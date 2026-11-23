import type * as maplibregl from 'maplibre-gl';
import { PointCloudLayer, type Point3D } from './PointCloudLayer';

export type { Point3D };

export interface MiniLidarOptions {
  layerId?: string;
  pointSize?: number;
}

/** Control de MapLibre que carga archivos .xyz y ofrece controles básicos. */
export class MiniLidarPlugin implements maplibregl.IControl {
  private map?: maplibregl.Map;
  private layer: PointCloudLayer;
  private container?: HTMLDivElement;
  private countEl?: HTMLDivElement;
  private toggleBtn?: HTMLButtonElement;
  private center: [number, number] | null = null;
  private centerZ = 0;
  private cleanupOrbit?: () => void;

  constructor(options: MiniLidarOptions = {}) {
    this.layer = new PointCloudLayer(options.layerId ?? 'mini-lidar-layer', options.pointSize ?? 5);
  }

  onAdd(map: maplibregl.Map): HTMLElement {
    this.map = map;
    const addLayer = () => {
      if (this.map && !this.map.getLayer(this.layer.id)) this.map.addLayer(this.layer);
    };
    if (map.isStyleLoaded()) addLayer();
    else map.once('load', addLayer);
    this.setupOrbit(map);

    const btnCss = 'flex:1;width:auto;height:auto;padding:3px 6px;border:1px solid #cbd5e1;border-radius:4px;font-size:11px;cursor:pointer;';
    const box = document.createElement('div');
    box.className = 'maplibregl-ctrl maplibregl-ctrl-group';
    box.style.cssText = 'padding:8px 10px;font:12px/1.4 system-ui,sans-serif;min-width:145px;';
    box.innerHTML =
      '<div style="font-weight:700;margin-bottom:2px;">Mini LiDAR</div>' +
      '<div data-count style="color:#475569;margin-bottom:6px;">Cargando...</div>' +
      `<div style="display:flex;gap:4px;"><button type="button" data-center style="${btnCss}">Centrar</button>` +
      `<button type="button" data-toggle style="${btnCss}">Ocultar</button></div>`;

    this.countEl = box.querySelector('[data-count]')!;
    this.toggleBtn = box.querySelector('[data-toggle]')!;
    box.querySelector('[data-center]')!.addEventListener('click', () => this.flyToCloud());
    this.toggleBtn.addEventListener('click', () => {
      this.layer.visible = !this.layer.visible;
      this.toggleBtn!.textContent = this.layer.visible ? 'Ocultar' : 'Mostrar';
      this.map?.triggerRepaint();
    });

    this.container = box;
    return box;
  }

  onRemove(): void {
    this.cleanupOrbit?.();
    this.cleanupOrbit = undefined;
    if (this.map?.getLayer(this.layer.id)) this.map.removeLayer(this.layer.id);
    this.container?.remove();
    this.map = undefined;
  }

  /** Envía los puntos a la capa GPU y actualiza el centro 3D y contador. */
  loadPoints(points: Point3D[], flyTo = false): void {
    this.layer.setPoints(points);
    if (this.countEl) this.countEl.textContent = `${points.length.toLocaleString('es-ES')} puntos`;
    if (points.length === 0) { this.center = null; this.centerZ = 0; return; }
    let lng = 0, lat = 0, z = 0;
    for (const p of points) { lng += p.lng; lat += p.lat; z += p.z; }
    this.center = [lng / points.length, lat / points.length];
    this.centerZ = z / points.length;
    if (flyTo) this.flyToCloud();
    else this.map?.jumpTo({ center: this.center, elevation: this.centerZ });
  }

  /** Descarga y parsea una nube ASCII .xyz (lng lat z). */
  async loadXYZ(url: string, flyTo = true): Promise<void> {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`No se pudo cargar ${url} (${res.status})`);
    this.loadPoints(parseXYZ(await res.text()), flyTo);
  }

  flyToCloud(): void {
    if (this.map && this.center) {
      this.map.flyTo({ center: this.center, elevation: this.centerZ, zoom: 17.8, pitch: 58, bearing: -25 });
    }
  }

  /** Reemplaza dragRotate por giro lineal invertido orbitando alrededor del edificio. */
  private setupOrbit(map: maplibregl.Map): void {
    map.dragRotate.disable();
    const canvas = map.getCanvas();
    let dragging = false, lastX = 0, lastY = 0;

    const onContextMenu = (e: MouseEvent) => e.preventDefault();
    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 2) return;
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!dragging) return;
      const dx = e.clientX - lastX, dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      const bearing = map.getBearing() + dx * 0.5;
      const pitch = Math.max(0, Math.min(map.getMaxPitch(), map.getPitch() - dy * 0.4));
      map.jumpTo({ ...(this.center ? { center: this.center, elevation: this.centerZ } : {}), bearing, pitch });
    };
    const onMouseUp = () => { dragging = false; };

    canvas.addEventListener('contextmenu', onContextMenu);
    canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('blur', onMouseUp);

    this.cleanupOrbit = () => {
      canvas.removeEventListener('contextmenu', onContextMenu);
      canvas.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('blur', onMouseUp);
      map.dragRotate.enable();
    };
  }
}

function parseXYZ(text: string): Point3D[] {
  const points: Point3D[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const [lng, lat, z] = line.split(/\s+/).map(Number);
    if (Number.isFinite(lng) && Number.isFinite(lat) && Number.isFinite(z)) points.push({ lng, lat, z });
  }
  return points;
}

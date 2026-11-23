import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
import { MiniLidarPlugin } from './plugin/MiniLidarPlugin';

// Necesario en Vite para que el Web Worker de MapLibre cargue correctamente en dev
maplibregl.setWorkerUrl(maplibreWorkerUrl);

// Centro del Edificio de Informática y Matemáticas (EII ULPGC, Tafira)
const EII_ULPGC: [number, number] = [-15.4514, 28.07334];

const map = new maplibregl.Map({
  container: 'map',
  style: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
  center: EII_ULPGC,
  zoom: 17.8,
  pitch: 58,
  maxPitch: 85,
  bearing: -25,
});

map.addControl(new maplibregl.NavigationControl(), 'top-right');

const lidar = new MiniLidarPlugin({ pointSize: 3 });
map.addControl(lidar, 'top-left');
lidar.loadCopc('/eii-ulpgc.copc.laz', false).catch((err) => {
  console.error('Error cargando nube de puntos:', err);
});

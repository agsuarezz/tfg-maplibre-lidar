import { Copc, type Hierarchy } from 'copc';
import { createLazPerf, type LazPerf } from 'laz-perf';
import lazPerfWasmUrl from 'laz-perf/lib/web/laz-perf.wasm?url';
import proj4 from 'proj4';
import type { Point3D } from './PointCloudLayer';

export interface CopcLoadOptions {
  /** Resta la cota mínima para apoyar la nube sobre el mapa plano (por defecto true). */
  groundAlign?: boolean;
  /** Profundidad máxima del octree a descargar (por defecto todas). */
  maxDepth?: number;
  /** Callback tras cargar cada nivel de detalle (LOD 0, 1, 2...). */
  onProgress?: (points: Point3D[], depth: number) => void;
}

let lazPerfPromise: Promise<LazPerf> | null = null;

function getLazPerf(): Promise<LazPerf> {
  return (lazPerfPromise ??= createLazPerf({ locateFile: () => lazPerfWasmUrl }));
}

/** Lector HTTP por rangos de bytes (Range) para leer solo las partes pedidas del COPC. */
function createRangeGetter(url: string) {
  return async (begin: number, end: number): Promise<Uint8Array> => {
    const res = await fetch(url, { headers: { Range: `bytes=${begin}-${end - 1}` } });
    if (!res.ok) throw new Error(`Error HTTP ${res.status} al leer ${url}`);
    const bytes = new Uint8Array(await res.arrayBuffer());
    return res.status === 206 ? bytes : bytes.subarray(begin, end);
  };
}

/** Recorre recursivamente las páginas de jerarquía COPC para obtener todos los nodos. */
async function loadAllNodes(
  getter: (begin: number, end: number) => Promise<Uint8Array>,
  page: Hierarchy.Page,
  out: Hierarchy.Node.Map = {}
): Promise<Hierarchy.Node.Map> {
  const subtree = await Copc.loadHierarchyPage(getter, page);
  Object.assign(out, subtree.nodes);
  for (const subPage of Object.values(subtree.pages)) {
    if (subPage) await loadAllNodes(getter, subPage, out);
  }
  return out;
}

/** Descarga y decodifica un archivo .copc.laz nivel a nivel según el octree. */
export async function loadCopc(url: string, options: CopcLoadOptions = {}): Promise<Point3D[]> {
  const groundAlign = options.groundAlign ?? true;
  const getter = createRangeGetter(url);
  const [lazPerf, copc] = await Promise.all([getLazPerf(), Copc.create(getter)]);
  const allNodes = await loadAllNodes(getter, copc.info.rootHierarchyPage);

  // Agrupa los nodos por profundidad del octree (0 = resumen inicial, 1..N = más detalle)
  const byDepth = new Map<number, Hierarchy.Node[]>();
  for (const [key, node] of Object.entries(allNodes)) {
    if (!node || node.pointCount === 0) continue;
    const depth = Number(key.split('-')[0]);
    if (options.maxDepth !== undefined && depth > options.maxDepth) continue;
    const list = byDepth.get(depth) ?? [];
    list.push(node);
    byDepth.set(depth, list);
  }

  const toWgs84 = copc.wkt ? proj4(copc.wkt, 'EPSG:4326') : null;
  let baseZ = groundAlign && copc.header.max[2] > copc.header.min[2] ? copc.header.min[2] : NaN;
  const points: Point3D[] = [];

  for (const depth of [...byDepth.keys()].sort((a, b) => a - b)) {
    const views = await Promise.all(
      byDepth.get(depth)!.map((node) =>
        Copc.loadPointDataView(getter, copc, node, { lazPerf, include: ['X', 'Y', 'Z'] })
      )
    );

    if (groundAlign && Number.isNaN(baseZ)) {
      baseZ = Infinity;
      for (const v of views) {
        const getZ = v.getter('Z');
        for (let i = 0; i < v.pointCount; i++) baseZ = Math.min(baseZ, getZ(i));
      }
      if (!Number.isFinite(baseZ)) baseZ = 0;
    }

    for (const view of views) {
      const getX = view.getter('X');
      const getY = view.getter('Y');
      const getZ = view.getter('Z');
      for (let i = 0; i < view.pointCount; i++) {
        const [lng, lat] = toWgs84 ? toWgs84.forward([getX(i), getY(i)]) : [getX(i), getY(i)];
        const z = getZ(i);
        points.push({ lng, lat, z: groundAlign ? z - baseZ : z });
      }
    }
    options.onProgress?.(points, depth);
  }

  return points;
}

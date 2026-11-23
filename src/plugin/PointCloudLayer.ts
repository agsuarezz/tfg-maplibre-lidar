import * as maplibregl from 'maplibre-gl';

export interface Point3D {
  lng: number;
  lat: number;
  z: number;
}

const VERTEX_SHADER = `#version 300 es
in vec3 a_pos;
uniform mat4 u_matrix;
uniform float u_pointSize, u_minZ, u_maxZ;
out vec3 v_color;
void main() {
  gl_Position = u_matrix * vec4(a_pos, 1.0);
  gl_PointSize = u_pointSize;
  float t = clamp((a_pos.z - u_minZ) / max(u_maxZ - u_minZ, 1e-9), 0.0, 1.0);
  vec3 low = vec3(0.12, 0.50, 0.95), mid = vec3(0.10, 0.80, 0.48), high = vec3(0.96, 0.36, 0.14);
  v_color = t < 0.5 ? mix(low, mid, t * 2.0) : mix(mid, high, (t - 0.5) * 2.0);
}`;

const FRAGMENT_SHADER = `#version 300 es
precision mediump float;
in vec3 v_color;
out vec4 fragColor;
void main() {
  if (length(gl_PointCoord - 0.5) > 0.5) discard; // Puntos circulares en vez de cuadrados
  fragColor = vec4(v_color, 1.0);
}`;

/** Capa WebGL2 personalizada de MapLibre para renderizar nubes de puntos 3D en GPU. */
export class PointCloudLayer implements maplibregl.CustomLayerInterface {
  readonly id: string;
  readonly type = 'custom' as const;
  readonly renderingMode = '3d' as const;
  visible = true;
  pointSize: number;

  private map?: maplibregl.Map;
  private program: WebGLProgram | null = null;
  private vao: WebGLVertexArrayObject | null = null;
  private buffer: WebGLBuffer | null = null;
  private uMatrix: WebGLUniformLocation | null = null;
  private uPointSize: WebGLUniformLocation | null = null;
  private uMinZ: WebGLUniformLocation | null = null;
  private uMaxZ: WebGLUniformLocation | null = null;
  private origin: maplibregl.MercatorCoordinate | null = null;
  private pendingData: Float32Array | null = null;
  private needsUpload = false;
  private pointCount = 0;
  private minZ = 0;
  private maxZ = 0;

  constructor(id = 'mini-lidar-layer', pointSize = 5) {
    this.id = id;
    this.pointSize = pointSize;
  }

  /** Proyecta a Mercator y guarda desplazamientos relativos para evitar temblor Float32. */
  setPoints(points: Point3D[]): void {
    if (points.length === 0) {
      this.origin = null;
      this.pendingData = new Float32Array(0);
      this.pointCount = 0;
      this.needsUpload = true;
      this.map?.triggerRepaint();
      return;
    }

    let sumLng = 0, sumLat = 0;
    for (const p of points) { sumLng += p.lng; sumLat += p.lat; }
    const origin = maplibregl.MercatorCoordinate.fromLngLat(
      [sumLng / points.length, sumLat / points.length],
      0
    );

    const data = new Float32Array(points.length * 3);
    let minZ = Infinity, maxZ = -Infinity;
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      const mc = maplibregl.MercatorCoordinate.fromLngLat([p.lng, p.lat], p.z);
      const dz = mc.z - origin.z;
      data[i * 3] = mc.x - origin.x;
      data[i * 3 + 1] = mc.y - origin.y;
      data[i * 3 + 2] = dz;
      if (dz < minZ) minZ = dz;
      if (dz > maxZ) maxZ = dz;
    }

    this.origin = origin;
    this.pendingData = data;
    this.pointCount = points.length;
    this.minZ = minZ;
    this.maxZ = maxZ;
    this.needsUpload = true;
    this.map?.triggerRepaint();
  }

  onAdd(map: maplibregl.Map, gl: WebGL2RenderingContext): void {
    this.map = map;
    this.program = createProgram(gl, VERTEX_SHADER, FRAGMENT_SHADER);
    this.uMatrix = gl.getUniformLocation(this.program, 'u_matrix');
    this.uPointSize = gl.getUniformLocation(this.program, 'u_pointSize');
    this.uMinZ = gl.getUniformLocation(this.program, 'u_minZ');
    this.uMaxZ = gl.getUniformLocation(this.program, 'u_maxZ');

    // VAO propio para no ensuciar el estado WebGL2 interno de MapLibre
    this.vao = gl.createVertexArray();
    this.buffer = gl.createBuffer();
    gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    const aPos = gl.getAttribLocation(this.program, 'a_pos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
  }

  render(gl: WebGL2RenderingContext, options: maplibregl.CustomRenderMethodInput): void {
    if (!this.visible || !this.program || !this.vao || !this.buffer) return;
    if (this.needsUpload && this.pendingData) {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
      gl.bufferData(gl.ARRAY_BUFFER, this.pendingData, gl.STATIC_DRAW);
      gl.bindBuffer(gl.ARRAY_BUFFER, null);
      this.needsUpload = false;
    }
    if (this.pointCount === 0 || !this.origin) return;

    // Traslada la matriz de cámara en Float64 al origen local de la nube
    const main = options.defaultProjectionData.mainMatrix;
    const m = new Float32Array(main);
    for (let r = 0; r < 4; r++) {
      m[12 + r] =
        main[r] * this.origin.x + main[4 + r] * this.origin.y +
        main[8 + r] * this.origin.z + main[12 + r];
    }

    gl.useProgram(this.program);
    gl.uniformMatrix4fv(this.uMatrix, false, m);
    gl.uniform1f(this.uPointSize, this.pointSize * window.devicePixelRatio);
    gl.uniform1f(this.uMinZ, this.minZ);
    gl.uniform1f(this.uMaxZ, this.maxZ);
    gl.bindVertexArray(this.vao);
    gl.drawArrays(gl.POINTS, 0, this.pointCount);
    gl.bindVertexArray(null);
  }

  onRemove(_map: maplibregl.Map, gl: WebGL2RenderingContext): void {
    if (this.buffer) gl.deleteBuffer(this.buffer);
    if (this.vao) gl.deleteVertexArray(this.vao);
    if (this.program) gl.deleteProgram(this.program);
    this.buffer = null; this.vao = null; this.program = null; this.map = undefined;
  }
}

function createProgram(gl: WebGL2RenderingContext, vsSrc: string, fsSrc: string): WebGLProgram {
  const compile = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? 'Shader error');
    return s;
  };
  const vs = compile(gl.VERTEX_SHADER, vsSrc);
  const fs = compile(gl.FRAGMENT_SHADER, fsSrc);
  const p = gl.createProgram()!;
  gl.attachShader(p, vs); gl.attachShader(p, fs); gl.linkProgram(p);
  gl.deleteShader(vs); gl.deleteShader(fs);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) ?? 'Link error');
  return p;
}

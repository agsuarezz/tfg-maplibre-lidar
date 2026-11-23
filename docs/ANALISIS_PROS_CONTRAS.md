# Análisis Técnico de `maplibre-gl-lidar`: Pros, Contras y Hoja de Ruta para un Nuevo Plugin

Este documento analiza en profundidad la arquitectura e implementación actual de **`maplibre-gl-lidar`** con el objetivo de identificar **qué partes funcionan bien y deben conservarse** y **qué limitaciones técnicas deben resolverse** al diseñar un nuevo plugin propio mejorado.

---

## 1. Resumen de la Arquitectura Actual

El plugin se estructura en torno a cinco bloques principales:
- **Integración con MapLibre y deck.gl (`src/lib/core/`)**: [`DeckOverlay.ts`](./src/lib/core/DeckOverlay.ts) conecta MapLibre con `@deck.gl/maplibre` (`MapLibreOverlay`), [`ViewportManager.ts`](./src/lib/core/ViewportManager.ts) calcula el nivel de detalle (LOD) según la cámara, y [`LidarControl.ts`](./src/lib/core/LidarControl.ts) actúa como controlador principal e interfaz `IControl`.
- **Cargadores de datos (`src/lib/loaders/`)**: [`PointCloudLoader.ts`](./src/lib/loaders/PointCloudLoader.ts) para carga completa (LAS/LAZ/COPC), [`CopcStreamingLoader.ts`](./src/lib/loaders/CopcStreamingLoader.ts) para streaming dinámico por octree de archivos COPC, y [`EptStreamingLoader.ts`](./src/lib/loaders/EptStreamingLoader.ts) para datasets Entwine Point Tiles (EPT).
- **Gestión de capas WebGL (`src/lib/layers/`)**: [`PointCloudManager.ts`](./src/lib/layers/PointCloudManager.ts) administra instancias de `PointCloudLayer` de deck.gl divididas en bloques (*chunks*).
- **Colorización (`src/lib/colorizers/`)**: [`ColorScheme.ts`](./src/lib/colorizers/ColorScheme.ts) y [`Colormaps.ts`](./src/lib/colorizers/Colormaps.ts) calculan los colores RGBA por elevación, intensidad, clasificación ASPRS o RGB.
- **Herramientas y GUI (`src/lib/tools/`, `src/lib/gui/`)**: Perfil de elevación transversal ([`CrossSectionTool.ts`](./src/lib/tools/CrossSectionTool.ts), [`ElevationProfileExtractor.ts`](./src/lib/tools/ElevationProfileExtractor.ts)), paneles de control, leyendas interactivas y metadatos.

---

## 2. PROS (Puntos Fuertes que Conviene Conservar)

### 2.1. Soporte multi-formato y estrategia de *fallback* muy sólida
- **Formatos soportados**: LAS (1.0 a 1.4), LAZ comprimido, COPC (*Cloud Optimized Point Cloud*) y EPT (*Entwine Point Tiles*, tanto en formato `laszip` como `binary`).
- **Decompresión híbrida inteligente** ([`PointCloudLoader.ts`](./src/lib/loaders/PointCloudLoader.ts)):
  - Utiliza `copc.js` + `laz-perf` (WASM cargado localmente en [`laz-perf.ts`](./src/lib/loaders/laz-perf.ts) sin depender de CDNs externos) para archivos LAS 1.2/1.4 y COPC.
  - Si detecta versiones LAS 1.0, 1.1 o 1.3 (no soportadas por `copc.js`), hace *fallback* automático a `@loaders.gl/las` (`LAZRsLoader`).
  - Si un servidor remoto falla en modo streaming por cabeceras Range/CORS, intenta automáticamente la descarga completa ([`LidarControl.ts`](./src/lib/core/LidarControl.ts)).
  - Detecta compresión LAZ leyendo directamente los bits 6 y 7 del byte 104 de la cabecera raw (`isLazCompressed`), evitando fallos cuando `copc.js` enmascara dicho bit.

### 2.2. Precisión espacial en GPU mediante `LNGLAT_OFFSETS`
- **Problema habitual en WebGL**: Las coordenadas geográficas (WGS84) en `Float32` pierden precisión y provocan temblores (*jittering*) al hacer zoom in.
- **Solución implementada** ([`PointCloudManager.ts`](./src/lib/layers/PointCloudManager.ts)): Calcula un `coordinateOrigin` en el centro del *bounding box* `[centerLng, centerLat, 0]` y almacena las posiciones de los puntos como desplazamientos relativos (`lng - originLng`, `lat - originLat`, `z`) usando `COORDINATE_SYSTEM.LNGLAT_OFFSETS` de deck.gl.
- **Por qué conservarlo**: Permite mantener precisión sub-milimétrica usando buffers `Float32Array` estándar sin el sobrecoste de emular `fp64` en GPU.

### 2.3. Heurística de LOD y priorización en Streaming Octree
- **Cálculo de profundidad adaptativo** ([`ViewportManager.ts`](./src/lib/core/ViewportManager.ts)):
  - Calcula el `targetDepth` del octree a partir de la resolución en metros por píxel del zoom actual comparada con el `spacing` raíz del archivo COPC/EPT.
  - **Ajuste por inclinación (`pitch`)**: Reduce automáticamente la profundidad objetivo cuando el mapa está inclinado (vista 3D), evitando descargar miles de nodos lejanos en el horizonte.
- **Prioridad *Center-First*** ([`CopcStreamingLoader.ts`](./src/lib/loaders/CopcStreamingLoader.ts)):
  - Ordena la cola de descarga priorizando los nodos más cercanos al centro de la pantalla con una ligera bonificación para nodos más profundos (`distPriority - depth * 0.0001`), y añade un *buffer* del 20% alrededor del viewport para cubrir bordes en cámaras inclinadas.
- **Fijación de regiones (`loadRegion` y `pauseStreaming`)**:
  - Permite descargar todos los niveles del octree dentro de un *bounding box* y fijarlos (*pin*) para que el algoritmo de *eviction* no los borre, algo muy útil para herramientas de edición, clasificación manual o medición de precisión.

### 2.4. Gestión limpia del Canvas y del Contexto WebGL
- **Re-parenting del canvas** ([`DeckOverlay.ts`](./src/lib/core/DeckOverlay.ts)): En modo `MapLibreOverlay`, MapLibre inserta por defecto el canvas de deck.gl dentro de `.maplibregl-control-container`, tapando controles y marcadores. El método `_moveBelowUi()` mueve el canvas justo detrás de la UI y encima del mapa base.
- **Sistema de capas `overlay: true`**: Garantiza que capas auxiliares (como la línea de sección transversal o selecciones) se rendericen siempre después de los chunks de puntos que van llegando por streaming.
- **Liberación explícita de WebGL2**: Al destruir el control, invoca `gl.getExtension('WEBGL_lose_context')?.loseContext()`, evitando la fuga de contextos WebGL típica de `luma.gl` al montar y desmontar componentes en React/SPA.

### 2.5. Transformación automática de CRS y unidades verticales
- **Lectura de WKT y `COMPD_CS`**: Extrae la proyección horizontal desde sistemas compuestos (`extractProjcsFromWkt`) y reproyecta automáticamente a `EPSG:4326` con `proj4`.
- **Conversión vertical**: Detecta automáticamente si el eje Z está en *International Feet* (`0.3048`) o *US Survey Feet* (`0.3048006096...`) en el WKT y lo convierte a metros.

### 2.6. Colorización estadística por percentiles y estilos por clase
- **Recorte de *outliers*** ([`helpers.ts`](./src/lib/utils/helpers.ts), [`ColorScheme.ts`](./src/lib/colorizers/ColorScheme.ts)): Calcula por defecto el rango entre los percentiles 2% y 98% mediante muestreo estratificado (máx. 100.000 muestras), logrando un contraste óptimo aunque la nube tenga puntos de ruido extremos (aves, reflejos subterráneos).
- **Estilos por nube y por clase**: Soporta overrides individuales por nube (`PointCloudStyleOverride`) y personalización de nombres/colores de clasificación (`ClassificationStyles` para códigos ASPRS 64–255).

---

## 3. CONTRAS Y LIMITACIONES (Aspectos a Mejorar en el Nuevo Plugin)

### 3.1. Ausencia de Web Workers: Todo ocurre en el Hilo Principal (Main Thread)
- **Dónde ocurre**: [`PointCloudLoader.ts`](./src/lib/loaders/PointCloudLoader.ts), [`CopcStreamingLoader.ts`](./src/lib/loaders/CopcStreamingLoader.ts) y [`EptStreamingLoader.ts`](./src/lib/loaders/EptStreamingLoader.ts) (en la línea 985 incluso se fuerza `worker: false` en `LAZRsLoader`).
- **Problema**:
  - La descompresión LAZ (`laz-perf`), la lectura binaria de cada dimensión, la reproyección `proj4` punto a punto (`this._transformer([x, y])` dentro de un bucle `for` síncrono para millones de puntos) y la generación de colores se ejecutan en el hilo principal del navegador.
- **Impacto**: Aunque intenta mitigar el bloqueo con `_yieldToUI()` (`setTimeout(0)`), durante el streaming o con nubes de varios millones de puntos se producen caídas de FPS (*jank*) al mover o rotar la cámara.

### 3.2. Colorización, Filtrado de Elevación y Z-Offset en CPU en vez de GPU
- **Dónde ocurre**: [`PointCloudManager.ts`](./src/lib/layers/PointCloudManager.ts) (líneas 246–275 y 589–744) y [`ColorScheme.ts`](./src/lib/colorizers/ColorScheme.ts).
- **Problema**:
  1. **Recálculo completo de colores en CPU**: Cambiar el colormap, el rango de percentiles o apagar una clase ASPRS recorre en CPU todos los puntos cargados para rellenar un nuevo `Uint8Array(pointCount * 4)`.
  2. **Filtrado y Z-Offset en CPU recreando buffers**: En `_createLayer()`, filtrar por `elevationRange` o cambiar el `zOffset` recorre todos los puntos en JS (`for (let i = 0; i < data.pointCount; i++)`), aloja nuevos `Float32Array` (`chunkPositions`) y `Uint8Array` (`chunkColors`), copia punto a punto los datos y destruye/recrea las capas `PointCloudLayer`.
  3. **Re-subida masiva en Streaming**: Cada vez que llega un lote de nodos en streaming (cada 100 ms), `updatePointCloud()` recalcula los colores de **toda** la nube acumulada y vuelve a crear y subir a la GPU **todos** los chunks desde el índice 0, en lugar de subir únicamente el nodo recién descargado.
- **Impacto**: Enorme presión sobre el recolector de basura (GC), alto consumo de memoria RAM duplicada (buffers del loader + buffers de los chunks) y lentitud al arrastrar sliders en la interfaz.

### 3.3. Buffer Monolítico Pre-alocado y Parpadeo (*Flashing*) en Streaming
- **Dónde ocurre**: [`CopcStreamingLoader.ts`](./src/lib/loaders/CopcStreamingLoader.ts) (`_allocateBuffers`, `evictLoadedNodesOutsideViewport`) y [`LidarControl.ts`](./src/lib/core/LidarControl.ts) (líneas 1524–1529 y 1779–1788).
- **Problema**:
  - Nada más inicializar un archivo en streaming, pre-aloca buffers tipados para todo el `pointBudget` (por defecto 5.000.000 de puntos: `positions` 60 MB + `intensities` 20 MB + `colors` 20 MB + `classifications` 5 MB + `extraAttributes` = **>120 MB de RAM por nube** antes de cargar un solo punto).
  - Todos los nodos se escriben en ese único array plano. Cuando se llena el 80% del presupuesto y la cobertura del viewport es menor al 50% (`budgetReached && needsCoverage`), llama a `resetLoadedData()`, **vaciando toda la nube de puntos de golpe** y volviendo a cargarla desde cero, lo que provoca un parpadeo visual muy perceptible.
  - Además, `selectNodesForViewport` acumula todos los nodos desde `depth = 0` hasta `targetDepth + 1`, pero cuando el usuario hace *zoom out*, los nodos profundos que siguen dentro del viewport no se desalojan para liberar presupuesto.

### 3.4. Carga recursiva completa de la jerarquía COPC al inicio
- **Dónde ocurre**: [`CopcStreamingLoader.ts`](./src/lib/loaders/CopcStreamingLoader.ts) (líneas 611–658, `_ensureHierarchyLoaded` y `_loadHierarchyRecursive`).
- **Problema**: A pesar de que los comentarios indican que las páginas de jerarquía se cargan bajo demanda, en la primera llamada a `selectNodesForViewport` descarga recursivamente **todas las sub-páginas de jerarquía** del archivo COPC antes de empezar a pedir nodos de puntos. En archivos COPC muy grandes con árboles profundos, esto añade latencia innecesaria al primer renderizado.

### 3.5. Modo `interleaved: false` y problemas con el Terreno 3D
- **Dónde ocurre**: [`DeckOverlay.ts`](./src/lib/core/DeckOverlay.ts) (línea 25) y [`LidarControl.ts`](./src/lib/core/LidarControl.ts) (`setTerrain`, `autoZOffset`).
- **Problema**:
  - Al usar `interleaved: false`, deck.gl renderiza en un canvas separado encima de MapLibre sin compartir el *depth buffer* del mapa. Por tanto, el terreno 3D de MapLibre o las capas de edificios 3D (`fill-extrusion`) nunca ocluyen correctamente la nube de puntos.
  - El ajuste `autoZOffset` simplemente resta una constante (`-zOffsetBase`) a toda la nube para pegarla a cota 0. Si se activa el terreno 3D (`terrainEnabled: true`), el mapa base ya tiene altitud real (DEM), por lo que restar `zOffsetBase` hunde la nube bajo tierra o la desalinea respecto a montañas y laderas.

### 3.6. Calidad visual básica: Sin EDL (Eye-Dome Lighting) ni Tamaño Adaptativo
- **Dónde ocurre**: [`PointCloudManager.ts`](./src/lib/layers/PointCloudManager.ts) (líneas 713–738).
- **Problema**:
  - Utiliza el `PointCloudLayer` estándar de deck.gl con `sizeUnits: 'pixels'`, tamaño constante y normal fija `[0, 0, 1]`.
  - Carece de **Eye-Dome Lighting (EDL)**, el filtro de sombreado en espacio de pantalla que usan visores profesionales como Potree o CloudCompare para resaltar bordes y profundidad sin necesidad de normales.
  - Tampoco ajusta el radio del punto en función de la distancia a cámara o densidad del LOD, por lo que al alejarse los puntos se solapan en exceso y al acercarse quedan huecos vacíos entre ellos.

### 3.7. Ineficiencias geométricas y de búsqueda espacial
- **Perfil de elevación por fuerza bruta $O(N)$** ([`ElevationProfileExtractor.ts`](./src/lib/tools/ElevationProfileExtractor.ts)):
  - Recorre secuencialmente **todos** los puntos de todas las nubes cargadas y ejecuta fórmulas trigonométricas (`haversineDistance` con `Math.sin`, `Math.cos`, `Math.atan2`) para cada punto, sin descartar primero por un *bounding box* rápido en 2D ni aprovechar el índice espacial de los nodos del octree (`nodeRanges`).
- **Transformación de *bounds* de solo 2 esquinas** ([`PointCloudLoader.ts`](./src/lib/loaders/PointCloudLoader.ts), [`CopcStreamingLoader.ts`](./src/lib/loaders/CopcStreamingLoader.ts)):
  - Para calcular los *bounds* en WGS84 solo transforma `[minX, minY]` y `[maxX, maxY]`. En proyecciones cónicas o UTM lejos del meridiano central, el rectángulo proyectado está rotado respecto a lat/lng, por lo que deben transformarse las **4 esquinas** para obtener un AABB correcto.
- **Heurística CRS hardcodeada**: En [`CopcStreamingLoader.ts`](./src/lib/loaders/CopcStreamingLoader.ts) (líneas 370–375), si un archivo no tiene WKT y sus coordenadas están entre 100.000 y 900.000, asume directamente que es `EPSG:2180` (Polonia), lo cual es erróneo para casi cualquier huso UTM del mundo.

### 3.8. Acoplamiento UI/Core en un archivo monolítico
- **Dónde ocurre**: [`LidarControl.ts`](./src/lib/core/LidarControl.ts) (**3.364 líneas**).
- **Problema**: Mezcla el motor de estado, la orquestación de loaders, el manejo del DOM del panel, los *listeners* de ventana y la lógica de terreno en una sola clase gigante. Además, modifica `document.documentElement.classList` para el tema claro/oscuro, afectando globalmente al documento si conviven varias instancias.

---

## 4. Propuesta de Diseño para el Nuevo Plugin (Qué Conservar + Mejoras)

| Área | Qué conservar de `maplibre-gl-lidar` | Qué mejorar en el nuevo plugin |
| :--- | :--- | :--- |
| **Formatos y Decodificación** | Soporte LAS 1.0–1.4, LAZ, COPC y EPT; detección de bits LAZ; uso de `laz-perf` WASM local y `proj4`. | **Pool de Web Workers**: Mover la descompresión WASM, el parseo de nodos y la reproyección `proj4` a Workers secundarios usando `Transferable Objects` (`ArrayBuffer`) para mantener el hilo principal a 60 FPS constantes. |
| **Precisión y Coordenadas** | Sistema `LNGLAT_OFFSETS` con `coordinateOrigin` en el centro de la nube y conversión automática de pies a metros. | Transformar las **4 esquinas** de cada nodo/cabecera al calcular *bounds* WGS84; eliminar el hardcode de `EPSG:2180` y permitir pasar un `defaultCrs` o selector de EPSG en la UI cuando falte el WKT. |
| **Renderizado y Colorización** | Colormaps científicos (`viridis`, `turbo`, etc.), cálculo de percentiles 2–98% por muestreo estratificado, leyendas ASPRS. | **Colorización y Filtrado 100% en GPU (Custom Shader / LayerExtension)**: Pasar `z`, `intensity` y `classification` como atributos WebGL y el colormap como textura 1D (LUT). Aplicar `zOffset`, `elevationRange` y visibilidad de clases en el *Vertex Shader* (0 ms en CPU al mover sliders). |
| **Calidad Visual 3D** | Gestión limpia del ciclo de vida del contexto WebGL y capas de *overlay*. | Añadir **Eye-Dome Lighting (EDL)** para percepción de relieve, **tamaño de punto adaptativo** según zoom/distancia a cámara (o *splatting* circular con suavizado), y soporte `interleaved: true` para oclusión real con edificios 3D y terreno. |
| **Motor de Streaming (COPC/EPT)** | Prioridad *center-first*, ajuste de `targetDepth` por `pitch` y zoom, y fijación de zonas con `loadRegion`. | **Caché LRU por Nodo en GPU**: Cada nodo del octree debe ser una subcapa/buffer independiente en lugar de reescribir y re-subir un único buffer de 5M de puntos cada 100 ms. Desalojar nodos profundos al hacer *zoom out* sin hacer `resetLoadedData()` global (cero parpadeos) y cargar sub-páginas de jerarquía COPC de forma verdaderamente perezosa (*lazy*). |
| **Terreno 3D** | Integración con DEM y control de exageración. | Sincronizar automáticamente el modo de altura con el terreno: desactivar o ajustar el `autoZOffset` cuando el terreno 3D está activo, o muestrear la elevación del DEM (`map.queryTerrainElevation`) para alinear nubes en alturas relativas sobre el suelo. |
| **Herramientas de Análisis** | Herramienta interactiva de perfil transversal (`CrossSectionTool`) e inspección de atributos al hacer hover/click. | **Indexación espacial con el Octree**: En `ElevationProfileExtractor`, filtrar primero qué nodos intersectan el *bounding box* del segmento y usar proyección plana local en metros en vez de `haversineDistance` sobre todos los puntos. Añadir herramientas de **medición 3D** (distancia 3D, pendiente, altura de edificio/árbol). |
| **Arquitectura de Código** | API de eventos clara (`load`, `streamingprogress`, `pointclick`), estado compartible por URL y soporte React. | **Separación Headless Core vs. UI**: Dividir el monolito de `LidarControl.ts` en un motor puro sin DOM (`LidarEngine`) y componentes de interfaz desacoplados, aislando las variables CSS de tema en el contenedor del control en vez de `<html>`. |

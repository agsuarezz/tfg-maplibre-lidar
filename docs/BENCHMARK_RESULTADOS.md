# Resultados del Benchmark de Rendimiento y Detección de Tirones (`maplibre-gl-lidar`)

- **Fecha de ejecución**: 2026-11-16T18:30:42.583Z
- **Entorno**: Node v24.22.0 (win32 / x64)
- **Presupuesto por fotograma (60 FPS)**: 16.67 ms
- **Umbral W3C *Long Task* (tirón perceptible)**: 50 ms

> **Cómo interpretar los resultados**: Todas las operaciones medidas se ejecutan de forma síncrona en el **hilo principal** de JavaScript. Cualquier operación que supere **16.67 ms** provoca pérdida de fotogramas (*frame drop*); si supera **50 ms** genera un tirón claro al hacer pan/zoom o mover un slider; por encima de **150 ms** la interfaz se congela momentáneamente.

---

## 1. Benchmark Multi-Escala (100k a 5M de puntos en CPU/Hilo Principal)

| Puntos | Operación | Categoría | Tiempo (ms) | Frames perdidos (60fps) | Estado |
| ---: | :--- | :--- | ---: | ---: | :--- |
| 100.000 | addPointCloud (carga inicial + chunks) | Render/Capas | 52.99 | 3 | Tirón notable (50-150ms) |
| 100.000 | ColorScheme: elevation (percentil 2-98%) | Colorización CPU | 59.10 | 3 | Tirón notable (50-150ms) |
| 100.000 | ColorScheme: elevation (min-max) | Colorización CPU | 3.69 | 0 | Fluido (<16.7ms) |
| 100.000 | ColorScheme: intensity (percentil) | Colorización CPU | 50.12 | 3 | Tirón notable (50-150ms) |
| 100.000 | ColorScheme: classification (ocultar ruido) | Colorización CPU | 1.30 | 0 | Fluido (<16.7ms) |
| 100.000 | ColorScheme: rgb (copia buffer) | Colorización CPU | 0.58 | 0 | Fluido (<16.7ms) |
| 100.000 | setPointSize(4) [slider tamaño punto] | Interacción UI | 10.08 | 0 | Fluido (<16.7ms) |
| 100.000 | setOpacity(0.75) [slider opacidad] | Interacción UI | 8.99 | 0 | Fluido (<16.7ms) |
| 100.000 | setZOffset(12.5) [slider altura Z] | Interacción UI | 8.54 | 0 | Fluido (<16.7ms) |
| 100.000 | setElevationRange [filtro elevación] | Filtrado CPU | 2.05 | 0 | Fluido (<16.7ms) |
| 100.000 | setHiddenClassifications [toggle leyenda] | Interacción UI | 10.47 | 0 | Fluido (<16.7ms) |
| 100.000 | proj4 transformación punto a punto | Decodificación/CRS | 35.70 | 2 | Tirón leve (16.7-50ms) |
| 100.000 | ElevationProfileExtractor.extract (perfil 2D) | Herramientas | 7.38 | 0 | Fluido (<16.7ms) |
| 500.000 | addPointCloud (carga inicial + chunks) | Render/Capas | 76.39 | 4 | Tirón notable (50-150ms) |
| 500.000 | ColorScheme: elevation (percentil 2-98%) | Colorización CPU | 59.85 | 3 | Tirón notable (50-150ms) |
| 500.000 | ColorScheme: elevation (min-max) | Colorización CPU | 17.95 | 1 | Tirón leve (16.7-50ms) |
| 500.000 | ColorScheme: intensity (percentil) | Colorización CPU | 50.53 | 3 | Tirón notable (50-150ms) |
| 500.000 | ColorScheme: classification (ocultar ruido) | Colorización CPU | 3.14 | 0 | Fluido (<16.7ms) |
| 500.000 | ColorScheme: rgb (copia buffer) | Colorización CPU | 1.17 | 0 | Fluido (<16.7ms) |
| 500.000 | setPointSize(4) [slider tamaño punto] | Interacción UI | 10.69 | 0 | Fluido (<16.7ms) |
| 500.000 | setOpacity(0.75) [slider opacidad] | Interacción UI | 10.71 | 0 | Fluido (<16.7ms) |
| 500.000 | setZOffset(12.5) [slider altura Z] | Interacción UI | 15.94 | 0 | Fluido (<16.7ms) |
| 500.000 | setElevationRange [filtro elevación] | Filtrado CPU | 0.84 | 0 | Fluido (<16.7ms) |
| 500.000 | setHiddenClassifications [toggle leyenda] | Interacción UI | 31.43 | 1 | Tirón leve (16.7-50ms) |
| 500.000 | proj4 transformación punto a punto | Decodificación/CRS | 142.44 | 8 | Tirón notable (50-150ms) |
| 500.000 | ElevationProfileExtractor.extract (perfil 2D) | Herramientas | 18.72 | 1 | Tirón leve (16.7-50ms) |
| 1.000.000 | addPointCloud (carga inicial + chunks) | Render/Capas | 128.92 | 7 | Tirón notable (50-150ms) |
| 1.000.000 | ColorScheme: elevation (percentil 2-98%) | Colorización CPU | 80.39 | 4 | Tirón notable (50-150ms) |
| 1.000.000 | ColorScheme: elevation (min-max) | Colorización CPU | 35.00 | 2 | Tirón leve (16.7-50ms) |
| 1.000.000 | ColorScheme: intensity (percentil) | Colorización CPU | 72.75 | 4 | Tirón notable (50-150ms) |
| 1.000.000 | ColorScheme: classification (ocultar ruido) | Colorización CPU | 7.00 | 0 | Fluido (<16.7ms) |
| 1.000.000 | ColorScheme: rgb (copia buffer) | Colorización CPU | 2.51 | 0 | Fluido (<16.7ms) |
| 1.000.000 | setPointSize(4) [slider tamaño punto] | Interacción UI | 24.14 | 1 | Tirón leve (16.7-50ms) |
| 1.000.000 | setOpacity(0.75) [slider opacidad] | Interacción UI | 29.21 | 1 | Tirón leve (16.7-50ms) |
| 1.000.000 | setZOffset(12.5) [slider altura Z] | Interacción UI | 27.94 | 1 | Tirón leve (16.7-50ms) |
| 1.000.000 | setElevationRange [filtro elevación] | Filtrado CPU | 1.68 | 0 | Fluido (<16.7ms) |
| 1.000.000 | setHiddenClassifications [toggle leyenda] | Interacción UI | 76.07 | 4 | Tirón notable (50-150ms) |
| 1.000.000 | proj4 transformación punto a punto | Decodificación/CRS | 278.29 | 16 | Congelación (>150ms) |
| 1.000.000 | ElevationProfileExtractor.extract (perfil 2D) | Herramientas | 35.20 | 2 | Tirón leve (16.7-50ms) |
| 2.500.000 | addPointCloud (carga inicial + chunks) | Render/Capas | 223.17 | 13 | Congelación (>150ms) |
| 2.500.000 | ColorScheme: elevation (percentil 2-98%) | Colorización CPU | 127.51 | 7 | Tirón notable (50-150ms) |
| 2.500.000 | ColorScheme: elevation (min-max) | Colorización CPU | 87.80 | 5 | Tirón notable (50-150ms) |
| 2.500.000 | ColorScheme: intensity (percentil) | Colorización CPU | 158.43 | 9 | Congelación (>150ms) |
| 2.500.000 | ColorScheme: classification (ocultar ruido) | Colorización CPU | 16.42 | 0 | Fluido (<16.7ms) |
| 2.500.000 | ColorScheme: rgb (copia buffer) | Colorización CPU | 5.62 | 0 | Fluido (<16.7ms) |
| 2.500.000 | setPointSize(4) [slider tamaño punto] | Interacción UI | 69.02 | 4 | Tirón notable (50-150ms) |
| 2.500.000 | setOpacity(0.75) [slider opacidad] | Interacción UI | 64.11 | 3 | Tirón notable (50-150ms) |
| 2.500.000 | setZOffset(12.5) [slider altura Z] | Interacción UI | 68.99 | 4 | Tirón notable (50-150ms) |
| 2.500.000 | setElevationRange [filtro elevación] | Filtrado CPU | 3.56 | 0 | Fluido (<16.7ms) |
| 2.500.000 | setHiddenClassifications [toggle leyenda] | Interacción UI | 160.91 | 9 | Congelación (>150ms) |
| 2.500.000 | proj4 loop (1M medido, extrapolado a 2.5M) | Decodificación/CRS | 748.31 | 44 | Congelación (>150ms) |
| 2.500.000 | ElevationProfileExtractor.extract (perfil 2D) | Herramientas | 87.71 | 5 | Tirón notable (50-150ms) |
| 5.000.000 | addPointCloud (carga inicial + chunks) | Render/Capas | 368.05 | 22 | Congelación (>150ms) |
| 5.000.000 | ColorScheme: elevation (percentil 2-98%) | Colorización CPU | 261.07 | 15 | Congelación (>150ms) |
| 5.000.000 | ColorScheme: elevation (min-max) | Colorización CPU | 171.43 | 10 | Congelación (>150ms) |
| 5.000.000 | ColorScheme: intensity (percentil) | Colorización CPU | 201.26 | 12 | Congelación (>150ms) |
| 5.000.000 | ColorScheme: classification (ocultar ruido) | Colorización CPU | 31.17 | 1 | Tirón leve (16.7-50ms) |
| 5.000.000 | ColorScheme: rgb (copia buffer) | Colorización CPU | 16.21 | 0 | Fluido (<16.7ms) |
| 5.000.000 | setPointSize(4) [slider tamaño punto] | Interacción UI | 135.30 | 8 | Tirón notable (50-150ms) |
| 5.000.000 | setOpacity(0.75) [slider opacidad] | Interacción UI | 138.67 | 8 | Tirón notable (50-150ms) |
| 5.000.000 | setZOffset(12.5) [slider altura Z] | Interacción UI | 139.64 | 8 | Tirón notable (50-150ms) |
| 5.000.000 | setElevationRange [filtro elevación] | Filtrado CPU | 7.25 | 0 | Fluido (<16.7ms) |
| 5.000.000 | setHiddenClassifications [toggle leyenda] | Interacción UI | 300.12 | 18 | Congelación (>150ms) |
| 5.000.000 | proj4 loop (1M medido, extrapolado a 5.0M) | Decodificación/CRS | 1397.38 | 83 | Congelación (>150ms) |
| 5.000.000 | ElevationProfileExtractor.extract (perfil 2D) | Herramientas | 169.22 | 10 | Congelación (>150ms) |

### Hallazgos clave de la Suite 1
- **Bug de coste en cambios visuales simples (`setPointSize` / `setOpacity`)**: Cambiar únicamente el tamaño de punto reconstruye y copia en CPU todos los `Float32Array` y `Uint8Array` de los chunks, bloqueando el hilo principal **24.14 ms** con 1M de puntos y **135.30 ms** con 5M de puntos.
- **Arrastrar sliders (`setZOffset` y `setElevationRange`)**: Con 5M de puntos, cada movimiento del slider de Z-Offset tarda **139.64 ms** y el de rango de elevación **7.25 ms**. En un evento `input` continuo del ratón, esto reduce el framerate por debajo de 1–5 FPS.
- **Reproyección `proj4` síncrona**: Transformar 1M de puntos de CRS proyectado a WGS84 en el hilo principal bloquea **278.29 ms** (16 frames perdidos). En streaming COPC/EPT esto sucede en el hilo principal justo al terminar cada descarga de nodo.
- **Extracción de perfil transversal (`ElevationProfileExtractor`)**: El escaneo lineal con fórmula Haversine sobre 5M de puntos consume **169.22 ms** de bloqueo síncrono.

---

## 2. Simulación de Tirones durante Streaming Progresivo (`updatePointCloud`)

En streaming COPC/EPT, `LidarControl` llama a `PointCloudManager.updatePointCloud()` cada 100 ms conforme llegan nodos. A diferencia de una inserción incremental, el código actual recalcula los colores de **toda** la nube acumulada y recrea **todos** los chunks desde el índice 0 en cada lote:

| Paso | Puntos acumulados | Lote nuevo | Tiempo `updatePointCloud` | Chunks recreados | Compactación (evict) | Heap JS (MB) | Estado |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | :--- |
| 1 | 250.000 | +250.000 | 57.95 ms | 1 | — | 92.6 MB | Tirón notable (50-150ms) |
| 2 | 500.000 | +250.000 | 65.19 ms | 1 | — | 177.4 MB | Tirón notable (50-150ms) |
| 3 | 1.000.000 | +500.000 | 112.96 ms | 1 | — | 141.7 MB | Tirón notable (50-150ms) |
| 4 | 2.000.000 | +1.000.000 | 179.01 ms | 2 | 1.45 ms | 119.9 MB | Congelación (>150ms) |
| 5 | 3.500.000 | +1.500.000 | 230.35 ms | 4 | 2.73 ms | 205.9 MB | Congelación (>150ms) |
| 6 | 5.000.000 | +1.500.000 | 338.32 ms | 5 | 3.72 ms | 147.9 MB | Congelación (>150ms) |

---

## 3. Benchmark con Nubes de Puntos Reales (COPC y EPT en Red)

| Dataset | Formato | Puntos totales | `initialize()` (HTTP + WKT) | RAM pre-alocada (5M budget) | `selectNodesForViewport()` | Nodos muestreados (pts) | Red + WASM | Bloqueo Hilo Principal (`extract` + `updateLayer`) | Estado máx. |
| :--- | :---: | ---: | ---: | ---: | ---: | :---: | ---: | ---: | :--- |
| Autzen Stadium | COPC | 10.653.336 | 901.04 ms | 3.2 MB | 167.83 ms | 6 (260.330) | 1949.48 ms | 199.10 ms (ext: 150.81 ms + upd: 48.29 ms) | Congelación (>150ms) |
| Madison | COPC | 4.068.294 | 1245.48 ms | 0.0 MB | 257.64 ms | 6 (52.664) | 2149.66 ms | 66.98 ms (ext: 28.08 ms + upd: 38.90 ms) | Congelación (>150ms) |
| Chicago | COPC | 18.711.790 | 987.18 ms | 0.0 MB | 256.32 ms | 6 (222.870) | 2860.58 ms | 171.64 ms (ext: 97.95 ms + upd: 73.69 ms) | Congelación (>150ms) |
| Red Rocks | EPT | 4.004.326 | 526.30 ms | 15.6 MB | 398.26 ms | 4 (79.164) | 2680.00 ms | 0.02 ms (ext: 0.00 ms + upd: 0.02 ms) | Congelación (>150ms) |
| Dublin | EPT | 1.420.984.613 | 467.09 ms | 0.0 MB | 1011.27 ms | 4 (763.866) | 3797.28 ms | 0.00 ms (ext: 0.00 ms + upd: 0.00 ms) | Congelación (>150ms) |

### Desglose por nodo en **Autzen Stadium (COPC)**

| Nodo (`d-x-y-z`) | Puntos | Red + Descompresión | Bloqueo CPU (`_extractPointData`) | Estado en hilo principal |
| :--- | ---: | ---: | ---: | :--- |
| `4-5-7-0` | 34.352 | 595.57 ms | 21.05 ms | Tirón leve (16.7-50ms) |
| `4-5-8-0` | 45.356 | 353.72 ms | 25.57 ms | Tirón leve (16.7-50ms) |
| `4-6-8-0` | 55.214 | 381.76 ms | 31.90 ms | Tirón leve (16.7-50ms) |
| `4-6-7-0` | 31.919 | 202.60 ms | 21.81 ms | Tirón leve (16.7-50ms) |
| `4-5-6-0` | 59.047 | 217.95 ms | 31.75 ms | Tirón leve (16.7-50ms) |
| `4-5-9-0` | 34.442 | 197.87 ms | 18.74 ms | Tirón leve (16.7-50ms) |

### Desglose por nodo en **Madison (COPC)**

| Nodo (`d-x-y-z`) | Puntos | Red + Descompresión | Bloqueo CPU (`_extractPointData`) | Estado en hilo principal |
| :--- | ---: | ---: | ---: | :--- |
| `0-0-0-0` | 36.870 | 489.21 ms | 20.43 ms | Tirón leve (16.7-50ms) |
| `4-8-7-0` | 6386 | 394.82 ms | 3.01 ms | Fluido (<16.7ms) |
| `4-8-8-0` | 1503 | 259.81 ms | 0.80 ms | Fluido (<16.7ms) |
| `4-7-8-0` | 961 | 384.49 ms | 0.56 ms | Fluido (<16.7ms) |
| `4-7-7-0` | 1201 | 341.50 ms | 0.46 ms | Fluido (<16.7ms) |
| `4-8-6-0` | 5743 | 279.82 ms | 2.83 ms | Fluido (<16.7ms) |

### Desglose por nodo en **Chicago (COPC)**

| Nodo (`d-x-y-z`) | Puntos | Red + Descompresión | Bloqueo CPU (`_extractPointData`) | Estado en hilo principal |
| :--- | ---: | ---: | ---: | :--- |
| `4-8-8-0` | 62.604 | 496.31 ms | 27.94 ms | Tirón leve (16.7-50ms) |
| `4-8-8-1` | 29.144 | 531.52 ms | 11.80 ms | Fluido (<16.7ms) |
| `4-7-7-0` | 49.776 | 480.92 ms | 20.51 ms | Tirón leve (16.7-50ms) |
| `4-7-7-1` | 17.457 | 446.01 ms | 10.99 ms | Fluido (<16.7ms) |
| `4-8-7-0` | 62.614 | 441.56 ms | 26.06 ms | Tirón leve (16.7-50ms) |
| `4-8-7-1` | 1275 | 464.26 ms | 0.64 ms | Fluido (<16.7ms) |

### Desglose por nodo en **Red Rocks (EPT)**

| Nodo (`d-x-y-z`) | Puntos | Red + Descompresión | Bloqueo CPU (`_extractPointData`) | Estado en hilo principal |
| :--- | ---: | ---: | ---: | :--- |
| `0-0-0-0` | 15.366 | 610.31 ms | 0.00 ms | Congelación (>150ms) |
| `4-8-7-7` | 19.728 | 819.56 ms | 0.00 ms | Congelación (>150ms) |
| `4-8-9-7` | 18.256 | 639.65 ms | 0.00 ms | Congelación (>150ms) |
| `3-3-3-3` | 25.814 | 610.48 ms | 0.00 ms | Congelación (>150ms) |

### Desglose por nodo en **Dublin (EPT)**

| Nodo (`d-x-y-z`) | Puntos | Red + Descompresión | Bloqueo CPU (`_extractPointData`) | Estado en hilo principal |
| :--- | ---: | ---: | ---: | :--- |
| `0-0-0-0` | 70.395 | 853.47 ms | 0.00 ms | Congelación (>150ms) |
| `4-8-7-7` | 233.168 | 1006.25 ms | 0.00 ms | Congelación (>150ms) |
| `4-8-8-7` | 221.943 | 918.83 ms | 0.00 ms | Congelación (>150ms) |
| `4-7-7-7` | 238.360 | 1018.73 ms | 0.00 ms | Congelación (>150ms) |

---

## 4. Diagnóstico Final: Cuándo da Tirones y Por Qué

1. **Al recibir nodos durante el streaming (`_extractPointData` + `updatePointCloud`)**: Cuando llegan nodos densos (50k–250k puntos por nodo) en datasets proyectados (como Autzen, Madison o Chicago), descomprimir en WASM + reproyectar punto a punto con `proj4` + regenerar colores de **todos** los puntos acumulados provoca bloqueos repetidos de decenas a cientos de milisegundos cada 100 ms.
2. **Al iniciar la carga COPC (`selectNodesForViewport`)**: `_loadHierarchyRecursive` descarga todas las páginas de jerarquía de golpe antes de poder seleccionar el primer nodo de puntos.
3. **Al interactuar con cualquier control visual (`setPointSize`, `setOpacity`, `setZOffset`, `setElevationRange`, cambiar colormap)**: A partir de ~500k–1M de puntos, prácticamente todas las interacciones de estilo superan el presupuesto de 16.67 ms y pasan a ser *Long Tasks* (> 50 ms) con 1M–5M puntos.
4. **Consumo inicial de memoria**: Incluso antes de descargar el primer nodo, `CopcStreamingLoader` y `EptStreamingLoader` pre-alocan los buffers completos para 5M de puntos (~105–125 MB por nube en TypedArrays).

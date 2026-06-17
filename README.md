# Taller Semana 6 — Reporte de rendimiento de ventas (ModaAndina)

Paquete para la actividad de Inteligencia de Negocios: análisis de ventas en
Power BI Desktop + reporte académico en Word.

## Contenido de la carpeta

| Archivo | Qué es |
|---|---|
| `generar_datos.py` | Genera los datos simulados en `Datos/` (Ventas.xlsx + 4 CSV). |
| `generar_reporte.py` | Genera el reporte de Word con cifras reales calculadas de los datos. |
| `Guia_PowerBI.md` | Paso a paso para construir `ModaAndina.pbix`. |
| `Datos/` | Conjuntos de datos (se crean al correr el script). |
| `Reporte_Rendimiento_Ventas_Alejandro_Arenas.docx` | El reporte (se crea al correr el script). |

## Cómo usarlo (en orden)

1. **Instalar dependencias** (una sola vez):
   ```
   pip install openpyxl python-docx
   ```
2. **Generar los datos**:
   ```
   python generar_datos.py
   ```
3. **Generar el reporte de Word**:
   ```
   python generar_reporte.py
   ```
4. **Construir el tablero**: sigue `Guia_PowerBI.md` en Power BI Desktop para
   crear `ModaAndina.pbix`.
5. **Insertar capturas**: toma las 6 capturas del dashboard y reemplaza los
   marcadores rojos `[ Insertar aquí: ... ]` del Word.
6. **Completar la portada**: añade el nombre del docente.
7. **Entregar**: sube el `.pbix` y las capturas a Google Drive (sin
   restricciones) y carga el Word en la plataforma.

## Notas

- Los datos incluyen defectos a propósito (duplicados, nulos, texto
  inconsistente, ventas en cero) para practicar la limpieza en Power Query; el
  reporte ya describe esa limpieza.
- El reporte recalcula todas las cifras desde los datos, así que si cambias
  `generar_datos.py` solo debes volver a correr ambos scripts.
- Caso, datos y empresa (ModaAndina) son **ficticios**, creados para fines
  académicos.

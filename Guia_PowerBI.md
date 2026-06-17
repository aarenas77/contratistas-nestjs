# Guía paso a paso — Construcción del tablero "ModaAndina" en Power BI Desktop

> Reporte de rendimiento de ventas · Inteligencia de Negocios · Semana 6
> · Alejandro Arenas Gómez
>
> Esta guía explica cómo construir el archivo `ModaAndina.pbix` a partir de los
> datos de la carpeta `Datos/`. Al final se indica qué capturas tomar para
> insertarlas en el reporte de Word.

---

## 0. Antes de empezar

- Verifica que la carpeta `Taller_Semana6_PowerBI\Datos\` tenga **5 archivos**:
  `Ventas.xlsx`, `Clientes.csv`, `Productos.csv`, `Tiendas.csv` y `Calendario.csv`.
  (Si no existen, ejecuta primero `python generar_datos.py`.)
- Abre **Power BI Desktop**. Si aparece la pantalla de bienvenida, ciérrala.

---

## 1. Importar los datos (Excel + CSV = fuentes diversas)

### 1.1 La tabla de hechos desde Excel
1. **Inicio → Obtener datos → Excel (libro)**.
2. Selecciona `Ventas.xlsx` → **Abrir**.
3. En el Navegador, marca la hoja **Ventas** y pulsa **Transformar datos**
   (no «Cargar»: primero vamos a limpiar).

### 1.2 Las dimensiones desde CSV
1. En el Editor de Power Query: **Inicio → Nuevo origen → Texto/CSV**.
2. Importa, uno por uno: `Clientes.csv`, `Productos.csv`, `Tiendas.csv` y
   `Calendario.csv`. En cada uno confirma el origen **65001: Unicode (UTF-8)**
   para que los acentos se vean bien, y pulsa **Aceptar / Transformar datos**.

Al terminar deberías tener 5 consultas en el panel izquierdo.

---

## 2. Limpiar y transformar (Editor de Power Query)

Estos pasos son **clave** y se describen en el reporte. Los datos traen
defectos a propósito.

### 2.1 Tabla `Ventas`
1. **Quitar duplicados**: selecciona la columna `ID_Venta` → clic derecho →
   **Quitar duplicados**. (Hay 15 filas repetidas.)
2. **Filtrar registros inválidos**: en `Importe_Venta`, abre el filtro →
   **Filtros de números → Es mayor que → 0**. (Elimina las ventas en cero.)
3. **Valores nulos en Costo**: selecciona la columna `Costo` → **Transformar →
   Reemplazar valores** → reemplaza `null` por `0`.
4. **Tipos de dato**: confirma que `Fecha` sea **Fecha**; `Unidades`,
   `Importe_Venta` y `Costo` sean **Número entero**/**decimal**; y `Descuento`
   sea **Número decimal**.

### 2.2 Tabla `Clientes`
1. **Normalizar la ciudad**: selecciona `Ciudad` → **Transformar → Formato →
   Recortar**; repite con **Limpiar**; y luego **Formato → Poner en mayúscula
   cada palabra**. Así «BOGOTA», « bogotá » y «bogota» quedan como «Bogotá».
2. **Nulos en Ciudad**: con la columna `Ciudad` seleccionada → **Reemplazar
   valores** → reemplaza valores en blanco/`null` por `Sin dato`.

### 2.3 Resto de tablas
- Revisa que `Productos`, `Tiendas` y `Calendario` tengan tipos correctos
  (precios y números como numéricos; `Fecha` como Fecha).

### 2.4 Cargar
- **Inicio → Cerrar y aplicar**. Power BI carga las tablas ya limpias.

---

## 3. Crear relaciones (esquema en estrella)

1. Ve a la **vista Modelo** (icono izquierdo).
2. Verifica o crea (arrastrando una clave sobre otra) estas relaciones
   **uno a varios (1:\*)** con **dirección de filtro única**:

   | Desde (lado 1) | Hacia (lado \*) |
   |---|---|
   | `Clientes[ID_Cliente]` | `Ventas[ID_Cliente]` |
   | `Productos[ID_Producto]` | `Ventas[ID_Producto]` |
   | `Tiendas[ID_Tienda]` | `Ventas[ID_Tienda]` |
   | `Calendario[Fecha]` | `Ventas[Fecha]` |

3. El diagrama debe verse como una **estrella**: `Ventas` al centro y las cuatro
   dimensiones alrededor.

---

## 4. Marcar la tabla de fechas

1. Selecciona la tabla `Calendario` en el panel **Datos**.
2. **Herramientas de tabla → Marcar como tabla de fechas** → columna **Fecha**.

Indispensable para las medidas de inteligencia de tiempo (comparación anual).

---

## 5. Crear las jerarquías

Clic derecho sobre la columna de mayor nivel → **Crear jerarquía**, y arrastra
las demás dentro:

- **Tiempo** (en `Calendario`): `Anio` → `Trimestre` → `Nombre_Mes`.
  (Para ordenar los meses: selecciona `Nombre_Mes` → **Ordenar por columna** → `Mes`.)
- **Geografía** (en `Tiendas`): `Region` → `Ciudad` → `Tienda`.
- **Producto** (en `Productos`): `Categoria` → `Marca` → `Producto`.

---

## 6. Crear las medidas (DAX)

Selecciona la tabla `Ventas` → **Herramientas de tabla → Nueva medida**. Crea
una por una:

```DAX
Ingresos Totales = SUM ( Ventas[Importe_Venta] )
```
```DAX
Unidades Vendidas = SUM ( Ventas[Unidades] )
```
```DAX
Ticket Promedio = DIVIDE ( [Ingresos Totales], [Unidades Vendidas] )
```
```DAX
Venta Promedio por Transaccion =
DIVIDE ( [Ingresos Totales], DISTINCTCOUNT ( Ventas[ID_Venta] ) )
```
```DAX
Costo Total = SUM ( Ventas[Costo] )
```
```DAX
Margen = [Ingresos Totales] - [Costo Total]
```
```DAX
Margen % = DIVIDE ( [Margen], [Ingresos Totales] )
```
```DAX
Clientes Unicos = DISTINCTCOUNT ( Ventas[ID_Cliente] )
```
```DAX
Ingresos Ano Anterior =
CALCULATE ( [Ingresos Totales], SAMEPERIODLASTYEAR ( Calendario[Fecha] ) )
```
```DAX
Crecimiento % YoY =
DIVIDE ( [Ingresos Totales] - [Ingresos Ano Anterior], [Ingresos Ano Anterior] )
```
```DAX
% Participacion Categoria =
DIVIDE ( [Ingresos Totales], CALCULATE ( [Ingresos Totales], ALL ( Productos[Categoria] ) ) )
```
```DAX
Ranking Producto =
RANKX ( ALL ( Productos[Producto] ), [Ingresos Totales], , DESC )
```

**Formato**: a las medidas monetarias (`Ingresos Totales`, `Margen`, `Ticket
Promedio`, etc.) dales formato **Moneda**; a las de porcentaje (`Margen %`,
`Crecimiento % YoY`, `% Participacion Categoria`) formato **Porcentaje** con
1–2 decimales.

---

## 7. Construir el dashboard (vista Informe)

Arma **una sola página** llamada *Dashboard de ventas*, organizada así:

### Fila superior — Tarjetas KPI
Inserta cuatro/cinco **Tarjetas**: `Ingresos Totales`, `Margen`,
`Unidades Vendidas`, `Clientes Unicos` y `Venta Promedio por Transaccion`.
> Captura → **Figura 1** del reporte.

### Centro-izquierda — Barras por categoría
**Gráfico de barras**: Eje Y = `Categoria`; Eje X = `Ingresos Totales`;
ordenado de mayor a menor.
> Captura → **Figura 2**.

### Centro-derecha — Mapa por geografía
**Mapa**: Ubicación = `Ciudad`; Tamaño de la burbuja = `Ingresos Totales`.
> Captura → **Figura 3**.

### Inferior-izquierda — Circular por segmento
**Gráfico circular o de anillo**: Leyenda = `Segmento`; Valores =
`Ingresos Totales`.
> Captura → **Figura 4**.

### Inferior-centro — Líneas en el tiempo
**Gráfico de líneas**: Eje = jerarquía **Tiempo**; Valores = `Ingresos Totales`
e `Ingresos Ano Anterior`.
> Captura → **Figura 5**.

### Inferior-derecha — Top productos
**Tabla** con `Producto`, `Ingresos Totales` y `Ranking Producto`; aplica un
filtro visual **Top N = 5** por `Ingresos Totales`.
> Captura → **Figura 6**.

---

## 8. Interactividad

- Agrega **Segmentaciones de datos** (slicers): `Anio`, `Region` y `Segmento`.
- Comprueba el **filtrado cruzado**: al hacer clic en una categoría, el resto de
  visualizaciones se actualiza.
- Activa el **drill-down** en el mapa y las líneas (botón de la flecha hacia
  abajo) para bajar de región a ciudad y de año a mes.
- Aplica un **tema** coherente (**Vista → Temas**) y pon títulos claros a cada
  visual.

---

## 9. Guardar y preparar la entrega

1. **Archivo → Guardar como** → `ModaAndina.pbix` en esta carpeta.
2. Toma las **6 capturas** indicadas (Figuras 1–6) y, opcionalmente, una de la
   **vista Modelo** (para evidenciar el esquema en estrella).
3. Abre `Reporte_Rendimiento_Ventas_Alejandro_Arenas.docx` y **reemplaza cada
   marcador rojo** `[ Insertar aquí: ... ]` por la captura correspondiente.
4. Completa el **nombre del docente** en la portada.
5. Sube `ModaAndina.pbix` y las capturas a una carpeta de **Google Drive sin
   restricciones de acceso** y, si tu actividad lo pide, pega el enlace en el
   Word.
6. Carga el documento de Word en la plataforma.

---

## Checklist final

- [ ] 5 tablas importadas (Ventas desde Excel; 4 dimensiones desde CSV).
- [ ] Limpieza aplicada: duplicados, nulos, filtro importe > 0, texto normalizado.
- [ ] Relaciones en estrella (1:\*, dirección única).
- [ ] `Calendario` marcada como tabla de fechas.
- [ ] 3 jerarquías creadas (Tiempo, Geografía, Producto).
- [ ] 12 medidas DAX creadas y con formato.
- [ ] Dashboard con ≥ 3 tipos de visualización + tarjetas + tabla.
- [ ] Segmentaciones, filtrado cruzado y drill-down funcionando.
- [ ] 6 capturas insertadas en el Word y docente completado.
- [ ] `.pbix` y capturas subidas a Drive; Word listo para entregar.

# PagoSimple - Contrato técnico de integración

## Propósito

Este documento resume el contrato que el backend consume hoy desde PagoSimple para consultar seguridad social (EPS y AFP) vía BDUA/RUAF.

## Flujo actual

1. Hacer login en PagoSimple.
2. Obtener token.
3. Consultar BDUA/RUAF con el documento del tercero.
4. Mapear EPS, AFP, fechas y régimen.
5. Si falla, devolver vacío y no romper el onboarding.

## Base URL

La implementación actual usa una URL configurable por propiedad:

```text
{base-url}
```

En el código actual la ruta base apunta al entorno de reportes de PagoSimple.

## Endpoint 1: login

### Request

```http
POST {base-url}/auth/login
Content-Type: application/json
```

### Body

```json
{
  "document_type": "CC",
  "document": "15436453",
  "password": "9753",
  "nit": "800167494",
  "company": "...",
  "secret_key": "..."
}
```

### Response esperada

```json
{
  "success": true,
  "code": 200,
  "data": {
    "session_token": "...",
    "token": "..."
  },
  "message": "...",
  "description": "..."
}
```

## Endpoint 2: consulta BDUA/RUAF

### Request

```http
POST {base-url}/bdua-ruaf/data
Content-Type: application/json
nit: 800167494
token: <token-obtenido-en-login>
```

### Body

```json
{
  "document_type": "CC",
  "document": "15436453"
}
```

### Response esperada

```json
{
  "success": true,
  "code": 200,
  "data": [
    {
      "affiliate_type": "C",
      "document_type": "CC",
      "document": "15436453",
      "first_last_name": "...",
      "second_last_name": "...",
      "first_name": "...",
      "second_name": "...",
      "bdua_eps_code": "...",
      "bdua_administrator_nit": "...",
      "bdua_administrator_name": "...",
      "bdua_affiliate_date": "yyyyMMdd",
      "ruaf_afp_code": "...",
      "ruaf_administrator_nit": "...",
      "ruaf_administrator_name": "...",
      "ruaf_affiliate_date": "yyyyMMdd",
      "is_pensionary": "..."
    }
  ],
  "message": "...",
  "description": "..."
}
```

## Campos que usa el backend

El backend consume:

- `data[0].bdua_administrator_name`
- `data[0].bdua_affiliate_date`
- `data[0].ruaf_administrator_name`
- `data[0].ruaf_affiliate_date`
- `data[0].affiliate_type`

## Reglas de transformación

- Normalizar `document_type` antes de consultar.
- Aceptar fechas en:
  - `yyyyMMdd`
  - `yyyy-MM-dd`
- Si la respuesta viene vacía, retornar `Optional.empty()` o equivalente.
- Si el proveedor falla, el onboarding no debe romperse.

## Reglas funcionales

- Si el frontend ya trae EPS o AFP, respetar esos valores.
- Si faltan EPS o AFP, completar con PagoSimple.
- Las fechas y el régimen deben preferirse desde PagoSimple cuando existan.

## Buenas prácticas para la migración a NestJS

- Extraer PagoSimple a un módulo propio.
- No hardcodear secretos.
- Usar timeout y retry.
- Guardar trazabilidad de origen.
- Agregar tests con mocks de login y BDUA/RUAF.


# Sistema de Login - Portal Transaccional

> Documentación extraída del proyecto `portaltransaccional` para referencia en MFContratistas.

---

## Tabla de Contenidos

1. [Endpoints](#1-endpoints)
2. [DTOs e Interfaces](#2-dtos-e-interfaces)
3. [Componentes / Pantallas](#3-componentes--pantallas)
4. [Servicios, Guards e Interceptores](#4-servicios-guards-e-interceptores)
5. [Estado y Almacenamiento](#5-estado-y-almacenamiento)
6. [Rutas](#6-rutas)
7. [Variables de Entorno](#7-variables-de-entorno)
8. [Encriptación y Seguridad](#8-encriptación-y-seguridad)
9. [Flujo Completo](#9-flujo-completo)
10. [Mapa de Archivos Clave](#10-mapa-de-archivos-clave)

---

## 1. Endpoints

Todos los endpoints de auth usan `environment.base_Url_login` como base.

### 1.1 Login

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `auth/login/token` | Autenticación principal. Retorna JWT. |

**Request body:**
```json
{
  "userLogin": "string",
  "userPassword": "string"
}
```

**Response:**
```json
{
  "token": "JWT_STRING"
}
```

---

### 1.2 Recuperación de Contraseña

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `auth/login/email-reset-password` | Envía OTP al email del usuario |
| POST | `auth/login/user-email-code` | Valida el código OTP (6 dígitos) |
| POST | `auth/login/save-user-pass` | Guarda la nueva contraseña |

**`email-reset-password` body:**
```json
{ "email": "string" }
```

**`user-email-code` body:**
```json
{ "otp": "string (6 dígitos)", "email": "string" }
```

**`save-user-pass` body:**
```json
{ "email": "string", "newPassword": "string" }
```

---

### 1.3 Registro de Usuarios

Base URL: `environment.base_Url_modulos`

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `terceros/api/v1/registrar-usuarios-sicofconfig/bulk` | Crea uno o múltiples usuarios |
| GET | `auth/login/search/subsidiary?company={companyId}` | Lista subsidiarias por empresa |
| GET | `modulos-opciones/api/v1/permisos/listar-roles?subsidiaryId={id}` | Lista roles disponibles |
| GET | `modulos-opciones/api/v1/permisos/apps-por-subsidiaria?subsidiaryId={id}` | Lista apps por subsidiaria |

---

## 2. DTOs e Interfaces

**Archivo fuente:** `src/app/auth/interface/login.interface.ts`

### LoginData (Request)
```typescript
export interface LoginData {
  userLogin:    string;
  userPassword: string;
}
```

### LoginResponse
```typescript
export interface LoginResponse {
  token: string;
}
```

### UserLogin (JWT Payload decodificado)
```typescript
export interface UserLogin {
  userData:      UserData;
  ConnectDbInfo: ConnectDbInfo[];
  CompanyInfo:   CompanyInfo[];
  sub:           string;
  iat:           number;
  exp:           number;
}
```

### UserData
```typescript
export interface UserData {
  userId:                 number;
  addressUser:            string;
  userIdentification:     string;
  userTypeIdentification: number;
  userCellular:           string;
  userEmail:              string;
  userFirstname:          string;
  userLastname:           string;
  userLogin:              string;
  status:                 string;
  userType:               string;
  firstLogin:             number;
}
```

### ConnectDbInfo
```typescript
export interface ConnectDbInfo {
  connectCode:    string;
  status:         string;
  connectContext: string;
  connectDbId:    number;
  companyId:      number;
  subsidiaryId:   number;
}
```

### CompanyInfo
```typescript
export interface CompanyInfo {
  companyId:    number;
  companyName:  string;
  multiCompany?: MultiCompany[];
}

export interface MultiCompany {
  subsidiaryCode: string;
  subsidiaryId:   number;
  subsidiaryName: string;
}
```

---

**Archivo fuente:** `src/app/auth/interface/cambioContrasenia.interface.ts`

### Recuperación de Contraseña
```typescript
export interface MensajeCambioContrasenia {
  msg:   string;
  email: string;
}

export interface EmailResetPassword {
  email: string;
}

export interface ValidateCode {
  otp:   string;
  email: string;
}

export interface SavePassword {
  email:       string;
  newPassword: string;
}
```

---

**Archivo fuente:** `src/app/auth/interface/RegisterForm.interfaces.ts`

### Registro de Usuarios
```typescript
export interface RegisterForm {
  tipoDocumento?: string | number;
  cedula:         string;
  celular?:       string;
  apellidoUno?:   string;
  apellidoDos?:   string;
  nombreUno?:     string;
  nombreDos?:     string;
  direccion?:     string;
  email?:         string;
  companyId?:     number;
  userPassword?:  string;
  appDesc?:       string;
  subsidiaryId?:  number;
  userType?:      number;
}

export interface BulkRegisterFormRequest {
  companyId:    number;
  subsidiaryId: number;
  appDesc:      string;
  userType?:    number;
  users:        RegisterForm[];
}

export interface SubsidiaryInfo {
  subsidiaryCode: string;
  subsidiaryId:   number;
  subsidiaryName: string;
}
```

---

**Archivo fuente:** `src/app/auth/interface/respuetaRegistro.interfaces.ts`

### Respuesta de Registro
```typescript
export interface RespuestaRegistroItem {
  index?:      number;
  cedula?:     string;
  success:     boolean;
  statusCode?: number;
  message?:    string;
  result?: {
    cedula?:        string;
    msg?:           string;
    userId?:        number;
    username?:      string;
    companyId?:     number;
    subsidiaryId?:  number;
    identification?: number;
    appDesc?:       string;
    tipoDocumento?: number;
    nitsd?:         number;
    nombre1?:       string;
    nombre2?:       string;
    apellido1?:     string;
    apellido2?:     string;
    email?:         string;
    direccion?:     string;
    telefono?:      string;
    celular?:       string;
    estado?:        string;
  };
}

export interface RespuestaRegistro {
  total?:        number;
  successCount?: number;
  failureCount?: number;
  msg?:          string;
  results?:      RespuestaRegistroItem[];
}

export interface RegistroBackendError {
  status?:     string;
  statusCode?: number;
  message?:    string;
  msg?:        string;
  error?:      string;
  errors?:     string[];
  solutions?:  string[];
  logProcess?: string;
  requestId?:  string;
  timestamp?:  string;
  path?:       string;
}
```

---

## 3. Componentes / Pantallas

### 3.1 LoginComponent

**Ruta:** `src/app/auth/components/login/`

**Campos del formulario:**

| Campo | Tipo | Descripción | Requerido |
|-------|------|-------------|-----------|
| `user` | text | Usuario o cédula | Sí |
| `password` | password | Contraseña | Sí |
| `rememberUser` | checkbox | Guardar usuario en localStorage | No (default: true) |
| `selectedCompany` | dropdown | Empresa (solo si multi-empresa) | Condicional |
| `connectCode` | dropdown | Subsidiaria (solo si multi-subsidiaria) | Condicional |

**Acciones / Botones:**

- **Ingresar** — Ejecuta `login()` si el formulario es válido
- **Cancelar** — Reinicia formulario para elegir otra empresa
- **Olvidé mi contraseña** — Abre modal `RecuperarContrasenaComponent`
- **Crear cuenta** — Navega a `/auth/registro`

**Lógica de empresa/subsidiaria:**
- 1 empresa + 1 subsidiaria → navega directo a `/dashboard/portal`
- 1 empresa + N subsidiarias → muestra selector de subsidiaria
- N empresas → muestra selector de empresa → luego subsidiaria si aplica

---

### 3.2 RecuperarContrasenaComponent (Modal)

**Ruta:** `src/app/auth/components/recuperar-contrasena/`

**Campos:**

| Campo | Tipo | Validación |
|-------|------|-----------|
| `email` | email | Formato válido (regex), requerido |

**Flujo:** POST a `auth/login/email-reset-password` → navega a `/auth/cambioContrasenia/{email_encriptado}`.

---

### 3.3 CambioContrasenaComponent

**Ruta:** `src/app/auth/components/cambio-contrasena/`

**Campos:**

| Campo | Tipo | Condición | Validación |
|-------|------|-----------|-----------|
| `codigo` | text (maxlength=6) | Siempre visible | 6 dígitos, requerido |
| `nuevaContrasenia` | password | Solo si código válido | Requerido |
| `confirmarContrasenia` | password | Solo si código válido | Debe coincidir con nueva |

**Acciones:**
- **Reenviar correo** — Reenvía OTP al email
- **Enviar** — Guarda nueva contraseña (si código es válido)
- **Cancelar** — Vuelve a `/auth`

---

### 3.4 RegistroComponent

**Ruta:** `src/app/auth/components/registro/`

El formulario está dividido en tres secciones:

**Sección 1 — Datos Personales:**

| Campo | Tipo | Validación |
|-------|------|-----------|
| `nombre` | text | Requerido |
| `apellidos` | text | Requerido |
| `tipoDocumento` | dropdown | Requerido (CC, CE, NIT, etc.) |
| `numeroDocumento` | text (solo números) | Requerido; se auto-asigna como `userLogin` |
| `direccion` | text | Opcional |
| `subsidiary` | dropdown | Requerido |
| `appDesc` | multi-select | Requerido |
| `userType` | dropdown (roles) | Requerido |

**Sección 2 — Información de Contacto:**

| Campo | Tipo | Validación |
|-------|------|-----------|
| `telefono` | text (solo números) | Opcional |
| `email` | email | Formato válido |
| `confirmarEmail` | email | Debe coincidir |

**Sección 3 — Credenciales:**

| Campo | Tipo | Validación |
|-------|------|-----------|
| `login` | text (deshabilitado) | Auto-asignado desde `numeroDocumento` |
| `password` | password | Requerido |
| `confirmarPassword` | password | Debe coincidir |

---

## 4. Servicios, Guards e Interceptores

### 4.1 UserService

**Archivo:** `src/app/auth/services/user.service.ts`

```typescript
login(userData: LoginData): Observable<LoginResponse>
// POST auth/login/token
// Encripta y guarda JWT en sessionStorage['x-token']

validarToken(): boolean
// Lee sessionStorage['x-token']
// Si no existe → redirige a /auth y retorna false
// Si existe → retorna true

decodeToken(): void
// Decodifica JWT manualmente (sin librerías)
// Guarda datos en UserDataService

decodeJWT(token: string): any
// Base64 decode del payload del JWT
// Reemplaza caracteres URL-safe (-, _)
```

---

### 4.2 RecuperarContrasenaService

**Archivo:** `src/app/auth/services/recuperar-contrasena.service.ts`

```typescript
emailResetPassword(emailUser: EmailResetPassword): Observable<any>
validateCode(code: ValidateCode): Observable<any>
savePassword(password: SavePassword): Observable<any>
```

---

### 4.3 RegistrarUsuarioService

**Archivo:** `src/app/auth/services/registrar-usuario.service.ts`

```typescript
crearUsuario(payload: BulkRegisterFormRequest): Observable<RespuestaRegistro>
obtenerSubsidiary(company: number): Observable<SubsidiaryInfo[]>
obtenerRoles(subsidiaryId: number): Observable<ApiResponse<listaRoles[]>>
obtenerAppsPorSubsidiaria(subsidiaryId: number): Observable<ApiResponse<AppsPorSubsidiariaResponse>>
```

---

### 4.4 AuthGuard

**Archivo:** `src/app/core/guard/auth.guard.ts`

```typescript
@Injectable({ providedIn: 'root' })
export class AuthGuard {
  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
    return this.usuarioServices.validarToken();
  }
}
```

Protege todas las rutas bajo `/dashboard`.

---

### 4.5 HeaderInterceptor

**Archivo:** `src/app/core/interceptors/header.interceptor.ts`

Intercepta **todas** las peticiones HTTP y agrega:

| Header | Valor | Condición |
|--------|-------|-----------|
| `token` | `connectionToken` o environment token | Siempre |
| `login` | `userIdentification` (NIT/cédula) | Si hay connectionToken |
| `codigoMempresa` | `'9999999999'` (fijo) | Si hay connectionToken |
| `Content-Type` | `'application/json'` | Si no es FormData |

**Rutas excluidas del interceptor** (no se agrega token):
```
/auth/login/token
auth/login/email-reset-password
/auth/login/user-email-code
auth/login/save-user-pass
/auth/login/complete/register
consultaNomina/V1/tipodocumento
SITU
```

---

### 4.6 SessionStorageService

**Archivo:** `src/app/services/core/session-storage.service.ts`

```typescript
// Tokens
obtenerToken(): string                     // Obtiene JWT desencriptado de 'x-token'
obtenerConnectionToken(): string           // Obtiene token de BD de 'db-token'
getEnvToken<T = any>(): T | null           // Obtiene token de 'token-env'
parseTokenConnection(token: string): string[]

// Datos de sesión
setSessionStorage(key: string, value: any): void
guardarSubsidiaria(id: number): void
obtenerSubsidiaria(): number
setUserId(id: number): void
GetUserId(): number

// LocalStorage
setLocalStorage(key: string, value: any): void  // Guarda usuario (si recuérdame)
obtenerUsuarioLocalStorage(): string
```

---

### 4.7 UserDataService

**Archivo:** `src/app/services/usuario/user-data.service.ts`

Gestiona datos del usuario en memoria usando `BehaviorSubject`:

```typescript
setUserData(user: UserLogin): void
setCodigoTercero(codigo: number): void
getFullDataUser(): UserLogin
getUserData(): UserData
getCompanies(): CompanyInfo[]
getSelectedCompany(): CompanyInfo
getInfoConnection(): ConnectDbInfo[]
setConnectDBInfo(connectDB: ConnectDbInfo): void   // Emite a BehaviorSubject
getConnectDBInfo(): ConnectDbInfo
getAllConnectDBInfo(): ConnectDbInfo[]
```

---

## 5. Estado y Almacenamiento

El proyecto **no usa Redux/NgRx/Zustand**. Usa `SessionStorage`, `LocalStorage` y `BehaviorSubject`.

### SessionStorage (por clave)

| Clave | Contenido | Encriptado |
|-------|-----------|-----------|
| `x-token` | JWT principal | Sí |
| `db-token` | Token de conexión a BD | Sí |
| `company` | ID de empresa seleccionada | Sí |
| `roles` | Roles del usuario | Sí |
| `subsidiary` | ID de subsidiaria | No |
| `userId` | ID del usuario | No |
| `envConfig` | Configuración de environment (Base64) | No |
| `token-env` | Token de environment | No |
| `module-route` | Ruta del módulo actual | No |
| `module-id` | ID del módulo | No |

### LocalStorage (por clave)

| Clave | Contenido | Cuándo |
|-------|-----------|--------|
| `user` | Nombre de usuario | Si "Recuérdame" está marcado |

---

## 6. Rutas

### App Routes (`src/app/app.routes.ts`)
```typescript
{ path: '',      loadChildren: () => authRoutes }
{ path: 'auth',  loadChildren: () => authRoutes }
{ path: '',      loadChildren: () => pagesRoutes }
{ path: '**',    redirectTo: 'dashboard', pathMatch: 'full' }
```

### Auth Routes (`src/app/auth/auth.routing.ts`)

| Path | Componente |
|------|-----------|
| `` (vacío) | `LoginComponent` |
| `cambioContrasenia/:email` | `CambioContrasenaComponent` |
| `registro` | `RegistroComponent` |

### Pages Routes — rutas protegidas (`src/app/pages/pages.routing.ts`)

| Path | Componente | Guard |
|------|-----------|-------|
| `dashboard` | `DashboardComponent` | `AuthGuard` |
| `dashboard` (child) | `MenuUsuarioComponent` | — |
| `dashboard/actualizar-contrasena` | `ActualizarContrasenaComponent` | — |

---

## 7. Variables de Entorno

### Production (`environment.prod.ts`)
```typescript
base_Url:               'https://adaservicios.adacsc.co/'
base_Url_modulos:       'https://ecosystem-gateway-prod.adacsc.co/'
base_Url_login:         'https://ecosystem-gateway-prod.adacsc.co/'
NotificacionMngr:       'https://ecosystem-gateway-prod.adacsc.co/'
base_url_contratistas:  'https://ecosystem-gateway-prod.adacsc.co/'
base_url_rentas:        'https://corantioquiarentas.adacsc.co/'
base_url_correos:       'https://factory-ws-utilities17.adacsc.co/'
base_url_epayco:        'https://apify.epayco.co/'
base_Url_RptTransaccion:'https://ada_servicios.adacsc.co/portal/'
token:                  'prod'
```

### Development (`environment.dev.ts`)
```typescript
base_Url_login:         'https://ecosystem-gateway-dev.adacsc.co/'
base_Url_modulos:       'https://ecosystem-gateway-dev.adacsc.co/'
base_url_contratistas:  'https://ecosystem-gateway-dev.adacsc.co/'
token:                  'dev'
```

### QA (`environment.qa.ts`)
```typescript
base_Url_login:         'https://ecosystem-gateway-qa.adacsc.co/'
base_Url_modulos:       'https://ecosystem-gateway-qa.adacsc.co/'
base_url_contratistas:  'https://ecosystem-gateway-qa.adacsc.co/'
token:                  'qa'
```

### Consultoría (`environment.con.ts`)
```typescript
base_Url_login:         'https://services-consultoria.adacsc.co/'
base_Url_modulos:       'https://ecosystem-gateway-dev.adacsc.co/'
base_url_contratistas:  'https://ecosystem-gateway-qa.adacsc.co/'
```

---

## 8. Encriptación y Seguridad

### Encriptación de datos en storage
- Implementada en `UtilityService` (encriptación personalizada)
- Se aplica a: `x-token`, `db-token`, `company`, `roles`
- El interceptor desencripta automáticamente antes de usar los headers

### Decodificación JWT (sin librerías externas)
```
1. Tomar la parte [1] del JWT (separado por puntos)
2. Reemplazar caracteres URL-safe: '-' → '+' y '_' → '/'
3. Decodificar Base64
4. JSON.parse del resultado
```

### Headers de seguridad por petición
```
token:          {connectionToken}
login:          {userIdentification}  (NIT o cédula)
codigoMempresa: '9999999999'          (valor fijo)
Content-Type:   'application/json'
```

---

## 9. Flujo Completo

### Flujo 1 — Login Simple (1 empresa, 1 subsidiaria)

```
/auth → LoginComponent
  │
  ├─ [localStorage] Recupera usuario guardado si "Recuérdame"
  │
  ├─ Usuario llena credenciales → clic "Ingresar"
  │
  ├─ POST auth/login/token → { token: JWT }
  │
  ├─ Encripta JWT → sessionStorage['x-token']
  │
  ├─ Decodifica JWT → extrae UserData, CompanyInfo, ConnectDbInfo
  │
  ├─ 1 empresa + 1 subsidiaria → guarda 'db-token' y 'company'
  │
  └─ Navega a /dashboard/portal
       └─ AuthGuard valida 'x-token' en cada navegación
          └─ HeaderInterceptor agrega headers en cada request
```

---

### Flujo 2 — Login Multi-Empresa / Multi-Subsidiaria

```
/auth → LoginComponent
  │
  ├─ POST auth/login/token → JWT con múltiples CompanyInfo
  │
  ├─ Deshabilita inputs de usuario/contraseña
  │
  ├─ Muestra dropdown de empresas
  │    └─ Usuario selecciona empresa
  │         ├─ 1 subsidiaria → navega a /dashboard/portal
  │         └─ N subsidiarias → muestra dropdown de subsidiarias
  │                              └─ Usuario selecciona → navega a /dashboard/portal
  └─ Guarda 'db-token', 'company', 'subsidiary' en sessionStorage
```

---

### Flujo 3 — Recuperación de Contraseña

```
Login → "Olvidé mi contraseña" → Modal RecuperarContrasenaComponent
  │
  ├─ Usuario ingresa email → POST auth/login/email-reset-password
  │
  └─ Navega a /auth/cambioContrasenia/{email_encriptado}
       └─ CambioContrasenaComponent
            │
            ├─ Ingresa OTP (6 dígitos) → POST auth/login/user-email-code
            │    └─ Si válido → habilita campos de contraseña
            │
            ├─ Ingresa nueva contraseña + confirmación
            │
            └─ POST auth/login/save-user-pass → navega a /auth
```

---

### Flujo 4 — Registro de Usuario

```
Login → "Crear cuenta" → /auth/registro (con param envConfig)
  │
  ├─ GET auth/login/search/subsidiary?company={id}
  │    └─ Si 1 subsidiaria → auto-asigna
  │
  ├─ Al seleccionar subsidiaria:
  │    ├─ GET modulos-opciones/.../apps-por-subsidiaria
  │    └─ GET modulos-opciones/.../listar-roles
  │
  ├─ Usuario llena 3 secciones del formulario
  │
  ├─ POST terceros/api/v1/registrar-usuarios-sicofconfig/bulk
  │
  └─ Navega a /auth (login)
```

---

## 10. Mapa de Archivos Clave

| Archivo | Ruta en portaltransaccional | Propósito |
|---------|---------------------------|-----------|
| `login.component.ts` | `src/app/auth/components/login/` | Lógica principal de login y selección empresa/subsidiaria |
| `user.service.ts` | `src/app/auth/services/` | Login HTTP, decodificación JWT, validación de token |
| `auth.guard.ts` | `src/app/core/guard/` | Protección de rutas (canActivate) |
| `header.interceptor.ts` | `src/app/core/interceptors/` | Inyección automática de headers en cada request |
| `session-storage.service.ts` | `src/app/services/core/` | Abstracción sobre sessionStorage y localStorage |
| `user-data.service.ts` | `src/app/services/usuario/` | Estado reactivo del usuario (BehaviorSubject) |
| `recuperar-contrasena.service.ts` | `src/app/auth/services/` | Llamadas HTTP para recuperación de contraseña |
| `registrar-usuario.service.ts` | `src/app/auth/services/` | Registro de usuarios y carga de catálogos |
| `login.interface.ts` | `src/app/auth/interface/` | DTOs de login, UserData, CompanyInfo, ConnectDbInfo |
| `cambioContrasenia.interface.ts` | `src/app/auth/interface/` | DTOs para recuperación de contraseña |
| `RegisterForm.interfaces.ts` | `src/app/auth/interface/` | DTOs para registro de usuarios |
| `respuetaRegistro.interfaces.ts` | `src/app/auth/interface/` | Interfaces de respuesta del registro |
| `auth.routing.ts` | `src/app/auth/` | Rutas públicas de autenticación |
| `app.routes.ts` | `src/app/` | Rutas raíz de la aplicación |
| `environment.*.ts` | `src/environments/` | URLs base por ambiente (prod, dev, qa, con) |
| `constant.ts` | `src/environments/` | URLs excluidas del interceptor de encriptación |

# Endpoints — Huellitas Solidarias API

Guía completa de endpoints reales del backend, pensada para conectar un frontend en React (Axios o Fetch). Ver también [`FRONTEND_INTEGRATION_EXAMPLE.ts`](./FRONTEND_INTEGRATION_EXAMPLE.ts) y [`../openapi.yaml`](../openapi.yaml).

## Convenciones generales

- **Base URL**: sin prefijo de versión — las rutas cuelgan directamente de la raíz (`http://localhost:3000/mascotas`, no `/api/v1/mascotas`). Esto refleja el código real; se documenta como decisión deliberada para no romper el frontend existente.
- **Autenticación**: header `Authorization: Bearer <token>` (JWT, expira según `JWT_EXPIRES_IN`, default `8h`).
- **Paginación**: query params `page` (default 1), `limit` (default 10, máx. 100). Respuesta: `{ success, data, pagination: { page, limit, total, totalPages, hasNextPage, hasPreviousPage } }`.
- **Ordenamiento**: `sortBy` + `sortOrder` (`asc`/`desc`), siempre contra una lista blanca de columnas por endpoint (ver tablas abajo).
- **Errores**: `{ success: false, code, error, message, errorCode, details? }`. `code` es el status HTTP (compatibilidad histórica); `errorCode` es el código de dominio (`RESOURCE_NOT_FOUND`, `VALIDATION_ERROR`, `DUPLICATE_ENTRY`, `FORBIDDEN`, etc.). Nunca se expone SQL, stack traces ni hashes.
- **Roles**: `usuario` (adoptante), `fundacion`, `admin`.

---

## 1. Auth (`/auth`)

| Método | Ruta | Auth | Roles | Body | Notas |
|---|---|---|---|---|---|
| POST | `/auth/register` | No | — | `{nombre, correo, password, cedula, telefono, direccion}` | Rol forzado a `usuario`. 409 si correo/cédula duplicados. |
| POST | `/auth/login` | No | — | `{correo, password}` | 401 credenciales inválidas, 403 cuenta suspendida. |
| PATCH | `/auth/password` | Sí | cualquiera | `{currentPassword, newPassword}` | Reemplaza al inseguro `reset-password` público (eliminado). 401 si la actual es incorrecta. |
| GET | `/auth/me` | Sí | cualquiera | — | Perfil propio. |
| PATCH | `/auth/perfil` | Sí | cualquiera | `{nombre?, telefono?, direccion?, cedula?}` | Actualización parcial. |
| GET | `/auth/usuarios` | Sí | admin | — | Paginado. Filtros: `rol`, `estado`, `search`. `sortBy`: `nombre`\|`fecha`\|`correo`. |
| PATCH | `/auth/usuarios/:correo/rol` | Sí | admin | `{rol}` | No permite auto-cambio de rol (el usuario no puede editarse a sí mismo por este medio salvo que sea admin). |
| PATCH | `/auth/usuarios/:correo/estado` | Sí | admin | `{estado: "Activo"\|"Suspendido"}` | Borrado lógico de cuenta (nunca DELETE físico). |

**Ejemplo de respuesta login (200):**
```json
{
  "token": "eyJhbGciOi...",
  "usuario": { "id": 1, "nombre": "...", "correo": "...", "rol": "usuario", "estado": "Activo" }
}
```

---

## 2. Mascotas (`/mascotas`)

| Método | Ruta | Auth | Roles | Notas |
|---|---|---|---|---|
| GET | `/mascotas/publicas` | No | — | Solo mascotas visibles (`oculto=0`, estado ≠ Eliminado). Paginado + filtros. |
| GET | `/mascotas/:id` | No | — | 404 si no existe/oculta/eliminada. |
| GET | `/mascotas` | Sí | cualquiera | Fundación ve solo las suyas (incluye ocultas/eliminadas para poder gestionarlas); resto ve el catálogo público. |
| POST | `/mascotas` | Sí | fundacion, admin | Crea; `organizacionId` se resuelve del token, nunca del body. |
| PATCH | `/mascotas/:id` | Sí | fundacion, admin | Fundación solo edita las propias (403 si no). |
| DELETE | `/mascotas/:id` | Sí | fundacion, admin | **Borrado lógico** (`estado=Eliminado`, `oculto=1`). Nunca físico: evita romper el historial de solicitudes. 204. |
| POST | `/mascotas/:id/tags` | Sí | fundacion, admin | `{tag}`. Evita duplicados. |
| DELETE | `/mascotas/:id/tags/:tagId` | Sí | fundacion, admin | — |
| POST | `/mascotas/:id/medios` | Sí | fundacion, admin | `{tipo?, contenido, esPrincipal?}`. Si `esPrincipal`, desmarca el anterior en una transacción. |
| DELETE | `/mascotas/:id/medios/:medioId` | Sí | fundacion, admin | — |

**Filtros de listado** (`GET /mascotas`, `/mascotas/publicas`): `page`, `limit`, `search` (nombre), `especie`, `raza`, `sexo`, `tamano`, `ciudad`, `estado`, `organizacionId`, `oculto`, `sortBy` (`nombre`\|`fecha`\|`ciudad`), `sortOrder`.

> Nota de esquema: el contrato ya existente usa nombres de catálogo en texto (`especie`, `raza`, `sexo`, `tamano`, `ciudad`) en vez de IDs numéricos — se mantiene así para no romper el frontend. Usa `/catalogos/*` para poblar selects con los valores válidos.

---

## 3. Solicitudes de adopción (`/solicitudes`)

| Método | Ruta | Auth | Roles | Notas |
|---|---|---|---|---|
| GET | `/solicitudes` | Sí | cualquiera | Admin ve todas, fundación las suyas, usuario las propias. Paginado + filtro `estado`. |
| GET | `/solicitudes/:id` | Sí | cualquiera | — |
| POST | `/solicitudes` | Sí | usuario | `{petId, form}`. Mascota debe estar `Disponible`; 1 solicitud activa por usuario/mascota. |
| PATCH | `/solicitudes/:id/estado` | Sí | fundacion, admin | `{estado, observaciones?, proximoPaso?}`. Máquina de estados: `revision→aprobada\|rechazada`, `aprobada→seguimiento\|rechazada`. Usa `SELECT ... FOR UPDATE` para evitar doble aprobación concurrente de la misma mascota. |
| POST | `/solicitudes/:id/seguimiento` | Sí | usuario | Solo si la solicitud está en estado `seguimiento` y el usuario es el adoptante. |
| POST | `/solicitudes/:id/evidencias` | Sí | admin, adoptante dueño | `{nombreArchivo, mimeType?, tamanioBytes?, contenido?}` |
| DELETE | `/solicitudes/:id/evidencias/:evidenciaId` | Sí | admin, adoptante dueño | — |

## 3b. Seguimientos de adopción (`/seguimientos-adopcion`)

| Método | Ruta | Auth | Roles | Notas |
|---|---|---|---|---|
| PATCH | `/seguimientos-adopcion/:id` | Sí | fundacion responsable, admin | `{comentario}` |
| DELETE | `/seguimientos-adopcion/:id` | Sí | — | **Siempre rechaza con 409**: los seguimientos son evidencia de la adopción y nunca se borran físicamente (decisión deliberada, ver informe). |
| POST | `/seguimientos-adopcion/:id/archivos` | Sí | fundacion, adoptante, admin | `{nombreArchivo}` |
| DELETE | `/seguimientos-adopcion/:id/archivos/:archivoId` | Sí | fundacion responsable, admin | Borra un archivo individual (no el seguimiento). |

---

## 4. Fundaciones (`/fundaciones`)

Este módulo mezcla dos conceptos por continuidad con el código real:
**(a)** el flujo de *solicitudes de registro* de una organización (equivalente a "solicitudes-organizacion" del enunciado) y
**(b)** el *perfil* de la organización ya aprobada (tabla `organizaciones`).

| Método | Ruta | Auth | Roles | Concepto | Notas |
|---|---|---|---|---|---|
| POST | `/fundaciones` | No | — | (a) registro | `{nombre, ruc, representante, correo, telefono, ciudad, descripcion, organizacion?, documento?}`. 409 si correo/RUC duplicados. |
| GET | `/fundaciones` | Sí | admin | (a) registro | Lista solicitudes, paginado + filtro `estado`. |
| GET | `/fundaciones/:id` | Sí | admin | (a) registro | Detalle de una solicitud. |
| PATCH | `/fundaciones/:id/estado` | Sí | admin | (a) registro | `{estado: "pendiente"\|"aprobada"\|"rechazada"}`. Al aprobar: crea usuario+perfil+organización en una transacción, genera contraseña temporal aleatoria (devuelta **una sola vez** en `temporaryPassword`, nunca logueada). No se puede aprobar/rechazar dos veces. |
| GET | `/fundaciones/me` | Sí | fundacion | (b) perfil | Perfil de la organización propia. |
| PATCH | `/fundaciones/me` | Sí | fundacion | (b) perfil | `{telefono?, ciudad?, descripcion?, direccion?}`. |
| DELETE | `/fundaciones/:id` | Sí | admin | (b) perfil | `:id` = id numérico de `organizaciones` (no el id de la solicitud). Borrado lógico (`activo=0`); 409 si tiene mascotas o solicitudes asociadas. |

---

## 5. Favoritos (`/favoritos`)

Solo rol `usuario`.

| Método | Ruta | Notas |
|---|---|---|
| GET | `/favoritos` | Lista mascotas favoritas visibles. |
| GET | `/favoritos/:mascotaId/verificar` | `{isFavorite}`. Alias: `GET /favoritos/:mascotaId` (compatibilidad). |
| POST | `/favoritos/:mascotaId` | Agrega (idempotente, `INSERT IGNORE`). |
| DELETE | `/favoritos/:mascotaId` | Quita. |
| POST | `/favoritos/:mascotaId/toggle` | Alterna (endpoint histórico, se mantiene). |

---

## 6. Mensajes (`/mensajes`)

| Método | Ruta | Auth | Roles | Notas |
|---|---|---|---|---|
| POST | `/mensajes` | No | — | Formulario de contacto público, con rate limit general. |
| GET | `/mensajes` | Sí | fundacion, admin | **Corrige un hueco de seguridad**: antes cualquier rol autenticado veía todos los mensajes; ahora solo admin (todos) o fundación (los propios). Paginado + filtro `leido`. |
| PATCH | `/mensajes/:id/leido` | Sí | fundacion, admin | Verifica que el mensaje pertenezca a la organización antes de marcarlo. |

---

## 7. Donaciones (`/donaciones`)

| Método | Ruta | Auth | Roles | Notas |
|---|---|---|---|---|
| POST | `/donaciones` | No | — | `{nombre, correo, tipo, cantidad, direccion}`. `cantidad` es texto libre (puede describir bienes, no solo montos). |
| GET | `/donaciones` | Sí | cualquiera | Admin ve todas; el resto solo las propias (por correo). Paginado + filtros `tipo`, `estado`. |
| PATCH | `/donaciones/:id/estado` | Sí | admin | `{estado: "Completado"\|"Pendiente"\|"Cancelado"}`. |
| DELETE | `/donaciones/:id` | Sí | admin | Cancelación lógica (`estado=Cancelado`), nunca borrado físico. 409 si ya está `Completado`. |

---

## 8. Catálogos (`/catalogos`) — solo lectura, público

`GET /catalogos/roles`, `/estados-cuenta`, `/especies`, `/razas` (+ `?especieId=`), `/sexos`, `/tamanos`, `/unidades-edad`, `/estados-mascota`, `/ciudades`, `/tags`, `/estados-solicitud-adopcion`, `/estados-solicitud-organizacion`, `/tipos-vivienda`, `/tipos-donacion`, `/estados-donacion`, `/tipos-medio`.

Todas devuelven `{success:true, data:[{id, codigo?, nombre}]}`, ordenadas por nombre.

---

## 9. Configuración del sitio (`/configuracion-sitio`)

| Método | Ruta | Auth | Roles |
|---|---|---|---|
| GET | `/configuracion-sitio` | No | — |
| PATCH | `/configuracion-sitio` | Sí | admin |

Registro único (`id=1`): `{correo, telefono, horario, direccion}`.

---

## 10. Salud (`/health`)

`GET /health` — público. Verifica conexión real a MySQL con `SELECT 1`. 200 si conectado, 503 si no.

---

## Códigos de error (`errorCode`)

| Código | HTTP | Significado |
|---|---|---|
| `VALIDATION_ERROR` | 422 | Zod rechazó el body/query/params. |
| `UNAUTHORIZED` | 401 | Token ausente/inválido/expirado. |
| `FORBIDDEN` | 403 | Rol insuficiente o no es dueño del recurso. |
| `RESOURCE_NOT_FOUND` | 404 | — |
| `CONFLICT` / específicos (`DUPLICATE_FAVORITE`, etc.) | 409 | Reglas de negocio (duplicados, transición inválida, evidencia protegida). |
| `DUPLICATE_ENTRY` | 409 | `ER_DUP_ENTRY` de MySQL no capturado por una regla de negocio explícita. |
| `INVALID_REFERENCE` | 400 | `ER_NO_REFERENCED_ROW_2` (FK apunta a algo inexistente). |
| `RESOURCE_IN_USE` | 409 | `ER_ROW_IS_REFERENCED_2` (intento de borrar algo referenciado). |
| `DATABASE_ERROR` / `INTERNAL_ERROR` | 500 | Error no clasificado; nunca expone SQL. |

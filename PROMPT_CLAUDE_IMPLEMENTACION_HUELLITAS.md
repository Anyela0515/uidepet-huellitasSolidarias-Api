# Implementación integral y profesional del backend — Huellitas Solidarias

## Contexto del proyecto

Este repositorio contiene el backend de **Huellitas Solidarias**, una plataforma para adopción responsable de mascotas, registro de fundaciones, seguimiento de adopciones, favoritos, mensajes y donaciones.

La aplicación utiliza:

- Node.js.
- Express.
- TypeScript.
- MySQL 8.
- Arquitectura por capas:
  - Routes.
  - Controllers.
  - Services.
  - Repositories.
  - Schemas.
- JWT para autenticación.
- Validación de datos.
- Middlewares de seguridad.
- Frontend separado que consumirá la API REST.

El objetivo de esta tarea es dejar el backend **completo, conectado a la base de datos, estable, seguro, probado y listo para integrarse con el frontend**.

No realices cambios superficiales ni generes archivos vacíos. Implementa funcionalidad real y comprobable.

---

# Objetivo general

Revisa todo el repositorio e implementa lo necesario para que la API quede lista para producción académica y para conectarse con el frontend.

La solución final debe incluir:

- Conexión funcional con MySQL.
- Arquitectura por capas completa.
- Repositories con consultas SQL reales.
- Services con reglas de negocio.
- Controllers correctamente tipados.
- Routes versionadas.
- Schemas de validación.
- Autenticación JWT.
- Autorización por roles.
- Paginación.
- Filtros.
- Ordenamiento seguro.
- Integridad referencial.
- Restricciones de base de datos.
- Borrado lógico donde corresponda.
- Transacciones.
- Manejo global de errores.
- Respuestas consistentes.
- Pruebas automatizadas.
- Documentación de endpoints.
- Archivo `.env.example`.
- Migraciones seguras.
- Seeds compatibles.
- Integración lista para el frontend.

---

# Regla principal

Antes de cambiar cualquier archivo:

1. Inspecciona toda la estructura del repositorio.
2. Revisa el contenido real de:
   - `package.json`
   - `src/index.ts`
   - `src/config/database.ts`
   - `src/controllers/`
   - `src/services/`
   - `src/repositories/`
   - `src/routes/`
   - `src/routers/`
   - `src/schemas/`
   - `src/middlewares/`
   - `src/types/`
   - `src/utils/`
   - `db/`
   - `.env.example`
   - `README.md`
3. Identifica qué módulos ya existen.
4. Completa o corrige los módulos existentes antes de crear duplicados.
5. No cambies nombres públicos usados por el frontend sin revisar todas sus referencias.
6. No inventes tablas ni columnas.
7. No elimines funcionalidad existente que ya sea correcta.
8. No dejes código simulado, TODO, mocks permanentes ni funciones sin implementar.
9. No afirmes que algo funciona sin ejecutarlo.
10. No modifiques `.env`.

---

# Esquema funcional esperado

La base de datos de Huellitas Solidarias incluye las siguientes tablas.

## Catálogos

- `roles`
- `estados_cuenta`
- `especies`
- `razas`
- `sexos`
- `tamanos`
- `unidades_edad`
- `estados_mascota`
- `ciudades`
- `tags`
- `estados_solicitud_adopcion`
- `estados_solicitud_organizacion`
- `tipos_vivienda`
- `tipos_donacion`
- `estados_donacion`
- `tipos_medio`

## Usuarios y organizaciones

- `usuarios`
- `perfiles_usuario`
- `organizaciones`
- `solicitudes_registro_organizacion`

## Mascotas

- `mascotas`
- `mascota_tag`
- `medios_mascota`

## Adopciones

- `solicitudes_adopcion`
- `formularios_adopcion`
- `evidencias_adopcion`
- `seguimientos_adopcion`
- `archivos_seguimiento`

## Otros módulos

- `favoritos`
- `mensajes`
- `donaciones`
- `configuracion_sitio`

Si el esquema real del repositorio difiere, utiliza el esquema real como fuente de verdad y documenta las diferencias.

---

# Arquitectura final esperada

Organiza la aplicación de forma similar a:

```text
src
│   index.ts
│
├── config
│   └── database.ts
│
├── controllers
│   ├── auth.controller.ts
│   ├── usuario.controller.ts
│   ├── fundacion.controller.ts
│   ├── solicitudOrganizacion.controller.ts
│   ├── mascota.controller.ts
│   ├── solicitudAdopcion.controller.ts
│   ├── seguimientoAdopcion.controller.ts
│   ├── favorito.controller.ts
│   ├── mensaje.controller.ts
│   ├── donacion.controller.ts
│   ├── catalogo.controller.ts
│   └── configuracionSitio.controller.ts
│
├── middlewares
│   ├── auth.ts
│   ├── requireRole.ts
│   ├── errorHandler.ts
│   ├── logger.ts
│   ├── rateLimiter.ts
│   └── validateSchema.ts
│
├── repositories
│   ├── usuario.repository.ts
│   ├── fundacion.repository.ts
│   ├── solicitudOrganizacion.repository.ts
│   ├── mascota.repository.ts
│   ├── solicitudAdopcion.repository.ts
│   ├── seguimientoAdopcion.repository.ts
│   ├── favorito.repository.ts
│   ├── mensaje.repository.ts
│   ├── donacion.repository.ts
│   ├── catalogo.repository.ts
│   └── configuracionSitio.repository.ts
│
├── routers
│   └── v1
│       ├── auth.routes.ts
│       ├── usuario.routes.ts
│       ├── fundacion.routes.ts
│       ├── solicitudOrganizacion.routes.ts
│       ├── mascota.routes.ts
│       ├── solicitudAdopcion.routes.ts
│       ├── seguimientoAdopcion.routes.ts
│       ├── favorito.routes.ts
│       ├── mensaje.routes.ts
│       ├── donacion.routes.ts
│       ├── catalogo.routes.ts
│       └── configuracionSitio.routes.ts
│
├── schemas
│   ├── auth.schema.ts
│   ├── usuario.schema.ts
│   ├── fundacion.schema.ts
│   ├── solicitudOrganizacion.schema.ts
│   ├── mascota.schema.ts
│   ├── solicitudAdopcion.schema.ts
│   ├── seguimientoAdopcion.schema.ts
│   ├── favorito.schema.ts
│   ├── mensaje.schema.ts
│   ├── donacion.schema.ts
│   ├── catalogo.schema.ts
│   ├── configuracionSitio.schema.ts
│   └── general.schema.ts
│
├── services
│   ├── auth.service.ts
│   ├── usuario.service.ts
│   ├── fundacion.service.ts
│   ├── solicitudOrganizacion.service.ts
│   ├── mascota.service.ts
│   ├── solicitudAdopcion.service.ts
│   ├── seguimientoAdopcion.service.ts
│   ├── favorito.service.ts
│   ├── mensaje.service.ts
│   ├── donacion.service.ts
│   ├── catalogo.service.ts
│   └── configuracionSitio.service.ts
│
├── types
│   ├── express.d.ts
│   ├── auth.types.ts
│   ├── usuario.types.ts
│   ├── mascota.types.ts
│   ├── solicitud.types.ts
│   └── frontend.ts
│
└── utils
    ├── asyncHandler.ts
    ├── dates.ts
    ├── edad.ts
    ├── ids.ts
    ├── mappers.ts
    ├── pagination.ts
    └── passwords.ts
```

No renombres carpetas o archivos existentes de manera innecesaria.

Si actualmente existe `routes/` en lugar de `routers/v1/`, puedes migrarlo de forma segura, actualizando todos los imports. No dejes ambas estructuras duplicadas.

---

# Capas obligatorias

Cada recurso funcional debe seguir este flujo:

```text
Route
  -> Controller
      -> Service
          -> Repository
              -> MySQL
```

## Routes

Responsabilidades:

- Definir métodos HTTP.
- Definir parámetros.
- Aplicar autenticación.
- Aplicar autorización.
- Aplicar validación.
- Aplicar rate limiting específico cuando corresponda.
- Llamar al controller.

No deben contener consultas SQL ni reglas de negocio.

## Controllers

Responsabilidades:

- Leer `params`, `query`, `body` y usuario autenticado.
- Llamar al service.
- Devolver códigos HTTP correctos.
- No ejecutar SQL.
- No implementar reglas de negocio complejas.
- Usar `asyncHandler` o manejo equivalente.

## Services

Responsabilidades:

- Implementar reglas de negocio.
- Verificar permisos.
- Coordinar múltiples repositories.
- Ejecutar transacciones.
- Lanzar errores de dominio.
- Evitar duplicados.
- Mantener consistencia de estados.

## Repositories

Responsabilidades:

- Ejecutar SQL parametrizado.
- Usar placeholders.
- Evitar interpolación insegura.
- Recibir opcionalmente una conexión transaccional.
- Mapear filas de base de datos.
- No devolver hashes de contraseña en listados.
- No decidir permisos del usuario.

## Schemas

Responsabilidades:

- Validar `body`.
- Validar `params`.
- Validar `query`.
- Convertir números cuando sea seguro.
- Limitar longitudes.
- Rechazar campos desconocidos cuando corresponda.
- No sustituir reglas de negocio que dependan de la base de datos.

---

# Módulos que deben quedar implementados

## 1. Autenticación

Implementa y verifica:

```http
POST /api/v1/auth/registro
POST /api/v1/auth/login
GET  /api/v1/auth/perfil
PATCH /api/v1/auth/password
```

Reglas:

- El correo debe ser único.
- La contraseña debe almacenarse con hash seguro.
- Nunca devolver `password_hash`.
- Validar credenciales sin revelar si el correo existe.
- JWT con expiración.
- JWT con secreto obligatorio desde variables de entorno.
- El payload debe incluir solamente datos necesarios:
  - `sub`
  - `rol`
  - `correo`, únicamente si la aplicación lo necesita.
- Verificar que la cuenta esté activa.
- No permitir login de cuentas suspendidas.
- Registrar usuario y perfil dentro de una transacción.
- Normalizar correo a minúsculas.
- Evitar registro con roles administrativos enviados libremente desde el frontend.

El usuario público solo puede registrarse como rol adoptante.

La creación de administradores o fundaciones debe estar protegida.

---

## 2. Usuarios y perfiles

Implementa:

```http
GET    /api/v1/usuarios
GET    /api/v1/usuarios/:id
GET    /api/v1/usuarios/me
PATCH  /api/v1/usuarios/me
PATCH  /api/v1/usuarios/:id
PATCH  /api/v1/usuarios/:id/estado
DELETE /api/v1/usuarios/:id
```

Reglas:

- El usuario puede consultar y editar su propio perfil.
- El administrador puede listar y administrar usuarios.
- El borrado debe ser lógico cuando existan datos asociados.
- No borrar físicamente usuarios con:
  - solicitudes de adopción;
  - favoritos;
  - donaciones;
  - organizaciones;
  - información histórica.
- Para desactivar, actualizar `estado_cuenta_id`.
- La cédula debe ser única cuando exista.
- No exponer hashes.
- Aplicar paginación en listados.

---

## 3. Fundaciones u organizaciones

El frontend puede usar el término `fundaciones`, aunque la tabla se llame `organizaciones`.

Implementa:

```http
GET    /api/v1/fundaciones
GET    /api/v1/fundaciones/:id
GET    /api/v1/fundaciones/me
PATCH  /api/v1/fundaciones/me
POST   /api/v1/fundaciones
PATCH  /api/v1/fundaciones/:id
DELETE /api/v1/fundaciones/:id
```

Reglas:

- Solo administradores pueden crear directamente una fundación.
- Una fundación autenticada solo puede modificar su propia organización.
- El administrador puede modificar cualquier organización.
- No eliminar físicamente una organización que tenga:
  - mascotas;
  - solicitudes;
  - mensajes;
  - adopciones;
  - registros históricos.
- Implementar desactivación lógica si el esquema lo permite.
- Si el esquema no dispone de estado para organizaciones, documentar la limitación y crear una migración segura antes de usar borrado físico.

---

## 4. Solicitudes de registro de fundaciones

Implementa:

```http
POST  /api/v1/solicitudes-organizacion
GET   /api/v1/solicitudes-organizacion
GET   /api/v1/solicitudes-organizacion/:id
PATCH /api/v1/solicitudes-organizacion/:id/estado
```

Reglas:

- El registro de solicitud puede ser público.
- El listado y la aprobación son exclusivos del administrador.
- No permitir dos solicitudes activas con el mismo RUC o correo.
- Al aprobar:
  1. validar nuevamente que no exista usuario;
  2. crear usuario;
  3. crear perfil;
  4. crear organización;
  5. actualizar estado de solicitud;
  6. ejecutar todo dentro de una transacción.
- No aprobar dos veces la misma solicitud.
- No generar contraseñas visibles en logs.
- Definir un mecanismo seguro para la contraseña inicial.
- Si no existe envío de correo, documentar claramente el flujo temporal.

---

## 5. Mascotas

Implementa:

```http
GET    /api/v1/mascotas
GET    /api/v1/mascotas/:id
POST   /api/v1/mascotas
PATCH  /api/v1/mascotas/:id
DELETE /api/v1/mascotas/:id

POST   /api/v1/mascotas/:id/tags
DELETE /api/v1/mascotas/:id/tags/:tagId

POST   /api/v1/mascotas/:id/medios
DELETE /api/v1/mascotas/:id/medios/:medioId
```

Filtros mínimos:

- `page`
- `limit`
- `search`
- `especieId`
- `razaId`
- `sexoId`
- `tamanoId`
- `ciudadId`
- `estadoId`
- `organizacionId`
- `oculto`
- `sortBy`
- `sortOrder`

Reglas:

- Listados públicos solo muestran mascotas visibles.
- Las fundaciones solo administran sus propias mascotas.
- El administrador puede administrar todas.
- El usuario adoptante no puede crear mascotas.
- No borrar físicamente mascotas con solicitudes de adopción.
- Usar estado `Eliminado` u ocultamiento lógico.
- Validar que la raza corresponda a la especie.
- Validar que la organización exista.
- Evitar tags duplicados.
- Permitir máximo un medio principal.
- Si se asigna un nuevo medio principal, desmarcar el anterior dentro de una transacción.
- No confiar en `organizacionId` enviado por una fundación; obtenerlo desde el usuario autenticado.
- Las consultas de detalle deben ensamblar:
  - datos de mascota;
  - especie;
  - raza;
  - sexo;
  - tamaño;
  - ciudad;
  - estado;
  - organización;
  - tags;
  - medios.

---

## 6. Solicitudes de adopción

Implementa:

```http
POST   /api/v1/solicitudes-adopcion
GET    /api/v1/solicitudes-adopcion
GET    /api/v1/solicitudes-adopcion/:id
PATCH  /api/v1/solicitudes-adopcion/:id
PATCH  /api/v1/solicitudes-adopcion/:id/estado

POST   /api/v1/solicitudes-adopcion/:id/evidencias
DELETE /api/v1/solicitudes-adopcion/:id/evidencias/:evidenciaId
```

Reglas:

- Solo usuarios autenticados pueden solicitar adopción.
- Un usuario no puede enviar más de una solicitud activa para la misma mascota.
- La mascota debe estar disponible.
- La organización se obtiene desde la mascota, no desde el frontend.
- El adoptante se obtiene desde el token.
- Crear dentro de una transacción:
  1. `solicitudes_adopcion`;
  2. `formularios_adopcion`;
  3. `evidencias_adopcion`.
- La fundación solo puede consultar solicitudes de sus mascotas.
- El adoptante solo puede consultar sus solicitudes.
- El administrador puede consultar todas.
- Solo la fundación propietaria o el administrador puede cambiar el estado.
- Definir transiciones de estado válidas.
- No permitir cambios arbitrarios de:
  - aprobada a revisión;
  - rechazada a aprobada sin una regla explícita;
  - seguimiento a revisión.
- Al aprobar una solicitud:
  - verificar que la mascota siga disponible;
  - marcar la mascota como `En proceso` o el estado definido;
  - impedir que otra solicitud sea aprobada simultáneamente;
  - ejecutar dentro de una transacción.
- Al concluir la adopción:
  - marcar mascota como `Adoptado`;
  - actualizar solicitud;
  - rechazar o cerrar otras solicitudes activas para la misma mascota según la regla del sistema.
- Evitar condiciones de carrera usando transacciones y bloqueo `SELECT ... FOR UPDATE` cuando sea necesario.

---

## 7. Seguimientos de adopción

Implementa:

```http
POST   /api/v1/solicitudes-adopcion/:solicitudId/seguimiento
GET    /api/v1/solicitudes-adopcion/:solicitudId/seguimiento
PATCH  /api/v1/seguimientos-adopcion/:id
DELETE /api/v1/seguimientos-adopcion/:id

POST   /api/v1/seguimientos-adopcion/:id/archivos
DELETE /api/v1/seguimientos-adopcion/:id/archivos/:archivoId
```

Reglas:

- Solo puede existir seguimiento para solicitudes aprobadas o en estado de seguimiento.
- Solo la fundación responsable, el adoptante relacionado y el administrador pueden consultar.
- Solo la fundación responsable o el administrador pueden crear o modificar.
- No eliminar físicamente seguimientos que funcionen como evidencia.
- Si el esquema solo permite uno por solicitud mediante `UNIQUE`, respetar esa regla.
- Los archivos dependen del seguimiento y pueden usar cascada únicamente si se elimina físicamente el seguimiento en una operación autorizada.
- Preferir borrado lógico si se agrega soporte mediante migración.

---

## 8. Favoritos

Implementa:

```http
GET    /api/v1/favoritos
POST   /api/v1/favoritos/:mascotaId
DELETE /api/v1/favoritos/:mascotaId
GET    /api/v1/favoritos/:mascotaId/verificar
```

Reglas:

- Obtener `usuarioId` desde JWT.
- No aceptar `usuarioId` en el body.
- Evitar favoritos duplicados mediante PK compuesta.
- Verificar que la mascota exista y sea visible.
- El listado debe devolver información suficiente para las tarjetas del frontend.
- Aplicar paginación si el listado puede crecer.

---

## 9. Mensajes

Implementa:

```http
POST   /api/v1/mensajes
GET    /api/v1/mensajes
GET    /api/v1/mensajes/:id
PATCH  /api/v1/mensajes/:id/leido
DELETE /api/v1/mensajes/:id
```

Reglas:

- El formulario de contacto puede ser público con rate limiting estricto.
- Validar nombre, correo, asunto y cuerpo.
- Si incluye `solicitudId`, verificar que exista.
- Si incluye `organizacionId`, verificar que exista.
- Una fundación solo puede leer mensajes dirigidos a su organización.
- El administrador puede leer todos.
- El remitente no puede listar mensajes internos.
- Preferir borrado lógico. Si el esquema no lo permite, documentar y crear migración.
- No exponer información de otras organizaciones.

---

## 10. Donaciones

Implementa:

```http
POST   /api/v1/donaciones
GET    /api/v1/donaciones
GET    /api/v1/donaciones/:id
PATCH  /api/v1/donaciones/:id
PATCH  /api/v1/donaciones/:id/estado
DELETE /api/v1/donaciones/:id
```

Reglas:

- Permitir donación autenticada o invitada según contrato actual.
- Si existe usuario autenticado, obtener `donante_usuario_id` desde el token.
- Validar tipo de donación y estado.
- No permitir que un usuario modifique donaciones ajenas.
- Los cambios de estado administrativos deben requerir rol autorizado.
- No borrar físicamente registros completados.
- Usar cancelación lógica.
- No asumir que `cantidad_descripcion` es siempre numérica, porque puede contener descripciones de bienes.
- Aplicar paginación y filtros.

---

## 11. Catálogos

Implementa endpoints de solo lectura:

```http
GET /api/v1/catalogos/roles
GET /api/v1/catalogos/estados-cuenta
GET /api/v1/catalogos/especies
GET /api/v1/catalogos/razas
GET /api/v1/catalogos/razas?especieId=1
GET /api/v1/catalogos/sexos
GET /api/v1/catalogos/tamanos
GET /api/v1/catalogos/unidades-edad
GET /api/v1/catalogos/estados-mascota
GET /api/v1/catalogos/ciudades
GET /api/v1/catalogos/tags
GET /api/v1/catalogos/estados-solicitud-adopcion
GET /api/v1/catalogos/estados-solicitud-organizacion
GET /api/v1/catalogos/tipos-vivienda
GET /api/v1/catalogos/tipos-donacion
GET /api/v1/catalogos/estados-donacion
GET /api/v1/catalogos/tipos-medio
```

Reglas:

- No crear un módulo completo por cada tabla catálogo.
- Usar un repository de catálogos.
- Ordenar por nombre.
- Permitir filtrar razas por especie.
- Evaluar cache corto para catálogos estables.
- No exponer catálogos administrativos innecesarios a usuarios públicos si contienen información sensible.

---

## 12. Configuración del sitio

Implementa:

```http
GET   /api/v1/configuracion-sitio
PATCH /api/v1/configuracion-sitio
```

Reglas:

- `GET` público.
- `PATCH` exclusivo para administrador.
- La tabla debe mantener un único registro con `id = 1`.
- Validar correo, teléfono, horario y dirección.
- Usar actualización parcial.
- No permitir crear múltiples configuraciones.

---

# Paginación obligatoria

Todos los listados que puedan crecer deben implementar paginación.

Parámetros:

```text
page
limit
```

Valores recomendados:

```text
page por defecto: 1
limit por defecto: 10
limit mínimo: 1
limit máximo: 100
```

No devolver cientos de registros sin límite.

Formato recomendado:

```json
{
  "success": true,
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 0,
    "totalPages": 0,
    "hasNextPage": false,
    "hasPreviousPage": false
  }
}
```

Crea una utilidad reutilizable para:

- normalizar `page`;
- normalizar `limit`;
- calcular `offset`;
- construir metadata.

No interpolar `sortBy` directamente desde el usuario.

Usar una lista blanca:

```ts
const allowedSortFields = {
  nombre: "m.nombre",
  fecha: "m.publicada_en",
  ciudad: "c.nombre",
};
```

---

# Contrato de respuestas

Mantén respuestas consistentes.

## Respuesta exitosa

```json
{
  "success": true,
  "data": {}
}
```

## Creación

```json
{
  "success": true,
  "message": "Recurso creado correctamente",
  "data": {}
}
```

## Error

```json
{
  "success": false,
  "message": "Descripción segura del error",
  "code": "RESOURCE_NOT_FOUND",
  "details": []
}
```

No exponer:

- stack trace en producción;
- SQL;
- rutas internas;
- secretos;
- hashes;
- tokens;
- información de otros usuarios.

Usar correctamente:

- `200 OK`
- `201 Created`
- `204 No Content`, únicamente cuando no se envía body.
- `400 Bad Request`
- `401 Unauthorized`
- `403 Forbidden`
- `404 Not Found`
- `409 Conflict`
- `422 Unprocessable Entity`, si el proyecto ya lo utiliza.
- `429 Too Many Requests`
- `500 Internal Server Error`

---

# Integridad referencial y reglas de base de datos

Revisa cada clave foránea individualmente.

No agregues `ON DELETE CASCADE` a todas las relaciones.

## Política general

### Usar `ON DELETE CASCADE`

Solo cuando el registro hijo:

- no tenga significado sin el padre;
- no sea histórico;
- no sea financiero;
- no sea evidencia;
- no deba conservarse por auditoría.

Candidatos razonables:

```text
perfiles_usuario -> usuarios
mascota_tag -> mascotas
medios_mascota -> mascotas
formularios_adopcion -> solicitudes_adopcion
evidencias_adopcion -> solicitudes_adopcion
archivos_seguimiento -> seguimientos_adopcion
favoritos -> usuarios
favoritos -> mascotas
```

Aun así, confirma cómo se manejan eliminaciones físicas en el backend.

### Usar `ON DELETE RESTRICT`

Para datos que deben conservarse o cuya eliminación dejaría inconsistencias:

```text
usuarios -> roles
usuarios -> estados_cuenta
organizaciones -> usuarios
mascotas -> organizaciones
mascotas -> razas
mascotas -> estados_mascota
solicitudes_adopcion -> mascotas
solicitudes_adopcion -> usuarios
solicitudes_adopcion -> organizaciones
donaciones -> tipos_donacion
donaciones -> estados_donacion
```

### Usar `ON DELETE SET NULL`

Solo en relaciones opcionales donde el registro principal deba conservarse:

```text
mensajes.solicitud_id
mensajes.organizacion_id
donaciones.donante_usuario_id
```

Confirma que las columnas permitan `NULL`.

## `ON UPDATE`

Usa normalmente:

```sql
ON UPDATE CASCADE
```

en las claves foráneas, especialmente donde el identificador padre pueda cambiar.

No modifiques claves naturales como correo, cédula o RUC sin revisar sus consecuencias.

---

# Reglas de cascada recomendadas por relación

Analiza y aplica únicamente si coinciden con el esquema real.

## Usuarios

```sql
perfiles_usuario.usuario_id
  -> usuarios.id
  ON UPDATE CASCADE
  ON DELETE CASCADE
```

Justificación:

El perfil no tiene sentido sin el usuario.

```sql
organizaciones.usuario_id
  -> usuarios.id
  ON UPDATE CASCADE
  ON DELETE RESTRICT
```

Justificación:

Una organización no debe desaparecer al eliminar una cuenta.

```sql
favoritos.usuario_id
  -> usuarios.id
  ON UPDATE CASCADE
  ON DELETE CASCADE
```

Solo si la eliminación física de usuario está permitida. Si se usa borrado lógico, la cascada no debe ejecutarse normalmente.

## Mascotas

```sql
mascota_tag.mascota_id
  -> mascotas.id
  ON UPDATE CASCADE
  ON DELETE CASCADE
```

```sql
medios_mascota.mascota_id
  -> mascotas.id
  ON UPDATE CASCADE
  ON DELETE CASCADE
```

```sql
solicitudes_adopcion.mascota_id
  -> mascotas.id
  ON UPDATE CASCADE
  ON DELETE RESTRICT
```

Una mascota con historial de solicitudes no se elimina físicamente.

## Solicitudes

```sql
formularios_adopcion.solicitud_id
  -> solicitudes_adopcion.id
  ON UPDATE CASCADE
  ON DELETE CASCADE
```

```sql
evidencias_adopcion.solicitud_id
  -> solicitudes_adopcion.id
  ON UPDATE CASCADE
  ON DELETE CASCADE
```

```sql
seguimientos_adopcion.solicitud_id
  -> solicitudes_adopcion.id
  ON UPDATE CASCADE
  ON DELETE RESTRICT
```

El seguimiento funciona como evidencia y no debe desaparecer automáticamente.

## Mensajes

```sql
mensajes.solicitud_id
  -> solicitudes_adopcion.id
  ON UPDATE CASCADE
  ON DELETE SET NULL
```

```sql
mensajes.organizacion_id
  -> organizaciones.id
  ON UPDATE CASCADE
  ON DELETE SET NULL
```

## Donaciones

```sql
donaciones.donante_usuario_id
  -> usuarios.id
  ON UPDATE CASCADE
  ON DELETE SET NULL
```

La donación debe conservarse aunque la cuenta del donante sea desactivada o eliminada mediante un proceso autorizado.

---

# Restricciones `CHECK`

MySQL 8 permite restricciones `CHECK`.

Aplica únicamente restricciones compatibles con los datos existentes.

Evalúa:

```sql
CHECK (CHAR_LENGTH(cedula) = 10)
```

Solo para cédulas no nulas y después de auditar datos reales:

```sql
CHECK (
  cedula IS NULL
  OR CHAR_LENGTH(cedula) = 10
)
```

Para RUC:

```sql
CHECK (
  ruc IS NULL
  OR CHAR_LENGTH(ruc) = 13
)
```

Para edad:

```sql
CHECK (edad_valor >= 0)
```

Para booleanos:

```sql
CHECK (oculto IN (0, 1))
CHECK (es_principal IN (0, 1))
CHECK (declaracion_veracidad IN (0, 1))
CHECK (leido IN (0, 1))
```

Para configuración única:

```sql
CHECK (id = 1)
```

No agregues restricciones excesivamente rígidas que rompan datos válidos.

Las reglas complejas deben permanecer en services.

---

# Índices

Analiza las consultas reales antes de crear índices.

No dupliques índices ya cubiertos por:

- PK.
- UNIQUE.
- FK.
- índices compuestos existentes.

Evalúa como mínimo:

```sql
CREATE INDEX idx_usuarios_rol_estado
ON usuarios(rol_id, estado_cuenta_id);

CREATE INDEX idx_organizaciones_ciudad
ON organizaciones(ciudad_id);

CREATE INDEX idx_mascotas_org_estado
ON mascotas(organizacion_id, estado_mascota_id);

CREATE INDEX idx_mascotas_ciudad_estado
ON mascotas(ciudad_id, estado_mascota_id);

CREATE INDEX idx_mascotas_raza_estado
ON mascotas(raza_id, estado_mascota_id);

CREATE INDEX idx_mascotas_publicada
ON mascotas(publicada_en);

CREATE INDEX idx_mascotas_oculto_estado
ON mascotas(oculto, estado_mascota_id);

CREATE INDEX idx_solicitudes_adoptante_estado
ON solicitudes_adopcion(adoptante_id, estado_id);

CREATE INDEX idx_solicitudes_org_estado
ON solicitudes_adopcion(organizacion_id, estado_id);

CREATE INDEX idx_solicitudes_mascota_estado
ON solicitudes_adopcion(mascota_id, estado_id);

CREATE INDEX idx_solicitudes_creado
ON solicitudes_adopcion(creado_en);

CREATE INDEX idx_mensajes_org_leido
ON mensajes(organizacion_id, leido);

CREATE INDEX idx_mensajes_creado
ON mensajes(creado_en);

CREATE INDEX idx_donaciones_estado_creado
ON donaciones(estado_donacion_id, creado_en);

CREATE INDEX idx_donaciones_tipo_estado
ON donaciones(tipo_donacion_id, estado_donacion_id);
```

Ejecuta `EXPLAIN` sobre las consultas principales.

Documenta:

- consulta;
- índice usado;
- motivo;
- posible impacto.

---

# Restricciones `UNIQUE`

Verifica que existan y funcionen:

```text
usuarios.correo
perfiles_usuario.cedula
organizaciones.ruc
organizaciones.usuario_id
solicitudes_registro_organizacion.correo
solicitudes_registro_organizacion.ruc
razas(especie_id, nombre)
mascota_tag(mascota_id, tag_id)
favoritos(usuario_id, mascota_id)
seguimientos_adopcion.solicitud_id
```

Evalúa una regla para evitar solicitudes de adopción activas duplicadas.

MySQL no permite fácilmente un índice único parcial por estado.

Implementa esta regla principalmente en el service con transacción y bloqueo.

No uses un trigger salvo justificación documentada.

---

# Borrado lógico

Prioriza borrado lógico para:

- usuarios;
- organizaciones;
- mascotas;
- solicitudes;
- seguimientos;
- mensajes;
- donaciones.

Ya existen campos útiles:

```text
usuarios.estado_cuenta_id
mascotas.estado_mascota_id
mascotas.oculto
solicitudes_adopcion.estado_id
donaciones.estado_donacion_id
mensajes.leido
```

No uses `mensajes.leido` como borrado lógico.

Si mensajes, organizaciones o seguimientos requieren borrado lógico y no existe columna, crea una migración segura, por ejemplo:

```sql
ALTER TABLE organizaciones
ADD COLUMN activo TINYINT(1) NOT NULL DEFAULT 1;

ALTER TABLE mensajes
ADD COLUMN eliminado TINYINT(1) NOT NULL DEFAULT 0;

ALTER TABLE seguimientos_adopcion
ADD COLUMN eliminado TINYINT(1) NOT NULL DEFAULT 0;
```

Solo agrega estas columnas si el análisis del backend confirma que se requieren.

No cambies el esquema sin migración.

---

# Transacciones obligatorias

Usa transacciones en operaciones con múltiples escrituras.

Casos mínimos:

## Registro de usuario

```text
crear usuarios
crear perfiles_usuario
```

## Aprobación de fundación

```text
crear usuario
crear perfil
crear organización
actualizar solicitud
```

## Crear mascota

```text
crear mascota
crear tags
crear medios
```

## Actualizar mascota

```text
actualizar mascota
sincronizar tags
sincronizar medios
actualizar medio principal
```

## Crear solicitud de adopción

```text
bloquear mascota
validar disponibilidad
crear solicitud
crear formulario
crear evidencias
```

## Aprobar solicitud

```text
bloquear solicitud
bloquear mascota
validar estado actual
actualizar solicitud
actualizar mascota
cerrar solicitudes incompatibles
```

## Registrar seguimiento

```text
crear seguimiento
crear archivos
actualizar estado de solicitud si corresponde
```

Patrón esperado:

```ts
const connection = await pool.getConnection();

try {
  await connection.beginTransaction();

  // operaciones relacionadas

  await connection.commit();
} catch (error) {
  await connection.rollback();
  throw error;
} finally {
  connection.release();
}
```

Los repositories deben aceptar `PoolConnection` opcional.

No abras una transacción para un `SELECT` simple.

---

# Concurrencia

Evita que dos solicitudes sean aprobadas para la misma mascota.

Usa una transacción con:

```sql
SELECT id, estado_mascota_id
FROM mascotas
WHERE id = ?
FOR UPDATE;
```

Después:

1. validar estado;
2. actualizar mascota;
3. aprobar solicitud;
4. cerrar otras solicitudes activas;
5. confirmar transacción.

No dependas únicamente de una consulta previa fuera de la transacción.

---

# Seguridad

Implementa o verifica:

- `helmet`.
- CORS configurable con `FRONTEND_URL`.
- `express.json` con límite razonable.
- Rate limiting general.
- Rate limiting más estricto para:
  - login;
  - registro;
  - contacto;
  - recuperación de contraseña, si existe.
- JWT obligatorio en rutas privadas.
- Autorización por roles.
- Hash de contraseñas.
- SQL parametrizado.
- No registrar contraseñas.
- No registrar tokens completos.
- Sanitización de mensajes de error.
- Variables de entorno obligatorias.
- Rechazar inicio si falta `JWT_SECRET`.
- No usar secretos predeterminados en producción.
- No usar `cors({ origin: "*" })` con credenciales.
- Evitar mass assignment.
- Lista blanca de campos actualizables.
- Lista blanca de ordenamiento.
- Límite de paginación.
- Validación de IDs.
- Respuestas sin stack en producción.

Roles esperados:

```text
usuario
fundacion
admin
```

Crea un middleware reutilizable:

```ts
requireRole("admin")
requireRole("fundacion", "admin")
```

Verifica además propiedad del recurso en el service.

El rol por sí solo no es suficiente.

---

# Archivos y medios

El esquema actual puede almacenar contenido en `LONGTEXT`.

Revisa cómo funciona el frontend.

No guardes archivos grandes en base64 sin límites.

Si se mantiene base64:

- limitar tamaño;
- validar MIME;
- validar extensión;
- no confiar en el nombre;
- rechazar contenido vacío;
- evitar payloads excesivos;
- documentar impacto.

Si el proyecto ya usa almacenamiento externo o filesystem:

- conservar estrategia existente;
- almacenar únicamente URL o ruta;
- proteger acceso;
- evitar path traversal.

No migres a otra estrategia sin necesidad.

---

# Mappers y contrato del frontend

La base de datos usa `snake_case`, pero el frontend puede usar `camelCase`.

Centraliza los mapeos.

Ejemplo:

```ts
{
  id: row.id,
  nombre: row.nombre,
  edadValor: row.edad_valor,
  unidadEdad: row.unidad_edad,
  organizacionId: row.organizacion_id,
  publicadaEn: row.publicada_en,
  esPrincipal: Boolean(row.es_principal)
}
```

No devolver filas SQL directamente si no coinciden con el contrato del frontend.

Revisa `src/types/frontend.ts`.

No cambies la estructura de respuestas existente sin verificar el frontend.

Documenta cualquier ajuste necesario.

---

# Conexión a la base de datos

Revisa `src/config/database.ts`.

Debe:

- usar `mysql2/promise`;
- crear un pool;
- leer variables de entorno;
- definir límites razonables;
- probar conexión al iniciar;
- no imprimir contraseña;
- exportar el pool;
- cerrar limpiamente en señales del sistema.

Variables esperadas:

```env
PORT=3000
NODE_ENV=development

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=huellitas_solidarias_db
DB_CONNECTION_LIMIT=10

JWT_SECRET=
JWT_EXPIRES_IN=1h

FRONTEND_URL=http://localhost:5173
```

Crea o corrige `.env.example`.

No modifiques `.env`.

Agrega validación temprana de variables obligatorias.

---

# Migraciones

No reemplaces directamente una base de datos existente.

Crea migraciones seguras dentro de:

```text
db/migrations/
```

Nombre sugerido:

```text
2026_07_19_integridad_y_backend_huellitas.sql
```

La migración debe:

1. auditar datos existentes;
2. detectar huérfanos;
3. detectar duplicados;
4. detectar constraints existentes;
5. eliminar solo constraints que deban cambiar;
6. recrearlas con reglas correctas;
7. crear índices faltantes;
8. agregar `CHECK` compatibles;
9. evitar pérdida de datos;
10. incluir comentarios;
11. ser compatible con MySQL 8;
12. ser idempotente cuando sea razonable;
13. no ejecutar cambios destructivos si existen datos incompatibles.

Consultas de auditoría mínimas:

```sql
SELECT p.*
FROM perfiles_usuario p
LEFT JOIN usuarios u ON u.id = p.usuario_id
WHERE u.id IS NULL;
```

```sql
SELECT o.*
FROM organizaciones o
LEFT JOIN usuarios u ON u.id = o.usuario_id
WHERE u.id IS NULL;
```

```sql
SELECT m.*
FROM mascotas m
LEFT JOIN organizaciones o ON o.id = m.organizacion_id
WHERE o.id IS NULL;
```

```sql
SELECT s.*
FROM solicitudes_adopcion s
LEFT JOIN mascotas m ON m.id = s.mascota_id
WHERE m.id IS NULL;
```

```sql
SELECT s.*
FROM solicitudes_adopcion s
LEFT JOIN usuarios u ON u.id = s.adoptante_id
WHERE u.id IS NULL;
```

```sql
SELECT f.*
FROM formularios_adopcion f
LEFT JOIN solicitudes_adopcion s ON s.id = f.solicitud_id
WHERE s.id IS NULL;
```

```sql
SELECT d.correo, COUNT(*)
FROM usuarios d
GROUP BY d.correo
HAVING COUNT(*) > 1;
```

No ejecutes:

```sql
DROP DATABASE
TRUNCATE
DROP TABLE
```

No borres datos para hacer pasar una migración.

---

# Seeds

Revisa el seed actual.

Debe insertar catálogos sin duplicarlos.

Usa estrategias compatibles como:

```sql
INSERT INTO roles (codigo, nombre)
VALUES ('usuario', 'Usuario adoptante')
ON DUPLICATE KEY UPDATE nombre = VALUES(nombre);
```

No insertes usuarios con contraseñas en texto plano.

Si se crea un administrador de prueba:

- usar hash;
- únicamente en entorno de desarrollo;
- documentar credenciales de prueba en lugar seguro;
- no incluir credenciales reales;
- no mostrar la contraseña en logs de producción.

---

# Triggers

No agregues triggers automáticamente.

Usa triggers solo si una regla técnica no puede garantizarse mediante:

- FK;
- `CHECK`;
- `UNIQUE`;
- transacciones;
- services.

No uses triggers para:

- aprobar solicitudes;
- cambiar estados de mascota;
- crear seguimientos;
- crear usuarios;
- cerrar solicitudes;
- enviar mensajes;
- registrar donaciones.

La lógica de negocio debe permanecer visible en el backend.

Si agregas un trigger, debes justificar:

- por qué no puede resolverse de otra manera;
- qué tablas afecta;
- cómo se prueba;
- cómo se revierte.

---

# Manejo de errores

Implementa clases o códigos de error reutilizables.

Ejemplos:

```text
VALIDATION_ERROR
UNAUTHORIZED
FORBIDDEN
RESOURCE_NOT_FOUND
EMAIL_ALREADY_EXISTS
CEDULA_ALREADY_EXISTS
RUC_ALREADY_EXISTS
DUPLICATE_FAVORITE
PET_NOT_AVAILABLE
ACTIVE_APPLICATION_EXISTS
INVALID_STATE_TRANSITION
DATABASE_ERROR
```

El `errorHandler` debe reconocer:

- errores propios;
- errores de Zod;
- errores de MySQL:
  - `ER_DUP_ENTRY`;
  - `ER_NO_REFERENCED_ROW_2`;
  - `ER_ROW_IS_REFERENCED_2`;
- errores JWT.

No devolver mensajes SQL internos.

---

# Pruebas obligatorias

Agrega pruebas útiles, no pruebas vacías.

## Unitarias

- schemas;
- services;
- permisos;
- transiciones de estado;
- paginación;
- mappers;
- validación de roles.

## Integración

Como mínimo:

### Auth

- registro válido;
- correo duplicado;
- login válido;
- contraseña incorrecta;
- cuenta suspendida;
- ruta protegida sin token;
- rol insuficiente.

### Mascotas

- listado paginado;
- filtros;
- creación por fundación;
- rechazo de creación por usuario;
- fundación no puede editar mascota ajena;
- borrado lógico;
- detalle con tags y medios.

### Solicitudes

- crear solicitud válida;
- impedir duplicado activo;
- impedir solicitud para mascota no disponible;
- fundación consulta solo sus solicitudes;
- aprobar con transacción;
- impedir doble aprobación concurrente.

### Favoritos

- agregar;
- duplicado;
- listar;
- eliminar;
- verificar.

### Base de datos

- FK válidas;
- FK inválidas;
- cascadas permitidas;
- restricciones `RESTRICT`;
- `SET NULL`;
- restricciones `CHECK`;
- transacción y rollback.

No afirmar que una prueba pasó si no se ejecutó.

---

# Validaciones y comandos

Identifica scripts reales en `package.json`.

Ejecuta los que existan.

Como mínimo intenta:

```bash
npm install
npm run build
npm run typecheck
npm test -- --runInBand
npm run lint
```

Si un script no existe, no inventes que se ejecutó.

Puedes agregar scripts útiles en `package.json`, por ejemplo:

```json
{
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "typecheck": "tsc --noEmit",
    "test": "jest --runInBand",
    "lint": "eslint ."
  }
}
```

Adapta esto a las dependencias existentes.

Prueba la API con solicitudes HTTP reales.

Ejemplos:

```bash
curl http://localhost:3000/health
```

```bash
curl "http://localhost:3000/api/v1/mascotas?page=1&limit=10"
```

No afirmes que Postman fue utilizado si no está disponible.

---

# Health check

Implementa:

```http
GET /health
```

Respuesta:

```json
{
  "success": true,
  "service": "huellitas-solidarias-api",
  "database": "connected",
  "timestamp": "..."
}
```

El endpoint debe verificar realmente la base de datos con una consulta liviana como:

```sql
SELECT 1;
```

No exponer configuración sensible.

---

# Documentación

Actualiza `README.md` con:

- descripción;
- requisitos;
- instalación;
- variables de entorno;
- creación de base de datos;
- ejecución de migraciones;
- ejecución de seeds;
- modo desarrollo;
- compilación;
- pruebas;
- rutas principales;
- roles;
- estructura del proyecto;
- paginación;
- ejemplos de respuesta;
- códigos de error;
- cómo conectar el frontend.

Crea:

```text
docs/reviews/REVISION_BACKEND_HUELLITAS.md
docs/reports/INFORME_IMPLEMENTACION_BACKEND.md
docs/api/ENDPOINTS_FRONTEND.md
```

## `ENDPOINTS_FRONTEND.md`

Debe incluir por endpoint:

- método;
- ruta;
- autenticación;
- roles;
- params;
- query;
- body;
- ejemplo de respuesta;
- códigos de error.

Debe quedar útil para quien conecte React con Axios o Fetch.

---

# Archivo de integración para el frontend

Crea una guía o ejemplo en:

```text
docs/api/FRONTEND_INTEGRATION_EXAMPLE.ts
```

Debe mostrar:

- instancia de Axios;
- `baseURL`;
- interceptor para JWT;
- manejo de `401`;
- función de login;
- listado de mascotas;
- detalle de mascota;
- favoritos;
- creación de solicitud;
- paginación.

Ejemplo orientativo:

```ts
import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:3000/api/v1",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});
```

No agregues dependencias al frontend dentro del backend.

Solo crea documentación o ejemplo.

---

# OpenAPI

Si el proyecto ya usa OpenAPI, complétalo.

Si no existe, crea:

```text
docs/openapi.yaml
```

Documenta:

- autenticación Bearer;
- schemas;
- endpoints;
- paginación;
- errores;
- roles requeridos.

Valida que el archivo sea OpenAPI 3.0 o 3.1 válido.

No dejes endpoints documentados que no existan.

---

# Reglas obligatorias

- No inventes tablas.
- No inventes columnas.
- No inventes endpoints sin implementarlos.
- No dupliques módulos.
- No dejes archivos vacíos.
- No uses `any` sin necesidad.
- No uses SQL concatenado con datos del usuario.
- No expongas hashes.
- No expongas secretos.
- No edites `.env`.
- No borres datos.
- No uses `DROP DATABASE`.
- No uses `TRUNCATE`.
- No uses `DROP TABLE`.
- No cambies estados sin revisar el código.
- No agregues cascadas indiscriminadas.
- No uses triggers innecesarios.
- No rompas el contrato del frontend.
- No devuelvas más de 100 elementos por página.
- No confíes en IDs de propietario enviados por el frontend.
- No permitas que una fundación administre recursos ajenos.
- No permitas que un usuario cambie su rol.
- No permitas aprobar solicitudes duplicadas.
- No afirmes que las pruebas pasan sin ejecutarlas.
- No hagas cambios destructivos en producción.
- No incluyas credenciales reales.
- No hagas commit ni push sin autorización explícita.

---

# Archivos mínimos que debes revisar

```text
package.json
tsconfig.json
src/index.ts
src/config/database.ts
src/controllers/
src/middlewares/
src/repositories/
src/routes/
src/routers/
src/schemas/
src/services/
src/types/
src/utils/
db/
.env.example
README.md
```

Revisa solo rutas existentes.

---

# Archivos mínimos que debes crear o completar

Ajusta según lo que ya exista.

```text
src/controllers/usuario.controller.ts
src/controllers/solicitudOrganizacion.controller.ts
src/controllers/seguimientoAdopcion.controller.ts
src/controllers/catalogo.controller.ts
src/controllers/configuracionSitio.controller.ts

src/repositories/solicitudOrganizacion.repository.ts
src/repositories/seguimientoAdopcion.repository.ts
src/repositories/configuracionSitio.repository.ts

src/services/usuario.service.ts
src/services/solicitudOrganizacion.service.ts
src/services/seguimientoAdopcion.service.ts
src/services/catalogo.service.ts
src/services/configuracionSitio.service.ts

src/routers/v1/
src/schemas/
src/types/express.d.ts

db/migrations/2026_07_19_integridad_y_backend_huellitas.sql

docs/reviews/REVISION_BACKEND_HUELLITAS.md
docs/reports/INFORME_IMPLEMENTACION_BACKEND.md
docs/api/ENDPOINTS_FRONTEND.md
docs/api/FRONTEND_INTEGRATION_EXAMPLE.ts
docs/openapi.yaml
```

No reemplaces archivos completos si basta con corregirlos.

---

# Criterios de finalización

La tarea solo se considera terminada cuando:

1. El proyecto compila.
2. TypeScript no presenta errores.
3. La API inicia.
4. La conexión MySQL funciona.
5. `/health` verifica la base de datos.
6. Los endpoints principales responden.
7. Los repositories contienen consultas reales.
8. Los listados tienen paginación.
9. Los filtros principales funcionan.
10. La autenticación funciona.
11. La autorización por roles funciona.
12. Las fundaciones no acceden a datos ajenos.
13. Las transacciones protegen operaciones múltiples.
14. Las claves foráneas están revisadas.
15. Las cascadas están justificadas.
16. Los datos históricos no se borran accidentalmente.
17. No se exponen contraseñas.
18. Las pruebas disponibles pasan.
19. La migración está lista y no es destructiva.
20. La documentación permite conectar el frontend.

---

# Informe final obligatorio

Antes de terminar, muestra un resumen exacto con estas secciones:

## 1. Diagnóstico inicial

- estructura encontrada;
- módulos existentes;
- módulos incompletos;
- problemas encontrados.

## 2. Archivos creados

Lista exacta.

## 3. Archivos modificados

Lista exacta y motivo.

## 4. Endpoints implementados

Tabla con:

```text
Método | Ruta | Autenticación | Roles | Estado
```

## 5. Base de datos

- relaciones revisadas;
- `ON DELETE` aplicados;
- `ON UPDATE` aplicados;
- índices creados;
- `CHECK` creados;
- reglas `UNIQUE`;
- auditorías ejecutadas;
- registros huérfanos encontrados.

## 6. Reglas de negocio

- permisos;
- estados;
- borrado lógico;
- duplicados;
- concurrencia;
- transacciones.

## 7. Seguridad

- JWT;
- hashes;
- CORS;
- Helmet;
- rate limiting;
- SQL parametrizado;
- validaciones.

## 8. Pruebas ejecutadas

Indica comandos reales y resultados reales.

Ejemplo:

```text
npm run build: PASS
npm run typecheck: PASS
npm test -- --runInBand: 24 pruebas PASS
npm run lint: PASS
```

Si algo falla, muestra el error real.

## 9. Pruebas manuales

Lista endpoints realmente probados.

## 10. Pendientes

No ocultes tareas pendientes.

## 11. Riesgos conocidos

Documenta limitaciones reales.

## 12. Instrucciones para ejecutar

Incluye comandos exactos:

```bash
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

Adapta los comandos a los scripts reales.

---

# Forma de trabajo

Trabaja directamente sobre el repositorio.

No te limites a explicar qué debería hacerse.

Debes:

1. inspeccionar;
2. implementar;
3. corregir;
4. migrar;
5. probar;
6. documentar;
7. mostrar resultados verificables.

Cuando encuentres una decisión ambigua, elige la opción más segura y compatible con el código actual.

No detengas la implementación por detalles menores.

No pidas confirmación para cada archivo.

Haz una revisión integral, pero evita cambios destructivos.

El resultado debe ser un backend profesional, coherente y listo para conectarse con el frontend de Huellitas Solidarias.

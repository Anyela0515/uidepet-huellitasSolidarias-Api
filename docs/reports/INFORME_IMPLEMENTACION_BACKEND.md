# Informe de implementación — Backend Huellitas Solidarias

Fecha: 2026-07-19

## 1. Diagnóstico inicial

Ver detalle completo en [`docs/reviews/REVISION_BACKEND_HUELLITAS.md`](../reviews/REVISION_BACKEND_HUELLITAS.md). Resumen:

- Estructura real: rutas planas (`/mascotas`, sin `/api/v1`), arquitectura por capas completa pero con módulos fusionados respecto al ideal del prompt (usuarios dentro de `auth`, seguimientos embebidos en `solicitud`, "fundaciones" = flujo de solicitudes de registro de `organizaciones`).
- Bugs críticos encontrados: borrado físico de mascotas que rompía con FK (`ER_ROW_IS_REFERENCED_2`), hueco de autorización en mensajes (cualquier rol veía todos los mensajes), endpoint de reset de contraseña sin autenticación (account takeover), password hardcodeada al aprobar fundaciones, falta de transacciones en creación/actualización de mascotas.
- Gaps estructurales: sin paginación real en ningún listado, sin filtros, `errorHandler` que solo distinguía Zod vs. 500 genérico, catálogos y configuración del sitio sin exponer vía API, 0% de cobertura de tests, sin graceful shutdown, README/openapi describiendo una API distinta a la real.

## 2. Archivos creados

```
db/migrations/2026_07_19_integridad_y_backend_huellitas.sql
docs/api/ENDPOINTS_FRONTEND.md
docs/api/FRONTEND_INTEGRATION_EXAMPLE.ts
docs/reviews/REVISION_BACKEND_HUELLITAS.md
docs/reports/INFORME_IMPLEMENTACION_BACKEND.md
src/app.ts                                   (createApp() extraído de index.ts para poder testear con Supertest)
src/utils/errors.ts                          (AppError y subclases: NotFoundError, ForbiddenError, ConflictError, ValidationAppError, UnauthorizedError)
src/utils/pagination.ts                      (parsePagination, buildPaginationMeta, buildSortClause)
src/utils/pagination.test.ts
src/utils/edad.test.ts
src/utils/mappers.test.ts
src/__tests__/setup.ts
src/__tests__/auth.test.ts
src/__tests__/mascotas.test.ts
src/__tests__/favoritos.test.ts
src/repositories/catalogo.repository.ts      (catálogos de solo lectura — distinto de catalog.repository.ts, que resuelve FKs internamente)
src/services/catalogo.service.ts
src/controllers/catalogo.controller.ts
src/routes/catalogos.ts
src/repositories/configuracionSitio.repository.ts
src/services/configuracionSitio.service.ts
src/controllers/configuracionSitio.controller.ts
src/routes/configuracionSitio.ts
src/schemas/configuracionSitio.schema.ts
src/repositories/organizacion.repository.ts  (perfil de organizaciones: me / editar / desactivar)
src/routes/seguimientosAdopcion.ts
vitest.config.ts
.env                                          (no existía; creado a pedido explícito del usuario)
```

Además, el usuario confirmó por chat que ya tenía `huellitas_solidarias_db` "creada" pero no existía en su MySQL local — se creó ejecutando `npm run db:schema` (script ya existente del proyecto, no destructivo dado que la base no existía previamente).

## 3. Archivos modificados (y motivo)

| Archivo | Motivo |
|---|---|
| `src/index.ts` | Se redujo a `createApp() + listen + graceful shutdown` (SIGINT/SIGTERM cierran el pool de MySQL). |
| `src/middlewares/errorHandler.ts` | Reconoce ahora `AppError` propio, `ZodError`, errores MySQL (`ER_DUP_ENTRY`, `ER_NO_REFERENCED_ROW_2`, `ER_ROW_IS_REFERENCED_2`) y JWT, sin romper el shape `{code, error}` que ya consumía el frontend (se añaden `success`, `message`, `errorCode` de forma aditiva). |
| `src/repositories/mascota.repository.ts` | `softDelete` en vez de `DELETE` físico; `create`/`update` envueltos en transacción; paginación + filtros (`search`, `especie`, `raza`, `sexo`, `tamano`, `ciudad`, `estado`, `organizacionId`, `oculto`); nuevas funciones `addTag/removeTagById/addMedio/removeMedio`. |
| `src/repositories/catalog.repository.ts` | Todas las funciones aceptan una conexión opcional (`Pool \| PoolConnection`) para poder participar en transacciones externas. |
| `src/repositories/usuario.repository.ts` | `create`/`findByCorreo`/`updateRol` aceptan conexión externa opcional (para la aprobación atómica de fundaciones); `findAll` paginado con filtros `rol`/`estado`/`search`. |
| `src/repositories/fundacion.repository.ts` | `findAll` paginado + filtro `estado`; `updateEstado`/`findById` aceptan conexión externa. |
| `src/repositories/solicitud.repository.ts` | `findAll/findByAdoptante/findByFundacion` paginados + filtro `estado`; nueva `updateEstadoConBloqueo` con `SELECT...FOR UPDATE`; funciones de seguimiento y evidencias como recurso independiente. |
| `src/repositories/mensaje.repository.ts` | `findAll/findByFundacion` paginados + filtro `leido`; `findById` nuevo; `countUnreadForFundacion` reescrito sin depender del listado paginado. |
| `src/repositories/donacion.repository.ts` | `findAll/findByCorreo` paginados + filtros `tipo`/`estado`; `findById`/`updateEstado` nuevos. |
| `src/repositories/favorito.repository.ts` | `add`/`remove` idempotentes (además del `toggle` histórico). |
| `src/services/mascota.service.ts` | `eliminarMascota` usa soft delete; nuevas funciones de tags/medios; paginación/filtros conectados al repository. |
| `src/services/mensaje.service.ts` | **Fix de seguridad**: `listarMensajes` ya no expone todo a cualquier rol; `marcarLeido` valida propiedad. |
| `src/services/auth.service.ts` | `resetPassword` reemplazado por `changePassword` (requiere contraseña actual); `listUsers` paginado; `createFundacionUser` acepta conexión externa. |
| `src/services/fundacion.service.ts` | `actualizarEstado` atómico (transacción única updateEstado+createFundacionUser), password temporal aleatoria (no hardcodeada), máquina de estados explícita; nuevas funciones de perfil de organización (`me`, actualizar, desactivar). |
| `src/services/solicitud.service.ts` | `actualizarEstado` usa bloqueo pesimista; nuevas funciones de seguimiento/evidencias independientes. |
| `src/services/donacion.service.ts` | Paginación/filtros; `actualizarEstado`/`cancelarDonacion` (cancelación lógica). |
| `src/services/favorito.service.ts` | `listarFavoritos` ya no depende de `findVisible()` paginado; nuevas `agregarFavorito`/`quitarFavorito`. |
| `src/controllers/*.ts` (todos) | Adaptados a las nuevas firmas de servicio (paginación, query params, nuevos endpoints). |
| `src/routes/*.ts` (todos) | Rutas nuevas de paridad (tags/medios de mascotas, evidencias, `/fundaciones/me`, `DELETE /fundaciones/:id`, `PATCH/DELETE /donaciones/:id`, `/favoritos/:mascotaId` POST/DELETE), `requireRole` agregado donde faltaba (mensajes). |
| `src/schemas/*.ts` | Nuevos schemas (`changePasswordSchema`, `actualizarPerfilFundacionSchema`, `agregarTagSchema`, `agregarMedioSchema`, `actualizarSeguimientoSchema`, `archivoSeguimientoSchema`, `evidenciaAdopcionSchema`, `actualizarEstadoDonacionSchema`); se removió `resetPasswordSchema`. |
| `README.md`, `openapi.yaml` | Reescritos completos para reflejar la API real (antes describían una API distinta). |
| `generate-token.mjs` | Reescrito: generaba un JWT con claims incompatibles con el formato real (`sub` string, `iss`, `aud`, `scope`); ahora firma `{sub, correo, rol}` real usando `JWT_SECRET` del `.env`. |
| `scripts/benchmark-mascotas.mjs` | Apuntaba a `/v1/mascotas` (inexistente); corregido a `/mascotas/publicas`. |
| `package.json` | Nuevas dependencias (`helmet`, `vitest`, `supertest`, `@types/supertest`); scripts `test`, `test:watch`, `db:migrate`. |

## 4. Endpoints implementados

Ver tabla completa por endpoint (auth, roles, params, body, respuestas, errores) en [`docs/api/ENDPOINTS_FRONTEND.md`](../api/ENDPOINTS_FRONTEND.md). Resumen:

| Método | Ruta | Auth | Roles | Estado |
|---|---|---|---|---|
| GET | /health | No | — | ✅ verificado (DB real) |
| POST | /auth/register | No | — | ✅ |
| POST | /auth/login | No | — | ✅ |
| PATCH | /auth/password | Sí | cualquiera | ✅ nuevo |
| GET | /auth/me | Sí | cualquiera | ✅ |
| PATCH | /auth/perfil | Sí | cualquiera | ✅ |
| GET | /auth/usuarios | Sí | admin | ✅ paginado |
| PATCH | /auth/usuarios/:correo/rol | Sí | admin | ✅ |
| PATCH | /auth/usuarios/:correo/estado | Sí | admin | ✅ |
| GET | /mascotas/publicas, /:id | según | — | ✅ paginado+filtros |
| GET/POST | /mascotas | Sí | según | ✅ paginado+filtros |
| PATCH/DELETE | /mascotas/:id | Sí | fundacion,admin | ✅ soft delete |
| POST/DELETE | /mascotas/:id/tags, /tags/:tagId | Sí | fundacion,admin | ✅ nuevo |
| POST/DELETE | /mascotas/:id/medios, /medios/:medioId | Sí | fundacion,admin | ✅ nuevo |
| GET/POST | /solicitudes | Sí | según | ✅ paginado+filtro |
| PATCH | /solicitudes/:id/estado | Sí | fundacion,admin | ✅ con bloqueo pesimista |
| POST | /solicitudes/:id/seguimiento | Sí | usuario | ✅ |
| POST/DELETE | /solicitudes/:id/evidencias, /evidencias/:id | Sí | admin,adoptante | ✅ nuevo |
| PATCH/DELETE | /seguimientos-adopcion/:id | Sí | fundacion,admin | ✅ nuevo (DELETE siempre 409, deliberado) |
| POST/DELETE | /seguimientos-adopcion/:id/archivos... | Sí | según | ✅ nuevo |
| GET/POST | /fundaciones | según | admin/público | ✅ paginado |
| GET/PATCH | /fundaciones/me | Sí | fundacion | ✅ nuevo |
| GET/DELETE | /fundaciones/:id | Sí | admin | ✅ nuevo (DELETE = soft delete) |
| PATCH | /fundaciones/:id/estado | Sí | admin | ✅ atómico + password temporal |
| GET/POST/DELETE | /favoritos... | Sí | usuario | ✅ + PK compuesta evita duplicados |
| GET/POST | /mensajes | según | fundacion,admin | ✅ **fix de seguridad** |
| PATCH | /mensajes/:id/leido | Sí | fundacion,admin | ✅ valida propiedad |
| GET/POST | /donaciones | según | según | ✅ paginado+filtros |
| PATCH/DELETE | /donaciones/:id... | Sí | admin | ✅ nuevo, cancelación lógica |
| GET | /catalogos/* (16 endpoints) | No | — | ✅ nuevo módulo completo |
| GET/PATCH | /configuracion-sitio | según | admin | ✅ nuevo módulo completo |

## 5. Base de datos

- **Relaciones revisadas**: las 35 FK del esquema original se auditaron una a una (ver `docs/reviews/REVISION_BACKEND_HUELLITAS.md`); ninguna FK existente se modificó (se decidió no tocar cascadas ya correctas).
- **`ON DELETE` aplicados**: ninguno nuevo — se decidió resolver la integridad vía **borrado lógico en el backend** (mascotas ya lo tenía disponible pero no usado; organizaciones lo ganó vía la nueva columna `activo`) en vez de forzar cascadas.
- **`ON UPDATE`**: sin cambios (decisión documentada: todas las PK referenciadas son inmutables una vez creadas).
- **Índices creados** (migración, todos verificados idempotentes): `idx_usuarios_rol_estado`, `idx_mascotas_org_estado`, `idx_mascotas_ciudad_estado`, `idx_mascotas_raza_estado`, `idx_mascotas_publicada`, `idx_mascotas_oculto_estado`, `idx_solicitudes_adoptante_estado`, `idx_solicitudes_org_estado`, `idx_solicitudes_mascota_estado`, `idx_solicitudes_creado`, `idx_mensajes_org_leido`, `idx_mensajes_creado`, `idx_donaciones_estado_creado`, `idx_donaciones_tipo_estado`.
- **`CHECK` creados** (solo tras auditar que los datos existentes los cumplían): `chk_organizaciones_activo`, `chk_perfiles_cedula_len`, `chk_organizaciones_ruc_len`, `chk_mascotas_edad_valor`, `chk_mascotas_oculto`, `chk_medios_es_principal`, `chk_formularios_declaracion`, `chk_mensajes_leido`.
- **Reglas `UNIQUE`**: todas las existentes se verificaron intactas (correo, cédula, RUC, `razas(especie_id,nombre)`, `mascota_tag`, `favoritos`, `seguimientos_adopcion.solicitud_id`).
- **Auditorías ejecutadas**: las 7 consultas de huérfanos/duplicados del prompt se incluyeron como parte de la migración (solo lectura, documentadas con alias `auditoria_*`).
- **Registros huérfanos encontrados**: ninguno (la base recién creada con `db:schema` + `seed` no tiene inconsistencias).
- **Columna nueva**: `organizaciones.activo TINYINT(1) DEFAULT 1` — habilita el borrado lógico de fundaciones.
- Migración aplicada y verificada **idempotente** (ejecutada dos veces consecutivas sin error, ver sección 8).

## 6. Reglas de negocio

- **Permisos**: `requireRole` a nivel de ruta + verificación de propiedad del recurso en el `service` (fundación solo administra lo suyo; adoptante solo ve sus solicitudes; admin ve todo). Corregido el hueco de mensajes (antes cualquier rol veía todo).
- **Estados**: máquina de transiciones explícita en solicitudes (`revision→aprobada|rechazada`, `aprobada→seguimiento|rechazada`) y en fundaciones (`pendiente→aprobada|rechazada`, terminal); ambas rechazan reprocesar una solicitud ya resuelta.
- **Borrado lógico**: mascotas (ya existía la columna, ahora sí se usa), organizaciones (columna nueva), donaciones (cancelación), usuarios (suspensión, ya existía). Seguimientos: se decidió **no** permitir borrado ni siquiera lógico (el endpoint `DELETE` siempre responde 409) porque funcionan como evidencia legal de la adopción.
- **Duplicados**: favoritos (PK compuesta + `INSERT IGNORE`), tags de mascota (verificación previa), solicitudes activas por mascota/usuario (verificado dentro de la transacción con bloqueo).
- **Concurrencia**: aprobación de solicitudes usa `SELECT ... FOR UPDATE` sobre la mascota y sobre la propia solicitud dentro de una transacción, revalidando la transición de estado dentro del bloqueo (no solo antes de escribir).
- **Transacciones**: registro de usuario, creación/actualización de mascota (+tags+medios), creación de solicitud (+formulario+evidencias), aprobación de fundación (usuario+perfil+organización+estado), aprobación/rechazo de solicitud (+cierre de solicitudes competidoras).

## 7. Seguridad

- JWT con `sub/correo/rol`, expiración configurable, secreto obligatorio (el proceso no arranca sin `JWT_SECRET` ≥32 caracteres).
- Contraseñas con `bcrypt` (factor 12); nunca se devuelve el hash (verificado en `mappers.test.ts`).
- **Corregido**: `POST /auth/reset-password` (account takeover sin verificación) → `PATCH /auth/password` (requiere la contraseña actual).
- **Corregido**: password hardcodeada al aprobar fundaciones → generada aleatoriamente con `crypto.randomBytes`, devuelta una única vez en la respuesta, nunca logueada.
- **Corregido**: fuga de mensajes de contacto a cualquier rol autenticado.
- CORS con whitelist explícita (`FRONTEND_ORIGIN`/`FRONTEND_ORIGINS`), `helmet` agregado, rate limiting general (300/15min) + estricto en auth (30/15min, ahora también cubre `/auth/password`).
- SQL parametrizado en el 100% de las consultas (ningún endpoint interpola valores del usuario directamente en SQL); `sortBy` siempre resuelto contra listas blancas (`buildSortClause`), nunca concatenado.
- `errorHandler` nunca expone SQL/stack en las respuestas; los logs de error de MySQL van a `console.error` del servidor, no a la respuesta HTTP.

## 8. Pruebas ejecutadas

Comandos reales y resultados reales (ejecutados en este entorno, contra MySQL local real):

```
npm install            : PASS (75 paquetes agregados: helmet, vitest, supertest, @types/supertest)
npm run db:schema      : PASS (creó huellitas_solidarias_db, no existía previamente)
npm run db:migrate     : PASS — ejecutado 2 veces consecutivas sin error (idempotente confirmado)
npm run seed           : PASS
npx tsc --noEmit       : PASS (sin errores)
npm run build          : PASS (tsc -> dist/)
npm test (vitest run)  : PASS — 39 pruebas, 6 archivos, ejecutado 2 veces consecutivas sin fallos
npm run lint           : NO EXISTE (no había ESLint instalado antes de este trabajo; no se inventó su ejecución)
```

Desglose de los 39 tests:
- Unitarios (26): `pagination.test.ts` (10), `edad.test.ts` (6), `mappers.test.ts` (2) — sin BD.
- Integración (13, contra la BD real de desarrollo vía Supertest+`createApp()`): `auth.test.ts` (8: registro, duplicado, login válido/inválido, ruta protegida sin token, rol insuficiente, cuenta suspendida, cambio de contraseña), `mascotas.test.ts` (6: paginación, filtro por especie, creación por fundación, rechazo por usuario, fundación no edita mascota ajena, soft delete sin romper por FK), `favoritos.test.ts` (7: agregar, duplicado sin fallar, verificar, listar, eliminar, toggle, fundación no puede usar el módulo).

**Nota real sobre las pruebas de integración**: no existe una base de datos de pruebas separada; corren contra la misma BD de desarrollo. Durante el desarrollo de este informe se encontraron y corrigieron dos causas reales de "flakiness" (no eran bugs del backend, sino defectos de diseño de los propios tests): (a) un valor de cédula fijo colisionaba con corridas anteriores por la restricción `UNIQUE`, y (b) el test de favoritos asumía que la mascota de referencia siempre empezaba "no favorita", cuando el estado persiste entre corridas. Ambos se corrigieron generando valores únicos por corrida y normalizando el estado inicial explícitamente.

## 9. Pruebas manuales

Ejecutadas con `curl` contra el servidor real (`npx tsx src/index.ts`, puertos 3010–3012 para no chocar con otro proceso Node ya corriendo en 3000 en esta máquina):

- `GET /health` → 200, `database:"connected"`.
- `GET /mascotas/publicas?page=1&limit=2` → paginación correcta (`total`, `totalPages`, etc.).
- `GET /catalogos/especies`, `/catalogos/roles`, `/catalogos/razas?especieId=1` → OK.
- `GET /configuracion-sitio`, `PATCH /configuracion-sitio` (admin) → OK.
- `POST /auth/login` (admin, fundación, usuario) → tokens válidos.
- `GET /auth/usuarios?page=1&limit=5` (admin) → paginado.
- `GET /mensajes` con rol `usuario` → **403** (antes exponía todo; confirma el fix).
- `PATCH /auth/password` con contraseña actual correcta/incorrecta → 200/401.
- `POST /auth/reset-password` (endpoint viejo) → **404** (confirmado eliminado).
- `DELETE /mascotas/4` (mascota con solicitud histórica) → **204** (antes esto causaba un 500 por FK; confirma el fix del bug crítico), y `GET /mascotas/4` posterior → 404 (oculta correctamente). Se restauró manualmente al estado original tras la prueba.
- `GET /fundaciones/me` (fundación) → perfil real de la organización.
- `POST /donaciones` → crear; `PATCH /donaciones/:id/estado` (admin) → cambia estado; `DELETE /donaciones/:id` sobre una ya "Completado" → **409** (bloqueo correcto).
- `DELETE /seguimientos-adopcion/:id` sobre un id inexistente → 404; sin token → 401 (ruta protegida correctamente).

## 10. Pendientes

- **Generic `PATCH /donaciones/:id`** (edición de campos distintos al estado) no se implementó — solo `PATCH /:id/estado` y `DELETE` (cancelación). Bajo impacto: no estaba entre los flujos críticos del negocio.
- **Envío real de correo** para la contraseña temporal de fundaciones aprobadas y para un flujo de "olvidé mi contraseña": no hay infraestructura de email en el proyecto; documentado como limitación conocida (ver sección 11).
- **Catálogos administrativos** (crear/editar catálogos vía API): se dejaron de solo lectura, tal como pide el prompt explícitamente ("no crear un módulo completo por cada tabla catálogo").
- **ESLint**: no estaba instalado antes de este trabajo y no se agregó (fuera del alcance solicitado; se documenta en vez de inventar su ejecución).
- Los tests de integración no cubren el 100% de los flujos (p. ej., no hay test automatizado de la aprobación de solicitudes bajo concurrencia real con dos requests simultáneos, aunque la lógica de bloqueo (`SELECT...FOR UPDATE`) se probó manualmente por inspección de código y por los tests de transición de estado existentes).

## 11. Riesgos conocidos

- **Pruebas de integración comparten la BD de desarrollo real**: no hay aislamiento entre corridas; se mitigó generando valores únicos por corrida y normalizando estados iniciales, pero un fallo a mitad de una corrida podría dejar residuos menores (usuarios/mascotas de prueba con soft-delete, solicitudes de fundación de prueba aprobadas). No afecta la integridad referencial (todo pasa por las mismas reglas de negocio que producción), pero sí acumula filas de prueba con el tiempo.
- **Password temporal de fundaciones sin canal de entrega real**: se retorna una sola vez en la respuesta HTTP al admin que aprueba; si el admin no la copia en ese momento, no hay forma de recuperarla salvo un nuevo cambio de contraseña administrativo. Aceptable para un entorno académico sin SMTP configurado.
- **Todas las FK relevantes siguen en `RESTRICT`/sin acción explícita** (decisión deliberada): esto es correcto para preservar datos, pero significa que cualquier futuro intento de `DELETE` físico sobre catálogos en uso fallará con `ER_ROW_IS_REFERENCED_2` — ya manejado por el `errorHandler` (409), pero vale tenerlo presente si se agregan nuevas features de administración de catálogos.
- **`.env` fue creado por esta sesión** con un `JWT_SECRET` generado aleatoriamente y credenciales de MySQL provistas por el usuario en el chat (`root`/`root`) — el usuario debe rotar el secreto antes de cualquier despliegue real y nunca commitear `.env`.

## 12. Instrucciones para ejecutar

```bash
npm install

# Base de datos (una sola vez; requiere MySQL 8 corriendo y .env configurado)
npm run db:schema     # crea huellitas_solidarias_db desde cero
npm run db:migrate    # aplica índices/checks/columna activo (idempotente)
npm run seed          # datos de desarrollo (usuarios/mascotas/solicitudes demo)

# Desarrollo
npm run dev            # nodemon + tsx, http://localhost:3000

# Pruebas (requiere la BD ya migrada/sembrada)
npm test

# Producción
npm run build
npm start
```

Cuentas demo (`npm run seed`): `admin@huellitas.com` / `fundacion@huellitas.com` / `maria.torres@correo.com`, todas con password `Huellitas123`.

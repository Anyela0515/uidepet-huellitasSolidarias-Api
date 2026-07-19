# Revisión inicial del backend — Huellitas Solidarias

Diagnóstico realizado antes de implementar los cambios de este ciclo (2026-07-19), sobre el estado real del repositorio `uidepet-huellitasSolidarias-Api`.

## Estructura encontrada

Arquitectura por capas real (plana, sin `/api/v1` ni `routers/v1`):

```
src/
├── index.ts
├── config/database.ts
├── controllers/  auth, mascota, solicitud, fundacion, favorito, mensaje, donacion
├── services/     (mismos módulos)
├── repositories/ (mismos módulos + catalog.repository.ts interno)
├── routes/       auth, mascotas, solicitudes, fundaciones, favoritos, mensajes, donaciones
├── schemas/       auth, mascota, solicitud, fundacion, general
├── middlewares/   auth (JWT+roles), errorHandler, logger, rateLimiter
├── types/frontend.ts
└── utils/        asyncHandler, dates, edad, mappers
```

`db/schema.sql` define 26 tablas en 3FN, con catálogos, usuarios/organizaciones, mascotas, adopciones, favoritos/mensajes/donaciones y `configuracion_sitio`. `db/seed.mjs` siembra datos de desarrollo (destructivo vía `TRUNCATE` de tablas transaccionales, no de catálogos).

## Módulos existentes

Auth (incluye gestión de usuarios), Mascotas, Solicitudes de adopción (incluye seguimiento embebido), Fundaciones (en realidad, solicitudes de registro de organización), Favoritos, Mensajes, Donaciones.

## Módulos incompletos o ausentes

- **Catálogos**: no expuestos vía API (solo uso interno en `catalog.repository.ts`).
- **Configuración del sitio**: tabla lista, cero código (controller/service/repository/ruta).
- **Perfil de organización** (`organizaciones`): sin endpoints propios (`me`, editar, desactivar).
- **Seguimientos de adopción** como recurso independiente: solo existía la creación embebida en `/solicitudes/:id/seguimiento`.
- Sin framework de tests instalado (0% cobertura).

## Problemas encontrados (por severidad)

1. **Crítico** — `mascota.service.eliminarMascota` hacía `DELETE FROM mascotas` físico. Con cualquier solicitud histórica (FK sin cascada), esto producía `ER_ROW_IS_REFERENCED_2` sin capturar → 500 sin control, pese a existir ya `oculto`/`estado=Eliminado` para soportar borrado lógico.
2. **Crítico (seguridad)** — `mensaje.service.listarMensajes`: cualquier rol autenticado distinto de `fundacion` caía en `findAll()`, exponiendo todos los mensajes de contacto de todas las fundaciones a cualquier usuario.
3. **Crítico (seguridad)** — `POST /auth/reset-password` permitía tomar cualquier cuenta solo con el correo, sin verificación (account takeover).
4. **Alto** — Password fija (`"Huellitas123"`) hardcodeada en el código al aprobar una fundación; aprobación + creación de usuario no eran atómicas.
5. **Alto** — `mascota.repository.create/update` hacían múltiples INSERT/DELETE relacionados sin transacción.
6. **Medio** — Ningún listado tenía paginación real (mascotas con `LIMIT 20` fijo sin offset/total; el resto sin límite alguno).
7. **Medio** — `errorHandler` solo distinguía `ZodError` vs. 500 genérico; no reconocía errores MySQL (`ER_DUP_ENTRY`, `ER_ROW_IS_REFERENCED_2`, etc.) ni una clase de error de dominio.
8. **Bajo** — `README.md` y `openapi.yaml` describían una API completamente distinta (rutas `/v1/...`, campos en otro idioma/formato) que no correspondía al código real.
9. **Bajo** — Sin graceful shutdown, sin `helmet`, pool de conexiones con tamaño fijo no configurable por env.

## Decisión de alcance

Se mantiene la estructura plana real (no se migra a `routers/v1` ni se antepone `/api/v1`), priorizando no romper el contrato que ya consume el frontend, tal como indica el criterio de "usar el código real como fuente de verdad" cuando difiere del árbol ideal propuesto.

Ver [`docs/reports/INFORME_IMPLEMENTACION_BACKEND.md`](../reports/INFORME_IMPLEMENTACION_BACKEND.md) para el detalle de qué se implementó en respuesta a cada punto de este diagnóstico.

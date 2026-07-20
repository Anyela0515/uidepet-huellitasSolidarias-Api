# Huellitas Solidarias — API

Backend de **Huellitas Solidarias**, plataforma de adopción responsable de mascotas: fundaciones, solicitudes de adopción, seguimiento post-adopción, favoritos, mensajes de contacto y donaciones.

Node.js + Express + TypeScript + MySQL 8 (`mysql2/promise`), arquitectura por capas (`routes → controllers → services → repositories → MySQL`), autenticación JWT y autorización por roles (`usuario`, `fundacion`, `admin`).

> Este README describe el estado **real** del código. Las rutas no llevan prefijo de versión (`/mascotas`, no `/api/v1/mascotas`): es una decisión deliberada para no romper el frontend ya conectado.

---

## Requisitos

- Node.js 20+
- MySQL 8
- npm

## Instalación

```bash
npm install
```

## Variables de entorno

Copia `.env.example` a `.env` y completa según tu entorno local:

```env
PORT=3000
NODE_ENV=development
FRONTEND_ORIGIN=http://localhost:5173
# FRONTEND_ORIGINS=https://tu-frontend.vercel.app

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=huellitas_solidarias_db
DB_CONNECTION_LIMIT=10

JWT_SECRET=coloca_aqui_tu_clave_secreta_jwt_minimo_32_caracteres
JWT_EXPIRES_IN=8h
```

El servidor **rechaza arrancar** si `JWT_SECRET` falta o tiene menos de 32 caracteres.

## Base de datos

```bash
# 1. Crea el esquema completo (DROP + CREATE DATABASE, catálogos incluidos)
npm run db:schema

# 2. Aplica la migración de integridad (aditiva, no destructiva, idempotente)
npm run db:migrate

# 3. Siembra datos de desarrollo (usuarios demo, mascotas, solicitudes...)
npm run seed

# Atajo para 1+3 (sin la migración)
npm run db:reset
```

La migración (`db/migrations/2026_07_19_integridad_y_backend_huellitas.sql`) agrega:
- `organizaciones.activo` (borrado lógico de fundaciones).
- Restricciones `CHECK` compatibles con los datos existentes (cédula, RUC, edad, booleanos), auditando antes de aplicarlas.
- Índices compuestos para las consultas reales del backend (mascotas, solicitudes, mensajes, donaciones, usuarios).


## Desarrollo

```bash
npm run dev
```

Arranca con `nodemon` + `tsx` sobre `src/index.ts`. Health check: `GET /health` (verifica conexión real a MySQL con `SELECT 1`).

## Compilación

```bash
npm run build   # tsc -> dist/
npm start       # node dist/index.js
```

## Pruebas

```bash
npm test          # vitest run (una sola vez)
npm run test:unit # unitarias sin conexión a MySQL
npm run test:watch
```

## Calidad y contrato de la API

```bash
npm run typecheck      # valida TypeScript sin generar dist/
npm run lint           # analiza TypeScript y scripts del proyecto
npm run openapi:lint   # valida openapi.yaml con Redocly
npm run check          # ejecuta todos los controles anteriores y las pruebas
```

GitHub Actions ejecuta automáticamente estos controles, la suite completa y la
compilación en cada `push` a `main` y en cada pull request. Para las pruebas de
integración levanta un servicio MySQL efímero, aplica el esquema y la migración,
y carga el seed sin tocar bases de datos externas.

- **Unitarias** (`src/utils/*.test.ts`): paginación, parseo de edad, mappers — no requieren base de datos.
- **Integración** (`src/__tests__/*.test.ts`): usan Supertest contra la app real (`src/app.ts`) y la **base de datos de desarrollo** ya migrada y sembrada. No existe una base de datos de pruebas separada ni mocking de MySQL: ejecuta `npm run db:schema && npm run db:migrate && npm run seed` antes de correr los tests. Los tests crean datos efímeros (usuarios/mascotas de prueba con correos e IDs únicos por timestamp) y limpian lo que pueden (borrado lógico), pero pueden dejar algún residuo menor en la base de desarrollo — es un trade-off aceptado para un proyecto académico sin infraestructura de test containers.

## Estructura del proyecto

```text
src/
├── index.ts              # arranque: createApp() + listen + graceful shutdown
├── app.ts                # construcción de la app Express (usada también por los tests)
├── config/database.ts    # pool mysql2/promise
├── controllers/          # leen req, llaman al service, arman la respuesta HTTP
├── services/             # reglas de negocio, transacciones, permisos
├── repositories/         # SQL parametrizado, mapeo de filas
├── routes/               # definición de endpoints + middlewares por ruta
├── schemas/               # validación Zod
├── middlewares/          # auth (JWT + roles), errorHandler, logger, rateLimiter
├── types/frontend.ts     # contrato camelCase que consume el frontend
└── utils/                # asyncHandler, pagination, mappers, edad, dates, errors
```

## Paginación

Todos los listados que pueden crecer devuelven:

```json
{
  "success": true,
  "data": [],
  "pagination": {
    "page": 1, "limit": 10, "total": 0, "totalPages": 0,
    "hasNextPage": false, "hasPreviousPage": false
  }
}
```

Parámetros: `page` (default 1), `limit` (default 10, máximo 100), `sortBy`/`sortOrder` contra una lista blanca de columnas por endpoint (nunca se interpola directamente el input del usuario en el `ORDER BY`).

## Roles y autorización

```
usuario    — adoptante
fundacion  — organización de rescate/adopción
admin      — administración de la plataforma
```

Middleware `requireRole("fundacion", "admin")` en las rutas; además cada `service` valida **pertenencia del recurso** (una fundación nunca administra mascotas, solicitudes o mensajes de otra).

## Rutas principales y contrato completo

Ver [`docs/api/ENDPOINTS_FRONTEND.md`](docs/api/ENDPOINTS_FRONTEND.md) (tabla completa por endpoint: auth, roles, params, body, respuestas, errores) y [`openapi.yaml`](openapi.yaml).

Resumen de prefijos: `/auth`, `/mascotas`, `/solicitudes`, `/seguimientos-adopcion`, `/fundaciones`, `/favoritos`, `/mensajes`, `/donaciones`, `/catalogos`, `/configuracion-sitio`, `/health`.

## Conectar el frontend

Ver [`docs/api/FRONTEND_INTEGRATION_EXAMPLE.ts`](docs/api/FRONTEND_INTEGRATION_EXAMPLE.ts): instancia Axios, interceptor de JWT, manejo de 401, ejemplos de login/listado paginado/favoritos/solicitudes.

## Códigos de error

Toda respuesta de error: `{ success: false, code, error, message, errorCode, details? }`. Ver la tabla de `errorCode` en `docs/api/ENDPOINTS_FRONTEND.md`. Nunca se expone SQL, stack traces, hashes de contraseña ni tokens completos en logs.

## Documentación adicional

- [`docs/reviews/REVISION_BACKEND_HUELLITAS.md`](docs/reviews/REVISION_BACKEND_HUELLITAS.md) — diagnóstico inicial detallado.
- [`docs/reports/INFORME_IMPLEMENTACION_BACKEND.md`](docs/reports/INFORME_IMPLEMENTACION_BACKEND.md) — informe final de la implementación (qué se hizo, qué quedó pendiente, riesgos conocidos).
- [`docs/api/ENDPOINTS_FRONTEND.md`](docs/api/ENDPOINTS_FRONTEND.md) — contrato completo por endpoint.
- [`openapi.yaml`](openapi.yaml) — especificación OpenAPI 3.0.3.

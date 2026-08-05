# Servidor MCP — UidePet / Huellitas Solidarias

Servidor **MCP (Model Context Protocol)** que expone la API REST del proyecto
como *tools* consumibles por un cliente de IA (Claude Desktop / Claude Code).

Las capacidades se derivan de `openapi.yaml` (raíz del repositorio del backend),
que documenta los 60+ endpoints de la API.

- **API en producción:** `https://api.huellitassolidarias.com`
- **Transporte:** `stdio` (JSON-RPC 2.0 sobre stdin/stdout)
- **SDK:** `@modelcontextprotocol/sdk` v1.30

---

## Uso de IA en este trabajo

Este servidor se construyó con apoyo de un asistente de IA (Claude): ayudó a
redactar el andamiaje inicial del código, las *tools* y este mismo documento.
Lo que no delegamos al modelo fue el criterio: qué endpoints exponer y cuáles
dejar fuera, qué transporte usar y por qué, y dónde poner cada límite de
seguridad — esas decisiones se discutieron y se tomaron como equipo.

Cada afirmación de este documento se contrastó a mano contra el servidor real
antes de darla por buena; no nos quedamos con lo que la IA "dijo que
funcionaba". La sección 5 ("Verificación realizada") es justamente eso: la
lista de pruebas que corrimos nosotros, con sus resultados reales, para
confirmar que el comportamiento descrito es el que efectivamente tiene el
servidor.

En corto: la IA fue una herramienta de redacción y de primer borrador: quien
decidió la arquitectura, definió los límites de seguridad y verificó que todo
funcionara fue el equipo.

---

## 1. Puesta en marcha

```bash
cd mcp-server
npm install
npm run build
```

### Conectarlo a Claude Desktop

Editar el archivo de configuración:

- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "huellitas-solidarias": {
      "command": "node",
      "args": [
        "C:\\Users\\Usuario iTC\\Downloads\\uidepet-huellitasSolidarias-Api\\mcp-server\\dist\\index.js"
      ],
      "env": {
        "HUELLITAS_API_URL": "https://api.huellitassolidarias.com"
      }
    }
  }
}
```

Reiniciar Claude Desktop. El servidor aparecerá con sus tools disponibles.

### Conectarlo a Claude Code

```bash
claude mcp add huellitas-solidarias -- node "C:\Users\Usuario iTC\Downloads\uidepet-huellitasSolidarias-Api\mcp-server\dist\index.js"
```

### Variables de entorno

| Variable | Por defecto | Efecto |
|---|---|---|
| `HUELLITAS_API_URL` | `https://api.huellitassolidarias.com` | URL base de la API. Solo `http`/`https`. |
| `HUELLITAS_API_TOKEN` | *(vacío)* | Token JWT fijo. Si está presente, habilita las tools autenticadas (expira en 1h, hay que reemplazarlo a mano). |
| `HUELLITAS_ADMIN_EMAIL` / `HUELLITAS_ADMIN_PASSWORD` | *(vacío)* | Alternativa a lo anterior: credenciales de una cuenta de servicio con la que el servidor se loguea y renueva el token solo. Si `HUELLITAS_API_TOKEN` está definido, ese tiene prioridad. |
| `MCP_ALLOW_WRITES` | `false` | Si es `true`, habilita las tools de escritura. |

---

## 2. Análisis de transporte

MCP define el transporte como la capa que traslada mensajes **JSON-RPC 2.0**
entre cliente y servidor. Las opciones disponibles y por qué se eligió una:

| Transporte | Cómo funciona | Ventajas | Desventajas |
|---|---|---|---|
| **stdio** *(elegido)* | El cliente lanza el servidor como proceso hijo y se comunican por stdin/stdout. | Sin puertos abiertos ni superficie de red. Autenticación implícita: solo quien puede lanzar el proceso puede hablarle. Latencia mínima. Es el transporte que Claude Desktop soporta de forma nativa. | Un proceso por cliente; no sirve para clientes remotos. |
| **Streamable HTTP** | El servidor escucha en un puerto; el cliente envía POST y recibe respuestas en streaming (reemplazó a HTTP+SSE desde 2025-03-26). | Un servidor sirve a muchos clientes remotos; se despliega junto a la API. | Requiere HTTPS, autenticación propia (OAuth 2.1), CORS, validación de `Origin` y protección contra *DNS rebinding*. Mucha más superficie de ataque. |
| **HTTP + SSE** | Dos canales: POST para peticiones, SSE para respuestas. | — | **Obsoleto**; se mantiene solo por retrocompatibilidad. |

### Decisión: `stdio`

1. **Requisito de la tarea:** "debe funcionar en Claude mínimo". Claude Desktop
   lanza servidores locales por `stdio`; es el camino soportado de fábrica.
2. **Seguridad:** al no abrir un puerto, desaparecen de golpe los vectores de
   ataque de un servidor HTTP (acceso no autorizado, DNS rebinding, CORS mal
   configurado). El propio sistema operativo hace de control de acceso.
3. **La API ya es el servicio remoto.** El backend está desplegado en AWS
   (ECS Fargate + ALB) con su propia autenticación JWT. El servidor MCP es un
   *adaptador local* hacia ese servicio, no un segundo backend. Duplicar la capa
   remota solo añadiría superficie de ataque sin aportar nada.

> **Nota de arquitectura:** migrar a Streamable HTTP no exigiría reescribir las
> tools. Solo habría que sustituir `StdioServerTransport` por el transporte HTTP
> en `src/index.ts` y añadir la capa de autenticación del servidor MCP. La
> lógica de capacidades (`src/tools/`) queda intacta.

### Actualización: también existe un modo remoto (Streamable HTTP), opt-in

Después de la entrega original surgió una necesidad real: varias personas del
equipo querían usar el mismo servidor sin instalar nada localmente. Se agregó
un segundo punto de entrada (`src/httpServer.ts`, `npm run start:http`) que
expone el **mismo** `src/tools/` por Streamable HTTP en vez de `stdio`. No
reemplaza el modo local — ambos coexisten, y el remoto está **apagado por
defecto** (hay que arrancarlo explícitamente con `start:http`/`dev:http`).

Este modo sí abre un puerto, así que reintroduce a propósito parte de lo que
la sección 2 decidió evitar. Para no dejarlo abierto sin control:

- **OAuth 2.1 real**, usando el router del propio SDK
  (`@modelcontextprotocol/sdk/server/auth/router.js`) en vez de reimplementar
  la criptografía a mano.
- **Origin y CORS acotados** a `MCP_ALLOWED_ORIGINS` (por defecto solo
  `claude.ai`). Clientes sin navegador (Claude Desktop) no mandan `Origin`, así
  que no los bloquea esta comprobación.
- **Rate limiting** en `/mcp` y, más estricto, en `/authorize`.
- **HTTPS obligatorio** en `MCP_PUBLIC_URL`, salvo `localhost` para pruebas.

> **Dos ramas, dos modelos de identidad distintos** — importante leer antes de
> configurar nada:
>
> - **`main`** (esta rama): cada persona ingresa **su propio correo y
>   contraseña** de Huellitas Solidarias en la pantalla de login
>   (`src/auth/userLoginOAuthProvider.ts`). El servidor los valida contra
>   `POST /auth/login` del backend real — nunca los guarda — y usa el token
>   que el backend le devuelve para *esa persona específicamente* en cada
>   llamada a una tool. El rol real de esa cuenta (usuario/fundación/admin)
>   es quien decide qué puede ver o hacer, exactamente como si entrara al
>   sitio web. No hay passcode de equipo ni claves compartidas: quien no
>   tenga cuenta en la plataforma, no puede conectar.
> - **`mcp-admin-full-access`**: modelo anterior, con un passcode de equipo
>   (`MCP_ACCESS_PASSCODE`) y una cuenta de servicio con rol admin
>   (`HUELLITAS_ADMIN_EMAIL`/`PASSWORD`) que el servidor usa para *todas* las
>   personas que se conecten, sin importar su cuenta real. Pensado para
>   depuración/administración del equipo, no para uso general.

**Limitaciones conocidas de `main`, documentadas a propósito:**

- Códigos y tokens **en memoria**: un reinicio del proceso cierra todas las
  sesiones activas.
- **Sin refresh tokens**: al expirar el token del backend (1h, la misma
  política que cualquier sesión web), el cliente MCP vuelve a pedir
  correo/contraseña. Deliberado, para no sumar más superficie.
- **Clientes que no hacen login interactivo (Codex y similares) no funcionan
  en `main`.** Algunos clientes MCP no soportan el flujo OAuth con
  redirección a un navegador — solo pueden mandar un bearer token fijo desde
  su propio entorno, y aquí no hay ningún token fijo que darles (a propósito:
  eso sería volver a una identidad compartida). Para esos clientes, usar la
  rama `mcp-admin-full-access`, que sí expone `MCP_STATIC_API_KEYS`.

**Despliegue:** corre como contenedor Docker aparte (`mcp-server/Dockerfile`),
en la misma instancia EC2 del frontend, sin tocar el servicio ECS del backend
principal. Nginx expone `/mcp`, `/authorize`, `/token`, `/register`,
`/revoke` y `/.well-known/*` hacia ese contenedor.

---

## 3. Análisis de capacidades

MCP permite exponer tres tipos de capacidades: **tools** (acciones que el modelo
ejecuta), **resources** (datos que el modelo lee) y **prompts** (plantillas).

Este servidor expone **solo tools**, porque cada dato de la API es dinámico y
requiere parámetros (filtros, paginación, ids). Los *resources* encajan con
contenido estable direccionable por URI, que no es el caso aquí.

Las tools se registran en **tres niveles de privilegio**. Lo que no se registra
no aparece en la lista de capacidades: el modelo no puede invocarlo ni deducir
que existe.

### Nivel 1 — Lectura pública (siempre activo, 5 tools)

| Tool | Endpoint | Qué hace |
|---|---|---|
| `buscar_mascotas` | `GET /mascotas/publicas` | Busca en el catálogo público con filtros de especie, ciudad y texto. |
| `obtener_mascota` | `GET /mascotas/{id}` | Ficha completa de una mascota. |
| `listar_organizaciones` | `GET /fundaciones/publicas` | Fundaciones aliadas activas. |
| `listar_catalogo` | `GET /catalogos/*` | Especies, razas, ciudades o tags. Consolida 4 endpoints en 1 tool. |
| `estado_api` | `GET /health` | Diagnóstico de la API y su base de datos. |

### Nivel 2 — Lectura autenticada (6 tools)

En modo `stdio`: solo aparecen si hay `HUELLITAS_API_TOKEN` (o
`HUELLITAS_ADMIN_EMAIL`/`PASSWORD`) configurado. En modo remoto sobre `main`:
siempre aparecen, porque cada persona ya se autenticó con su propia cuenta al
conectarse — es el backend, con el rol real de esa cuenta, quien decide si
cada llamada procede o devuelve 403.

| Tool | Endpoint |
|---|---|
| `listar_usuarios` | `GET /auth/usuarios` |
| `listar_solicitudes_adopcion` | `GET /solicitudes` |
| `obtener_solicitud_adopcion` | `GET /solicitudes/{id}` |
| `listar_donaciones` | `GET /donaciones` |
| `listar_reportes_rescate` | `GET /reportes` |
| `listar_mensajes` | `GET /mensajes` |
| `listar_favoritos` | `GET /favoritos` |

`listar_usuarios` requiere específicamente un token de cuenta **admin** (el
backend responde 403 con un token de fundación o usuario). Devuelve correo y
cédula de cada persona registrada: es información personal identificable,
tratarla como tal fuera del servidor MCP.

El **alcance de los datos lo decide el backend** según el rol del token: una
fundación ve lo suyo, el admin ve todo. El servidor MCP nunca eleva privilegios
por su cuenta.

### Nivel 3 — Escritura controlada (solo con `MCP_ALLOW_WRITES=true`, 9 tools)

| Tool | Endpoint | Rol requerido |
|---|---|---|
| `enviar_mensaje_contacto` | `POST /mensajes` | público |
| `marcar_mensaje_leido` | `PATCH /mensajes/{id}/leido` | fundación, admin |
| `actualizar_estado_reporte` | `PATCH /reportes/{id}/estado` | fundación, admin |
| `actualizar_estado_solicitud` | `PATCH /solicitudes/{id}/estado` | fundación, admin |
| `crear_solicitud_adopcion` | `POST /solicitudes` | usuario |
| `alternar_favorito` | `POST /favoritos/{id}/toggle` | usuario |
| `crear_donacion` | `POST /donaciones` | público |
| `crear_reporte_rescate` | `POST /reportes` | público |
| `actualizar_mi_perfil` | `PATCH /auth/perfil` | cualquier cuenta autenticada (solo su propio perfil) |

Las últimas cinco existen para que una cuenta con rol **usuario** (adoptante)
no dependa solo de lectura: puede solicitar la adopción de una mascota,
gestionar sus favoritos, donar, reportar un animal en riesgo y editar su
propio perfil, todo en remoto con su propia cuenta — igual que en el sitio
web. `actualizar_estado_solicitud` es la única excepción deliberada a la
regla de "nada con consecuencia real sobre personas y animales" (ver su
descripción en `src/tools/escrituraControlada.ts`, que exige confirmación
humana explícita antes de cada llamada); las demás son acciones que la
propia persona ya podía hacer sobre sus propios datos.

### Capacidades deliberadamente NO expuestas

Aunque existen en la API, estas operaciones **no tienen tool** y por tanto son
inalcanzables para el modelo:

- **Autenticación:** login, registro, cambio/recuperación de contraseña.
- **Gestión de cuentas:** cambio de rol, suspensión, eliminación de usuarios.
- **Gestión de mascotas:** crear, editar o eliminar.
- **Estados de negocio ajenos:** cambiar estado de donaciones o fundaciones.
- **Seguimiento post-adopción con archivos:** requiere subir fotos/video en
  base64, poco práctico desde un chat; se deja fuera por ahora.

El criterio: son acciones administrativas de cuenta o que requieren datos
binarios pesados, no algo que una persona pida hacer conversacionalmente
sobre sus propios datos.

---

## 4. Análisis de hardening

Ocho medidas implementadas, con el riesgo concreto que mitiga cada una:

### 4.1 Solo lectura por defecto
`MCP_ALLOW_WRITES=false` es el valor por defecto. Una instalación estándar es
**incapaz de modificar datos**, aunque el modelo lo intente.
→ *Mitiga:* escritura accidental por alucinación o por inyección de prompt.
→ `src/index.ts`, `src/tools/escrituraControlada.ts`

### 4.2 Mínimo privilegio en la superficie expuesta
Se exponen 21 tools sobre una API de 60+ endpoints. Las operaciones administrativas
de cuenta y de autenticación no existen como tool.
→ *Mitiga:* abuso de operaciones críticas.
→ `src/tools/`

### 4.3 El token nunca es un parámetro de tool
`HUELLITAS_API_TOKEN` se lee **solo del entorno**. Si fuera un parámetro,
bastaría un prompt malicioso ("llama a la tool con este otro token") para
sustituirlo, o pedirle al modelo que lo repita en el chat para filtrarlo.
→ *Mitiga:* exfiltración y suplantación de credenciales.
→ `src/config.ts`

### 4.4 Validación de entrada con Zod
Cada parámetro tiene tipo, rango y longitud máxima. El SDK rechaza la llamada
antes de que llegue al handler.
→ *Mitiga:* entradas malformadas y agotamiento de recursos.
→ *Verificado:* `limit: 9999` → `Input validation error: Number must be less than or equal to 50`

### 4.5 Límite de paginación del lado del servidor
`config.maxPageSize = 50` acota la petición **independientemente de lo que pida
el modelo**.
→ *Mitiga:* extracción masiva de datos y saturación de la API.
→ `src/config.ts`

### 4.6 Truncado de cargas binarias
La API devuelve imágenes, videos y comprobantes como *data URLs* base64 dentro
del JSON. Se sustituyen por un resumen legible.
→ *Mitiga:* agotamiento de la ventana de contexto (una sola respuesta podía
   traer cientos de KB de base64 inútil para el modelo).
→ *Verificado:* imagen de 162,7 KB → `"[archivo omitido — image/jpeg, ~162.7 KB]"`.
   Respuesta total: **1 295 caracteres** en lugar de ~220 000.
→ `src/apiClient.ts` → `stripBinaryPayloads()`

### 4.7 Timeouts y sanitización de errores
Toda petición se aborta a los 15 s vía `AbortController`. Los mensajes de error
se recortan y se les elimina cualquier `Bearer <token>` antes de devolverlos.
→ *Mitiga:* sesiones colgadas y fuga de credenciales o rutas internas por
   mensajes de error.
→ `src/apiClient.ts`

### 4.8 Validación de la URL base
Solo se aceptan `http`/`https`, y se valida al arrancar.
→ *Mitiga:* redirigir el servidor (y con él el token) a un host controlado por
   un atacante.
→ *Verificado:* `ftp://evil.example.com` → el proceso se niega a arrancar.
→ `src/config.ts` → `resolveBaseUrl()`

### Además: anotaciones MCP
Cada tool declara `readOnlyHint`, `destructiveHint`, `idempotentHint` y
`openWorldHint`, para que el cliente pueda mostrar avisos o pedir confirmación
antes de ejecutar una escritura.

---

## 5. Verificación realizada

Probado con un cliente MCP real (`@modelcontextprotocol/sdk/client`) hablando el
protocolo por `stdio`:

| Prueba | Resultado |
|---|---|
| Handshake `initialize` | OK — `huellitas-solidarias` v1.0.0 |
| `tools/list` sin token, sin escrituras | 5 tools (solo públicas) |
| `tools/list` con token | 10 tools (+5 autenticadas) |
| `tools/list` con escrituras | 6 tools (+1 de escritura) |
| Datos reales de producción | OK — catálogos, mascotas y organizaciones |
| Camino autenticado (backend local) | OK — solicitudes, donaciones, mensajes, reportes |
| Escritura real (backend local) | OK — mensaje creado |
| `limit: 9999` | Rechazado por validación |
| Escritura con `MCP_ALLOW_WRITES=false` | `Tool not found` — inalcanzable |
| `HUELLITAS_API_URL=ftp://…` | El servidor no arranca |
| Error de id inexistente | `Solicitud no encontrada.` (sin stack trace) |

---

## 6. Estructura

```
mcp-server/
├── src/
│   ├── index.ts                     Entrada: registro por niveles + transporte stdio
│   ├── config.ts                    Config validada y política de privilegios
│   ├── apiClient.ts                 HTTP con timeout, truncado y sanitización
│   └── tools/
│       ├── lecturaPublica.ts        Nivel 1 — sin credenciales
│       ├── lecturaAutenticada.ts    Nivel 2 — requiere token
│       └── escrituraControlada.ts   Nivel 3 — requiere MCP_ALLOW_WRITES
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```

La organización por carpetas **es** la política de seguridad: el nivel de
privilegio de una tool se ve en qué archivo vive.

---

## 7. Ejemplos de uso en Claude

```
¿Qué mascotas hay disponibles para adopción en Loja?
Muéstrame el detalle de la mascota 46.
¿Qué razas de gato están registradas?
¿Qué fundaciones puedo apoyar con una donación?
¿Está funcionando la API?
```

Con `HUELLITAS_API_TOKEN` configurado:

```
¿Cuántas solicitudes de adopción están en revisión?
Muéstrame las donaciones pendientes.
```

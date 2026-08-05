import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiRequest, formatForModel } from "../apiClient.js";
import { config } from "../config.js";

const SOLO_LECTURA = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true,
} as const;

const limiteSchema = z
  .number()
  .int()
  .min(1)
  .max(config.maxPageSize)
  .optional()
  .describe(`Registros por página (máximo ${config.maxPageSize}).`);

const paginaSchema = z.number().int().min(1).max(500).optional().describe("Número de página.");

/**
 * En modo stdio y en la rama con acceso administrativo compartido, estas
 * tools se registran solo si hay token en el entorno del servidor. En
 * `main` (modo remoto), se registran siempre que la persona conectada haya
 * iniciado sesión con su propia cuenta — `token` es el bearer DE ESA
 * PERSONA, no uno del servidor.
 *
 * El alcance de lo que devuelven lo decide el backend según el rol de ese
 * token (una fundación ve lo suyo, el admin ve todo, un usuario normal
 * probablemente reciba 403 en varias de estas): el servidor MCP no eleva
 * privilegios por su cuenta, solo reenvía la identidad de quien pregunta.
 */
export function registrarToolsLecturaAutenticada(server: McpServer, token?: string): void {
  server.registerTool(
    "listar_usuarios",
    {
      title: "Listar usuarios registrados",
      description:
        "Lista las cuentas registradas en la plataforma (adoptantes, fundaciones y administradores). " +
        "Requiere que el token configurado sea de una cuenta admin (el backend responde 403 si no). " +
        "ATENCIÓN: incluye correo y cédula de cada persona (información personal identificable); " +
        "no compartas esta salida fuera del equipo autorizado a verla.",
      inputSchema: {
        rol: z.enum(["usuario", "fundacion", "admin"]).optional().describe("Filtra por rol de la cuenta."),
        estado: z.string().max(30).optional().describe('Filtra por estado, p. ej. "Activo" o "Suspendido".'),
        search: z.string().max(100).optional().describe("Busca por nombre o correo."),
        page: paginaSchema,
        limit: limiteSchema,
      },
      annotations: SOLO_LECTURA,
    },
    async (args) => {
      const datos = await apiRequest("GET", "/auth/usuarios", { query: args, auth: token ?? true });
      return { content: [{ type: "text", text: formatForModel(datos) }] };
    }
  );

  server.registerTool(
    "listar_solicitudes_adopcion",
    {
      title: "Listar solicitudes de adopción",
      description:
        "Lista las solicitudes de adopción visibles para el token configurado. " +
        "Se puede filtrar por estado: revision, aprobada, rechazada o seguimiento. " +
        "Incluye el formulario declarado por el adoptante y sus observaciones.",
      inputSchema: {
        estado: z
          .enum(["revision", "aprobada", "rechazada", "seguimiento"])
          .optional()
          .describe("Filtra por estado de la solicitud."),
        page: paginaSchema,
        limit: limiteSchema,
      },
      annotations: SOLO_LECTURA,
    },
    async (args) => {
      const datos = await apiRequest("GET", "/solicitudes", { query: args, auth: token ?? true });
      return { content: [{ type: "text", text: formatForModel(datos) }] };
    }
  );

  server.registerTool(
    "obtener_solicitud_adopcion",
    {
      title: "Obtener el detalle de una solicitud de adopción",
      description:
        "Devuelve una solicitud completa por su código (p. ej. ADOP-2026-1785392005493), " +
        "incluyendo el formulario del adoptante, evidencias del hogar y los seguimientos post-adopción.",
      inputSchema: {
        id: z.string().min(3).max(50).describe("Código de la solicitud."),
      },
      annotations: SOLO_LECTURA,
    },
    async ({ id }) => {
      const datos = await apiRequest("GET", `/solicitudes/${encodeURIComponent(id)}`, {
        auth: token ?? true,
      });
      return { content: [{ type: "text", text: formatForModel(datos) }] };
    }
  );

  server.registerTool(
    "listar_donaciones",
    {
      title: "Listar donaciones",
      description:
        "Lista las donaciones registradas visibles para el token configurado. " +
        "Se puede filtrar por tipo (Alimento, Medicinas, Accesorios, Dinero, Otro) y por estado.",
      inputSchema: {
        tipo: z.string().max(50).optional().describe("Tipo de donación."),
        estado: z
          .enum(["Completado", "Pendiente", "Cancelado"])
          .optional()
          .describe("Estado de la donación."),
        page: paginaSchema,
        limit: limiteSchema,
      },
      annotations: SOLO_LECTURA,
    },
    async (args) => {
      const datos = await apiRequest("GET", "/donaciones", { query: args, auth: token ?? true });
      return { content: [{ type: "text", text: formatForModel(datos) }] };
    }
  );

  server.registerTool(
    "listar_reportes_rescate",
    {
      title: "Listar reportes de rescate",
      description:
        "Lista los reportes ciudadanos de animales en riesgo (requiere rol admin en el token). " +
        "Se puede filtrar por estado: recibida, revision, atendida o cerrada.",
      inputSchema: {
        estado: z
          .enum(["recibida", "revision", "atendida", "cerrada"])
          .optional()
          .describe("Estado del reporte."),
        page: paginaSchema,
        limit: limiteSchema,
      },
      annotations: SOLO_LECTURA,
    },
    async (args) => {
      const datos = await apiRequest("GET", "/reportes", { query: args, auth: token ?? true });
      return { content: [{ type: "text", text: formatForModel(datos) }] };
    }
  );

  server.registerTool(
    "listar_mensajes",
    {
      title: "Listar mensajes de contacto",
      description:
        "Lista los mensajes recibidos por la organización del token (o todos, si el token es de admin). " +
        "Incluye mensajes de contacto, avisos de nuevas solicitudes y de donaciones.",
      inputSchema: {
        leido: z.boolean().optional().describe("true = solo leídos, false = solo no leídos."),
        page: paginaSchema,
        limit: limiteSchema,
      },
      annotations: SOLO_LECTURA,
    },
    async (args) => {
      const datos = await apiRequest("GET", "/mensajes", { query: args, auth: token ?? true });
      return { content: [{ type: "text", text: formatForModel(datos) }] };
    }
  );
}

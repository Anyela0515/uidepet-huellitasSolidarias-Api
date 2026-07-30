import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiRequest, formatForModel } from "../apiClient.js";

/**
 * Única categoría de tools que modifica datos. Se registra solo cuando
 * MCP_ALLOW_WRITES=true, de modo que la instalación por defecto es incapaz de
 * escribir aunque el modelo lo intente.
 *
 * Deliberadamente se expone únicamente el endpoint público de contacto. NO se
 * exponen (ni existen como tool) las operaciones sensibles del API:
 *   - login / registro / cambio de contraseña
 *   - cambio de rol o suspensión de cuentas
 *   - aprobación o rechazo de solicitudes de adopción
 *   - creación, edición o borrado de mascotas
 *   - cambio de estado de donaciones o reportes
 * Esas acciones tienen consecuencias reales sobre personas y animales, así que
 * se mantienen fuera del alcance del modelo por diseño.
 */
export function registrarToolsEscrituraControlada(server: McpServer): void {
  server.registerTool(
    "enviar_mensaje_contacto",
    {
      title: "Enviar un mensaje de contacto",
      description:
        "Envía un mensaje al buzón de contacto de la plataforma (endpoint público). " +
        "Si se indica organizacionId, el mensaje llega a la bandeja de esa fundación. " +
        "ATENCIÓN: esta acción escribe en la base de datos real y notifica por correo; " +
        "confirma con la persona antes de ejecutarla.",
      inputSchema: {
        de: z.string().min(2).max(120).describe("Nombre de quien escribe."),
        correo: z.string().email().max(150).describe("Correo de contacto del remitente."),
        asunto: z.string().min(3).max(255).describe("Asunto del mensaje."),
        mensaje: z.string().min(10).max(2000).describe("Cuerpo del mensaje."),
        organizacionId: z
          .number()
          .int()
          .positive()
          .optional()
          .describe("Id de la fundación destinataria (ver listar_organizaciones)."),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (args) => {
      const datos = await apiRequest("POST", "/mensajes", { body: args });
      return {
        content: [
          {
            type: "text",
            text: `Mensaje enviado correctamente.\n\n${formatForModel(datos)}`,
          },
        ],
      };
    }
  );
}

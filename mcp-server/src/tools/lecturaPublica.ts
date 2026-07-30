import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiRequest, formatForModel } from "../apiClient.js";
import { config } from "../config.js";

/** Anotaciones MCP: declaran al cliente que estas tools no mutan nada. */
const SOLO_LECTURA = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true,
} as const;

const paginaSchema = z
  .number()
  .int()
  .min(1)
  .max(500)
  .optional()
  .describe("Número de página (empieza en 1).");

/**
 * El tope lo impone el servidor, no el modelo: aunque pida 10 000 registros,
 * `maxPageSize` recorta la petición antes de salir a la API.
 */
const limiteSchema = z
  .number()
  .int()
  .min(1)
  .max(config.maxPageSize)
  .optional()
  .describe(`Registros por página (máximo ${config.maxPageSize}).`);

export function registrarToolsLecturaPublica(server: McpServer): void {
  server.registerTool(
    "buscar_mascotas",
    {
      title: "Buscar mascotas en adopción",
      description:
        "Busca en el catálogo público de mascotas disponibles para adopción. " +
        "Permite filtrar por nombre, especie (Perro, Gato, Otro) y ciudad/ubicación. " +
        "No incluye mascotas ya adoptadas, eliminadas u ocultas.",
      inputSchema: {
        search: z.string().max(100).optional().describe("Texto a buscar en el nombre de la mascota."),
        especie: z.string().max(50).optional().describe('Especie exacta, p. ej. "Perro" o "Gato".'),
        ciudad: z.string().max(100).optional().describe("Ubicación o ciudad de la mascota."),
        sortBy: z
          .enum(["nombre", "fecha", "ciudad"])
          .optional()
          .describe("Campo de ordenamiento."),
        sortOrder: z.enum(["asc", "desc"]).optional().describe("Dirección del ordenamiento."),
        page: paginaSchema,
        limit: limiteSchema,
      },
      annotations: SOLO_LECTURA,
    },
    async (args) => {
      const datos = await apiRequest("GET", "/mascotas/publicas", { query: args });
      return { content: [{ type: "text", text: formatForModel(datos) }] };
    }
  );

  server.registerTool(
    "obtener_mascota",
    {
      title: "Obtener el detalle de una mascota",
      description:
        "Devuelve la ficha completa de una mascota por su id: historia, requisitos de adopción, " +
        "tags, organización responsable y estado. Devuelve error si la mascota ya fue adoptada o no es pública.",
      inputSchema: {
        id: z.number().int().positive().describe("Id numérico de la mascota."),
      },
      annotations: SOLO_LECTURA,
    },
    async ({ id }) => {
      const datos = await apiRequest("GET", `/mascotas/${id}`);
      return { content: [{ type: "text", text: formatForModel(datos) }] };
    }
  );

  server.registerTool(
    "listar_organizaciones",
    {
      title: "Listar fundaciones aliadas",
      description:
        "Lista las organizaciones/fundaciones activas de la plataforma, con su ciudad y descripción. " +
        "Útil para saber a quién se puede donar o qué fundación publicó una mascota.",
      inputSchema: {},
      annotations: SOLO_LECTURA,
    },
    async () => {
      const datos = await apiRequest("GET", "/fundaciones/publicas");
      return { content: [{ type: "text", text: formatForModel(datos) }] };
    }
  );

  server.registerTool(
    "listar_catalogo",
    {
      title: "Consultar un catálogo de referencia",
      description:
        "Consulta las listas de referencia de la plataforma: especies, razas, tags, y la " +
        "división política de Ecuador (provincias, cantones y parroquias). " +
        'Para "razas" se filtra por especieId, porque cada raza pertenece a una especie ' +
        '(p. ej. "Mestizo" existe por separado para Perro y para Gato). ' +
        'Para "cantones" se filtra por padreId (la provincia) y para "parroquias" es ' +
        "obligatorio (el cantón), porque hay más de 1300.",
      inputSchema: {
        tipo: z
          .enum(["especies", "razas", "tags", "provincias", "cantones", "parroquias"])
          .describe("Catálogo a consultar."),
        padreId: z
          .number()
          .int()
          .positive()
          .optional()
          .describe(
            'Id del elemento padre: la especie para "razas", la provincia para ' +
              '"cantones", el cantón para "parroquias" (aquí es obligatorio).'
          ),
      },
      annotations: SOLO_LECTURA,
    },
    async ({ tipo, padreId }) => {
      const claveFiltro: Record<string, string> = {
        razas: "especieId",
        cantones: "provinciaId",
        parroquias: "cantonId",
      };
      const clave = claveFiltro[tipo];
      const query = clave && padreId ? { [clave]: padreId } : undefined;
      const datos = await apiRequest("GET", `/catalogos/${tipo}`, { query });
      return { content: [{ type: "text", text: formatForModel(datos) }] };
    }
  );

  server.registerTool(
    "estado_api",
    {
      title: "Verificar el estado de la API",
      description:
        "Comprueba que la API de Huellitas Solidarias responde y que su conexión a la base de datos " +
        "está activa. Útil para diagnosticar si un fallo es de la API o del servidor MCP.",
      inputSchema: {},
      annotations: SOLO_LECTURA,
    },
    async () => {
      const datos = await apiRequest("GET", "/health");
      return {
        content: [
          {
            type: "text",
            text: `API consultada: ${config.baseUrl}\n\n${formatForModel(datos)}`,
          },
        ],
      };
    }
  );
}

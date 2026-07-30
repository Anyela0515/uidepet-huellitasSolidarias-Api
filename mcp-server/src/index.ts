import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { config, hasToken } from "./config.js";
import { registrarToolsLecturaPublica } from "./tools/lecturaPublica.js";
import { registrarToolsLecturaAutenticada } from "./tools/lecturaAutenticada.js";
import { registrarToolsEscrituraControlada } from "./tools/escrituraControlada.js";

/**
 * Servidor MCP de UidePet — Huellitas Solidarias.
 *
 * Expone la API REST del proyecto como tools consumibles por un cliente MCP
 * (Claude Desktop / Claude Code). Las capacidades se registran por niveles:
 *
 *   1. Lectura pública      → siempre disponible.
 *   2. Lectura autenticada  → solo si HUELLITAS_API_TOKEN está definido.
 *   3. Escritura controlada → solo si MCP_ALLOW_WRITES=true.
 *
 * Lo que no se registra no existe para el modelo: no puede invocarlo ni
 * inferir su superficie desde la lista de tools.
 */
async function main(): Promise<void> {
  const server = new McpServer({
    name: "huellitas-solidarias",
    version: "1.0.0",
  });

  registrarToolsLecturaPublica(server);

  if (hasToken()) {
    registrarToolsLecturaAutenticada(server);
  }

  if (config.allowWrites) {
    registrarToolsEscrituraControlada(server);
  }

  // El transporte stdio usa stdout para el protocolo JSON-RPC: cualquier
  // console.log contaminaría el canal y rompería la sesión. Todo el logging
  // va a stderr, que el cliente MCP trata como diagnóstico.
  console.error(
    [
      "Servidor MCP Huellitas Solidarias iniciado (stdio).",
      `  API        : ${config.baseUrl}`,
      `  Token      : ${hasToken() ? "configurado" : "ausente (solo tools públicas)"}`,
      `  Escrituras : ${config.allowWrites ? "HABILITADAS" : "bloqueadas"}`,
    ].join("\n")
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error: unknown) => {
  const detalle = error instanceof Error ? error.message : String(error);
  console.error(`Error fatal al iniciar el servidor MCP: ${detalle}`);
  process.exit(1);
});

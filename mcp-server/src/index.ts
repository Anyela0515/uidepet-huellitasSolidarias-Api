import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { config, hasToken } from "./config.js";
import { registrarToolsLecturaPublica } from "./tools/lecturaPublica.js";
import { registrarToolsLecturaAutenticada } from "./tools/lecturaAutenticada.js";
import { registrarToolsEscrituraControlada } from "./tools/escrituraControlada.js";

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

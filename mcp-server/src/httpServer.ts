import express, { type Request, type Response, type NextFunction } from "express";
import rateLimit from "express-rate-limit";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { mcpAuthRouter } from "@modelcontextprotocol/sdk/server/auth/router.js";
import { requireBearerAuth } from "@modelcontextprotocol/sdk/server/auth/middleware/bearerAuth.js";
import { httpConfig } from "./httpConfig.js";
import { hasToken, config } from "./config.js";
import { PasscodeOAuthProvider } from "./auth/passcodeOAuthProvider.js";
import { registrarToolsLecturaPublica } from "./tools/lecturaPublica.js";
import { registrarToolsLecturaAutenticada } from "./tools/lecturaAutenticada.js";
import { registrarToolsEscrituraControlada } from "./tools/escrituraControlada.js";

const provider = new PasscodeOAuthProvider();
const app = express();

app.disable("x-powered-by");
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

/**
 * Origin: solo se valida en el endpoint /mcp (el que realmente expone datos
 * vía JSON-RPC a un cliente de navegador). El resto de rutas — la página de
 * login, /token, /register — se navegan/envían directamente desde el propio
 * dominio o desde un cliente no-navegador, y ahí Origin no aplica: exigirlo
 * ahí bloqueaba el propio formulario de passcode (bug corregido).
 *
 * Claude Desktop, al ser una app nativa, no manda Origin — así que no lo
 * bloquea esta comprobación, coherente con la guía de seguridad de
 * transporte HTTP del propio SDK (validar Origin, no exigirlo si no viene).
 */
function checkMcpOrigin(req: Request, res: Response, next: NextFunction): void {
  const origin = req.headers.origin;
  if (origin && !httpConfig.allowedOrigins.includes(origin)) {
    res.status(403).json({ error: "Origin no permitido." });
    return;
  }
  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, mcp-session-id");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  }
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  next();
}

// Límite generoso pero real: evita fuerza bruta contra el passcode y abuso
// del endpoint /mcp. Mismo enfoque que ya usa el backend principal.
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 100,
    standardHeaders: true,
    legacyHeaders: false,
  })
);
app.use(
  "/authorize",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Demasiados intentos. Espera unos minutos." },
  })
);

app.use(
  mcpAuthRouter({
    provider,
    issuerUrl: new URL(httpConfig.publicUrl.origin),
    resourceServerUrl: httpConfig.publicUrl,
    scopesSupported: ["mcp:tools"],
    resourceName: "Huellitas Solidarias MCP",
  })
);

// Paso de login propio: no lo cubre mcpAuthRouter porque no es parte del
// protocolo OAuth estándar, es el formulario de passcode intermedio.
app.post("/authorize/submit", (req, res) => {
  const pendingId = String(req.query.pending ?? "");
  const passcode = String(req.body.passcode ?? "");
  provider.handleLoginSubmit(pendingId, passcode, res);
});

function buildServer(): McpServer {
  const server = new McpServer({ name: "huellitas-solidarias", version: "1.0.0" });
  registrarToolsLecturaPublica(server);
  if (hasToken()) registrarToolsLecturaAutenticada(server);
  if (config.allowWrites) registrarToolsEscrituraControlada(server);
  return server;
}

const mcpPath = new URL(httpConfig.publicUrl).pathname || "/mcp";

app.options(mcpPath, checkMcpOrigin);

app.post(
  mcpPath,
  checkMcpOrigin,
  requireBearerAuth({ verifier: provider }),
  async (req: Request, res: Response) => {
    try {
      const server = buildServer();
      const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
      res.on("close", () => {
        transport.close();
        server.close();
      });
    } catch (error) {
      console.error("Error manejando solicitud MCP:", error);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: "2.0",
          error: { code: -32603, message: "Internal server error" },
          id: null,
        });
      }
    }
  }
);

app.get(mcpPath, checkMcpOrigin, (_req, res) => {
  res.status(405).json({
    jsonrpc: "2.0",
    error: { code: -32000, message: "Method not allowed." },
    id: null,
  });
});

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "huellitas-mcp-http" });
});

app.listen(httpConfig.port, () => {
  console.log(
    [
      "Servidor MCP Huellitas Solidarias iniciado (Streamable HTTP).",
      `  Puerto      : ${httpConfig.port}`,
      `  URL publica : ${httpConfig.publicUrl.href}`,
      `  API backend : ${config.baseUrl}`,
      `  Token API   : ${hasToken() ? "configurado" : "ausente (solo tools públicas)"}`,
      `  Escrituras  : ${config.allowWrites ? "HABILITADAS" : "bloqueadas"}`,
    ].join("\n")
  );
});

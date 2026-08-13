import express, { type Request, type Response, type NextFunction } from "express";
import rateLimit from "express-rate-limit";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { mcpAuthRouter } from "@modelcontextprotocol/sdk/server/auth/router.js";
import { requireBearerAuth } from "@modelcontextprotocol/sdk/server/auth/middleware/bearerAuth.js";
import { httpConfig } from "./httpConfig.js";
import { config } from "./config.js";
import { UserLoginOAuthProvider } from "./auth/userLoginOAuthProvider.js";
import { registrarToolsLecturaPublica } from "./tools/lecturaPublica.js";
import { registrarToolsLecturaAutenticada } from "./tools/lecturaAutenticada.js";
import { registrarToolsEscrituraControlada } from "./tools/escrituraControlada.js";

const provider = new UserLoginOAuthProvider();
const app = express();

app.set("trust proxy", 1);

app.disable("x-powered-by");

app.use((req: Request, _res: Response, next: NextFunction) => {
  console.log(
    `[req] ${req.method} ${req.path} ip=${req.ip} auth=${req.headers.authorization ? "si" : "no"} ua="${req.headers["user-agent"] ?? ""}"`
  );
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

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

app.post("/authorize/submit", async (req, res) => {
  const pendingId = String(req.query.pending ?? "");
  const correo = String(req.body.correo ?? "");
  const password = String(req.body.password ?? "");
  await provider.handleLoginSubmit(pendingId, correo, password, res);
});

function buildServer(backendToken: string): McpServer {
  const server = new McpServer({ name: "huellitas-solidarias", version: "1.0.0" });
  registrarToolsLecturaPublica(server);
  registrarToolsLecturaAutenticada(server, backendToken);
  if (config.allowWrites) registrarToolsEscrituraControlada(server, backendToken);
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
      const backendToken = req.auth?.extra?.backendToken;
      if (typeof backendToken !== "string") {
        res.status(401).json({
          jsonrpc: "2.0",
          error: { code: -32001, message: "Sesión sin credenciales de Huellitas Solidarias válidas." },
          id: null,
        });
        return;
      }
      const server = buildServer(backendToken);
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
      `  Puerto        : ${httpConfig.port}`,
      `  URL publica   : ${httpConfig.publicUrl.href}`,
      `  API backend   : ${config.baseUrl}`,
      `  Autenticacion : cada persona con su propia cuenta de Huellitas Solidarias`,
      `  Escrituras    : ${config.allowWrites ? "HABILITADAS (segun el rol real de cada cuenta)" : "bloqueadas"}`,
    ].join("\n")
  );
});

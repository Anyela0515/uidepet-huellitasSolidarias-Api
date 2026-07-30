import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import express, { type Request, type Response } from "express";
import cors from "cors";
import helmet from "helmet";
import swaggerUi from "swagger-ui-express";
import { load as loadYaml } from "js-yaml";

import { pool } from "./config/database.js";
import { requestLogger } from "./middlewares/logger.js";
import { rateLimiter } from "./middlewares/rateLimiter.js";
import { errorHandler } from "./middlewares/errorHandler.js";

import authRouter from "./routes/auth.js";
import mascotasRouter from "./routes/mascotas.js";
import solicitudesRouter from "./routes/solicitudes.js";
import fundacionesRouter from "./routes/fundaciones.js";
import favoritosRouter from "./routes/favoritos.js";
import mensajesRouter from "./routes/mensajes.js";
import donacionesRouter from "./routes/donaciones.js";
import catalogosRouter from "./routes/catalogos.js";
import seguimientosAdopcionRouter from "./routes/seguimientosAdopcion.js";
import reportesRouter from "./routes/reportes.js";

export function createApp() {
  const app = express();
  const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN ?? "http://localhost:5173";

  // La propia API se agrega como origen permitido: Swagger UI se sirve desde
  // /docs, en el mismo dominio, y "Try it out" llama a la API desde ahí —
  // el navegador manda ese Origin aunque sea la misma máquina.
  const allowedOrigins = new Set(
    [
      FRONTEND_ORIGIN,
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      `http://localhost:${process.env.PORT ?? 3000}`,
      "https://api.huellitassolidarias.com",
      ...(process.env.FRONTEND_ORIGINS?.split(",").map((o) => o.trim()) ?? []),
    ].filter(Boolean)
  );

  app.disable("x-powered-by");
  app.use(helmet());
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || allowedOrigins.has(origin)) {
          callback(null, true);
          return;
        }
        callback(new Error(`Origen no permitido por CORS: ${origin}`));
      },
      credentials: true,
    })
  );
  app.use(express.json({ limit: "15mb" }));
  app.use(requestLogger);
  app.use(rateLimiter);

  app.get("/health", async (_req: Request, res: Response) => {
    try {
      await pool.query("SELECT 1");
      res.status(200).json({
        success: true,
        code: 200,
        service: "huellitas-solidarias-api",
        database: "connected",
        status: "API UidePet Huellitas Solidarias activa",
        timestamp: new Date().toISOString(),
      });
    } catch {
      res.status(503).json({
        success: false,
        code: 503,
        service: "huellitas-solidarias-api",
        database: "disconnected",
        status: "API activa pero sin conexión a la base de datos",
        timestamp: new Date().toISOString(),
      });
    }
  });

  const openapiDocument = loadYaml(
    fs.readFileSync(path.join(process.cwd(), "openapi.yaml"), "utf8")
  ) as Record<string, unknown>;

  function timingSafeEqualString(a: string, b: string) {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  }

  // /docs solo debe ser visible para quien tenga estas credenciales: si no
  // están configuradas, se niega el acceso por defecto (fail closed) en vez
  // de dejarlo público por un descuido de despliegue.
  app.use("/docs", (req: Request, res: Response, next) => {
    const docsUser = process.env.DOCS_USER;
    const docsPassword = process.env.DOCS_PASSWORD;
    if (!docsUser || !docsPassword) {
      res.status(404).json({ code: 404, error: "Ruta no encontrada" });
      return;
    }

    const header = req.headers.authorization ?? "";
    const [scheme, encoded] = header.split(" ");
    const decoded =
      scheme === "Basic" && encoded
        ? Buffer.from(encoded, "base64").toString("utf8")
        : "";
    const [user, password] = decoded.split(":");

    if (
      user &&
      password &&
      timingSafeEqualString(user, docsUser) &&
      timingSafeEqualString(password, docsPassword)
    ) {
      next();
      return;
    }

    res.set("WWW-Authenticate", 'Basic realm="Huellitas Solidarias API Docs"');
    res.status(401).send("Autenticación requerida.");
  });

  // Swagger UI incluye un <script> inline para inicializarse; el CSP estricto
  // (script-src 'self', sin 'unsafe-inline') que aplica helmet() globalmente
  // lo bloquearía. Se relaja solo para esta ruta, ya protegida arriba por
  // autenticación básica.
  app.use("/docs", (_req: Request, res: Response, next) => {
    res.removeHeader("Content-Security-Policy");
    next();
  });
  app.use("/docs", swaggerUi.serve, swaggerUi.setup(openapiDocument));

  app.use("/auth", authRouter);
  app.use("/mascotas", mascotasRouter);
  app.use("/solicitudes", solicitudesRouter);
  app.use("/fundaciones", fundacionesRouter);
  app.use("/favoritos", favoritosRouter);
  app.use("/mensajes", mensajesRouter);
  app.use("/donaciones", donacionesRouter);
  app.use("/catalogos", catalogosRouter);
  app.use("/seguimientos-adopcion", seguimientosAdopcionRouter);
  app.use("/reportes", reportesRouter);

  app.use((_req: Request, res: Response) => {
    res.status(404).json({
      code: 404,
      error: "Ruta no encontrada",
    });
  });

  app.use(errorHandler);

  return app;
}

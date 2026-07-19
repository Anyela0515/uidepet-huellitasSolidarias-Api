import express, { type Request, type Response } from "express";
import cors from "cors";
import helmet from "helmet";

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
import configuracionSitioRouter from "./routes/configuracionSitio.js";
import seguimientosAdopcionRouter from "./routes/seguimientosAdopcion.js";

export function createApp() {
  const app = express();
  const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN ?? "http://localhost:5173";

  const allowedOrigins = new Set(
    [
      FRONTEND_ORIGIN,
      "http://localhost:5173",
      "http://127.0.0.1:5173",
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

  app.use("/auth", authRouter);
  app.use("/mascotas", mascotasRouter);
  app.use("/solicitudes", solicitudesRouter);
  app.use("/fundaciones", fundacionesRouter);
  app.use("/favoritos", favoritosRouter);
  app.use("/mensajes", mensajesRouter);
  app.use("/donaciones", donacionesRouter);
  app.use("/catalogos", catalogosRouter);
  app.use("/configuracion-sitio", configuracionSitioRouter);
  app.use("/seguimientos-adopcion", seguimientosAdopcionRouter);

  app.use((_req: Request, res: Response) => {
    res.status(404).json({
      code: 404,
      error: "Ruta no encontrada",
    });
  });

  app.use(errorHandler);

  return app;
}

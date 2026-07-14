import "dotenv/config";
import express, { type Request, type Response } from "express";
import cors from "cors";

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

function assertEnv() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    console.error(
      "Falta JWT_SECRET (mínimo 32 caracteres). Revisa tu archivo .env"
    );
    process.exit(1);
  }
}

assertEnv();

const app = express();
const PORT = Number(process.env.PORT ?? 3000);
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

app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({
    code: 200,
    status: "API UidePet Huellitas Solidarias activa",
    timestamp: new Date().toISOString(),
  });
});

app.use("/auth", authRouter);
app.use("/mascotas", mascotasRouter);
app.use("/solicitudes", solicitudesRouter);
app.use("/fundaciones", fundacionesRouter);
app.use("/favoritos", favoritosRouter);
app.use("/mensajes", mensajesRouter);
app.use("/donaciones", donacionesRouter);

app.use((_req: Request, res: Response) => {
  res.status(404).json({
    code: 404,
    error: "Ruta no encontrada",
  });
});

app.use(errorHandler);


app.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor iniciado en el puerto ${PORT}`);
});

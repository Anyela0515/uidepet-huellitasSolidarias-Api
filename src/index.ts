import "dotenv/config";
import express, {
  type Request,
  type Response,
} from "express";
import cors from "cors";

import { requestLogger } from "./middlewares/logger.js";
import { requireJwt } from "./middlewares/auth.js";
import { rateLimiter } from "./middlewares/rateLimiter.js";
import { errorHandler } from "./middlewares/errorHandler.js";

import authRouter from "./routes/auth.js";
import mascotasRouter from "./routes/v1/mascotas.js";
import solicitudesV1Router from "./routes/v1/solicitudesAdopcion.js";
import solicitudesV2Router from "./routes/v2/solicitudesAdopcion.js";

const app = express();
const PORT = Number(process.env.PORT ?? 3000);

// Middlewares globales
app.use(cors());
app.use(express.json());
app.use(requestLogger);
app.use(rateLimiter);

// Ruta pública para comprobar que la API funciona
app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({
    code: 200,
    status: "API UidePet Huellitas Solidarias activa",
    timestamp: new Date().toISOString(),
  });
});

// Ruta pública para login
app.use("/auth", authRouter);

// Desde aquí se exige JWT para rutas privadas
app.use(requireJwt);

// Rutas protegidas
app.use("/v1/mascotas", mascotasRouter);
app.use("/v1/solicitudes-adopcion", solicitudesV1Router);
app.use("/v2/solicitudes-adopcion", solicitudesV2Router);

// Ruta no encontrada
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    code: 404,
    error: "Ruta no encontrada",
  });
});

// Manejador global de errores
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Servidor iniciado en http://localhost:${PORT}`);
});
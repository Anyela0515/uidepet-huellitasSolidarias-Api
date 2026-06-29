import "dotenv/config";
import express, {
  type Request,
  type Response,
  type NextFunction,
} from "express";
import cors from "cors";

import { requestLogger } from "./middlewares/logger.js";
import { requireJwt } from "./middlewares/auth.js";
import { rateLimiter } from "./middlewares/rateLimiter.js";

import mascotasRouter from "./routes/v1/mascotas.js";
import solicitudesV1Router from "./routes/v1/solicitudesAdopcion.js";
import solicitudesV2Router from "./routes/v2/solicitudesAdopcion.js";

const app = express();
const PORT = Number(process.env.PORT ?? 3000);

app.use(cors());
app.use(express.json());
app.use(requestLogger);

app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({
    code: 200,
    status: "API UidePet Huellitas Solidarias activa",
    timestamp: new Date().toISOString(),
  });
});

// Desde aquí se exige JWT, igual que en la guía
app.use(requireJwt);
app.use(rateLimiter);

// Rutas protegidas
app.use("/v1/mascotas", mascotasRouter);
app.use("/v1/solicitudes-adopcion", solicitudesV1Router);
app.use("/v2/solicitudes-adopcion", solicitudesV2Router);

app.use((_req: Request, res: Response) => {
  res.status(404).json({
    code: 404,
    error: "Ruta no encontrada",
  });
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);

  res.status(500).json({
    code: 500,
    error: "Error interno del servidor",
  });
});

app.listen(PORT, () => {
  console.log(`Servidor iniciado en http://localhost:${PORT}`);
});
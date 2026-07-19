import { Request, Response } from "express";
import { actualizarConfiguracionSitioSchema } from "../schemas/configuracionSitio.schema.js";
import * as configuracionSitioService from "../services/configuracionSitio.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const obtener = asyncHandler(async (_req: Request, res: Response) => {
  const data = await configuracionSitioService.obtenerConfiguracion();
  res.status(200).json({ success: true, data });
});

export const actualizar = asyncHandler(async (req: Request, res: Response) => {
  const data = actualizarConfiguracionSitioSchema.parse(req.body);
  const config = await configuracionSitioService.actualizarConfiguracion(data);
  res.status(200).json({
    success: true,
    message: "Configuración actualizada correctamente.",
    data: config,
  });
});

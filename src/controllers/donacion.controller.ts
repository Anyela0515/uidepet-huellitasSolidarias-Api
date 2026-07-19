import { Request, Response } from "express";
import {
  actualizarEstadoDonacionSchema,
  crearDonacionSchema,
} from "../schemas/general.schema.js";
import * as donacionService from "../services/donacion.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const listar = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user!;
  const { data, meta } = await donacionService.listarDonaciones(
    user.rol,
    user.correo,
    req.query as Record<string, unknown>
  );
  res.status(200).json({ success: true, data, pagination: meta });
});

export const crear = asyncHandler(async (req: Request, res: Response) => {
  const data = crearDonacionSchema.parse(req.body);
  const result = await donacionService.crearDonacion(data);
  res.status(201).json(result);
});

export const actualizarEstado = asyncHandler(async (req: Request, res: Response) => {
  const { estado } = actualizarEstadoDonacionSchema.parse(req.body);
  const donacion = await donacionService.actualizarEstado(
    String(req.params.id),
    estado,
    req.user!.rol
  );
  res.status(200).json({ success: true, data: donacion });
});

export const eliminar = asyncHandler(async (req: Request, res: Response) => {
  const donacion = await donacionService.cancelarDonacion(
    String(req.params.id),
    req.user!.rol
  );
  res.status(200).json({
    success: true,
    message: "Donación cancelada correctamente.",
    data: donacion,
  });
});

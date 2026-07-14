import { Request, Response } from "express";
import { crearDonacionSchema } from "../schemas/general.schema.js";
import * as donacionService from "../services/donacion.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const listar = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user!;
  const data = await donacionService.listarDonaciones(user.rol, user.correo);
  res.status(200).json({ data });
});

export const crear = asyncHandler(async (req: Request, res: Response) => {
  const data = crearDonacionSchema.parse(req.body);
  const result = await donacionService.crearDonacion(data);
  res.status(201).json(result);
});

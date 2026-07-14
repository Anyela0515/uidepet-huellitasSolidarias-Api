import { Request, Response } from "express";
import { crearMensajeSchema } from "../schemas/general.schema.js";
import * as mensajeService from "../services/mensaje.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const listar = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user!;
  const data = await mensajeService.listarMensajes(user.rol, user.correo);
  res.status(200).json({ data });
});

export const crear = asyncHandler(async (req: Request, res: Response) => {
  const data = crearMensajeSchema.parse(req.body);
  const result = await mensajeService.crearMensaje(data);
  res.status(201).json(result);
});

export const marcarLeido = asyncHandler(async (req: Request, res: Response) => {
  const result = await mensajeService.marcarLeido(String(req.params.id));
  res.status(200).json(result);
});

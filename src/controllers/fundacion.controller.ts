import { Request, Response } from "express";
import {
  actualizarEstadoFundacionSchema,
  crearFundacionSchema,
} from "../schemas/fundacion.schema.js";
import * as fundacionService from "../services/fundacion.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const listar = asyncHandler(async (_req: Request, res: Response) => {
  const data = await fundacionService.listarFundaciones();
  res.status(200).json({ data });
});

export const registrar = asyncHandler(async (req: Request, res: Response) => {
  const data = crearFundacionSchema.parse(req.body);
  const result = await fundacionService.registrarFundacion(data);

  if ("error" in result) {
    res.status(409).json({ error: result.error });
    return;
  }

  res.status(201).json(result);
});

export const actualizarEstado = asyncHandler(async (req: Request, res: Response) => {
  const { estado } = actualizarEstadoFundacionSchema.parse(req.body);
  const result = await fundacionService.actualizarEstado(String(req.params.id), estado);

  if ("error" in result) {
    res.status(404).json({ error: result.error });
    return;
  }

  res.status(200).json(result);
});

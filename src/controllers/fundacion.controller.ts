import { Request, Response } from "express";
import {
  actualizarEstadoFundacionSchema,
  actualizarPerfilFundacionSchema,
  crearFundacionSchema,
} from "../schemas/fundacion.schema.js";
import * as fundacionService from "../services/fundacion.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const listar = asyncHandler(async (req: Request, res: Response) => {
  const { data, meta } = await fundacionService.listarFundaciones(
    req.query as Record<string, unknown>
  );
  res.status(200).json({ success: true, data, pagination: meta });
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
    const status = result.error.includes("no encontrada") ? 404 : 409;
    res.status(status).json({ error: result.error });
    return;
  }

  res.status(200).json(result);
});

export const obtener = asyncHandler(async (req: Request, res: Response) => {
  const data = await fundacionService.obtenerFundacion(String(req.params.id));
  res.status(200).json({ success: true, data });
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  const data = await fundacionService.obtenerPerfilPropio(req.user!.correo);
  res.status(200).json({ success: true, data });
});

export const actualizarMe = asyncHandler(async (req: Request, res: Response) => {
  const data = actualizarPerfilFundacionSchema.parse(req.body);
  const perfil = await fundacionService.actualizarPerfilPropio(req.user!.correo, data);
  res.status(200).json({
    success: true,
    message: "Perfil actualizado correctamente.",
    data: perfil,
  });
});

export const eliminar = asyncHandler(async (req: Request, res: Response) => {
  await fundacionService.eliminarOrganizacion(Number(req.params.id));
  res.status(204).send();
});

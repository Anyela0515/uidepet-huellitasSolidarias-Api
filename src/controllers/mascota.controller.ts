import { Request, Response } from "express";
import {
  actualizarMascotaSchema,
  crearMascotaSchema,
} from "../schemas/mascota.schema.js";
import * as authService from "../services/auth.service.js";
import * as mascotaService from "../services/mascota.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const listar = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user;
  const data =
    user?.rol === "fundacion"
      ? await mascotaService.listarPorFundacion(user.correo)
      : await mascotaService.listarVisibles();

  res.status(200).json({ data });
});

export const listarPublicas = asyncHandler(async (_req: Request, res: Response) => {
  const data = await mascotaService.listarVisibles();
  res.status(200).json({ data });
});

export const obtener = asyncHandler(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const mascota = await mascotaService.obtenerMascota(id);

  if (!mascota || mascota.estado === "Eliminado" || mascota.hidden) {
    res.status(404).json({ error: "Mascota no encontrada." });
    return;
  }

  res.status(200).json({ data: mascota });
});

export const crear = asyncHandler(async (req: Request, res: Response) => {
  const data = crearMascotaSchema.parse(req.body);
  const session = req.user!;
  const usuario = await authService.getMe(session.sub);

  if (!usuario) {
    res.status(401).json({ error: "Usuario no autenticado." });
    return;
  }

  try {
    const mascota = await mascotaService.crearMascota(
      data,
      usuario.correo,
      usuario.organizacion || usuario.nombre
    );
    res.status(201).json({ mascota });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo crear la mascota.";
    res.status(400).json({ error: message });
  }
});

export const actualizar = asyncHandler(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const data = actualizarMascotaSchema.parse(req.body);
  const fundacionEmail =
    req.user?.rol === "fundacion" ? req.user.correo : undefined;

  const result = await mascotaService.actualizarMascota(id, data, fundacionEmail);

  if ("error" in result) {
    const status = (result.error ?? "").includes("permiso") ? 403 : 404;
    res.status(status).json({ error: result.error });
    return;
  }

  res.status(200).json(result);
});

export const eliminar = asyncHandler(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const fundacionEmail =
    req.user?.rol === "fundacion" ? req.user.correo : undefined;

  const result = await mascotaService.eliminarMascota(id, fundacionEmail);

  if ("error" in result) {
    const status = (result.error ?? "").includes("permiso") ? 403 : 404;
    res.status(status).json({ error: result.error });
    return;
  }

  res.status(204).send();
});

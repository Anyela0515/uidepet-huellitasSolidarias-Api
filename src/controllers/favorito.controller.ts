import { Request, Response } from "express";
import * as favoritoService from "../services/favorito.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const listar = asyncHandler(async (req: Request, res: Response) => {
  const data = await favoritoService.listarFavoritos(req.user!.correo);
  res.status(200).json({ data });
});

export const toggle = asyncHandler(async (req: Request, res: Response) => {
  const mascotaId = Number(req.params.mascotaId);
  const result = await favoritoService.toggleFavorito(req.user!.correo, mascotaId);

  if ("error" in result) {
    res.status(400).json({ error: result.error });
    return;
  }

  res.status(200).json(result);
});

export const verificar = asyncHandler(async (req: Request, res: Response) => {
  const mascotaId = Number(req.params.mascotaId);
  const isFavorite = await favoritoService.esFavorito(req.user!.correo, mascotaId);
  res.status(200).json({ isFavorite });
});

export const agregar = asyncHandler(async (req: Request, res: Response) => {
  const mascotaId = Number(req.params.mascotaId);
  await favoritoService.agregarFavorito(req.user!.correo, mascotaId);
  res.status(201).json({ success: true, message: "Agregado a favoritos." });
});

export const eliminar = asyncHandler(async (req: Request, res: Response) => {
  const mascotaId = Number(req.params.mascotaId);
  await favoritoService.quitarFavorito(req.user!.correo, mascotaId);
  res.status(204).send();
});

import { Request, Response } from "express";
import {
  actualizarEstadoDenunciaSchema,
  crearReporteRescateSchema,
} from "../schemas/general.schema.js";
import * as denunciaService from "../services/denuncia.service.js";
import * as catalogRepo from "../repositories/catalog.repository.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { verificarEvidenciaOLanzar } from "../utils/fileSignature.js";

export const listar = asyncHandler(async (req: Request, res: Response) => {
  const { data, meta } = await denunciaService.listarDenuncias(
    req.query as Record<string, unknown>
  );
  res.status(200).json({ success: true, data, pagination: meta });
});

export const crear = asyncHandler(async (req: Request, res: Response) => {
  const data = crearReporteRescateSchema.parse(req.body);
  for (const evidencia of data.evidencias) {
    await verificarEvidenciaOLanzar(evidencia.url, evidencia.type, evidencia.name);
  }
  const result = await denunciaService.crearDenuncia(data);
  res.status(201).json(result);
});

export const actualizarEstado = asyncHandler(async (req: Request, res: Response) => {
  const { estado, evidencias } = actualizarEstadoDenunciaSchema.parse(req.body);
  for (const evidencia of evidencias ?? []) {
    await verificarEvidenciaOLanzar(evidencia.url, evidencia.type, evidencia.name);
  }

  const user = req.user!;
  const organizacionId =
    user.rol === "fundacion" ? await catalogRepo.findOrganizacionIdByUsuarioCorreo(user.correo) : null;

  const result = await denunciaService.actualizarEstado(
    String(req.params.id),
    estado,
    organizacionId,
    evidencias ?? [],
    { id: user.sub, correo: user.correo }
  );
  res.status(200).json({ success: true, ...result });
});

export const consultar = asyncHandler(async (req: Request, res: Response) => {
  const data = await denunciaService.consultarPorCodigo(String(req.params.codigo).trim());
  res.status(200).json({ success: true, data });
});

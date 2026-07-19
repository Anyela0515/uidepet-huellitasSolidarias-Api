import { Request, Response } from "express";
import * as catalogoService from "../services/catalogo.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";

function ok(res: Response, data: unknown) {
  res.status(200).json({ success: true, data });
}

export const roles = asyncHandler(async (_req: Request, res: Response) => {
  ok(res, await catalogoService.listarRoles());
});

export const estadosCuenta = asyncHandler(async (_req: Request, res: Response) => {
  ok(res, await catalogoService.listarEstadosCuenta());
});

export const especies = asyncHandler(async (_req: Request, res: Response) => {
  ok(res, await catalogoService.listarEspecies());
});

export const razas = asyncHandler(async (req: Request, res: Response) => {
  const especieId = req.query.especieId ? Number(req.query.especieId) : undefined;
  ok(res, await catalogoService.listarRazas(especieId));
});

export const sexos = asyncHandler(async (_req: Request, res: Response) => {
  ok(res, await catalogoService.listarSexos());
});

export const tamanos = asyncHandler(async (_req: Request, res: Response) => {
  ok(res, await catalogoService.listarTamanos());
});

export const unidadesEdad = asyncHandler(async (_req: Request, res: Response) => {
  ok(res, await catalogoService.listarUnidadesEdad());
});

export const estadosMascota = asyncHandler(async (_req: Request, res: Response) => {
  ok(res, await catalogoService.listarEstadosMascota());
});

export const ciudades = asyncHandler(async (_req: Request, res: Response) => {
  ok(res, await catalogoService.listarCiudades());
});

export const tags = asyncHandler(async (_req: Request, res: Response) => {
  ok(res, await catalogoService.listarTags());
});

export const estadosSolicitudAdopcion = asyncHandler(async (_req: Request, res: Response) => {
  ok(res, await catalogoService.listarEstadosSolicitudAdopcion());
});

export const estadosSolicitudOrganizacion = asyncHandler(
  async (_req: Request, res: Response) => {
    ok(res, await catalogoService.listarEstadosSolicitudOrganizacion());
  }
);

export const tiposVivienda = asyncHandler(async (_req: Request, res: Response) => {
  ok(res, await catalogoService.listarTiposVivienda());
});

export const tiposDonacion = asyncHandler(async (_req: Request, res: Response) => {
  ok(res, await catalogoService.listarTiposDonacion());
});

export const estadosDonacion = asyncHandler(async (_req: Request, res: Response) => {
  ok(res, await catalogoService.listarEstadosDonacion());
});

export const tiposMedio = asyncHandler(async (_req: Request, res: Response) => {
  ok(res, await catalogoService.listarTiposMedio());
});

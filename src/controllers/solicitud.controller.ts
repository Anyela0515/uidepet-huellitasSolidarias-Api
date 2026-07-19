import { Request, Response } from "express";
import {
  actualizarEstadoSolicitudSchema,
  actualizarSeguimientoSchema,
  archivoSeguimientoSchema,
  crearSolicitudSchema,
  evidenciaAdopcionSchema,
  seguimientoSolicitudSchema,
} from "../schemas/solicitud.schema.js";
import * as authService from "../services/auth.service.js";
import * as solicitudService from "../services/solicitud.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const listar = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user!;
  const { data, meta } = await solicitudService.listarSolicitudes(
    user.rol,
    user.correo,
    req.query as Record<string, unknown>
  );
  res.status(200).json({ success: true, data, pagination: meta });
});

export const obtener = asyncHandler(async (req: Request, res: Response) => {
  const solicitud = await solicitudService.obtenerSolicitud(String(req.params.id));
  if (!solicitud) {
    res.status(404).json({ error: "Solicitud no encontrada." });
    return;
  }
  res.status(200).json({ data: solicitud });
});

export const crear = asyncHandler(async (req: Request, res: Response) => {
  const data = crearSolicitudSchema.parse(req.body);
  const session = req.user!;
  const usuario = await authService.getMe(session.sub);

  if (!usuario) {
    res.status(401).json({ error: "Usuario no autenticado." });
    return;
  }

  const result = await solicitudService.crearSolicitud(data, {
    id: usuario.id,
    nombre: usuario.nombre,
    correo: usuario.correo,
  });

  if ("error" in result) {
    res.status(400).json({ error: result.error });
    return;
  }

  res.status(201).json(result);
});

export const actualizarEstado = asyncHandler(async (req: Request, res: Response) => {
  const data = actualizarEstadoSolicitudSchema.parse(req.body);
  const fundacionEmail =
    req.user?.rol === "fundacion" ? req.user.correo : undefined;

  const result = await solicitudService.actualizarEstado(
    String(req.params.id),
    data,
    fundacionEmail
  );

  if ("error" in result) {
    const status = (result.error ?? "").includes("permiso") ? 403 : 400;
    res.status(status).json({ error: result.error });
    return;
  }

  res.status(200).json(result);
});

export const agregarSeguimiento = asyncHandler(async (req: Request, res: Response) => {
  const data = seguimientoSolicitudSchema.parse(req.body);
  const result = await solicitudService.agregarSeguimiento(
    String(req.params.id),
    data,
    req.user!.correo
  );

  if ("error" in result) {
    res.status(400).json({ error: result.error });
    return;
  }

  res.status(200).json(result);
});

export const agregarEvidencia = asyncHandler(async (req: Request, res: Response) => {
  const data = evidenciaAdopcionSchema.parse(req.body);
  const user = req.user!;
  const result = await solicitudService.agregarEvidencia(
    String(req.params.id),
    data,
    user.rol,
    user.correo
  );
  res.status(201).json({
    success: true,
    message: "Evidencia agregada correctamente.",
    data: result,
  });
});

export const eliminarEvidencia = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user!;
  const solicitud = await solicitudService.eliminarEvidencia(
    String(req.params.id),
    Number(req.params.evidenciaId),
    user.rol,
    user.correo
  );
  res.status(200).json({ success: true, data: solicitud });
});

export const actualizarSeguimiento = asyncHandler(async (req: Request, res: Response) => {
  const { comentario } = actualizarSeguimientoSchema.parse(req.body);
  const user = req.user!;
  const seguimiento = await solicitudService.actualizarSeguimiento(
    Number(req.params.id),
    comentario,
    user.rol,
    user.correo
  );
  res.status(200).json({ success: true, data: seguimiento });
});

export const eliminarSeguimiento = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user!;
  await solicitudService.eliminarSeguimiento(
    Number(req.params.id),
    user.rol,
    user.correo
  );
  res.status(204).send();
});

export const agregarArchivoSeguimiento = asyncHandler(async (req: Request, res: Response) => {
  const { nombreArchivo } = archivoSeguimientoSchema.parse(req.body);
  const user = req.user!;
  const seguimiento = await solicitudService.agregarArchivoSeguimiento(
    Number(req.params.id),
    nombreArchivo,
    user.rol,
    user.correo
  );
  res.status(201).json({ success: true, data: seguimiento });
});

export const eliminarArchivoSeguimiento = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user!;
  const seguimiento = await solicitudService.eliminarArchivoSeguimiento(
    Number(req.params.id),
    Number(req.params.archivoId),
    user.rol,
    user.correo
  );
  res.status(200).json({ success: true, data: seguimiento });
});

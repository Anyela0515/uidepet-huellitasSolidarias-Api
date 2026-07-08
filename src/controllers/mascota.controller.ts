import { Request, Response } from "express";
import {
  crearMascotaSchema,
  actualizarMascotaSchema,
} from "../schemas/mascota.schema.js";
import * as service from "../services/mascota.service.js";

export async function listar(_req: Request, res: Response) {
  const mascotas = await service.listarMascotas();

  res.status(200).json({
    code: 200,
    data: mascotas,
  });
}

export async function obtener(req: Request, res: Response) {
  const id = Number(req.params.id);
  const mascota = await service.obtenerMascota(id);

  if (!mascota) {
    res.status(404).json({
      code: 404,
      error: "Mascota no encontrada.",
    });
    return;
  }

  res.status(200).json({
    code: 200,
    data: mascota,
  });
}

export async function crear(req: Request, res: Response) {
  const data = crearMascotaSchema.parse(req.body);
  const nuevaMascota = await service.crearMascota(data);

  res.status(201).json({
    code: 201,
    message: "Mascota creada correctamente.",
    data: nuevaMascota,
  });
}

export async function actualizar(req: Request, res: Response) {
  const id = Number(req.params.id);
  const data = actualizarMascotaSchema.parse(req.body);

  const mascotaActualizada = await service.actualizarMascota(id, data);

  if (!mascotaActualizada) {
    res.status(404).json({
      code: 404,
      error: "Mascota no encontrada.",
    });
    return;
  }

  res.status(200).json({
    code: 200,
    message: "Mascota actualizada correctamente.",
    data: mascotaActualizada,
  });
}

export async function eliminar(req: Request, res: Response) {
  const id = Number(req.params.id);
  const eliminado = await service.eliminarMascota(id);

  if (!eliminado) {
    res.status(404).json({
      code: 404,
      error: "Mascota no encontrada.",
    });
    return;
  }

  res.status(204).send();
}
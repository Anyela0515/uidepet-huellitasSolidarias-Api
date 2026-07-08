import * as repository from "../repositories/mascota.repository.js";
import {
  CrearMascotaDTO,
  ActualizarMascotaDTO,
} from "../schemas/mascota.schema.js";

export async function listarMascotas() {
  return repository.findAll();
}

export async function obtenerMascota(id: number) {
  return repository.findById(id);
}

export async function crearMascota(data: CrearMascotaDTO) {
  return repository.create(data);
}

export async function actualizarMascota(id: number, data: ActualizarMascotaDTO) {
  const mascota = await repository.findById(id);

  if (!mascota) {
    return null;
  }

  return repository.update(id, data);
}

export async function eliminarMascota(id: number) {
  const mascota = await repository.findById(id);

  if (!mascota) {
    return false;
  }

  await repository.remove(id);
  return true;
}
import * as mascotaRepo from "../repositories/mascota.repository.js";
import * as favoritoRepo from "../repositories/favorito.repository.js";
import * as solicitudRepo from "../repositories/solicitud.repository.js";
import * as catalog from "../repositories/catalog.repository.js";
import type { Mascota } from "../types/frontend.js";
import {
  ActualizarMascotaDTO,
  CrearMascotaDTO,
} from "../schemas/mascota.schema.js";

export async function listarVisibles() {
  return mascotaRepo.findVisible();
}

export async function listarPorFundacion(fundacionEmail: string) {
  return mascotaRepo.findByFundacionEmail(fundacionEmail);
}

export async function obtenerMascota(id: number) {
  return mascotaRepo.findById(id);
}

export async function crearMascota(
  data: CrearMascotaDTO,
  fundacionEmail: string,
  _fundacionNombre: string
) {
  const organizacionId =
    await catalog.findOrganizacionIdByUsuarioCorreo(fundacionEmail);

  if (!organizacionId) {
    throw new Error(
      "La cuenta de fundación no tiene una organización asociada."
    );
  }

  return mascotaRepo.create({
    ...data,
    organizacionId,
  });
}

export async function actualizarMascota(
  id: number,
  data: ActualizarMascotaDTO,
  fundacionEmail?: string
) {
  if (
    fundacionEmail &&
    !(await mascotaRepo.belongsToFundacion(id, fundacionEmail))
  ) {
    return { error: "No tienes permiso para editar esta mascota." };
  }

  const mascota = await mascotaRepo.update(id, data);
  return mascota ? { mascota } : { error: "Mascota no encontrada." };
}

export async function eliminarMascota(id: number, fundacionEmail?: string) {
  const mascota = await mascotaRepo.findById(id);
  if (!mascota) return { error: "Mascota no encontrada." };

  if (fundacionEmail && mascota.fundacionEmail !== fundacionEmail) {
    return { error: "No tienes permiso para eliminar esta mascota." };
  }

  await solicitudRepo.cancelActiveByPetId(id);
  await favoritoRepo.removePetFromAll(id);
  await mascotaRepo.remove(id);
  return { ok: true };
}

export function isAvailableForAdoption(
  pet: Pick<Mascota, "estado" | "hidden">
) {
  return Boolean(pet && pet.estado === "Disponible" && !pet.hidden);
}

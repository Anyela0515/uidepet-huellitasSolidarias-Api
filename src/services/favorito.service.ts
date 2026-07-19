import * as favoritoRepo from "../repositories/favorito.repository.js";
import * as mascotaRepo from "../repositories/mascota.repository.js";
import { NotFoundError } from "../utils/errors.js";

export async function listarFavoritos(correo: string) {
  const ids = await favoritoRepo.getIdsByCorreo(correo);
  const mascotas = await Promise.all(ids.map((id) => mascotaRepo.findById(id)));
  return mascotas.filter(
    (pet): pet is NonNullable<typeof pet> =>
      Boolean(pet) && pet!.estado !== "Eliminado" && !pet!.hidden
  );
}

export async function toggleFavorito(correo: string, mascotaId: number) {
  const pet = await mascotaRepo.findById(mascotaId);
  if (!pet || pet.estado === "Eliminado" || pet.hidden) {
    return { error: "Mascota no disponible." };
  }

  const isFavorite = await favoritoRepo.toggle(correo, mascotaId);
  return { isFavorite };
}

export async function esFavorito(correo: string, mascotaId: number) {
  return favoritoRepo.isFavorite(correo, mascotaId);
}

export async function agregarFavorito(correo: string, mascotaId: number) {
  const pet = await mascotaRepo.findById(mascotaId);
  if (!pet || pet.estado === "Eliminado" || pet.hidden) {
    throw new NotFoundError("Mascota no disponible.", "PET_NOT_AVAILABLE");
  }
  await favoritoRepo.add(correo, mascotaId);
  return { ok: true };
}

export async function quitarFavorito(correo: string, mascotaId: number) {
  await favoritoRepo.remove(correo, mascotaId);
  return { ok: true };
}

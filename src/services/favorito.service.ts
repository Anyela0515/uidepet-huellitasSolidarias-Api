import * as favoritoRepo from "../repositories/favorito.repository.js";
import * as mascotaRepo from "../repositories/mascota.repository.js";

export async function listarFavoritos(correo: string) {
  const ids = await favoritoRepo.getIdsByCorreo(correo);
  const visible = await mascotaRepo.findVisible();
  const visibleIds = new Set(visible.map((p) => p.id));
  return visible.filter((p) => ids.includes(p.id) && visibleIds.has(p.id));
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

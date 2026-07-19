import * as mascotaRepo from "../repositories/mascota.repository.js";
import * as favoritoRepo from "../repositories/favorito.repository.js";
import * as solicitudRepo from "../repositories/solicitud.repository.js";
import * as catalog from "../repositories/catalog.repository.js";
import type { Mascota } from "../types/frontend.js";
import {
  ActualizarMascotaDTO,
  CrearMascotaDTO,
} from "../schemas/mascota.schema.js";
import {
  buildSortClause,
  parsePagination,
} from "../utils/pagination.js";
import { MASCOTA_SORT_FIELDS, type MascotaFiltros } from "../repositories/mascota.repository.js";
import { ForbiddenError, NotFoundError } from "../utils/errors.js";

function parseFiltros(query: Record<string, unknown>): MascotaFiltros {
  const filtros: MascotaFiltros = {};
  if (query.search) filtros.search = String(query.search);
  if (query.especie) filtros.especie = String(query.especie);
  if (query.raza) filtros.raza = String(query.raza);
  if (query.sexo) filtros.sexo = String(query.sexo);
  if (query.tamano) filtros.tamano = String(query.tamano);
  if (query.ciudad) filtros.ciudad = String(query.ciudad);
  if (query.estado) filtros.estado = String(query.estado);
  if (query.organizacionId) filtros.organizacionId = Number(query.organizacionId);
  if (query.oculto !== undefined) filtros.oculto = String(query.oculto) === "true";
  return filtros;
}

export async function listarVisibles(query: Record<string, unknown> = {}) {
  const pagination = parsePagination(query);
  const sortClause = buildSortClause(query.sortBy, query.sortOrder, MASCOTA_SORT_FIELDS, "fecha");
  return mascotaRepo.findVisible(pagination, sortClause, parseFiltros(query));
}

export async function listarPorFundacion(
  fundacionEmail: string,
  query: Record<string, unknown> = {}
) {
  const pagination = parsePagination(query);
  const sortClause = buildSortClause(query.sortBy, query.sortOrder, MASCOTA_SORT_FIELDS, "fecha");
  return mascotaRepo.findByFundacionEmail(
    fundacionEmail,
    pagination,
    sortClause,
    parseFiltros(query)
  );
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
  // Borrado lógico: nunca físico, porque las solicitudes históricas
  // referencian mascotas.id con FK RESTRICT.
  await mascotaRepo.softDelete(id);
  return { ok: true };
}

export function isAvailableForAdoption(
  pet: Pick<Mascota, "estado" | "hidden">
) {
  return Boolean(pet && pet.estado === "Disponible" && !pet.hidden);
}

async function assertOwnership(id: number, fundacionEmail?: string) {
  if (fundacionEmail && !(await mascotaRepo.belongsToFundacion(id, fundacionEmail))) {
    throw new ForbiddenError("No tienes permiso para modificar esta mascota.");
  }
  const mascota = await mascotaRepo.findById(id);
  if (!mascota) throw new NotFoundError("Mascota no encontrada.");
  return mascota;
}

export async function agregarTag(id: number, tag: string, fundacionEmail?: string) {
  await assertOwnership(id, fundacionEmail);
  return mascotaRepo.addTag(id, tag);
}

export async function quitarTag(id: number, tagId: number, fundacionEmail?: string) {
  await assertOwnership(id, fundacionEmail);
  return mascotaRepo.removeTagById(id, tagId);
}

export async function agregarMedio(
  id: number,
  data: { tipo?: string; contenido: string; esPrincipal?: boolean },
  fundacionEmail?: string
) {
  await assertOwnership(id, fundacionEmail);
  return mascotaRepo.addMedio(id, data);
}

export async function quitarMedio(id: number, medioId: number, fundacionEmail?: string) {
  await assertOwnership(id, fundacionEmail);
  return mascotaRepo.removeMedio(id, medioId);
}

import * as donacionRepo from "../repositories/donacion.repository.js";
import { buildSortClause, parsePagination } from "../utils/pagination.js";
import { DONACION_SORT_FIELDS, type DonacionFiltros } from "../repositories/donacion.repository.js";
import { ConflictError, ForbiddenError, NotFoundError } from "../utils/errors.js";

export async function listarDonaciones(
  rol: string,
  correo: string,
  query: Record<string, unknown> = {}
) {
  const pagination = parsePagination(query);
  const sortClause = buildSortClause(query.sortBy, query.sortOrder, DONACION_SORT_FIELDS, "fecha");
  const filtros: DonacionFiltros = {};
  if (query.tipo) filtros.tipo = String(query.tipo);
  if (query.estado) filtros.estado = String(query.estado);

  if (rol === "admin") return donacionRepo.findAll(pagination, sortClause, filtros);
  return donacionRepo.findByCorreo(correo, pagination, sortClause, filtros);
}

export async function crearDonacion(data: {
  nombre: string;
  correo: string;
  tipo: string;
  cantidad: string;
  direccion: string;
}) {
  const donacion = await donacionRepo.create(data);
  return { donacion };
}

export async function actualizarEstado(id: string, estado: string, rol: string) {
  if (rol !== "admin") {
    throw new ForbiddenError("Solo un administrador puede cambiar el estado de una donación.");
  }
  const donacion = await donacionRepo.findById(id);
  if (!donacion) throw new NotFoundError("Donación no encontrada.");
  return donacionRepo.updateEstado(id, estado);
}

export async function cancelarDonacion(id: string, rol: string) {
  if (rol !== "admin") {
    throw new ForbiddenError("Solo un administrador puede cancelar una donación.");
  }
  const donacion = await donacionRepo.findById(id);
  if (!donacion) throw new NotFoundError("Donación no encontrada.");
  if (donacion.estado === "Completado") {
    throw new ConflictError("No se puede cancelar una donación ya completada.");
  }
  return donacionRepo.updateEstado(id, "Cancelado");
}

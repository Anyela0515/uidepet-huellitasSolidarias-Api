import * as denunciaRepo from "../repositories/denuncia.repository.js";
import { NotFoundError } from "../utils/errors.js";
import { buildSortClause, parsePagination } from "../utils/pagination.js";
import { DENUNCIA_SORT_FIELDS } from "../repositories/denuncia.repository.js";

export async function listarDenuncias(query: Record<string, unknown> = {}) {
  const pagination = parsePagination(query);
  const sortClause = buildSortClause(query.sortBy, query.sortOrder, DENUNCIA_SORT_FIELDS, "fecha");
  const estado = query.estado !== undefined ? String(query.estado) : undefined;
  return denunciaRepo.findAll(pagination, sortClause, { estado });
}

export async function crearDenuncia(data: {
  tipoAnimal: string;
  urgencia: string;
  ubicacion: string;
  referencia?: string | null;
  coordenadas?: { latitud: number; longitud: number } | null;
  descripcion: string;
  nombreContacto?: string | null;
  contacto?: string | null;
  evidencias: Array<{ name: string; type?: string | null; size?: number | null; url?: string | null }>;
}) {
  const reporte = await denunciaRepo.create(data);
  return { reporte };
}

export async function actualizarEstado(id: string, estado: string) {
  const denuncia = await denunciaRepo.findById(id);
  if (!denuncia) throw new NotFoundError("Reporte no encontrado.");

  const reporte = await denunciaRepo.updateEstado(id, estado);
  return { reporte };
}

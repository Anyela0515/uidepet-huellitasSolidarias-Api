import * as denunciaRepo from "../repositories/denuncia.repository.js";
import * as organizacionRepo from "../repositories/organizacion.repository.js";
import { sendNuevoReporteRescateEmail } from "./email.service.js";
import { NotFoundError } from "../utils/errors.js";
import { buildSortClause, parsePagination } from "../utils/pagination.js";
import { DENUNCIA_SORT_FIELDS } from "../repositories/denuncia.repository.js";
import { publish } from "../events/domainEvents.js";

interface Actor {
  id: number | null;
  correo: string | null;
}

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
  if (reporte) await notificarFundaciones(reporte);
  return { reporte };
}

async function notificarFundaciones(reporte: {
  tipoAnimal: string;
  urgencia: string;
  ubicacion: string;
  descripcion: string;
}) {
  const panelUrl = `${process.env.FRONTEND_URL || "https://huellitassolidarias.com"}/fundacion/reportes`;
  let fundaciones: Array<{ correo: string; nombre: string }>;
  try {
    fundaciones = await organizacionRepo.findAllActivasConCorreo();
  } catch (error) {
    console.error("No se pudieron obtener las fundaciones para notificar el reporte:", error);
    return;
  }

  const envios = fundaciones.map((fundacion) =>
    sendNuevoReporteRescateEmail(fundacion.correo, fundacion.nombre, panelUrl, reporte).catch((error) => {
      console.error(`No se pudo notificar el reporte a ${fundacion.correo}:`, error);
    })
  );
  await Promise.allSettled(envios);
}

export async function actualizarEstado(id: string, estado: string, actor?: Actor) {
  const denuncia = await denunciaRepo.findById(id);
  if (!denuncia) throw new NotFoundError("Reporte no encontrado.");

  const reporte = await denunciaRepo.updateEstado(id, estado);

  publish("reporte.estado_cambiado", {
    usuarioId: actor?.id ?? null,
    usuarioCorreo: actor?.correo ?? null,
    entidad: "reporte_rescate",
    entidadId: id,
    detalle: { estadoAnterior: denuncia.estado, estadoNuevo: estado },
  });

  return { reporte };
}

import * as donacionRepo from "../repositories/donacion.repository.js";
import * as organizacionRepo from "../repositories/organizacion.repository.js";
import * as mensajeRepo from "../repositories/mensaje.repository.js";
import { buildSortClause, parsePagination } from "../utils/pagination.js";
import { DONACION_SORT_FIELDS, type DonacionFiltros } from "../repositories/donacion.repository.js";
import { ConflictError, ForbiddenError, NotFoundError } from "../utils/errors.js";
import { sendComprobanteDonacionEmail, sendNuevoMensajeNotificationEmail } from "./email.service.js";

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
  organizacionId: number;
  comprobantePago?: string | null;
}) {
  const organizacion = await organizacionRepo.findById(data.organizacionId);
  if (!organizacion || !organizacion.activo) {
    throw new NotFoundError("Organización no disponible.");
  }
  const donacion = await donacionRepo.create(data);

  await mensajeRepo.create({
    de: data.nombre,
    correo: data.correo,
    asunto: `Nueva donación — ${data.tipo}`,
    mensaje: `${data.nombre} (${data.correo}) registró una donación: ${data.tipo} — ${data.cantidad}.${
      data.direccion ? ` Dirección: ${data.direccion}.` : ""
    }`,
    organizacionId: data.organizacionId,
  });

  const frontendUrl = (process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/$/, "");
  try {
    await sendNuevoMensajeNotificationEmail(
      organizacion.correo,
      organizacion.nombre,
      `${frontendUrl}/fundacion/mensajes`
    );
  } catch (error) {
    console.error("No se pudo enviar el aviso de nueva donación a la organización:", error);
  }

  if (data.comprobantePago) {
    try {
      await sendComprobanteDonacionEmail(
        organizacion.correo,
        organizacion.nombre,
        data.nombre,
        data.correo,
        data.cantidad,
        data.comprobantePago
      );
    } catch (error) {
      console.error("No se pudo enviar el comprobante de pago a la organización:", error);
    }
  }

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

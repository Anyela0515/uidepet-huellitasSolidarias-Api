import * as mensajeRepo from "../repositories/mensaje.repository.js";
import * as organizacionRepo from "../repositories/organizacion.repository.js";
import { ForbiddenError, NotFoundError } from "../utils/errors.js";
import { buildSortClause, parsePagination } from "../utils/pagination.js";
import { MENSAJE_SORT_FIELDS } from "../repositories/mensaje.repository.js";
import { sendNuevoMensajeNotificationEmail } from "./email.service.js";

export async function listarMensajes(
  rol: string,
  correo: string,
  query: Record<string, unknown> = {}
) {
  const pagination = parsePagination(query);
  const sortClause = buildSortClause(query.sortBy, query.sortOrder, MENSAJE_SORT_FIELDS, "fecha");
  const leido = query.leido !== undefined ? String(query.leido) === "true" : undefined;

  if (rol === "admin") return mensajeRepo.findAll(pagination, sortClause, leido);
  if (rol === "fundacion")
    return mensajeRepo.findByFundacion(correo, pagination, sortClause, leido);
  throw new ForbiddenError("No tienes permiso para ver los mensajes.");
}

export async function crearMensaje(data: {
  de: string;
  correo: string;
  asunto: string;
  mensaje: string;
  solicitudId?: string | null;
  fundacionEmail?: string | null;
  organizacionId?: number | null;
}) {
  let organizacion: Awaited<ReturnType<typeof organizacionRepo.findById>> = null;
  if (data.organizacionId) {
    organizacion = await organizacionRepo.findById(data.organizacionId);
    if (!organizacion || !organizacion.activo) {
      throw new NotFoundError("Organización no disponible.");
    }
  }

  const mensaje = await mensajeRepo.create(data);

  const frontendUrl = (process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/$/, "");

  if (organizacion) {
    try {
      await sendNuevoMensajeNotificationEmail(
        organizacion.correo,
        organizacion.nombre,
        `${frontendUrl}/fundacion/mensajes`,
        data.de,
        data.asunto
      );
    } catch (error) {
      console.error("No se pudo enviar el aviso de nuevo mensaje a la organización:", error);
    }
  } else {

    try {
      await sendNuevoMensajeNotificationEmail(
        "leontauro2005@gmail.com",
        "Equipo de soporte Huellitas Solidarias",
        `${frontendUrl}/fundacion/mensajes`,
        data.de,
        data.asunto
      );
    } catch (error) {
      console.error("No se pudo enviar el aviso de mensaje de soporte:", error);
    }
  }

  return { mensaje };
}

export async function marcarLeido(id: string, rol: string, correo: string) {
  const mensaje = await mensajeRepo.findById(id);
  if (!mensaje) throw new NotFoundError("Mensaje no encontrado.");

  if (rol !== "admin" && mensaje.fundacionEmail !== correo) {
    throw new ForbiddenError("No tienes permiso para modificar este mensaje.");
  }

  await mensajeRepo.markAsRead(id);
  return { ok: true };
}

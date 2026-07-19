import * as solicitudRepo from "../repositories/solicitud.repository.js";
import * as mascotaRepo from "../repositories/mascota.repository.js";
import * as mensajeRepo from "../repositories/mensaje.repository.js";
import {
  ActualizarEstadoSolicitudDTO,
  CrearSolicitudDTO,
} from "../schemas/solicitud.schema.js";
import { isAvailableForAdoption } from "./mascota.service.js";
import { buildSortClause, parsePagination } from "../utils/pagination.js";
import { SOLICITUD_SORT_FIELDS } from "../repositories/solicitud.repository.js";
import { ConflictError, ForbiddenError, NotFoundError } from "../utils/errors.js";

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  revision: ["aprobada", "rechazada"],
  aprobada: ["seguimiento", "rechazada"],
  rechazada: [],
  seguimiento: [],
};

export async function listarSolicitudes(
  rol: string,
  correo: string,
  query: Record<string, unknown> = {}
) {
  const pagination = parsePagination(query);
  const sortClause = buildSortClause(query.sortBy, query.sortOrder, SOLICITUD_SORT_FIELDS, "fecha");
  const estado = query.estado ? String(query.estado) : undefined;

  if (rol === "admin") return solicitudRepo.findAll(pagination, sortClause, estado);
  if (rol === "fundacion")
    return solicitudRepo.findByFundacion(correo, pagination, sortClause, estado);
  return solicitudRepo.findByAdoptante(correo, pagination, sortClause, estado);
}

export async function obtenerSolicitud(id: string) {
  return solicitudRepo.findById(id);
}

export async function crearSolicitud(
  data: CrearSolicitudDTO,
  user: { id: number; nombre: string; correo: string }
) {
  const pet = await mascotaRepo.findById(data.petId);
  if (!pet) return { error: "Mascota no encontrada." };
  if (!isAvailableForAdoption(pet)) {
    return { error: "Esta mascota no está disponible para adopción." };
  }

  if (await solicitudRepo.hasActiveForUserAndPet(user.correo, data.petId)) {
    return { error: "Ya tienes una solicitud activa para esta mascota." };
  }

  if (await solicitudRepo.hasActiveForPet(data.petId)) {
    return { error: "Esta mascota ya tiene una solicitud en proceso." };
  }

  const solicitud = await solicitudRepo.create(data, pet, user);
  await mascotaRepo.update(data.petId, { estado: "En proceso" });

  await mensajeRepo.create({
    de: user.nombre,
    correo: user.correo,
    asunto: `Nueva solicitud de adopción — ${pet.nombre}`,
    mensaje: `${user.nombre} envió una solicitud para adoptar a ${pet.nombre}. Revisar en Solicitudes.`,
    solicitudId: solicitud?.id,
    fundacionEmail: pet.fundacionEmail,
  });

  return { solicitud };
}

export async function actualizarEstado(
  id: string,
  data: ActualizarEstadoSolicitudDTO,
  fundacionEmail?: string
) {
  const actual = await solicitudRepo.findById(id);
  if (!actual) return { error: "Solicitud no encontrada." };

  if (fundacionEmail && actual.fundacionEmail !== fundacionEmail) {
    return { error: "No tienes permiso para modificar esta solicitud." };
  }

  // Validación optimista previa (mejor mensaje de error para el caso común);
  // la validación autoritativa ocurre de nuevo dentro de la transacción con
  // bloqueo, por si el estado cambió entre esta lectura y la escritura.
  const allowed = ALLOWED_TRANSITIONS[actual.estado] || [];
  if (!allowed.includes(data.estado)) {
    return { error: "Transición de estado no permitida." };
  }

  try {
    const solicitud = await solicitudRepo.updateEstadoConBloqueo(
      id,
      actual.petId,
      data,
      ALLOWED_TRANSITIONS
    );
    return { solicitud };
  } catch (error) {
    if (error instanceof Error && error.message === "TRANSICION_NO_PERMITIDA") {
      return { error: "Transición de estado no permitida: la solicitud ya cambió de estado." };
    }
    if (error instanceof Error && error.message === "SOLICITUD_NO_ENCONTRADA") {
      return { error: "Solicitud no encontrada." };
    }
    throw error;
  }
}

export async function agregarSeguimiento(
  id: string,
  data: {
    comentario: string;
    cantidadArchivos?: number;
    archivosNombres?: string[];
  },
  userCorreo: string
) {
  const actual = await solicitudRepo.findById(id);
  if (!actual) return { error: "Solicitud no encontrada." };
  if (actual.adoptanteEmail !== userCorreo) {
    return { error: "No tienes permiso para modificar esta solicitud." };
  }
  if (actual.estado !== "seguimiento") {
    return { error: "Esta solicitud no está en etapa de seguimiento." };
  }
  if (actual.seguimientoEnviado) {
    return { error: "Ya enviaste la evidencia de seguimiento." };
  }

  const solicitud = await solicitudRepo.addSeguimiento(id, data);

  await mensajeRepo.create({
    de: actual.adoptante,
    correo: actual.adoptanteEmail,
    asunto: `Seguimiento post-adopción — ${actual.mascota}`,
    mensaje: data.comentario,
    solicitudId: id,
    fundacionEmail: actual.fundacionEmail,
  });

  return { solicitud };
}

export async function agregarEvidencia(
  solicitudId: string,
  data: { nombreArchivo: string; mimeType?: string; tamanioBytes?: number; contenido?: string },
  rol: string,
  correo: string
) {
  const solicitud = await solicitudRepo.findById(solicitudId);
  if (!solicitud) throw new NotFoundError("Solicitud no encontrada.");
  if (rol !== "admin" && solicitud.adoptanteEmail !== correo) {
    throw new ForbiddenError("No tienes permiso para modificar esta solicitud.");
  }
  return solicitudRepo.addEvidencia(solicitudId, data);
}

export async function eliminarEvidencia(
  solicitudId: string,
  evidenciaId: number,
  rol: string,
  correo: string
) {
  const solicitud = await solicitudRepo.findById(solicitudId);
  if (!solicitud) throw new NotFoundError("Solicitud no encontrada.");
  if (rol !== "admin" && solicitud.adoptanteEmail !== correo) {
    throw new ForbiddenError("No tienes permiso para modificar esta solicitud.");
  }
  return solicitudRepo.removeEvidencia(solicitudId, evidenciaId);
}

async function assertSeguimientoManageable(id: number, rol: string, correo: string) {
  const seguimiento = await solicitudRepo.findSeguimientoById(id);
  if (!seguimiento) throw new NotFoundError("Seguimiento no encontrado.");
  if (rol !== "admin" && seguimiento.fundacionEmail !== correo) {
    throw new ForbiddenError("No tienes permiso para modificar este seguimiento.");
  }
  return seguimiento;
}

export async function actualizarSeguimiento(
  id: number,
  comentario: string,
  rol: string,
  correo: string
) {
  await assertSeguimientoManageable(id, rol, correo);
  return solicitudRepo.updateSeguimientoComentario(id, comentario);
}

/**
 * Los seguimientos funcionan como evidencia de la adopción: nunca se borran
 * físicamente, ni siquiera para el administrador. La ruta existe para
 * cumplir el contrato, pero rechaza la operación de forma explícita.
 */
export async function eliminarSeguimiento(id: number, rol: string, correo: string) {
  await assertSeguimientoManageable(id, rol, correo);
  throw new ConflictError(
    "Los seguimientos no se eliminan físicamente: son evidencia de la adopción."
  );
}

export async function agregarArchivoSeguimiento(
  id: number,
  nombreArchivo: string,
  rol: string,
  correo: string
) {
  const seguimiento = await solicitudRepo.findSeguimientoById(id);
  if (!seguimiento) throw new NotFoundError("Seguimiento no encontrado.");
  const esPropio =
    rol === "admin" ||
    seguimiento.fundacionEmail === correo ||
    seguimiento.adoptanteEmail === correo;
  if (!esPropio) {
    throw new ForbiddenError("No tienes permiso para modificar este seguimiento.");
  }
  return solicitudRepo.addArchivoSeguimiento(id, nombreArchivo);
}

export async function eliminarArchivoSeguimiento(
  id: number,
  archivoId: number,
  rol: string,
  correo: string
) {
  await assertSeguimientoManageable(id, rol, correo);
  return solicitudRepo.removeArchivoSeguimiento(id, archivoId);
}

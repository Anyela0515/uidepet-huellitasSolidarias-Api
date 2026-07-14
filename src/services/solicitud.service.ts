import * as solicitudRepo from "../repositories/solicitud.repository.js";
import * as mascotaRepo from "../repositories/mascota.repository.js";
import * as mensajeRepo from "../repositories/mensaje.repository.js";
import {
  ActualizarEstadoSolicitudDTO,
  CrearSolicitudDTO,
} from "../schemas/solicitud.schema.js";
import { isAvailableForAdoption } from "./mascota.service.js";

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  revision: ["aprobada", "rechazada"],
  aprobada: ["seguimiento", "rechazada"],
  rechazada: [],
  seguimiento: [],
};

export async function listarSolicitudes(rol: string, correo: string) {
  if (rol === "admin") return solicitudRepo.findAll();
  if (rol === "fundacion") return solicitudRepo.findByFundacion(correo);
  return solicitudRepo.findByAdoptante(correo);
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

  const allowed = ALLOWED_TRANSITIONS[actual.estado] || [];
  if (!allowed.includes(data.estado)) {
    return { error: "Transición de estado no permitida." };
  }

  const solicitud = await solicitudRepo.updateEstado(id, data);

  if (data.estado === "rechazada") {
    const hasOther = await solicitudRepo.hasActiveForPet(actual.petId, id);
    if (!hasOther) {
      await mascotaRepo.update(actual.petId, { estado: "Disponible" });
    }
  } else if (data.estado === "aprobada") {
    await mascotaRepo.update(actual.petId, { estado: "En proceso" });
  } else if (data.estado === "seguimiento") {
    await mascotaRepo.update(actual.petId, { estado: "Adoptado" });
  }

  return { solicitud };
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

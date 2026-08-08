import crypto from "node:crypto";
import { pool } from "../config/database.js";
import * as fundacionRepo from "../repositories/fundacion.repository.js";
import * as organizacionRepo from "../repositories/organizacion.repository.js";
import * as usuarioRepo from "../repositories/usuario.repository.js";
import * as authService from "./auth.service.js";
import { buildSortClause, parsePagination } from "../utils/pagination.js";
import { FUNDACION_SORT_FIELDS } from "../repositories/fundacion.repository.js";
import { ConflictError, NotFoundError } from "../utils/errors.js";
import { sendFundacionCredentialsEmail, sendFundacionRechazadaEmail } from "./email.service.js";

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  pendiente: ["aprobada", "rechazada"],
  aprobada: [],
  rechazada: [],
};

function generateTemporaryPassword(): string {
  // 16 chars alfanuméricos, suficiente entropía para una contraseña temporal
  // de un solo uso que el admin debe comunicar y el usuario debe cambiar.
  return crypto.randomBytes(12).toString("base64url");
}

export async function obtenerFundacion(id: string) {
  const fundacion = await fundacionRepo.findById(id);
  if (!fundacion) throw new NotFoundError("Solicitud de fundación no encontrada.");
  return fundacion;
}

export async function listarFundaciones(query: Record<string, unknown> = {}) {
  const pagination = parsePagination(query);
  const sortClause = buildSortClause(query.sortBy, query.sortOrder, FUNDACION_SORT_FIELDS, "fecha");
  const estado = query.estado ? String(query.estado) : undefined;
  return fundacionRepo.findAll(pagination, sortClause, estado);
}

export async function listarOrganizacionesPublicas() {
  return organizacionRepo.findPublicas();
}

export async function registrarFundacion(data: {
  nombre: string;
  organizacion?: string;
  ruc: string;
  representante: string;
  correo: string;
  telefono: string;
  localidadId: number;
  descripcion: string;
  documento?: string;
  documentoContenido?: string;
}) {
  const correo = data.correo.trim().toLowerCase();

  if (await fundacionRepo.existsByCorreo(correo)) {
    return { error: "Ya existe una solicitud con este correo." };
  }

  if (await fundacionRepo.existsByRuc(data.ruc.trim())) {
    return { error: "Ya existe una solicitud con este RUC." };
  }

  const fundacion = await fundacionRepo.create({ ...data, correo });
  return { fundacion };
}

export async function actualizarEstado(
  id: string,
  estado: string
): Promise<
  | { error: string }
  | {
      fundacion: Awaited<ReturnType<typeof fundacionRepo.findById>>;
      credencialesEnviadas?: boolean;
    }
> {
  const fundacion = await fundacionRepo.findById(id);
  if (!fundacion) return { error: "Fundación no encontrada." };

  const allowed = ALLOWED_TRANSITIONS[fundacion.estado] ?? [];
  if (!allowed.includes(estado)) {
    return {
      error:
        fundacion.estado === estado
          ? "Esta solicitud ya fue procesada con ese estado."
          : "Transición de estado no permitida: la solicitud ya fue procesada.",
    };
  }

  const conn = await pool.getConnection();
  let temporaryPassword: string | undefined;

  try {
    await conn.beginTransaction();

    let updated: Awaited<ReturnType<typeof fundacionRepo.findById>>;
    if (estado === "rechazada") {
      // Se elimina en vez de marcar como rechazada: correo/RUC son UNIQUE
      // en esta tabla, y dejar la fila bloquearía un futuro reintento de la
      // misma organización con los mismos datos.
      updated = { ...fundacion, estado: "rechazada" };
      await fundacionRepo.deleteRequest(id, conn);
    } else {
      updated = await fundacionRepo.updateEstado(id, estado, conn);
    }

    let esCuentaNueva = false;
    if (estado === "aprobada" && updated) {
      temporaryPassword = generateTemporaryPassword();
      const resultado = await authService.createFundacionUser(
        {
          correo: updated.correo,
          nombre: updated.representante || updated.nombre,
          telefono: updated.telefono,
          organizacion: updated.organizacion || updated.nombre,
          password: temporaryPassword,
          ruc: updated.ruc,
          localidadId: updated.localidadId ?? undefined,
          descripcion: updated.descripcion,
        },
        conn
      );
      esCuentaNueva = !resultado.existed;
    }

    await conn.commit();

    if (estado === "rechazada" && updated) {
      try {
        await sendFundacionRechazadaEmail(updated.correo, updated.representante || updated.nombre);
      } catch (error) {
        console.error("No se pudo enviar el correo de rechazo de fundación:", error);
      }
    }

    let credencialesEnviadas = false;
    if (esCuentaNueva && updated && temporaryPassword) {
      const frontendUrl = (process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/$/, "");
      try {
        await sendFundacionCredentialsEmail(
          updated.correo,
          updated.representante || updated.nombre,
          temporaryPassword,
          `${frontendUrl}/ingreso`
        );
        credencialesEnviadas = true;
      } catch (error) {
        console.error("No se pudo enviar el correo de credenciales de fundación:", error);
      }
    }

    return {
      fundacion: updated,
      // La contraseña temporal solo se envía por correo a la fundación; el
      // admin nunca la recibe en esta respuesta ni en ningún otro lugar.
      ...(esCuentaNueva ? { credencialesEnviadas } : {}),
    };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

export async function obtenerPerfilPropio(correo: string) {
  const perfil = await organizacionRepo.findByUsuarioCorreo(correo);
  if (!perfil) {
    throw new NotFoundError(
      "Tu cuenta de fundación no tiene una organización asociada."
    );
  }
  return perfil;
}

export async function actualizarPerfilPropio(
  correo: string,
  data: {
    telefono?: string;
    localidadId?: number;
    descripcion?: string;
    direccion?: string;
    imagenQr?: string | null;
    imagen?: string | null;
  }
) {
  const existing = await organizacionRepo.findByUsuarioCorreo(correo);
  if (!existing) {
    throw new NotFoundError(
      "Tu cuenta de fundación no tiene una organización asociada."
    );
  }
  return organizacionRepo.updateByUsuarioCorreo(correo, data);
}

export async function obtenerOrganizacion(id: number) {
  const organizacion = await organizacionRepo.findById(id);
  if (!organizacion) throw new NotFoundError("Organización no encontrada.");
  return organizacion;
}

/**
 * Elimina por completo una fundación aprobada: su cuenta de usuario, su
 * organización y la solicitud de registro que la originó. Se bloquea si
 * tiene mascotas o solicitudes de adopción asociadas (ahí se debe suspender
 * en su lugar, para no perder ese historial).
 */
export async function eliminarOrganizacion(solicitudId: string) {
  const solicitud = await fundacionRepo.findById(solicitudId);
  if (!solicitud) throw new NotFoundError("Solicitud no encontrada.");

  const organizacion = await organizacionRepo.findByUsuarioCorreo(solicitud.correo);
  if (!organizacion) throw new NotFoundError("No existe una cuenta de fundación asociada.");

  if (await organizacionRepo.hasMascotasOSolicitudes(organizacion.id)) {
    throw new ConflictError(
      "No se puede eliminar: la fundación tiene mascotas o solicitudes asociadas. Puedes suspenderla en su lugar."
    );
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await organizacionRepo.remove(organizacion.id, conn);
    await usuarioRepo.remove(solicitud.correo, conn);
    await fundacionRepo.deleteRequest(solicitudId, conn);
    await conn.commit();
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }

  return { ok: true };
}

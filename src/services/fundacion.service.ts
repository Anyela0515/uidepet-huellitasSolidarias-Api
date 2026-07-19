import crypto from "node:crypto";
import { pool } from "../config/database.js";
import * as fundacionRepo from "../repositories/fundacion.repository.js";
import * as organizacionRepo from "../repositories/organizacion.repository.js";
import * as authService from "./auth.service.js";
import { buildSortClause, parsePagination } from "../utils/pagination.js";
import { FUNDACION_SORT_FIELDS } from "../repositories/fundacion.repository.js";
import { ConflictError, NotFoundError } from "../utils/errors.js";

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

export async function registrarFundacion(data: {
  nombre: string;
  organizacion?: string;
  ruc: string;
  representante: string;
  correo: string;
  telefono: string;
  ciudad: string;
  descripcion: string;
  documento?: string;
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
  | { fundacion: Awaited<ReturnType<typeof fundacionRepo.findById>>; temporaryPassword?: string }
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

    const updated = await fundacionRepo.updateEstado(id, estado, conn);

    if (estado === "aprobada" && updated) {
      temporaryPassword = generateTemporaryPassword();
      await authService.createFundacionUser(
        {
          correo: updated.correo,
          nombre: updated.representante || updated.nombre,
          telefono: updated.telefono,
          organizacion: updated.organizacion || updated.nombre,
          password: temporaryPassword,
          ruc: updated.ruc,
          ciudad: updated.ciudad,
          descripcion: updated.descripcion,
        },
        conn
      );
    }

    await conn.commit();

    return {
      fundacion: updated,
      // Sin infraestructura de envío de correo: la contraseña temporal se
      // retorna una única vez en esta respuesta para que el admin la
      // comunique de forma segura. Nunca se loggea ni se persiste en claro.
      ...(temporaryPassword ? { temporaryPassword } : {}),
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
  data: { telefono?: string; ciudad?: string; descripcion?: string; direccion?: string }
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

/** Borrado lógico: nunca físico, para preservar mascotas/solicitudes/mensajes históricos. */
export async function eliminarOrganizacion(id: number) {
  const organizacion = await organizacionRepo.findById(id);
  if (!organizacion) throw new NotFoundError("Organización no encontrada.");

  if (await organizacionRepo.hasMascotasOSolicitudes(id)) {
    throw new ConflictError(
      "No se puede desactivar: la organización tiene mascotas o solicitudes asociadas."
    );
  }

  await organizacionRepo.softDelete(id);
  return { ok: true };
}

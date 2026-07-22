import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { OAuth2Client } from "google-auth-library";
import type { PoolConnection } from "mysql2/promise";
import * as usuarioRepo from "../repositories/usuario.repository.js";
import * as catalog from "../repositories/catalog.repository.js";
import { GoogleLoginDTO, LoginDTO, RegisterDTO } from "../schemas/auth.schema.js";
import { mapUsuario } from "../utils/mappers.js";
import { buildSortClause, parsePagination } from "../utils/pagination.js";
import { USUARIO_SORT_FIELDS, type UsuarioFiltros } from "../repositories/usuario.repository.js";
import * as passwordResetRepo from "../repositories/passwordReset.repository.js";
import { sendPasswordResetEmail } from "./email.service.js";

function signSessionToken(usuario: ReturnType<typeof mapUsuario>) {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET no configurado correctamente.");
  }

  return jwt.sign(
    { sub: usuario.id, correo: usuario.correo, rol: usuario.rol },
    secret,
    { expiresIn: (process.env.JWT_EXPIRES_IN || "8h") as jwt.SignOptions["expiresIn"] }
  );
}

export async function login(data: LoginDTO) {
  const row = await usuarioRepo.findByCorreo(data.correo.trim().toLowerCase());
  if (!row) return { error: "Credenciales incorrectas." };

  const valid = await bcrypt.compare(data.password, String(row.password));
  if (!valid) return { error: "Credenciales incorrectas." };

  const usuario = mapUsuario(row);
  if (usuario.estado === "Suspendido") {
    return { error: "suspendido" };
  }

  return { token: signSessionToken(usuario), usuario };
}

export async function loginWithGoogle(data: GoogleLoginDTO) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) throw new Error("GOOGLE_CLIENT_ID no configurado.");

  const ticket = await new OAuth2Client(clientId).verifyIdToken({
    idToken: data.credential,
    audience: clientId,
  });
  const payload = ticket.getPayload();
  if (!payload?.email || !payload.email_verified) {
    return { error: "Google no pudo verificar el correo de esta cuenta." };
  }

  const correo = payload.email.trim().toLowerCase();
  let row = await usuarioRepo.findByCorreo(correo);
  if (!row) {
    const randomPassword = await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 12);
    await usuarioRepo.create({
      nombre: payload.name?.trim() || correo.split("@")[0],
      correo,
      password: randomPassword,
      rol: "usuario",
    });
    row = await usuarioRepo.findByCorreo(correo);
  }
  if (!row) throw new Error("No se pudo crear la cuenta de Google.");

  const usuario = mapUsuario(row);
  if (usuario.estado === "Suspendido") return { error: "suspendido" };
  return { token: signSessionToken(usuario), usuario };
}

export async function register(data: RegisterDTO) {
  const correo = data.correo.trim().toLowerCase();

  if (await usuarioRepo.existsByCorreo(correo)) {
    return { error: "El correo ya está registrado." };
  }

  if (await usuarioRepo.existsByCedula(data.cedula)) {
    return { error: "La cédula ya está registrada." };
  }

  const hash = await bcrypt.hash(data.password, 12);
  const usuario = await usuarioRepo.create({
    nombre: data.nombre,
    correo,
    password: hash,
    cedula: data.cedula,
    telefono: data.telefono,
    direccion: data.direccion,
    rol: "usuario",
  });

  return { usuario };
}

export async function changePassword(
  correo: string,
  currentPassword: string,
  newPassword: string
): Promise<{ error: string } | { ok: true }> {
  const row = await usuarioRepo.findByCorreo(correo);
  if (!row) return { error: "Usuario no encontrado." };

  const valid = await bcrypt.compare(currentPassword, String(row.password));
  if (!valid) return { error: "La contraseña actual es incorrecta." };

  const hash = await bcrypt.hash(newPassword, 12);
  await usuarioRepo.updatePassword(correo, hash);
  return { ok: true };
}

export async function requestPasswordReset(correoInput: string) {
  const correo = correoInput.trim().toLowerCase();
  const row = await usuarioRepo.findByCorreo(correo);
  if (!row) return { ok: true };

  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
  await passwordResetRepo.create(Number(row.id), tokenHash, expiresAt);

  const frontendUrl = (process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/$/, "");
  const resetUrl = `${frontendUrl}/recuperar-contrasena?token=${encodeURIComponent(token)}`;
  try {
    await sendPasswordResetEmail(correo, String(row.nombre || "Usuario"), resetUrl);
  } catch (error) {
    console.error("No se pudo enviar el correo de recuperación:", error);
  }

  return process.env.NODE_ENV === "test" ? { ok: true, token } : { ok: true };
}

export async function resetPasswordWithToken(token: string, newPassword: string) {
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const passwordHash = await bcrypt.hash(newPassword, 12);
  const consumed = await passwordResetRepo.consumeAndUpdatePassword(tokenHash, passwordHash);
  return consumed ? { ok: true } : { error: "El enlace es inválido, ya fue utilizado o venció." };
}

export async function getMe(id: number) {
  const row = await usuarioRepo.findById(id);
  return row ? mapUsuario(row) : null;
}

export async function updateProfile(
  correo: string,
  data: {
    nombre?: string;
    telefono?: string;
    direccion?: string;
    cedula?: string;
  }
) {
  if (data.cedula && (await usuarioRepo.existsByCedula(data.cedula, correo))) {
    return { error: "La cédula ya está registrada." };
  }

  const usuario = await usuarioRepo.updateProfile(correo, data);
  return usuario ? { usuario } : { error: "Usuario no encontrado." };
}

export async function listUsers(query: Record<string, unknown> = {}) {
  const pagination = parsePagination(query);
  const sortClause = buildSortClause(query.sortBy, query.sortOrder, USUARIO_SORT_FIELDS, "fecha");
  const filtros: UsuarioFiltros = {};
  if (query.rol) filtros.rol = String(query.rol);
  if (query.estado) filtros.estado = String(query.estado);
  if (query.search) filtros.search = String(query.search);
  return usuarioRepo.findAll(pagination, sortClause, filtros);
}

export async function setRole(correo: string, rol: string) {
  const row = await usuarioRepo.findByCorreo(correo);
  if (!row) return { error: "Usuario no encontrado." };
  await usuarioRepo.updateRol(correo, rol);
  return { ok: true };
}

export async function setEstado(correo: string, estado: string) {
  const row = await usuarioRepo.findByCorreo(correo);
  if (!row) return { error: "Usuario no encontrado." };
  await usuarioRepo.updateEstado(correo, estado);
  return { ok: true };
}

export async function createFundacionUser(
  data: {
    correo: string;
    nombre: string;
    telefono?: string;
    organizacion?: string;
    password: string;
    ruc?: string;
    ciudad?: string;
    descripcion?: string;
  },
  conn?: PoolConnection
) {
  const exists = await usuarioRepo.findByCorreo(data.correo, conn);
  if (exists) {
    if (String(exists.rol_codigo) !== "fundacion") {
      await usuarioRepo.updateRol(data.correo, "fundacion", conn);
    }

    const orgId = await catalog.findOrganizacionIdByUsuarioId(Number(exists.id), conn);
    if (!orgId && data.organizacion) {
      await usuarioRepo.ensureOrganizacion(
        {
          usuarioId: Number(exists.id),
          organizacion: data.organizacion,
          ruc: data.ruc,
          ciudad: data.ciudad,
          telefono: data.telefono,
          descripcion: data.descripcion,
          direccion: undefined,
        },
        conn
      );
    }

    return { ok: true, existed: true };
  }

  const hash = await bcrypt.hash(data.password, 12);
  await usuarioRepo.create(
    {
      nombre: data.nombre,
      correo: data.correo,
      password: hash,
      telefono: data.telefono,
      rol: "fundacion",
      organizacion: data.organizacion,
      ruc: data.ruc,
      ciudad: data.ciudad,
      descripcion: data.descripcion,
    },
    conn
  );

  return { ok: true, existed: false };
}

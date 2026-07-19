import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import type { PoolConnection } from "mysql2/promise";
import * as usuarioRepo from "../repositories/usuario.repository.js";
import * as catalog from "../repositories/catalog.repository.js";
import { LoginDTO, RegisterDTO } from "../schemas/auth.schema.js";
import { mapUsuario } from "../utils/mappers.js";
import { buildSortClause, parsePagination } from "../utils/pagination.js";
import { USUARIO_SORT_FIELDS, type UsuarioFiltros } from "../repositories/usuario.repository.js";

export async function login(data: LoginDTO) {
  const row = await usuarioRepo.findByCorreo(data.correo.trim().toLowerCase());
  if (!row) return { error: "Credenciales incorrectas." };

  const valid = await bcrypt.compare(data.password, String(row.password));
  if (!valid) return { error: "Credenciales incorrectas." };

  const usuario = mapUsuario(row);
  if (usuario.estado === "Suspendido") {
    return { error: "suspendido" };
  }

  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET no configurado correctamente.");
  }

  const token = jwt.sign(
    { sub: usuario.id, correo: usuario.correo, rol: usuario.rol },
    secret,
    {
      expiresIn: (process.env.JWT_EXPIRES_IN ||
        "8h") as jwt.SignOptions["expiresIn"],
    }
  );

  return { token, usuario };
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

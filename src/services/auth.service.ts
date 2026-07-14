import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import * as usuarioRepo from "../repositories/usuario.repository.js";
import * as catalog from "../repositories/catalog.repository.js";
import { LoginDTO, RegisterDTO } from "../schemas/auth.schema.js";
import { mapUsuario } from "../utils/mappers.js";

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

export async function resetPassword(correo: string, password: string) {
  const row = await usuarioRepo.findByCorreo(correo.trim().toLowerCase());
  if (!row) return { error: "No existe una cuenta con ese correo." };

  const hash = await bcrypt.hash(password, 12);
  await usuarioRepo.updatePassword(correo.trim().toLowerCase(), hash);
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

export async function listUsers() {
  return usuarioRepo.findAll();
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

export async function createFundacionUser(data: {
  correo: string;
  nombre: string;
  telefono?: string;
  organizacion?: string;
  password: string;
  ruc?: string;
  ciudad?: string;
  descripcion?: string;
}) {
  const exists = await usuarioRepo.findByCorreo(data.correo);
  if (exists) {
    if (String(exists.rol_codigo) !== "fundacion") {
      await usuarioRepo.updateRol(data.correo, "fundacion");
    }

    const orgId = await catalog.findOrganizacionIdByUsuarioId(Number(exists.id));
    if (!orgId && data.organizacion) {
      await usuarioRepo.ensureOrganizacion({
        usuarioId: Number(exists.id),
        organizacion: data.organizacion,
        ruc: data.ruc,
        ciudad: data.ciudad,
        telefono: data.telefono,
        descripcion: data.descripcion,
        direccion: undefined,
      });
    }

    return { ok: true, existed: true };
  }

  const hash = await bcrypt.hash(data.password, 12);
  await usuarioRepo.create({
    nombre: data.nombre,
    correo: data.correo,
    password: hash,
    telefono: data.telefono,
    rol: "fundacion",
    organizacion: data.organizacion,
    ruc: data.ruc,
    ciudad: data.ciudad,
    descripcion: data.descripcion,
  });

  return { ok: true, existed: false };
}

import { pool } from "../config/database.js";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { mapUsuario } from "../utils/mappers.js";
import * as catalog from "./catalog.repository.js";

const USER_SELECT = `
  SELECT
    u.id,
    u.correo,
    u.password_hash AS password,
    u.creado_en,
    r.codigo AS rol_codigo,
    ec.codigo AS estado_codigo,
    p.nombre,
    p.cedula,
    p.telefono,
    p.direccion,
    o.nombre AS organizacion_nombre
  FROM usuarios u
  INNER JOIN roles r ON r.id = u.rol_id
  INNER JOIN estados_cuenta ec ON ec.id = u.estado_cuenta_id
  INNER JOIN perfiles_usuario p ON p.usuario_id = u.id
  LEFT JOIN organizaciones o ON o.usuario_id = u.id
`;

export async function findByCorreo(correo: string) {
  const [rows] = await pool.query<RowDataPacket[]>(
    `${USER_SELECT} WHERE u.correo = ? LIMIT 1`,
    [correo]
  );
  return rows[0] ?? null;
}

export async function findById(id: number) {
  const [rows] = await pool.query<RowDataPacket[]>(
    `${USER_SELECT} WHERE u.id = ? LIMIT 1`,
    [id]
  );
  return rows[0] ?? null;
}

export async function findAll() {
  const [rows] = await pool.query<RowDataPacket[]>(
    `${USER_SELECT} ORDER BY u.id DESC`
  );
  return rows.map((row) => mapUsuario(row));
}

export async function create(data: {
  nombre: string;
  correo: string;
  password: string;
  cedula?: string;
  telefono?: string;
  direccion?: string;
  rol?: string;
  organizacion?: string;
  ciudad?: string;
  ruc?: string;
  descripcion?: string;
}) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const rolId = await catalog.getRolId(data.rol ?? "usuario");
    const estadoId = await catalog.getEstadoCuentaId("Activo");

    const [userResult] = await conn.query<ResultSetHeader>(
      `INSERT INTO usuarios (correo, password_hash, rol_id, estado_cuenta_id)
       VALUES (?, ?, ?, ?)`,
      [data.correo, data.password, rolId, estadoId]
    );

    const usuarioId = userResult.insertId;

    await conn.query(
      `INSERT INTO perfiles_usuario (usuario_id, nombre, cedula, telefono, direccion)
       VALUES (?, ?, ?, ?, ?)`,
      [
        usuarioId,
        data.nombre,
        data.cedula ?? null,
        data.telefono ?? null,
        data.direccion ?? null,
      ]
    );

    if (data.rol === "fundacion" && data.organizacion) {
      const ciudadId = data.ciudad
        ? await catalog.getOrCreateCiudadId(data.ciudad)
        : null;

      await conn.query(
        `INSERT INTO organizaciones
          (nombre, ruc, telefono, ciudad_id, descripcion, direccion, usuario_id)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          data.organizacion,
          data.ruc ?? null,
          data.telefono ?? null,
          ciudadId,
          data.descripcion ?? null,
          data.direccion ?? null,
          usuarioId,
        ]
      );
    }

    await conn.commit();
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }

  const row = await findByCorreo(data.correo);
  return row ? mapUsuario(row) : null;
}

export async function updatePassword(correo: string, passwordHash: string) {
  await pool.query("UPDATE usuarios SET password_hash = ? WHERE correo = ?", [
    passwordHash,
    correo,
  ]);
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
  const user = await findByCorreo(correo);
  if (!user) return null;

  const sets: string[] = [];
  const values: unknown[] = [];

  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      sets.push(`${key} = ?`);
      values.push(value);
    }
  }

  if (sets.length) {
    values.push(user.id);
    await pool.query(
      `UPDATE perfiles_usuario SET ${sets.join(", ")} WHERE usuario_id = ?`,
      values
    );
  }

  const row = await findByCorreo(correo);
  return row ? mapUsuario(row) : null;
}

export async function updateRol(correo: string, rol: string) {
  const rolId = await catalog.getRolId(rol);
  await pool.query("UPDATE usuarios SET rol_id = ? WHERE correo = ?", [
    rolId,
    correo,
  ]);
}

export async function updateEstado(correo: string, estado: string) {
  const estadoId = await catalog.getEstadoCuentaId(estado);
  await pool.query("UPDATE usuarios SET estado_cuenta_id = ? WHERE correo = ?", [
    estadoId,
    correo,
  ]);
}

export async function existsByCorreo(correo: string) {
  const row = await findByCorreo(correo);
  return Boolean(row);
}

export async function existsByCedula(cedula: string, excludeCorreo?: string) {
  const [rows] = await pool.query<RowDataPacket[]>(
    excludeCorreo
      ? `SELECT p.usuario_id
         FROM perfiles_usuario p
         INNER JOIN usuarios u ON u.id = p.usuario_id
         WHERE p.cedula = ? AND u.correo <> ?
         LIMIT 1`
      : `SELECT usuario_id FROM perfiles_usuario WHERE cedula = ? LIMIT 1`,
    excludeCorreo ? [cedula, excludeCorreo] : [cedula]
  );
  return rows.length > 0;
}

export async function ensureOrganizacion(data: {
  usuarioId: number;
  organizacion: string;
  ruc?: string;
  ciudad?: string;
  telefono?: string;
  descripcion?: string;
  direccion?: string;
}) {
  const existing = await catalog.findOrganizacionIdByUsuarioId(data.usuarioId);
  if (existing) return existing;

  const ciudadId = data.ciudad
    ? await catalog.getOrCreateCiudadId(data.ciudad)
    : null;

  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO organizaciones
      (nombre, ruc, telefono, ciudad_id, descripcion, direccion, usuario_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      data.organizacion,
      data.ruc ?? null,
      data.telefono ?? null,
      ciudadId,
      data.descripcion ?? null,
      data.direccion ?? null,
      data.usuarioId,
    ]
  );

  return result.insertId;
}

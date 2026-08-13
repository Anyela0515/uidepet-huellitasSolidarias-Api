import { pool } from "../config/database.js";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import type { Pool, PoolConnection } from "mysql2/promise";
import { mapUsuario } from "../utils/mappers.js";
import * as catalog from "./catalog.repository.js";
import { buildPaginationMeta, type PaginationParams } from "../utils/pagination.js";

type Executor = Pool | PoolConnection;

export const USUARIO_SORT_FIELDS: Record<string, string> = {
  nombre: "u.nombre",
  fecha: "u.creado_en",
  correo: "u.correo",
};

export interface UsuarioFiltros {
  rol?: string;
  estado?: string;
  search?: string;
}

const USER_SELECT = `
  SELECT
    u.id,
    u.correo,
    u.password_hash AS password,
    u.debe_cambiar_password,
    u.email_verificado,
    u.creado_en,
    r.codigo AS rol_codigo,
    ec.codigo AS estado_codigo,
    u.nombre,
    u.cedula,
    u.telefono,
    u.direccion,
    u.imagen,
    o.nombre AS organizacion_nombre
  FROM usuarios u
  INNER JOIN catalogos r ON r.id = u.rol_id AND r.tipo = 'rol'
  INNER JOIN catalogos ec ON ec.id = u.estado_cuenta_id AND ec.tipo = 'estado_cuenta'
  LEFT JOIN organizaciones o ON o.usuario_id = u.id
`;

export async function findByCorreo(correo: string, conn: Executor = pool) {
  const [rows] = await conn.query<RowDataPacket[]>(
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

export async function findEstadoActual(id: number) {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT u.correo, r.codigo AS rol_codigo, ec.codigo AS estado_codigo
     FROM usuarios u
     INNER JOIN catalogos r ON r.id = u.rol_id AND r.tipo = 'rol'
     INNER JOIN catalogos ec ON ec.id = u.estado_cuenta_id AND ec.tipo = 'estado_cuenta'
     WHERE u.id = ?
     LIMIT 1`,
    [id]
  );
  return rows[0] ?? null;
}

export async function findAll(
  pagination: PaginationParams,
  sortClause: string,
  filtros: UsuarioFiltros = {}
) {
  const clauses: string[] = [];
  const values: unknown[] = [];

  if (filtros.rol) {
    clauses.push("r.codigo = ?");
    values.push(filtros.rol);
  }
  if (filtros.estado) {
    clauses.push("ec.codigo = ?");
    values.push(filtros.estado);
  }
  if (filtros.search) {
    clauses.push("(u.nombre LIKE ? OR u.correo LIKE ?)");
    values.push(`%${filtros.search}%`, `%${filtros.search}%`);
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";

  const [countRows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS total
     FROM usuarios u
     INNER JOIN catalogos r ON r.id = u.rol_id AND r.tipo = 'rol'
     INNER JOIN catalogos ec ON ec.id = u.estado_cuenta_id AND ec.tipo = 'estado_cuenta'
     ${where}`,
    values
  );
  const total = Number(countRows[0]?.total ?? 0);

  const [rows] = await pool.query<RowDataPacket[]>(
    `${USER_SELECT} ${where} ORDER BY ${sortClause} LIMIT ? OFFSET ?`,
    [...values, pagination.limit, pagination.offset]
  );

  return {
    data: rows.map((row) => mapUsuario(row)),
    meta: buildPaginationMeta(pagination.page, pagination.limit, total),
  };
}

export async function create(
  data: {
    nombre: string;
    correo: string;
    password: string;
    cedula?: string;
    telefono?: string;
    direccion?: string;
    rol?: string;
    organizacion?: string;
    localidadId?: number;
    ruc?: string;
    descripcion?: string;
    debeCambiarPassword?: boolean;
    emailVerificado?: boolean;
  },
  externalConn?: PoolConnection
) {
  const ownsTransaction = !externalConn;
  const conn = externalConn ?? (await pool.getConnection());

  try {
    if (ownsTransaction) await conn.beginTransaction();

    const rolId = await catalog.getRolId(data.rol ?? "usuario", conn);
    const estadoId = await catalog.getEstadoCuentaId("Activo", conn);

    const [userResult] = await conn.query<ResultSetHeader>(
      `INSERT INTO usuarios
        (correo, password_hash, nombre, cedula, telefono, direccion, rol_id, estado_cuenta_id, debe_cambiar_password, email_verificado)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.correo,
        data.password,
        data.nombre,
        data.cedula ?? null,
        data.telefono ?? null,
        data.direccion ?? null,
        rolId,
        estadoId,
        data.debeCambiarPassword ? 1 : 0,
        data.emailVerificado === false ? 0 : 1,
      ]
    );

    const usuarioId = userResult.insertId;

    if (data.rol === "fundacion" && data.organizacion) {
      const localidadId = data.localidadId
        ? await catalog.assertLocalidadId(Number(data.localidadId), conn)
        : null;

      await conn.query(
        `INSERT INTO organizaciones
          (nombre, ruc, telefono, localidad_id, descripcion, direccion, usuario_id)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          data.organizacion,
          data.ruc ?? null,
          data.telefono ?? null,
          localidadId,
          data.descripcion ?? null,
          data.direccion ?? null,
          usuarioId,
        ]
      );
    }

    if (ownsTransaction) await conn.commit();
  } catch (error) {
    if (ownsTransaction) await conn.rollback();
    throw error;
  } finally {
    if (ownsTransaction) conn.release();
  }

  const row = await findByCorreo(data.correo, ownsTransaction ? pool : conn);
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
    imagen?: string | null;
  }
) {
  const sets: string[] = [];
  const values: unknown[] = [];

  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      sets.push(`${key} = ?`);
      values.push(value);
    }
  }

  if (sets.length) {
    values.push(correo);
    await pool.query(
      `UPDATE usuarios SET ${sets.join(", ")} WHERE correo = ?`,
      values
    );
  }

  const row = await findByCorreo(correo);
  return row ? mapUsuario(row) : null;
}

export async function updateRol(correo: string, rol: string, conn: Executor = pool) {
  const rolId = await catalog.getRolId(rol, conn);
  await conn.query("UPDATE usuarios SET rol_id = ? WHERE correo = ?", [
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

export async function clearDebeCambiarPassword(correo: string) {
  await pool.query("UPDATE usuarios SET debe_cambiar_password = 0 WHERE correo = ?", [
    correo,
  ]);
}

export async function remove(correo: string, conn: Executor = pool) {
  const [result] = await conn.query<ResultSetHeader>(
    "DELETE FROM usuarios WHERE correo = ?",
    [correo]
  );
  return result.affectedRows > 0;
}

export async function existsByCorreo(correo: string) {
  const row = await findByCorreo(correo);
  return Boolean(row);
}

export async function existsByCedula(cedula: string, excludeCorreo?: string) {
  const [rows] = await pool.query<RowDataPacket[]>(
    excludeCorreo
      ? "SELECT id FROM usuarios WHERE cedula = ? AND correo <> ? LIMIT 1"
      : "SELECT id FROM usuarios WHERE cedula = ? LIMIT 1",
    excludeCorreo ? [cedula, excludeCorreo] : [cedula]
  );
  return rows.length > 0;
}

export async function ensureOrganizacion(
  data: {
    usuarioId: number;
    organizacion: string;
    ruc?: string;
    localidadId?: number;
    telefono?: string;
    descripcion?: string;
    direccion?: string;
  },
  conn: Executor = pool
) {
  const existing = await catalog.findOrganizacionIdByUsuarioId(data.usuarioId, conn);
  if (existing) return existing;

  const localidadId = data.localidadId
    ? await catalog.assertLocalidadId(Number(data.localidadId), conn)
    : null;

  const [result] = await conn.query<ResultSetHeader>(
    `INSERT INTO organizaciones
      (nombre, ruc, telefono, localidad_id, descripcion, direccion, usuario_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      data.organizacion,
      data.ruc ?? null,
      data.telefono ?? null,
      localidadId,
      data.descripcion ?? null,
      data.direccion ?? null,
      data.usuarioId,
    ]
  );

  return result.insertId;
}

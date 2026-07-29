import { pool } from "../config/database.js";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import type { Pool, PoolConnection } from "mysql2/promise";

type Executor = Pool | PoolConnection;

async function findIdByCodigo(
  table: string,
  codigo: string,
  conn: Executor = pool
): Promise<number | null> {
  const [rows] = await conn.query<RowDataPacket[]>(
    `SELECT id FROM ${table} WHERE codigo = ? LIMIT 1`,
    [codigo]
  );
  return rows[0] ? Number(rows[0].id) : null;
}

async function findCategoriaId(
  tipo: string,
  nombre: string,
  padreId: number | null,
  conn: Executor = pool
): Promise<number | null> {
  const [rows] = await conn.query<RowDataPacket[]>(
    "SELECT id FROM categorias WHERE tipo = ? AND nombre = ? AND padre_id <=> ? LIMIT 1",
    [tipo, nombre, padreId]
  );
  return rows[0] ? Number(rows[0].id) : null;
}

async function getOrCreateCatalogoId(
  tipo: string,
  nombre: string,
  conn: Executor = pool
): Promise<number> {
  const [rows] = await conn.query<RowDataPacket[]>(
    "SELECT id FROM catalogos WHERE tipo = ? AND nombre = ? LIMIT 1",
    [tipo, nombre]
  );
  if (rows[0]) return Number(rows[0].id);
  const [result] = await conn.query<ResultSetHeader>(
    "INSERT INTO catalogos (tipo, nombre) VALUES (?, ?)",
    [tipo, nombre]
  );
  return result.insertId;
}

export async function getRolId(codigo: string, conn: Executor = pool): Promise<number> {
  const id = await findIdByCodigo("roles", codigo, conn);
  if (!id) throw new Error(`Rol no encontrado: ${codigo}`);
  return id;
}

export async function getEstadoCuentaId(codigo: string, conn: Executor = pool): Promise<number> {
  const id = await findIdByCodigo("estados_cuenta", codigo, conn);
  if (!id) throw new Error(`Estado de cuenta no encontrado: ${codigo}`);
  return id;
}

export async function getEstadoMascotaId(codigo: string, conn: Executor = pool): Promise<number> {
  const id = await findIdByCodigo("estados_mascota", codigo, conn);
  if (!id) throw new Error(`Estado de mascota no encontrado: ${codigo}`);
  return id;
}

export async function getEstadoSolicitudAdopcionId(
  codigo: string,
  conn: Executor = pool
): Promise<number> {
  const id = await findIdByCodigo("estados_solicitud_adopcion", codigo, conn);
  if (!id) throw new Error(`Estado de solicitud no encontrado: ${codigo}`);
  return id;
}

export async function getEstadoSolicitudOrgId(
  codigo: string,
  conn: Executor = pool
): Promise<number> {
  const id = await findIdByCodigo("estados_solicitud_organizacion", codigo, conn);
  if (!id) throw new Error(`Estado de solicitud org no encontrado: ${codigo}`);
  return id;
}

export async function getEstadoDonacionId(codigo: string, conn: Executor = pool): Promise<number> {
  const id = await findIdByCodigo("estados_donacion", codigo, conn);
  if (!id) throw new Error(`Estado de donación no encontrado: ${codigo}`);
  return id;
}

export async function getTipoMedioId(codigo: string, conn: Executor = pool): Promise<number> {
  const id = await findIdByCodigo("tipos_medio", codigo, conn);
  if (!id) throw new Error(`Tipo de medio no encontrado: ${codigo}`);
  return id;
}

export async function getEstadoDenunciaId(codigo: string, conn: Executor = pool): Promise<number> {
  const id = await findIdByCodigo("estados_denuncia", codigo, conn);
  if (!id) throw new Error(`Estado de denuncia no encontrado: ${codigo}`);
  return id;
}

export async function getOrCreateCiudadId(nombre: string, conn: Executor = pool): Promise<number> {
  return getOrCreateCatalogoId("ciudad", nombre, conn);
}

export async function getOrCreateEspecieId(nombre: string, conn: Executor = pool): Promise<number> {
  const existing = await findCategoriaId("especie", nombre, null, conn);
  if (existing) return existing;
  const [result] = await conn.query<ResultSetHeader>(
    "INSERT INTO categorias (tipo, nombre) VALUES ('especie', ?)",
    [nombre]
  );
  return result.insertId;
}

export async function getOrCreateRazaId(
  especieNombre: string,
  razaNombre: string,
  conn: Executor = pool
): Promise<number> {
  const especieId = await getOrCreateEspecieId(especieNombre, conn);
  const nombre = razaNombre?.trim() || "Mestizo";
  const existing = await findCategoriaId("raza", nombre, especieId, conn);
  if (existing) return existing;

  const [result] = await conn.query<ResultSetHeader>(
    "INSERT INTO categorias (tipo, padre_id, nombre) VALUES ('raza', ?, ?)",
    [especieId, nombre]
  );
  return result.insertId;
}

export async function getOrCreateSexoId(nombre: string, conn: Executor = pool): Promise<number> {
  const existing = await findCategoriaId("sexo", nombre, null, conn);
  if (existing) return existing;
  const [result] = await conn.query<ResultSetHeader>(
    "INSERT INTO categorias (tipo, nombre) VALUES ('sexo', ?)",
    [nombre]
  );
  return result.insertId;
}

export async function getOrCreateTamanoId(nombre: string, conn: Executor = pool): Promise<number> {
  const existing = await findCategoriaId("tamano", nombre, null, conn);
  if (existing) return existing;
  const [result] = await conn.query<ResultSetHeader>(
    "INSERT INTO categorias (tipo, nombre) VALUES ('tamano', ?)",
    [nombre]
  );
  return result.insertId;
}

export async function getUnidadEdadId(nombre: string, conn: Executor = pool): Promise<number> {
  const id = await findCategoriaId("unidad_edad", nombre, null, conn);
  if (!id) throw new Error(`Unidad de edad no encontrada: ${nombre}`);
  return id;
}

export async function getOrCreateTipoViviendaId(
  nombre: string,
  conn: Executor = pool
): Promise<number> {
  return getOrCreateCatalogoId("tipo_vivienda", nombre, conn);
}

export async function getOrCreateTipoDonacionId(
  nombre: string,
  conn: Executor = pool
): Promise<number> {
  return getOrCreateCatalogoId("tipo_donacion", nombre, conn);
}

export async function getOrCreateTagIds(
  nombres: string[],
  conn: Executor = pool
): Promise<number[]> {
  const ids: number[] = [];
  for (const nombre of nombres) {
    const trimmed = nombre.trim();
    if (!trimmed) continue;
    ids.push(await getOrCreateCatalogoId("tag", trimmed, conn));
  }
  return ids;
}

export async function findOrganizacionIdByUsuarioId(
  usuarioId: number,
  conn: Executor = pool
): Promise<number | null> {
  const [rows] = await conn.query<RowDataPacket[]>(
    "SELECT id FROM organizaciones WHERE usuario_id = ? LIMIT 1",
    [usuarioId]
  );
  return rows[0] ? Number(rows[0].id) : null;
}

export async function findOrganizacionIdByUsuarioCorreo(
  correo: string,
  conn: Executor = pool
): Promise<number | null> {
  const [rows] = await conn.query<RowDataPacket[]>(
    `SELECT o.id
     FROM organizaciones o
     INNER JOIN usuarios u ON u.id = o.usuario_id
     WHERE u.correo = ?
     LIMIT 1`,
    [correo]
  );
  return rows[0] ? Number(rows[0].id) : null;
}

export async function findUsuarioIdByCorreo(
  correo: string,
  conn: Executor = pool
): Promise<number | null> {
  const [rows] = await conn.query<RowDataPacket[]>(
    "SELECT id FROM usuarios WHERE correo = ? LIMIT 1",
    [correo]
  );
  return rows[0] ? Number(rows[0].id) : null;
}

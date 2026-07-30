import { pool } from "../config/database.js";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import type { Pool, PoolConnection } from "mysql2/promise";

type Executor = Pool | PoolConnection;

async function findIdByTipoCodigo(
  tipo: string,
  codigo: string,
  conn: Executor = pool
): Promise<number | null> {
  const [rows] = await conn.query<RowDataPacket[]>(
    "SELECT id FROM catalogos WHERE tipo = ? AND codigo = ? LIMIT 1",
    [tipo, codigo]
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
    "SELECT id FROM catalogos WHERE tipo = ? AND nombre = ? AND padre_id <=> ? LIMIT 1",
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
  const id = await findIdByTipoCodigo("rol", codigo, conn);
  if (!id) throw new Error(`Rol no encontrado: ${codigo}`);
  return id;
}

export async function getEstadoCuentaId(codigo: string, conn: Executor = pool): Promise<number> {
  const id = await findIdByTipoCodigo("estado_cuenta", codigo, conn);
  if (!id) throw new Error(`Estado de cuenta no encontrado: ${codigo}`);
  return id;
}

export async function getEstadoMascotaId(codigo: string, conn: Executor = pool): Promise<number> {
  const id = await findIdByTipoCodigo("estado_mascota", codigo, conn);
  if (!id) throw new Error(`Estado de mascota no encontrado: ${codigo}`);
  return id;
}

export async function getEstadoSolicitudAdopcionId(
  codigo: string,
  conn: Executor = pool
): Promise<number> {
  const id = await findIdByTipoCodigo("estado_solicitud_adopcion", codigo, conn);
  if (!id) throw new Error(`Estado de solicitud no encontrado: ${codigo}`);
  return id;
}

export async function getEstadoSolicitudOrgId(
  codigo: string,
  conn: Executor = pool
): Promise<number> {
  const id = await findIdByTipoCodigo("estado_solicitud_organizacion", codigo, conn);
  if (!id) throw new Error(`Estado de solicitud org no encontrado: ${codigo}`);
  return id;
}

export async function getEstadoDonacionId(codigo: string, conn: Executor = pool): Promise<number> {
  const id = await findIdByTipoCodigo("estado_donacion", codigo, conn);
  if (!id) throw new Error(`Estado de donación no encontrado: ${codigo}`);
  return id;
}

export async function getTipoMedioId(codigo: string, conn: Executor = pool): Promise<number> {
  const id = await findIdByTipoCodigo("tipo_medio", codigo, conn);
  if (!id) throw new Error(`Tipo de medio no encontrado: ${codigo}`);
  return id;
}

export async function getEstadoDenunciaId(codigo: string, conn: Executor = pool): Promise<number> {
  const id = await findIdByTipoCodigo("estado_denuncia", codigo, conn);
  if (!id) throw new Error(`Estado de denuncia no encontrado: ${codigo}`);
  return id;
}

/**
 * Valida que el id recibido sea realmente una localidad de la división
 * política. No se hace getOrCreate como con los otros catálogos: las
 * provincias, cantones y parroquias son una lista oficial cerrada, y dejar
 * que el frontend inventara una nueva es justo lo que llenó el catálogo
 * anterior de entradas escritas a mano.
 */
export async function assertLocalidadId(
  localidadId: number,
  conn: Executor = pool
): Promise<number> {
  const [rows] = await conn.query<RowDataPacket[]>(
    "SELECT id FROM catalogos WHERE id = ? AND tipo IN ('provincia','canton','parroquia') LIMIT 1",
    [localidadId]
  );
  if (!rows[0]) throw new Error(`Localidad no encontrada: ${localidadId}`);
  return Number(rows[0].id);
}

/** Busca una localidad por nombre, del nivel más específico al más general. */
export async function findLocalidadIdByNombre(
  nombre: string,
  conn: Executor = pool
): Promise<number | null> {
  const [rows] = await conn.query<RowDataPacket[]>(
    `SELECT id FROM catalogos
     WHERE tipo IN ('parroquia','canton','provincia') AND nombre = ?
     ORDER BY FIELD(tipo, 'parroquia', 'canton', 'provincia')
     LIMIT 1`,
    [nombre.trim()]
  );
  return rows[0] ? Number(rows[0].id) : null;
}

export async function getOrCreateEspecieId(nombre: string, conn: Executor = pool): Promise<number> {
  const existing = await findCategoriaId("especie", nombre, null, conn);
  if (existing) return existing;
  const [result] = await conn.query<ResultSetHeader>(
    "INSERT INTO catalogos (tipo, nombre) VALUES ('especie', ?)",
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
    "INSERT INTO catalogos (tipo, padre_id, nombre) VALUES ('raza', ?, ?)",
    [especieId, nombre]
  );
  return result.insertId;
}

export async function getOrCreateSexoId(nombre: string, conn: Executor = pool): Promise<number> {
  const existing = await findCategoriaId("sexo", nombre, null, conn);
  if (existing) return existing;
  const [result] = await conn.query<ResultSetHeader>(
    "INSERT INTO catalogos (tipo, nombre) VALUES ('sexo', ?)",
    [nombre]
  );
  return result.insertId;
}

export async function getOrCreateTamanoId(nombre: string, conn: Executor = pool): Promise<number> {
  const existing = await findCategoriaId("tamano", nombre, null, conn);
  if (existing) return existing;
  const [result] = await conn.query<ResultSetHeader>(
    "INSERT INTO catalogos (tipo, nombre) VALUES ('tamano', ?)",
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

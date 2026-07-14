import { pool } from "../config/database.js";
import type { ResultSetHeader, RowDataPacket } from "mysql2";

async function findIdByNombre(
  table: string,
  nombre: string
): Promise<number | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id FROM ${table} WHERE nombre = ? LIMIT 1`,
    [nombre]
  );
  return rows[0] ? Number(rows[0].id) : null;
}

async function findIdByCodigo(
  table: string,
  codigo: string
): Promise<number | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id FROM ${table} WHERE codigo = ? LIMIT 1`,
    [codigo]
  );
  return rows[0] ? Number(rows[0].id) : null;
}

export async function getRolId(codigo: string): Promise<number> {
  const id = await findIdByCodigo("roles", codigo);
  if (!id) throw new Error(`Rol no encontrado: ${codigo}`);
  return id;
}

export async function getEstadoCuentaId(codigo: string): Promise<number> {
  const id = await findIdByCodigo("estados_cuenta", codigo);
  if (!id) throw new Error(`Estado de cuenta no encontrado: ${codigo}`);
  return id;
}

export async function getEstadoMascotaId(codigo: string): Promise<number> {
  const id = await findIdByCodigo("estados_mascota", codigo);
  if (!id) throw new Error(`Estado de mascota no encontrado: ${codigo}`);
  return id;
}

export async function getEstadoSolicitudAdopcionId(
  codigo: string
): Promise<number> {
  const id = await findIdByCodigo("estados_solicitud_adopcion", codigo);
  if (!id) throw new Error(`Estado de solicitud no encontrado: ${codigo}`);
  return id;
}

export async function getEstadoSolicitudOrgId(codigo: string): Promise<number> {
  const id = await findIdByCodigo("estados_solicitud_organizacion", codigo);
  if (!id) throw new Error(`Estado de solicitud org no encontrado: ${codigo}`);
  return id;
}

export async function getEstadoDonacionId(codigo: string): Promise<number> {
  const id = await findIdByCodigo("estados_donacion", codigo);
  if (!id) throw new Error(`Estado de donación no encontrado: ${codigo}`);
  return id;
}

export async function getTipoMedioId(codigo: string): Promise<number> {
  const id = await findIdByCodigo("tipos_medio", codigo);
  if (!id) throw new Error(`Tipo de medio no encontrado: ${codigo}`);
  return id;
}

export async function getOrCreateCiudadId(nombre: string): Promise<number> {
  const existing = await findIdByNombre("ciudades", nombre);
  if (existing) return existing;
  const [result] = await pool.query<ResultSetHeader>(
    "INSERT INTO ciudades (nombre) VALUES (?)",
    [nombre]
  );
  return result.insertId;
}

export async function getOrCreateEspecieId(nombre: string): Promise<number> {
  const existing = await findIdByNombre("especies", nombre);
  if (existing) return existing;
  const [result] = await pool.query<ResultSetHeader>(
    "INSERT INTO especies (nombre) VALUES (?)",
    [nombre]
  );
  return result.insertId;
}

export async function getOrCreateRazaId(
  especieNombre: string,
  razaNombre: string
): Promise<number> {
  const especieId = await getOrCreateEspecieId(especieNombre);
  const nombre = razaNombre?.trim() || "Mestizo";
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT id FROM razas WHERE especie_id = ? AND nombre = ? LIMIT 1",
    [especieId, nombre]
  );
  if (rows[0]) return Number(rows[0].id);

  const [result] = await pool.query<ResultSetHeader>(
    "INSERT INTO razas (especie_id, nombre) VALUES (?, ?)",
    [especieId, nombre]
  );
  return result.insertId;
}

export async function getOrCreateSexoId(nombre: string): Promise<number> {
  const existing = await findIdByNombre("sexos", nombre);
  if (existing) return existing;
  const [result] = await pool.query<ResultSetHeader>(
    "INSERT INTO sexos (nombre) VALUES (?)",
    [nombre]
  );
  return result.insertId;
}

export async function getOrCreateTamanoId(nombre: string): Promise<number> {
  const existing = await findIdByNombre("tamanos", nombre);
  if (existing) return existing;
  const [result] = await pool.query<ResultSetHeader>(
    "INSERT INTO tamanos (nombre) VALUES (?)",
    [nombre]
  );
  return result.insertId;
}

export async function getUnidadEdadId(nombre: string): Promise<number> {
  const id = await findIdByNombre("unidades_edad", nombre);
  if (!id) throw new Error(`Unidad de edad no encontrada: ${nombre}`);
  return id;
}

export async function getOrCreateTipoViviendaId(
  nombre: string
): Promise<number> {
  const existing = await findIdByNombre("tipos_vivienda", nombre);
  if (existing) return existing;
  const [result] = await pool.query<ResultSetHeader>(
    "INSERT INTO tipos_vivienda (nombre) VALUES (?)",
    [nombre]
  );
  return result.insertId;
}

export async function getOrCreateTipoDonacionId(
  nombre: string
): Promise<number> {
  const existing = await findIdByNombre("tipos_donacion", nombre);
  if (existing) return existing;
  const [result] = await pool.query<ResultSetHeader>(
    "INSERT INTO tipos_donacion (nombre) VALUES (?)",
    [nombre]
  );
  return result.insertId;
}

export async function getOrCreateTagIds(nombres: string[]): Promise<number[]> {
  const ids: number[] = [];
  for (const nombre of nombres) {
    const trimmed = nombre.trim();
    if (!trimmed) continue;
    let id = await findIdByNombre("tags", trimmed);
    if (!id) {
      const [result] = await pool.query<ResultSetHeader>(
        "INSERT INTO tags (nombre) VALUES (?)",
        [trimmed]
      );
      id = result.insertId;
    }
    ids.push(id);
  }
  return ids;
}

export async function findOrganizacionIdByUsuarioId(
  usuarioId: number
): Promise<number | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT id FROM organizaciones WHERE usuario_id = ? LIMIT 1",
    [usuarioId]
  );
  return rows[0] ? Number(rows[0].id) : null;
}

export async function findOrganizacionIdByUsuarioCorreo(
  correo: string
): Promise<number | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
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
  correo: string
): Promise<number | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT id FROM usuarios WHERE correo = ? LIMIT 1",
    [correo]
  );
  return rows[0] ? Number(rows[0].id) : null;
}

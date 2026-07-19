import { pool } from "../config/database.js";
import type { RowDataPacket } from "mysql2";
import type { Pool, PoolConnection } from "mysql2/promise";
import { mapFundacion } from "../utils/mappers.js";
import * as catalog from "./catalog.repository.js";
import { buildPaginationMeta, type PaginationParams } from "../utils/pagination.js";

type Executor = Pool | PoolConnection;

export const FUNDACION_SORT_FIELDS: Record<string, string> = {
  nombre: "s.nombre_organizacion",
  fecha: "s.creado_en",
};

const SELECT = `
  SELECT
    s.id,
    s.nombre_organizacion,
    s.ruc,
    s.nombre_representante,
    s.correo,
    s.telefono,
    s.descripcion,
    s.nombre_documento,
    s.creado_en,
    c.nombre AS ciudad,
    e.codigo AS estado_codigo
  FROM solicitudes_registro_organizacion s
  INNER JOIN ciudades c ON c.id = s.ciudad_id
  INNER JOIN estados_solicitud_organizacion e ON e.id = s.estado_id
`;

export async function findAll(
  pagination: PaginationParams,
  sortClause: string,
  estado?: string
) {
  const values: unknown[] = [];
  const where = estado ? "WHERE e.codigo = ?" : "";
  if (estado) values.push(estado);

  const [countRows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS total
     FROM solicitudes_registro_organizacion s
     INNER JOIN estados_solicitud_organizacion e ON e.id = s.estado_id
     ${where}`,
    values
  );
  const total = Number(countRows[0]?.total ?? 0);

  const [rows] = await pool.query<RowDataPacket[]>(
    `${SELECT} ${where} ORDER BY ${sortClause} LIMIT ? OFFSET ?`,
    [...values, pagination.limit, pagination.offset]
  );

  return {
    data: rows.map((row) => mapFundacion(row)),
    meta: buildPaginationMeta(pagination.page, pagination.limit, total),
  };
}

export async function findById(id: string, conn: Executor = pool) {
  const [rows] = await conn.query<RowDataPacket[]>(
    `${SELECT} WHERE s.id = ? LIMIT 1`,
    [id]
  );
  return rows[0] ? mapFundacion(rows[0]) : null;
}

export async function existsByCorreo(correo: string) {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT id FROM solicitudes_registro_organizacion WHERE correo = ? LIMIT 1",
    [correo]
  );
  return rows.length > 0;
}

export async function existsByRuc(ruc: string) {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT id FROM solicitudes_registro_organizacion WHERE ruc = ? LIMIT 1",
    [ruc]
  );
  return rows.length > 0;
}

export async function create(data: {
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
  const id = `FUND-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const ciudadId = await catalog.getOrCreateCiudadId(data.ciudad);
  const estadoId = await catalog.getEstadoSolicitudOrgId("pendiente");
  const nombreOrg = data.organizacion ?? data.nombre;

  await pool.query(
    `INSERT INTO solicitudes_registro_organizacion
      (id, nombre_organizacion, ruc, nombre_representante, correo, telefono,
       ciudad_id, descripcion, nombre_documento, estado_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      nombreOrg,
      data.ruc,
      data.representante,
      data.correo.trim().toLowerCase(),
      data.telefono,
      ciudadId,
      data.descripcion,
      data.documento ?? "",
      estadoId,
    ]
  );

  return findById(id);
}

export async function updateEstado(id: string, estado: string, conn: Executor = pool) {
  const estadoId = await catalog.getEstadoSolicitudOrgId(estado, conn);
  await conn.query(
    "UPDATE solicitudes_registro_organizacion SET estado_id = ? WHERE id = ?",
    [estadoId, id]
  );
  return findById(id, conn);
}

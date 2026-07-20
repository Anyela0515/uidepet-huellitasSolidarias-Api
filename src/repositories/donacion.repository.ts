import { pool } from "../config/database.js";
import type { RowDataPacket } from "mysql2";
import { mapDonacion } from "../utils/mappers.js";
import * as catalog from "./catalog.repository.js";
import { buildPaginationMeta, type PaginationParams } from "../utils/pagination.js";

export const DONACION_SORT_FIELDS: Record<string, string> = {
  fecha: "d.creado_en",
};

export interface DonacionFiltros {
  tipo?: string;
  estado?: string;
}

function buildDonacionWhere(
  filtros: DonacionFiltros,
  base: string[],
  values: unknown[]
) {
  const clauses = [...base];
  if (filtros.tipo) {
    clauses.push("td.nombre = ?");
    values.push(filtros.tipo);
  }
  if (filtros.estado) {
    clauses.push("ed.codigo = ?");
    values.push(filtros.estado);
  }
  return clauses;
}

const SELECT = `
  SELECT
    d.id,
    d.nombre_donante,
    d.correo_donante,
    d.cantidad_descripcion,
    d.direccion,
    d.creado_en,
    td.nombre AS tipo_nombre,
    ed.codigo AS estado_codigo
  FROM donaciones d
  INNER JOIN tipos_donacion td ON td.id = d.tipo_donacion_id
  INNER JOIN estados_donacion ed ON ed.id = d.estado_donacion_id
`;

export async function findAll(
  pagination: PaginationParams,
  sortClause: string,
  filtros: DonacionFiltros = {}
) {
  const values: unknown[] = [];
  const clauses = buildDonacionWhere(filtros, [], values);
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";

  const [countRows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS total
     FROM donaciones d
     INNER JOIN tipos_donacion td ON td.id = d.tipo_donacion_id
     INNER JOIN estados_donacion ed ON ed.id = d.estado_donacion_id
     ${where}`,
    values
  );
  const total = Number(countRows[0]?.total ?? 0);

  const [rows] = await pool.query<RowDataPacket[]>(
    `${SELECT} ${where} ORDER BY ${sortClause} LIMIT ? OFFSET ?`,
    [...values, pagination.limit, pagination.offset]
  );

  return {
    data: rows.map((row) => mapDonacion(row)),
    meta: buildPaginationMeta(pagination.page, pagination.limit, total),
  };
}

export async function findByCorreo(
  correo: string,
  pagination: PaginationParams,
  sortClause: string,
  filtros: DonacionFiltros = {}
) {
  const values: unknown[] = [correo];
  const clauses = buildDonacionWhere(filtros, ["d.correo_donante = ?"], values);
  const where = `WHERE ${clauses.join(" AND ")}`;

  const [countRows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS total
     FROM donaciones d
     INNER JOIN tipos_donacion td ON td.id = d.tipo_donacion_id
     INNER JOIN estados_donacion ed ON ed.id = d.estado_donacion_id
     ${where}`,
    values
  );
  const total = Number(countRows[0]?.total ?? 0);

  const [rows] = await pool.query<RowDataPacket[]>(
    `${SELECT} ${where} ORDER BY ${sortClause} LIMIT ? OFFSET ?`,
    [...values, pagination.limit, pagination.offset]
  );

  return {
    data: rows.map((row) => mapDonacion(row)),
    meta: buildPaginationMeta(pagination.page, pagination.limit, total),
  };
}

export async function findById(id: string) {
  const [rows] = await pool.query<RowDataPacket[]>(
    `${SELECT} WHERE d.id = ? LIMIT 1`,
    [id]
  );
  return rows[0] ? mapDonacion(rows[0]) : null;
}

export async function updateEstado(id: string, estado: string) {
  const estadoId = await catalog.getEstadoDonacionId(estado);
  await pool.query(
    "UPDATE donaciones SET estado_donacion_id = ? WHERE id = ?",
    [estadoId, id]
  );
  return findById(id);
}

export async function create(data: {
  nombre: string;
  correo: string;
  tipo: string;
  cantidad: string;
  direccion: string;
}) {
  const id = `DON-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const tipoId = await catalog.getOrCreateTipoDonacionId(data.tipo);
  const estadoId = await catalog.getEstadoDonacionId("Completado");
  const usuarioId = await catalog.findUsuarioIdByCorreo(
    data.correo.trim().toLowerCase()
  );

  await pool.query(
    `INSERT INTO donaciones
      (id, donante_usuario_id, nombre_donante, correo_donante, tipo_donacion_id,
       cantidad_descripcion, direccion, estado_donacion_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      usuarioId,
      data.nombre,
      data.correo.trim().toLowerCase(),
      tipoId,
      data.cantidad,
      data.direccion,
      estadoId,
    ]
  );

  const [rows] = await pool.query<RowDataPacket[]>(
    `${SELECT} WHERE d.id = ? LIMIT 1`,
    [id]
  );
  return rows[0] ? mapDonacion(rows[0]) : null;
}

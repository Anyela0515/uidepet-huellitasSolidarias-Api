import { pool } from "../config/database.js";
import type { RowDataPacket } from "mysql2";
import { mapDenuncia } from "../utils/mappers.js";
import * as catalog from "./catalog.repository.js";
import { buildPaginationMeta, type PaginationParams } from "../utils/pagination.js";

export const DENUNCIA_SORT_FIELDS: Record<string, string> = {
  fecha: "dr.creado_en",
};

const SELECT = `
  SELECT
    dr.id,
    dr.tipo_animal,
    dr.urgencia,
    dr.ubicacion,
    dr.referencia,
    dr.latitud,
    dr.longitud,
    dr.descripcion,
    dr.nombre_contacto,
    dr.contacto,
    dr.creado_en,
    ed.codigo AS estado_codigo,
    (
      SELECT JSON_ARRAYAGG(
        JSON_OBJECT(
          'name', ev.nombre_archivo,
          'type', ev.mime_type,
          'size', ev.tamanio_bytes,
          'url', ev.contenido
        )
      )
      FROM evidencias_denuncia ev
      WHERE ev.denuncia_id = dr.id
    ) AS evidencias_json
  FROM denuncias_rescate dr
  INNER JOIN estados_denuncia ed ON ed.id = dr.estado_id
`;

export interface DenunciaFiltros {
  estado?: string;
}

export async function findAll(
  pagination: PaginationParams,
  sortClause: string,
  filtros: DenunciaFiltros = {}
) {
  const values: unknown[] = [];
  const clauses: string[] = [];
  if (filtros.estado) {
    clauses.push("ed.codigo = ?");
    values.push(filtros.estado);
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";

  const [countRows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS total
     FROM denuncias_rescate dr
     INNER JOIN estados_denuncia ed ON ed.id = dr.estado_id
     ${where}`,
    values
  );
  const total = Number(countRows[0]?.total ?? 0);

  const [rows] = await pool.query<RowDataPacket[]>(
    `${SELECT} ${where} ORDER BY ${sortClause} LIMIT ? OFFSET ?`,
    [...values, pagination.limit, pagination.offset]
  );

  return {
    data: rows.map((row) => mapDenuncia(row)),
    meta: buildPaginationMeta(pagination.page, pagination.limit, total),
  };
}

export async function findById(id: string) {
  const [rows] = await pool.query<RowDataPacket[]>(
    `${SELECT} WHERE dr.id = ? LIMIT 1`,
    [id]
  );
  return rows[0] ? mapDenuncia(rows[0]) : null;
}

export async function updateEstado(id: string, estado: string) {
  const estadoId = await catalog.getEstadoDenunciaId(estado);
  await pool.query("UPDATE denuncias_rescate SET estado_id = ? WHERE id = ?", [
    estadoId,
    id,
  ]);
  return findById(id);
}

export async function create(data: {
  tipoAnimal: string;
  urgencia: string;
  ubicacion: string;
  referencia?: string | null;
  coordenadas?: { latitud: number; longitud: number } | null;
  descripcion: string;
  nombreContacto?: string | null;
  contacto?: string | null;
  evidencias: Array<{ name: string; type?: string | null; size?: number | null; url?: string | null }>;
}) {
  const id = `RESC-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const estadoId = await catalog.getEstadoDenunciaId("recibida");

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    await conn.query(
      `INSERT INTO denuncias_rescate
        (id, tipo_animal, urgencia, ubicacion, referencia, latitud, longitud,
         descripcion, nombre_contacto, contacto, estado_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.tipoAnimal,
        data.urgencia,
        data.ubicacion,
        data.referencia ?? null,
        data.coordenadas?.latitud ?? null,
        data.coordenadas?.longitud ?? null,
        data.descripcion,
        data.nombreContacto ?? null,
        data.contacto ?? null,
        estadoId,
      ]
    );

    for (const ev of data.evidencias) {
      await conn.query(
        `INSERT INTO evidencias_denuncia
          (denuncia_id, nombre_archivo, mime_type, tamanio_bytes, contenido)
         VALUES (?, ?, ?, ?, ?)`,
        [
          id,
          String(ev.name ?? "archivo"),
          ev.type ?? null,
          ev.size != null ? Number(ev.size) : null,
          ev.url ?? null,
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

  return findById(id);
}

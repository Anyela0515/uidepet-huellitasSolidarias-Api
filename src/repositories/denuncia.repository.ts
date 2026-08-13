import { pool } from "../config/database.js";
import type { RowDataPacket } from "mysql2";
import { mapDenuncia } from "../utils/mappers.js";
import * as catalog from "./catalog.repository.js";
import { buildPaginationMeta, type PaginationParams } from "../utils/pagination.js";
import { ConflictError, NotFoundError } from "../utils/errors.js";

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
    dr.correo_notificacion,
    dr.creado_en,
    ed.codigo AS estado_codigo,
    dr.organizacion_atiende_id,
    org.nombre AS organizacion_atiende_nombre,
    (
      SELECT JSON_ARRAYAGG(
        JSON_OBJECT(
          'name', ev.nombre_archivo,
          'type', ev.mime_type,
          'size', ev.tamanio_bytes,
          'url', ev.contenido
        )
      )
      FROM archivos ev
      WHERE ev.denuncia_id = dr.id AND ev.categoria = 'reporte'
    ) AS evidencias_json,
    (
      SELECT JSON_ARRAYAGG(
        JSON_OBJECT(
          'name', ev.nombre_archivo,
          'type', ev.mime_type,
          'size', ev.tamanio_bytes,
          'url', ev.contenido
        )
      )
      FROM archivos ev
      WHERE ev.denuncia_id = dr.id AND ev.categoria = 'rescate'
    ) AS evidencias_rescate_json
  FROM denuncias_rescate dr
  INNER JOIN catalogos ed ON ed.id = dr.estado_id AND ed.tipo = 'estado_denuncia'
  LEFT JOIN organizaciones org ON org.id = dr.organizacion_atiende_id
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
     INNER JOIN catalogos ed ON ed.id = dr.estado_id AND ed.tipo = 'estado_denuncia'
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

export interface EvidenciaRescateInput {
  name: string;
  type: string;
  size: number;
  url: string;
}

/**
 * `organizacionId` es null para un admin (nunca queda bloqueado por nadie,
 * ni reclama el reporte para sí). Para una fundación: si el reporte ya está
 * reclamado por OTRA organización, se rechaza con ConflictError — es la
 * comprobación (y el UPDATE) dentro de la misma transacción con bloqueo
 * pesimista lo que evita que dos fundaciones lo reclamen a la vez.
 */
export async function updateEstado(
  id: string,
  estado: string,
  organizacionId: number | null,
  evidencias: EvidenciaRescateInput[] = []
) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [locked] = await conn.query<RowDataPacket[]>(
      `SELECT dr.id, dr.organizacion_atiende_id
       FROM denuncias_rescate dr
       WHERE dr.id = ?
       FOR UPDATE`,
      [id]
    );
    if (!locked[0]) {
      throw new NotFoundError("Reporte no encontrado.");
    }

    const organizacionActualId = locked[0].organizacion_atiende_id as number | null;
    if (
      organizacionId !== null &&
      organizacionActualId !== null &&
      organizacionActualId !== organizacionId
    ) {
      throw new ConflictError("Este reporte ya está siendo atendido por otra fundación.");
    }

    const estadoId = await catalog.getEstadoDenunciaId(estado, conn);
    await conn.query(
      `UPDATE denuncias_rescate
       SET estado_id = ?,
           organizacion_atiende_id = COALESCE(organizacion_atiende_id, ?)
       WHERE id = ?`,
      [estadoId, organizacionId, id]
    );

    for (const ev of evidencias) {
      await conn.query(
        `INSERT INTO archivos
          (denuncia_id, categoria, nombre_archivo, mime_type, tamanio_bytes, contenido)
         VALUES (?, 'rescate', ?, ?, ?, ?)`,
        [id, ev.name, ev.type, ev.size, ev.url]
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

export async function create(data: {
  tipoAnimal: string;
  urgencia: string;
  ubicacion: string;
  referencia?: string | null;
  coordenadas?: { latitud: number; longitud: number } | null;
  descripcion: string;
  nombreContacto?: string | null;
  contacto?: string | null;
  correoNotificacion?: string | null;
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
         descripcion, nombre_contacto, contacto, correo_notificacion, estado_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        data.correoNotificacion ?? null,
        estadoId,
      ]
    );

    for (const ev of data.evidencias) {
      await conn.query(
        `INSERT INTO archivos
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

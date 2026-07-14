import { pool } from "../config/database.js";
import type { RowDataPacket } from "mysql2";
import { mapMensaje } from "../utils/mappers.js";
import * as catalog from "./catalog.repository.js";

const SELECT = `
  SELECT
    m.id,
    m.nombre_remitente,
    m.correo_remitente,
    m.asunto,
    m.cuerpo,
    m.solicitud_id,
    m.leido,
    m.creado_en,
    u.correo AS fundacion_email
  FROM mensajes m
  LEFT JOIN organizaciones o ON o.id = m.organizacion_id
  LEFT JOIN usuarios u ON u.id = o.usuario_id
`;

export async function findAll() {
  const [rows] = await pool.query<RowDataPacket[]>(
    `${SELECT} ORDER BY m.creado_en DESC`
  );
  return rows.map((row) => mapMensaje(row));
}

export async function findByFundacion(fundacionEmail: string) {
  const orgId =
    await catalog.findOrganizacionIdByUsuarioCorreo(fundacionEmail);

  const [rows] = await pool.query<RowDataPacket[]>(
    `${SELECT}
     WHERE m.organizacion_id = ?
        OR EXISTS (
          SELECT 1
          FROM solicitudes_adopcion sa
          INNER JOIN organizaciones og ON og.id = sa.organizacion_id
          INNER JOIN usuarios uf ON uf.id = og.usuario_id
          WHERE sa.id = m.solicitud_id AND uf.correo = ?
        )
     ORDER BY m.creado_en DESC`,
    [orgId, fundacionEmail]
  );
  return rows.map((row) => mapMensaje(row));
}

export async function create(data: {
  de: string;
  correo: string;
  asunto: string;
  mensaje: string;
  solicitudId?: string | null;
  fundacionEmail?: string | null;
}) {
  const id = `MSG-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  let organizacionId: number | null = null;

  if (data.fundacionEmail) {
    organizacionId = await catalog.findOrganizacionIdByUsuarioCorreo(
      data.fundacionEmail
    );
  }

  await pool.query(
    `INSERT INTO mensajes
      (id, nombre_remitente, correo_remitente, asunto, cuerpo, solicitud_id, organizacion_id, leido)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
    [
      id,
      data.de,
      data.correo,
      data.asunto,
      data.mensaje,
      data.solicitudId ?? null,
      organizacionId,
    ]
  );

  const [rows] = await pool.query<RowDataPacket[]>(
    `${SELECT} WHERE m.id = ? LIMIT 1`,
    [id]
  );
  return rows[0] ? mapMensaje(rows[0]) : null;
}

export async function markAsRead(id: string) {
  await pool.query("UPDATE mensajes SET leido = 1 WHERE id = ?", [id]);
}

export async function countUnreadForFundacion(fundacionEmail: string) {
  const mensajes = await findByFundacion(fundacionEmail);
  return mensajes.filter((m) => !m.leido).length;
}

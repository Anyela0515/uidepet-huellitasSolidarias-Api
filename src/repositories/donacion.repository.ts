import { pool } from "../config/database.js";
import type { RowDataPacket } from "mysql2";
import { mapDonacion } from "../utils/mappers.js";
import * as catalog from "./catalog.repository.js";

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

export async function findAll() {
  const [rows] = await pool.query<RowDataPacket[]>(
    `${SELECT} ORDER BY d.creado_en DESC`
  );
  return rows.map((row) => mapDonacion(row));
}

export async function findByCorreo(correo: string) {
  const [rows] = await pool.query<RowDataPacket[]>(
    `${SELECT} WHERE d.correo_donante = ? ORDER BY d.creado_en DESC`,
    [correo]
  );
  return rows.map((row) => mapDonacion(row));
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

import { pool } from "../config/database.js";
import type { RowDataPacket } from "mysql2";
import type { Pool, PoolConnection } from "mysql2/promise";
import * as catalog from "./catalog.repository.js";

type Executor = Pool | PoolConnection;

export interface OrganizacionPerfil {
  id: number;
  nombre: string;
  ruc: string;
  telefono: string;
  ciudad: string;
  provinciaId: number | null;
  cantonId: number | null;
  localidadId: number | null;
  descripcion: string;
  direccion: string;
  correo: string;
  activo: boolean;
  imagenQr: string | null;
  imagen: string | null;
}

const SELECT = `
  SELECT
    o.id, o.nombre, o.ruc, o.telefono,
    CONCAT_WS(', ', c.nombre, c1.nombre, c2.nombre) AS ciudad,
    -- Los ids se resuelven por tipo, no por posición: una organización
    -- histórica puede tener guardado un cantón en vez de una parroquia, y
    -- entonces el primer nivel es el cantón y el segundo la provincia.
    CASE WHEN c.tipo = 'parroquia' THEN c.id END AS parroquia_id,
    CASE WHEN c.tipo = 'canton' THEN c.id
         WHEN c1.tipo = 'canton' THEN c1.id END AS canton_id,
    CASE WHEN c.tipo = 'provincia' THEN c.id
         WHEN c1.tipo = 'provincia' THEN c1.id
         WHEN c2.tipo = 'provincia' THEN c2.id END AS provincia_id,
    o.descripcion, o.direccion, o.activo, o.imagen_qr, o.imagen, u.correo
  FROM organizaciones o
  INNER JOIN usuarios u ON u.id = o.usuario_id
  LEFT JOIN catalogos c  ON c.id = o.localidad_id
  LEFT JOIN catalogos c1 ON c1.id = c.padre_id
  LEFT JOIN catalogos c2 ON c2.id = c1.padre_id
`;

function map(row: RowDataPacket): OrganizacionPerfil {
  return {
    id: Number(row.id),
    nombre: String(row.nombre ?? ""),
    ruc: String(row.ruc ?? ""),
    telefono: String(row.telefono ?? ""),
    ciudad: String(row.ciudad ?? ""),
    provinciaId: row.provincia_id ? Number(row.provincia_id) : null,
    cantonId: row.canton_id ? Number(row.canton_id) : null,
    localidadId: row.parroquia_id ? Number(row.parroquia_id) : null,
    descripcion: String(row.descripcion ?? ""),
    direccion: String(row.direccion ?? ""),
    correo: String(row.correo ?? ""),
    activo: Boolean(row.activo),
    imagenQr: row.imagen_qr ? String(row.imagen_qr) : null,
    imagen: row.imagen ? String(row.imagen) : null,
  };
}

export async function findById(id: number): Promise<OrganizacionPerfil | null> {
  const [rows] = await pool.query<RowDataPacket[]>(`${SELECT} WHERE o.id = ? LIMIT 1`, [id]);
  return rows[0] ? map(rows[0]) : null;
}

export async function findByUsuarioCorreo(correo: string): Promise<OrganizacionPerfil | null> {
  const [rows] = await pool.query<RowDataPacket[]>(`${SELECT} WHERE u.correo = ? LIMIT 1`, [correo]);
  return rows[0] ? map(rows[0]) : null;
}

export async function findPublicas() {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT o.id, o.nombre,
            CONCAT_WS(', ', c.nombre, c1.nombre, c2.nombre) AS ciudad,
            o.descripcion, o.imagen_qr, o.imagen
     FROM organizaciones o
     LEFT JOIN catalogos c  ON c.id = o.localidad_id
     LEFT JOIN catalogos c1 ON c1.id = c.padre_id
     LEFT JOIN catalogos c2 ON c2.id = c1.padre_id
     WHERE o.activo = 1
     ORDER BY o.nombre ASC`
  );
  return rows.map((row) => ({
    id: Number(row.id),
    nombre: String(row.nombre ?? ""),
    ciudad: String(row.ciudad ?? ""),
    provinciaId: row.provincia_id ? Number(row.provincia_id) : null,
    cantonId: row.canton_id ? Number(row.canton_id) : null,
    localidadId: row.parroquia_id ? Number(row.parroquia_id) : null,
    descripcion: String(row.descripcion ?? ""),
    imagenQr: row.imagen_qr ? String(row.imagen_qr) : null,
    imagen: row.imagen ? String(row.imagen) : null,
  }));
}

export async function updateByUsuarioCorreo(
  correo: string,
  data: {
    telefono?: string;
    localidadId?: number;
    descripcion?: string;
    direccion?: string;
    imagenQr?: string | null;
    imagen?: string | null;
  }
): Promise<OrganizacionPerfil | null> {
  const sets: string[] = [];
  const values: unknown[] = [];

  if (data.telefono !== undefined) {
    sets.push("telefono = ?");
    values.push(data.telefono);
  }
  if (data.descripcion !== undefined) {
    sets.push("descripcion = ?");
    values.push(data.descripcion);
  }
  if (data.direccion !== undefined) {
    sets.push("direccion = ?");
    values.push(data.direccion);
  }
  if (data.imagenQr !== undefined) {
    sets.push("imagen_qr = ?");
    values.push(data.imagenQr);
  }
  if (data.imagen !== undefined) {
    sets.push("imagen = ?");
    values.push(data.imagen);
  }
  if (data.localidadId !== undefined) {
    sets.push("localidad_id = ?");
    values.push(await catalog.assertLocalidadId(Number(data.localidadId)));
  }

  if (sets.length) {
    await pool.query(
      `UPDATE organizaciones o
       INNER JOIN usuarios u ON u.id = o.usuario_id
       SET ${sets.join(", ")}
       WHERE u.correo = ?`,
      [...values, correo]
    );
  }

  return findByUsuarioCorreo(correo);
}

export async function hasMascotasOSolicitudes(id: number): Promise<boolean> {
  const [mascotas] = await pool.query<RowDataPacket[]>(
    "SELECT 1 FROM mascotas WHERE organizacion_id = ? LIMIT 1",
    [id]
  );
  if (mascotas.length) return true;

  const [solicitudes] = await pool.query<RowDataPacket[]>(
    "SELECT 1 FROM solicitudes_adopcion WHERE organizacion_id = ? LIMIT 1",
    [id]
  );
  return solicitudes.length > 0;
}

export async function softDelete(id: number) {
  await pool.query("UPDATE organizaciones SET activo = 0 WHERE id = ?", [id]);
}

/** Borrado físico: solo debe usarse tras confirmar que no tiene mascotas ni solicitudes asociadas. */
export async function remove(id: number, conn: Executor = pool) {
  await conn.query("DELETE FROM organizaciones WHERE id = ?", [id]);
}

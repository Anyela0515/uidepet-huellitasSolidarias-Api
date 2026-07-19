import { pool } from "../config/database.js";
import type { RowDataPacket } from "mysql2";
import * as catalog from "./catalog.repository.js";

export interface OrganizacionPerfil {
  id: number;
  nombre: string;
  ruc: string;
  telefono: string;
  ciudad: string;
  descripcion: string;
  direccion: string;
  correo: string;
  activo: boolean;
}

const SELECT = `
  SELECT
    o.id, o.nombre, o.ruc, o.telefono, c.nombre AS ciudad,
    o.descripcion, o.direccion, o.activo, u.correo
  FROM organizaciones o
  INNER JOIN usuarios u ON u.id = o.usuario_id
  LEFT JOIN ciudades c ON c.id = o.ciudad_id
`;

function map(row: RowDataPacket): OrganizacionPerfil {
  return {
    id: Number(row.id),
    nombre: String(row.nombre ?? ""),
    ruc: String(row.ruc ?? ""),
    telefono: String(row.telefono ?? ""),
    ciudad: String(row.ciudad ?? ""),
    descripcion: String(row.descripcion ?? ""),
    direccion: String(row.direccion ?? ""),
    correo: String(row.correo ?? ""),
    activo: Boolean(row.activo),
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

export async function updateByUsuarioCorreo(
  correo: string,
  data: { telefono?: string; ciudad?: string; descripcion?: string; direccion?: string }
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
  if (data.ciudad !== undefined) {
    sets.push("ciudad_id = ?");
    values.push(await catalog.getOrCreateCiudadId(data.ciudad));
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

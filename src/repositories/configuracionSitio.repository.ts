import { pool } from "../config/database.js";
import type { RowDataPacket } from "mysql2";

export interface ConfiguracionSitio {
  id: number;
  correo: string;
  telefono: string;
  horario: string;
  direccion: string;
}

function mapConfig(row: RowDataPacket): ConfiguracionSitio {
  return {
    id: Number(row.id),
    correo: String(row.correo),
    telefono: String(row.telefono),
    horario: String(row.horario),
    direccion: String(row.direccion),
  };
}

export async function get(): Promise<ConfiguracionSitio | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT id, correo, telefono, horario, direccion FROM configuracion_sitio WHERE id = 1 LIMIT 1"
  );
  return rows[0] ? mapConfig(rows[0]) : null;
}

export async function update(
  data: Partial<Pick<ConfiguracionSitio, "correo" | "telefono" | "horario" | "direccion">>
): Promise<ConfiguracionSitio | null> {
  const sets: string[] = [];
  const values: unknown[] = [];

  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      sets.push(`${key} = ?`);
      values.push(value);
    }
  }

  // La tabla siempre tiene exactamente 1 fila (CHECK id = 1): nunca se inserta,
  // solo se actualiza parcialmente el registro singleton existente.
  if (sets.length) {
    await pool.query(
      `UPDATE configuracion_sitio SET ${sets.join(", ")} WHERE id = 1`,
      values
    );
  }

  return get();
}

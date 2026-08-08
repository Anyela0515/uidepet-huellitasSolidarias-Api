import { pool } from "../config/database.js";

export interface RegistroAuditoria {
  usuarioId: number | null;
  usuarioCorreo: string | null;
  accion: string;
  entidad: string;
  entidadId: string;
  detalle?: unknown;
}

/** INSERT-only por diseño: la tabla `auditoria` bloquea UPDATE y DELETE con
 * triggers (ver db/migrations/2026_08_05_auditoria_inmutable.sql), así que
 * no hay (ni debe haber) un update/delete en este repositorio. */
export async function insertar(registro: RegistroAuditoria): Promise<void> {
  await pool.query(
    `INSERT INTO auditoria (usuario_id, usuario_correo, accion, entidad, entidad_id, detalle)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      registro.usuarioId,
      registro.usuarioCorreo,
      registro.accion,
      registro.entidad,
      registro.entidadId,
      registro.detalle === undefined ? null : JSON.stringify(registro.detalle),
    ]
  );
}

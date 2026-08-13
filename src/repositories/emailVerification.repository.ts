import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { pool } from "../config/database.js";

const TIPO = "verificacion_email";

export async function create(usuarioId: number, tokenHash: string, expiresAt: Date) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query(
      "UPDATE tokens_usuario SET used_at = NOW() WHERE usuario_id = ? AND tipo = ? AND used_at IS NULL",
      [usuarioId, TIPO]
    );
    await connection.query<ResultSetHeader>(
      `INSERT INTO tokens_usuario (usuario_id, tipo, token_hash, expires_at)
       VALUES (?, ?, ?, ?)`,
      [usuarioId, TIPO, tokenHash, expiresAt]
    );
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function consumeAndVerify(tokenHash: string): Promise<string | null> {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.query<RowDataPacket[]>(
      `SELECT t.id, t.usuario_id, u.correo
       FROM tokens_usuario t
       INNER JOIN usuarios u ON u.id = t.usuario_id
       WHERE t.token_hash = ? AND t.tipo = ? AND t.used_at IS NULL AND t.expires_at > NOW()
       LIMIT 1 FOR UPDATE`,
      [tokenHash, TIPO]
    );
    const token = rows[0];
    if (!token) {
      await connection.rollback();
      return null;
    }

    await connection.query("UPDATE usuarios SET email_verificado = 1 WHERE id = ?", [
      token.usuario_id,
    ]);
    await connection.query(
      "UPDATE tokens_usuario SET used_at = NOW() WHERE id = ?",
      [token.id]
    );
    await connection.commit();
    return String(token.correo);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

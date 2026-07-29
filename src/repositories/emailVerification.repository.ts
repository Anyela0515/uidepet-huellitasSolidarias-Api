import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { pool } from "../config/database.js";

export async function create(usuarioId: number, tokenHash: string, expiresAt: Date) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query(
      "UPDATE email_verification_tokens SET used_at = NOW() WHERE usuario_id = ? AND used_at IS NULL",
      [usuarioId]
    );
    await connection.query<ResultSetHeader>(
      `INSERT INTO email_verification_tokens (usuario_id, token_hash, expires_at)
       VALUES (?, ?, ?)`,
      [usuarioId, tokenHash, expiresAt]
    );
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

/** Consume el token y marca el usuario como verificado; devuelve su correo o null si el token no es válido. */
export async function consumeAndVerify(tokenHash: string): Promise<string | null> {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.query<RowDataPacket[]>(
      `SELECT t.id, t.usuario_id, u.correo
       FROM email_verification_tokens t
       INNER JOIN usuarios u ON u.id = t.usuario_id
       WHERE t.token_hash = ? AND t.used_at IS NULL AND t.expires_at > NOW()
       LIMIT 1 FOR UPDATE`,
      [tokenHash]
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
      "UPDATE email_verification_tokens SET used_at = NOW() WHERE id = ?",
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

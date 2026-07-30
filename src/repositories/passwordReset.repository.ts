import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { pool } from "../config/database.js";

const TIPO = "recuperacion_password";

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

export async function consumeAndUpdatePassword(tokenHash: string, passwordHash: string) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.query<RowDataPacket[]>(
      `SELECT id, usuario_id
       FROM tokens_usuario
       WHERE token_hash = ? AND tipo = ? AND used_at IS NULL AND expires_at > NOW()
       LIMIT 1 FOR UPDATE`,
      [tokenHash, TIPO]
    );
    const token = rows[0];
    if (!token) {
      await connection.rollback();
      return false;
    }

    await connection.query(
      "UPDATE usuarios SET password_hash = ?, debe_cambiar_password = 0 WHERE id = ?",
      [passwordHash, token.usuario_id]
    );
    await connection.query(
      "UPDATE tokens_usuario SET used_at = NOW() WHERE id = ?",
      [token.id]
    );
    await connection.commit();
    return true;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

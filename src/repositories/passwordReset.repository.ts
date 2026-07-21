import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { pool } from "../config/database.js";

let tableReady: Promise<void> | null = null;

export function ensurePasswordResetTable() {
  tableReady ??= pool.query(`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      usuario_id INT UNSIGNED NOT NULL,
      token_hash CHAR(64) NOT NULL UNIQUE,
      expires_at DATETIME NOT NULL,
      used_at DATETIME NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_password_reset_usuario (usuario_id),
      INDEX idx_password_reset_expires (expires_at),
      CONSTRAINT fk_password_reset_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
    )
  `).then(() => undefined);
  return tableReady;
}

export async function create(usuarioId: number, tokenHash: string, expiresAt: Date) {
  await ensurePasswordResetTable();
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query(
      "UPDATE password_reset_tokens SET used_at = NOW() WHERE usuario_id = ? AND used_at IS NULL",
      [usuarioId]
    );
    await connection.query<ResultSetHeader>(
      `INSERT INTO password_reset_tokens (usuario_id, token_hash, expires_at)
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

export async function consumeAndUpdatePassword(tokenHash: string, passwordHash: string) {
  await ensurePasswordResetTable();
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.query<RowDataPacket[]>(
      `SELECT id, usuario_id
       FROM password_reset_tokens
       WHERE token_hash = ? AND used_at IS NULL AND expires_at > NOW()
       LIMIT 1 FOR UPDATE`,
      [tokenHash]
    );
    const token = rows[0];
    if (!token) {
      await connection.rollback();
      return false;
    }

    await connection.query(
      "UPDATE usuarios SET password_hash = ? WHERE id = ?",
      [passwordHash, token.usuario_id]
    );
    await connection.query(
      "UPDATE password_reset_tokens SET used_at = NOW() WHERE id = ?",
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

import { pool } from "../config/database.js";
import type { RowDataPacket } from "mysql2";
import * as catalog from "./catalog.repository.js";

export async function getIdsByCorreo(correo: string) {
  const usuarioId = await catalog.findUsuarioIdByCorreo(correo);
  if (!usuarioId) return [];

  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT mascota_id FROM favoritos WHERE usuario_id = ?",
    [usuarioId]
  );
  return rows.map((r) => Number(r.mascota_id));
}

export async function isFavorite(correo: string, mascotaId: number) {
  const usuarioId = await catalog.findUsuarioIdByCorreo(correo);
  if (!usuarioId) return false;

  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT 1 FROM favoritos WHERE usuario_id = ? AND mascota_id = ? LIMIT 1",
    [usuarioId, mascotaId]
  );
  return rows.length > 0;
}

export async function toggle(correo: string, mascotaId: number) {
  const usuarioId = await catalog.findUsuarioIdByCorreo(correo);
  if (!usuarioId) throw new Error("Usuario no encontrado.");

  const exists = await isFavorite(correo, mascotaId);
  if (exists) {
    await pool.query(
      "DELETE FROM favoritos WHERE usuario_id = ? AND mascota_id = ?",
      [usuarioId, mascotaId]
    );
    return false;
  }

  await pool.query(
    "INSERT INTO favoritos (usuario_id, mascota_id) VALUES (?, ?)",
    [usuarioId, mascotaId]
  );
  return true;
}

export async function add(correo: string, mascotaId: number) {
  const usuarioId = await catalog.findUsuarioIdByCorreo(correo);
  if (!usuarioId) throw new Error("Usuario no encontrado.");
  await pool.query(
    "INSERT IGNORE INTO favoritos (usuario_id, mascota_id) VALUES (?, ?)",
    [usuarioId, mascotaId]
  );
}

export async function remove(correo: string, mascotaId: number) {
  const usuarioId = await catalog.findUsuarioIdByCorreo(correo);
  if (!usuarioId) return;
  await pool.query(
    "DELETE FROM favoritos WHERE usuario_id = ? AND mascota_id = ?",
    [usuarioId, mascotaId]
  );
}

export async function removePetFromAll(mascotaId: number) {
  await pool.query("DELETE FROM favoritos WHERE mascota_id = ?", [mascotaId]);
}

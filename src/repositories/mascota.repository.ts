import { pool } from "../config/database.js";
import {
  CrearMascotaDTO,
  ActualizarMascotaDTO,
} from "../schemas/mascota.schema.js";

const BASE_QUERY = `
  SELECT
    m.id_mascota AS id,
    m.fk_organizacion_id,
    o.nombre AS organizacion_nombre,
    m.nombre,
    m.especie,
    m.raza,
    m.sexo,
    m.edad_aproximada,
    m.tamano,
    m.color,
    m.descripcion,
    m.historia,
    m.estado_salud,
    m.esterilizado,
    m.estado_adopcion,
    m.fecha_registro
  FROM mascota m
  JOIN organizacion o ON o.id_organizacion = m.fk_organizacion_id
`;

export async function findAll() {
  const [rows] = await pool.query(
    BASE_QUERY + " ORDER BY m.id_mascota DESC"
  );

  return rows as any[];
}

export async function findById(id: number) {
  const [rows] = (await pool.query(
    BASE_QUERY + " WHERE m.id_mascota = ?",
    [id]
  )) as [any[], any];

  return rows[0] ?? null;
}

export async function create(data: CrearMascotaDTO) {
  const [result] = (await pool.query(
    `
    INSERT INTO mascota
      (
        fk_organizacion_id,
        nombre,
        especie,
        raza,
        sexo,
        edad_aproximada,
        tamano,
        color,
        descripcion,
        historia,
        estado_salud,
        esterilizado,
        estado_adopcion
      )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      data.fk_organizacion_id,
      data.nombre,
      data.especie,
      data.raza ?? "MESTIZO",
      data.sexo,
      data.edad_aproximada,
      data.tamano,
      data.color ?? null,
      data.descripcion,
      data.historia,
      data.estado_salud,
      data.esterilizado ?? false,
      data.estado_adopcion ?? "DISPONIBLE",
    ]
  )) as [any, any];

  return findById(result.insertId);
}

export async function update(id: number, data: ActualizarMascotaDTO) {
  const entradas = Object.entries(data).filter(
    ([, value]) => value !== undefined
  );

  if (entradas.length === 0) {
    return findById(id);
  }

  const sets = entradas.map(([key]) => `${key} = ?`).join(", ");
  const values = entradas.map(([, value]) => value);

  await pool.query(`UPDATE mascota SET ${sets} WHERE id_mascota = ?`, [
    ...values,
    id,
  ]);

  return findById(id);
}

export async function remove(id: number) {
  await pool.query("DELETE FROM mascota WHERE id_mascota = ?", [id]);
}
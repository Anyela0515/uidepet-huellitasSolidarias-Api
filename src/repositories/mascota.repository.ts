import { pool } from "../config/database.js";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { mapMascota } from "../utils/mappers.js";
import {
  ActualizarMascotaDTO,
  CrearMascotaDTO,
} from "../schemas/mascota.schema.js";
import { parseEdadTexto } from "../utils/edad.js";
import * as catalog from "./catalog.repository.js";

const MAX_MASCOTAS_POR_RESPUESTA = 20;

const MASCOTA_SELECT = `
  SELECT
    m.id,
    m.nombre,
    m.edad_valor,
    ue.nombre AS unidad_edad,
    m.historia,
    m.requisitos,
    m.publicada_en,
    m.oculto,
    e.nombre AS especie,
    r.nombre AS raza,
    s.nombre AS sexo,
    t.nombre AS tamano,
    c.nombre AS ubicacion,
    em.codigo AS estado_codigo,
    o.nombre AS fundacion,
    u.correo AS fundacion_email,
    o.id AS organizacion_id,
    (
      SELECT mm.contenido
      FROM medios_mascota mm
      WHERE mm.mascota_id = m.id AND mm.es_principal = 1
      ORDER BY mm.id ASC
      LIMIT 1
    ) AS imagen,
    (
      SELECT GROUP_CONCAT(tg.nombre ORDER BY tg.nombre SEPARATOR ',')
      FROM mascota_tag mt
      INNER JOIN tags tg ON tg.id = mt.tag_id
      WHERE mt.mascota_id = m.id
    ) AS tags
  FROM mascotas m
  INNER JOIN razas r ON r.id = m.raza_id
  INNER JOIN especies e ON e.id = r.especie_id
  INNER JOIN unidades_edad ue ON ue.id = m.unidad_edad_id
  INNER JOIN sexos s ON s.id = m.sexo_id
  INNER JOIN tamanos t ON t.id = m.tamano_id
  INNER JOIN ciudades c ON c.id = m.ciudad_id
  INNER JOIN estados_mascota em ON em.id = m.estado_mascota_id
  INNER JOIN organizaciones o ON o.id = m.organizacion_id
  INNER JOIN usuarios u ON u.id = o.usuario_id
`;

async function resolveMascotaFks(data: {
  especie?: string;
  raza?: string;
  edad?: string;
  sexo?: string;
  tamano?: string;
  ubicacion?: string;
  estado?: string;
}) {
  const parsed = data.edad ? parseEdadTexto(data.edad) : null;
  return {
    razaId:
      data.especie !== undefined
        ? await catalog.getOrCreateRazaId(data.especie, data.raza ?? "Mestizo")
        : undefined,
    edadValor: parsed?.valor,
    unidadEdadId: parsed
      ? await catalog.getUnidadEdadId(parsed.unidad)
      : undefined,
    sexoId: data.sexo
      ? await catalog.getOrCreateSexoId(data.sexo)
      : undefined,
    tamanoId: data.tamano
      ? await catalog.getOrCreateTamanoId(data.tamano)
      : undefined,
    ciudadId: data.ubicacion
      ? await catalog.getOrCreateCiudadId(data.ubicacion)
      : undefined,
    estadoId: data.estado
      ? await catalog.getEstadoMascotaId(data.estado)
      : undefined,
  };
}

async function syncTags(mascotaId: number, tags: string[]) {
  await pool.query("DELETE FROM mascota_tag WHERE mascota_id = ?", [mascotaId]);
  const tagIds = await catalog.getOrCreateTagIds(tags);
  for (const tagId of tagIds) {
    await pool.query(
      "INSERT INTO mascota_tag (mascota_id, tag_id) VALUES (?, ?)",
      [mascotaId, tagId]
    );
  }
}

async function syncImagen(mascotaId: number, imagen: string) {
  const tipoId = await catalog.getTipoMedioId("imagen");
  await pool.query("DELETE FROM medios_mascota WHERE mascota_id = ?", [
    mascotaId,
  ]);
  if (imagen) {
    await pool.query(
      `INSERT INTO medios_mascota (mascota_id, tipo_medio_id, contenido, es_principal)
       VALUES (?, ?, ?, 1)`,
      [mascotaId, tipoId, imagen]
    );
  }
}

export async function findVisible() {
  const [rows] = await pool.query<RowDataPacket[]>(
    `${MASCOTA_SELECT}
     WHERE em.codigo <> 'Eliminado' AND m.oculto = 0
     ORDER BY m.id DESC
     LIMIT ?`,
    [MAX_MASCOTAS_POR_RESPUESTA]
  );
  return rows.map((row) => mapMascota(row));
}

export async function findByFundacionEmail(fundacionEmail: string) {
  const [rows] = await pool.query<RowDataPacket[]>(
    `${MASCOTA_SELECT}
     WHERE u.correo = ? AND em.codigo <> 'Eliminado' AND m.oculto = 0
     ORDER BY m.id DESC
     LIMIT ?`,
    [fundacionEmail, MAX_MASCOTAS_POR_RESPUESTA]
  );
  return rows.map((row) => mapMascota(row));
}

export async function findById(id: number) {
  const [rows] = await pool.query<RowDataPacket[]>(
    `${MASCOTA_SELECT} WHERE m.id = ? LIMIT 1`,
    [id]
  );
  return rows[0] ? mapMascota(rows[0]) : null;
}

export async function findOrganizacionId(id: number): Promise<number | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT organizacion_id FROM mascotas WHERE id = ? LIMIT 1",
    [id]
  );
  return rows[0] ? Number(rows[0].organizacion_id) : null;
}

export async function create(
  data: CrearMascotaDTO & { organizacionId: number }
) {
  const fks = await resolveMascotaFks({
    especie: data.especie,
    raza: data.raza,
    edad: data.edad,
    sexo: data.sexo,
    tamano: data.tamano,
    ubicacion: data.ubicacion,
    estado: data.estado ?? "Disponible",
  });

  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO mascotas
      (nombre, raza_id, edad_valor, unidad_edad_id, sexo_id, tamano_id, ciudad_id,
       historia, requisitos, organizacion_id, estado_mascota_id, publicada_en, oculto)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.nombre,
      fks.razaId,
      fks.edadValor,
      fks.unidadEdadId,
      fks.sexoId,
      fks.tamanoId,
      fks.ciudadId,
      data.historia,
      data.requisitos,
      data.organizacionId,
      fks.estadoId,
      data.fechaPublicacion
        ? new Date(data.fechaPublicacion)
        : new Date(),
      data.hidden ? 1 : 0,
    ]
  );

  const id = result.insertId;
  await syncTags(id, data.tags ?? []);
  await syncImagen(id, data.imagen ?? "");
  return findById(id);
}

export async function update(id: number, data: ActualizarMascotaDTO) {
  const current = await findById(id);
  if (!current) return null;

  const fks = await resolveMascotaFks({
    especie: data.especie ?? current.especie,
    raza: data.raza ?? current.raza,
    edad: data.edad ?? current.edad,
    sexo: data.sexo ?? current.sexo,
    tamano: data.tamano ?? current.tamano,
    ubicacion: data.ubicacion ?? current.ubicacion,
    estado: data.estado ?? current.estado,
  });

  const sets: string[] = [];
  const values: unknown[] = [];

  if (data.nombre !== undefined) {
    sets.push("nombre = ?");
    values.push(data.nombre);
  }
  if (data.especie !== undefined || data.raza !== undefined) {
    sets.push("raza_id = ?");
    values.push(fks.razaId);
  }
  if (data.edad !== undefined) {
    sets.push("edad_valor = ?", "unidad_edad_id = ?");
    values.push(fks.edadValor, fks.unidadEdadId);
  }
  if (data.sexo !== undefined) {
    sets.push("sexo_id = ?");
    values.push(fks.sexoId);
  }
  if (data.tamano !== undefined) {
    sets.push("tamano_id = ?");
    values.push(fks.tamanoId);
  }
  if (data.ubicacion !== undefined) {
    sets.push("ciudad_id = ?");
    values.push(fks.ciudadId);
  }
  if (data.historia !== undefined) {
    sets.push("historia = ?");
    values.push(data.historia);
  }
  if (data.requisitos !== undefined) {
    sets.push("requisitos = ?");
    values.push(data.requisitos);
  }
  if (data.estado !== undefined) {
    sets.push("estado_mascota_id = ?");
    values.push(fks.estadoId);
  }
  if (data.fechaPublicacion !== undefined) {
    sets.push("publicada_en = ?");
    values.push(new Date(data.fechaPublicacion));
  }
  if (data.hidden !== undefined) {
    sets.push("oculto = ?");
    values.push(data.hidden ? 1 : 0);
  }

  if (sets.length) {
    values.push(id);
    await pool.query(
      `UPDATE mascotas SET ${sets.join(", ")} WHERE id = ?`,
      values
    );
  }

  if (data.tags !== undefined) await syncTags(id, data.tags);
  if (data.imagen !== undefined) await syncImagen(id, data.imagen);

  return findById(id);
}

export async function remove(id: number) {
  await pool.query("DELETE FROM mascotas WHERE id = ?", [id]);
}

export async function belongsToFundacion(id: number, fundacionEmail: string) {
  const pet = await findById(id);
  return Boolean(pet && pet.fundacionEmail === fundacionEmail);
}

export async function hasActiveSolicitud(petId: number) {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT sa.id
     FROM solicitudes_adopcion sa
     INNER JOIN estados_solicitud_adopcion es ON es.id = sa.estado_id
     WHERE sa.mascota_id = ? AND es.codigo IN ('revision', 'aprobada', 'seguimiento')
     LIMIT 1`,
    [petId]
  );
  return rows.length > 0;
}

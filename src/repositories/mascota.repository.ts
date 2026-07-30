import { pool } from "../config/database.js";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import type { Pool, PoolConnection } from "mysql2/promise";
import { mapMascota } from "../utils/mappers.js";
import {
  ActualizarMascotaDTO,
  CrearMascotaDTO,
} from "../schemas/mascota.schema.js";
import { parseEdadTexto } from "../utils/edad.js";
import * as catalog from "./catalog.repository.js";
import { buildPaginationMeta, type PaginationParams } from "../utils/pagination.js";

type Executor = Pool | PoolConnection;

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
    m.imagen,
    e.nombre AS especie,
    r.nombre AS raza,
    s.nombre AS sexo,
    t.nombre AS tamano,
    m.ubicacion,
    em.codigo AS estado_codigo,
    o.nombre AS fundacion,
    u.correo AS fundacion_email,
    o.id AS organizacion_id,
    (
      SELECT GROUP_CONCAT(tg.nombre ORDER BY tg.nombre SEPARATOR ',')
      FROM mascota_tag mt
      INNER JOIN catalogos tg ON tg.id = mt.tag_id AND tg.tipo = 'tag'
      WHERE mt.mascota_id = m.id
    ) AS tags
  FROM mascotas m
  INNER JOIN catalogos r ON r.id = m.raza_id AND r.tipo = 'raza'
  INNER JOIN catalogos e ON e.id = r.padre_id AND e.tipo = 'especie'
  INNER JOIN catalogos ue ON ue.id = m.unidad_edad_id AND ue.tipo = 'unidad_edad'
  INNER JOIN catalogos s ON s.id = m.sexo_id AND s.tipo = 'sexo'
  INNER JOIN catalogos t ON t.id = m.tamano_id AND t.tipo = 'tamano'
  INNER JOIN catalogos em ON em.id = m.estado_mascota_id AND em.tipo = 'estado_mascota'
  INNER JOIN organizaciones o ON o.id = m.organizacion_id
  INNER JOIN usuarios u ON u.id = o.usuario_id
`;

export const MASCOTA_SORT_FIELDS: Record<string, string> = {
  nombre: "m.nombre",
  fecha: "m.publicada_en",
  ciudad: "m.ubicacion",
};

export interface MascotaFiltros {
  search?: string;
  especie?: string;
  raza?: string;
  sexo?: string;
  tamano?: string;
  ciudad?: string;
  estado?: string;
  organizacionId?: number;
  oculto?: boolean;
}

function buildWhere(
  filtros: MascotaFiltros,
  base: string[],
  values: unknown[]
) {
  const clauses = [...base];

  if (filtros.search) {
    clauses.push("m.nombre LIKE ?");
    values.push(`%${filtros.search}%`);
  }
  if (filtros.especie) {
    clauses.push("e.nombre = ?");
    values.push(filtros.especie);
  }
  if (filtros.raza) {
    clauses.push("r.nombre = ?");
    values.push(filtros.raza);
  }
  if (filtros.sexo) {
    clauses.push("s.nombre = ?");
    values.push(filtros.sexo);
  }
  if (filtros.tamano) {
    clauses.push("t.nombre = ?");
    values.push(filtros.tamano);
  }
  if (filtros.ciudad) {
    clauses.push("m.ubicacion = ?");
    values.push(filtros.ciudad);
  }
  if (filtros.estado) {
    clauses.push("em.codigo = ?");
    values.push(filtros.estado);
  }
  if (filtros.organizacionId) {
    clauses.push("o.id = ?");
    values.push(filtros.organizacionId);
  }
  if (filtros.oculto !== undefined) {
    clauses.push("m.oculto = ?");
    values.push(filtros.oculto ? 1 : 0);
  }

  return clauses;
}

async function resolveMascotaFks(
  data: {
    especie?: string;
    raza?: string;
    edad?: string;
    sexo?: string;
    tamano?: string;
    estado?: string;
  },
  conn: Executor = pool
) {
  const parsed = data.edad ? parseEdadTexto(data.edad) : null;
  return {
    razaId:
      data.especie !== undefined
        ? await catalog.getOrCreateRazaId(data.especie, data.raza ?? "Mestizo", conn)
        : undefined,
    edadValor: parsed?.valor,
    unidadEdadId: parsed
      ? await catalog.getUnidadEdadId(parsed.unidad, conn)
      : undefined,
    sexoId: data.sexo
      ? await catalog.getOrCreateSexoId(data.sexo, conn)
      : undefined,
    tamanoId: data.tamano
      ? await catalog.getOrCreateTamanoId(data.tamano, conn)
      : undefined,
    estadoId: data.estado
      ? await catalog.getEstadoMascotaId(data.estado, conn)
      : undefined,
  };
}

async function syncTags(mascotaId: number, tags: string[], conn: Executor = pool) {
  await conn.query("DELETE FROM mascota_tag WHERE mascota_id = ?", [mascotaId]);
  const tagIds = await catalog.getOrCreateTagIds(tags, conn);
  for (const tagId of tagIds) {
    await conn.query(
      "INSERT INTO mascota_tag (mascota_id, tag_id) VALUES (?, ?)",
      [mascotaId, tagId]
    );
  }
}

export async function findVisible(
  pagination: PaginationParams,
  sortClause: string,
  filtros: MascotaFiltros = {}
) {
  const values: unknown[] = [];
  // "Adoptado" se oculta igual que "Eliminado": una vez adoptada, la mascota
  // ya no debe verse en el catálogo público ni para un usuario adoptante
  // normal. Solo la fundación dueña (findByFundacionEmail) y el admin
  // (findAllAdmin) siguen viéndola.
  const clauses = buildWhere(
    filtros,
    ["em.codigo <> 'Eliminado'", "em.codigo <> 'Adoptado'", "m.oculto = 0"],
    values
  );
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";

  const [countRows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS total
     FROM mascotas m
     INNER JOIN catalogos r ON r.id = m.raza_id AND r.tipo = 'raza'
     INNER JOIN catalogos e ON e.id = r.padre_id AND e.tipo = 'especie'
     INNER JOIN catalogos s ON s.id = m.sexo_id AND s.tipo = 'sexo'
     INNER JOIN catalogos t ON t.id = m.tamano_id AND t.tipo = 'tamano'
     INNER JOIN catalogos em ON em.id = m.estado_mascota_id AND em.tipo = 'estado_mascota'
     INNER JOIN organizaciones o ON o.id = m.organizacion_id
     ${where}`,
    values
  );
  const total = Number(countRows[0]?.total ?? 0);

  const [rows] = await pool.query<RowDataPacket[]>(
    `${MASCOTA_SELECT}
     ${where}
     ORDER BY ${sortClause}
     LIMIT ? OFFSET ?`,
    [...values, pagination.limit, pagination.offset]
  );

  return {
    data: rows.map((row) => mapMascota(row)),
    meta: buildPaginationMeta(pagination.page, pagination.limit, total),
  };
}

export async function findAllAdmin(
  pagination: PaginationParams,
  sortClause: string,
  filtros: MascotaFiltros = {}
) {
  const values: unknown[] = [];
  const clauses = buildWhere(filtros, [], values);
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";

  const [countRows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS total
     FROM mascotas m
     INNER JOIN catalogos r ON r.id = m.raza_id AND r.tipo = 'raza'
     INNER JOIN catalogos e ON e.id = r.padre_id AND e.tipo = 'especie'
     INNER JOIN catalogos s ON s.id = m.sexo_id AND s.tipo = 'sexo'
     INNER JOIN catalogos t ON t.id = m.tamano_id AND t.tipo = 'tamano'
     INNER JOIN catalogos em ON em.id = m.estado_mascota_id AND em.tipo = 'estado_mascota'
     INNER JOIN organizaciones o ON o.id = m.organizacion_id
     ${where}`,
    values
  );
  const total = Number(countRows[0]?.total ?? 0);

  const [rows] = await pool.query<RowDataPacket[]>(
    `${MASCOTA_SELECT}
     ${where}
     ORDER BY ${sortClause}
     LIMIT ? OFFSET ?`,
    [...values, pagination.limit, pagination.offset]
  );

  return {
    data: rows.map((row) => mapMascota(row)),
    meta: buildPaginationMeta(pagination.page, pagination.limit, total),
  };
}

export async function findByFundacionEmail(
  fundacionEmail: string,
  pagination: PaginationParams,
  sortClause: string,
  filtros: MascotaFiltros = {}
) {
  // A diferencia de findVisible, aquí no se oculta nada por defecto: la
  // fundación debe poder administrar (ver/editar) también sus propias
  // mascotas ocultas o marcadas como "Eliminado".
  const values: unknown[] = [fundacionEmail];
  const clauses = buildWhere(filtros, ["u.correo = ?"], values);
  const where = `WHERE ${clauses.join(" AND ")}`;

  const [countRows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS total
     FROM mascotas m
     INNER JOIN catalogos r ON r.id = m.raza_id AND r.tipo = 'raza'
     INNER JOIN catalogos e ON e.id = r.padre_id AND e.tipo = 'especie'
     INNER JOIN catalogos s ON s.id = m.sexo_id AND s.tipo = 'sexo'
     INNER JOIN catalogos t ON t.id = m.tamano_id AND t.tipo = 'tamano'
     INNER JOIN catalogos em ON em.id = m.estado_mascota_id AND em.tipo = 'estado_mascota'
     INNER JOIN organizaciones o ON o.id = m.organizacion_id
     INNER JOIN usuarios u ON u.id = o.usuario_id
     ${where}`,
    values
  );
  const total = Number(countRows[0]?.total ?? 0);

  const [rows] = await pool.query<RowDataPacket[]>(
    `${MASCOTA_SELECT}
     ${where}
     ORDER BY ${sortClause}
     LIMIT ? OFFSET ?`,
    [...values, pagination.limit, pagination.offset]
  );

  return {
    data: rows.map((row) => mapMascota(row)),
    meta: buildPaginationMeta(pagination.page, pagination.limit, total),
  };
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
  const conn = await pool.getConnection();
  let id!: number;
  try {
    await conn.beginTransaction();

    const fks = await resolveMascotaFks(
      {
        especie: data.especie,
        raza: data.raza,
        edad: data.edad,
        sexo: data.sexo,
        tamano: data.tamano,
        estado: data.estado ?? "Disponible",
      },
      conn
    );

    const [result] = await conn.query<ResultSetHeader>(
      `INSERT INTO mascotas
        (nombre, raza_id, edad_valor, unidad_edad_id, sexo_id, tamano_id, ubicacion,
         historia, requisitos, imagen, organizacion_id, estado_mascota_id, publicada_en, oculto)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.nombre,
        fks.razaId,
        fks.edadValor,
        fks.unidadEdadId,
        fks.sexoId,
        fks.tamanoId,
        data.ubicacion,
        data.historia,
        data.requisitos,
        data.imagen || null,
        data.organizacionId,
        fks.estadoId,
        data.fechaPublicacion ? new Date(data.fechaPublicacion) : new Date(),
        data.hidden ? 1 : 0,
      ]
    );

    id = result.insertId;
    await syncTags(id, data.tags ?? [], conn);

    await conn.commit();
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }

  return findById(id);
}

export async function update(id: number, data: ActualizarMascotaDTO) {
  const current = await findById(id);
  if (!current) return null;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const fks = await resolveMascotaFks(
      {
        especie: data.especie ?? current.especie,
        raza: data.raza ?? current.raza,
        edad: data.edad ?? current.edad,
        sexo: data.sexo ?? current.sexo,
        tamano: data.tamano ?? current.tamano,
        estado: data.estado ?? current.estado,
      },
      conn
    );

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
      sets.push("ubicacion = ?");
      values.push(data.ubicacion);
    }
    if (data.historia !== undefined) {
      sets.push("historia = ?");
      values.push(data.historia);
    }
    if (data.requisitos !== undefined) {
      sets.push("requisitos = ?");
      values.push(data.requisitos);
    }
    if (data.imagen !== undefined) {
      sets.push("imagen = ?");
      values.push(data.imagen || null);
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
      await conn.query(`UPDATE mascotas SET ${sets.join(", ")} WHERE id = ?`, values);
    }

    if (data.tags !== undefined) await syncTags(id, data.tags, conn);

    await conn.commit();
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }

  return findById(id);
}

/**
 * Borrado lógico: la mascota puede tener solicitudes históricas (FK RESTRICT),
 * por lo que nunca se hace DELETE físico.
 */
export async function softDelete(id: number) {
  const estadoEliminadoId = await catalog.getEstadoMascotaId("Eliminado");
  await pool.query(
    "UPDATE mascotas SET estado_mascota_id = ?, oculto = 1 WHERE id = ?",
    [estadoEliminadoId, id]
  );
}

export async function belongsToFundacion(id: number, fundacionEmail: string) {
  const pet = await findById(id);
  return Boolean(pet && pet.fundacionEmail === fundacionEmail);
}

export async function hasActiveSolicitud(petId: number) {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT sa.id
     FROM solicitudes_adopcion sa
     INNER JOIN catalogos es ON es.id = sa.estado_id AND es.tipo = 'estado_solicitud_adopcion'
     WHERE sa.mascota_id = ? AND es.codigo IN ('revision', 'aprobada', 'seguimiento')
     LIMIT 1`,
    [petId]
  );
  return rows.length > 0;
}

/** Agrega un único tag sin afectar los existentes (evita duplicados vía la PK compuesta). */
export async function addTag(mascotaId: number, tagNombre: string) {
  const [tagId] = await catalog.getOrCreateTagIds([tagNombre]);
  if (!tagId) return findById(mascotaId);

  const [existing] = await pool.query<RowDataPacket[]>(
    "SELECT 1 FROM mascota_tag WHERE mascota_id = ? AND tag_id = ? LIMIT 1",
    [mascotaId, tagId]
  );
  if (!existing.length) {
    await pool.query(
      "INSERT INTO mascota_tag (mascota_id, tag_id) VALUES (?, ?)",
      [mascotaId, tagId]
    );
  }
  return findById(mascotaId);
}

export async function removeTagById(mascotaId: number, tagId: number) {
  await pool.query(
    "DELETE FROM mascota_tag WHERE mascota_id = ? AND tag_id = ?",
    [mascotaId, tagId]
  );
  return findById(mascotaId);
}

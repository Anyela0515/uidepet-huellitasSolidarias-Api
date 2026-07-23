import { pool } from "../config/database.js";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { mapSolicitud } from "../utils/mappers.js";
import type { Mascota } from "../types/frontend.js";
import {
  ActualizarEstadoSolicitudDTO,
  CrearSolicitudDTO,
} from "../schemas/solicitud.schema.js";
import * as catalog from "./catalog.repository.js";
import * as mascotaRepo from "./mascota.repository.js";
import { buildPaginationMeta, type PaginationParams } from "../utils/pagination.js";

const ACTIVE_STATES = ["revision", "aprobada", "seguimiento"] as const;

export const SOLICITUD_SORT_FIELDS: Record<string, string> = {
  fecha: "sa.creado_en",
  estado: "es.codigo",
};

const SOLICITUD_SELECT = `
  SELECT
    sa.id,
    sa.mascota_id,
    sa.observaciones,
    sa.proximo_paso,
    sa.creado_en,
    es.codigo AS estado_codigo,
    m.nombre AS mascota_nombre,
    m.edad_valor,
    ue.nombre AS unidad_edad,
    rz.nombre AS raza,
    ci.nombre AS ubicacion,
    pu.nombre AS adoptante_nombre,
    ua.correo AS adoptante_email,
    o.nombre AS fundacion,
    uf.correo AS fundacion_email,
    (
      SELECT mm.contenido
      FROM medios_mascota mm
      WHERE mm.mascota_id = m.id AND mm.es_principal = 1
      ORDER BY mm.id ASC LIMIT 1
    ) AS imagen,
    (
      SELECT GROUP_CONCAT(tg.nombre ORDER BY tg.nombre SEPARATOR ',')
      FROM mascota_tag mt
      INNER JOIN tags tg ON tg.id = mt.tag_id
      WHERE mt.mascota_id = m.id
    ) AS tags,
    f.nombre_declarado AS form_nombre_declarado,
    f.cedula_declarada AS form_cedula_declarada,
    f.telefono_declarado AS form_telefono_declarado,
    f.correo_declarado AS form_correo_declarado,
    f.direccion_declarada AS form_direccion_declarada,
    cf.nombre AS form_ciudad,
    tv.nombre AS form_tipo_vivienda,
    f.personas_hogar AS form_personas_hogar,
    f.acuerdo_hogar AS form_acuerdo_hogar,
    f.permanencia_animal AS form_permanencia_animal,
    f.lugar_dormir AS form_lugar_dormir,
    f.tiene_mascotas AS form_tiene_mascotas,
    f.cantidad_mascotas AS form_cantidad_mascotas,
    f.vacunas AS form_vacunas,
    f.esterilizacion AS form_esterilizacion,
    f.responsable_cuidado AS form_responsable_cuidado,
    f.responsable_gastos AS form_responsable_gastos,
    f.acepta_seguimiento AS form_acepta_seguimiento,
    f.acepta_contrato AS form_acepta_contrato,
    f.declaracion_veracidad AS form_declaracion_veracidad,
    (
      SELECT JSON_ARRAYAGG(
        JSON_OBJECT(
          'name', ea.nombre_archivo,
          'type', ea.mime_type,
          'size', ea.tamanio_bytes,
          'url', ea.contenido
        )
      )
      FROM evidencias_adopcion ea
      WHERE ea.solicitud_id = sa.id
    ) AS evidencias_json,
    (
      SELECT JSON_ARRAYAGG(
        JSON_OBJECT(
          'id', seg.id,
          'periodo', seg.periodo,
          'comentario', seg.comentario,
          'creadoEn', seg.creado_en,
          'archivos', COALESCE(
            (
              SELECT JSON_ARRAYAGG(
                JSON_OBJECT(
                  'id', asg.id,
                  'name', asg.nombre_archivo,
                  'type', asg.mime_type,
                  'size', asg.tamanio_bytes,
                  'url', NULL
                )
              )
              FROM archivos_seguimiento asg
              WHERE asg.seguimiento_id = seg.id
            ),
            JSON_ARRAY()
          )
        )
      )
      FROM seguimientos_adopcion seg
      WHERE seg.solicitud_id = sa.id
    ) AS seguimientos_json
  FROM solicitudes_adopcion sa
  INNER JOIN estados_solicitud_adopcion es ON es.id = sa.estado_id
  INNER JOIN mascotas m ON m.id = sa.mascota_id
  INNER JOIN categorias ue ON ue.id = m.unidad_edad_id AND ue.tipo = 'unidad_edad'
  INNER JOIN categorias rz ON rz.id = m.raza_id AND rz.tipo = 'raza'
  INNER JOIN ciudades ci ON ci.id = m.ciudad_id
  INNER JOIN usuarios ua ON ua.id = sa.adoptante_id
  INNER JOIN perfiles_usuario pu ON pu.usuario_id = ua.id
  INNER JOIN organizaciones o ON o.id = sa.organizacion_id
  INNER JOIN usuarios uf ON uf.id = o.usuario_id
  LEFT JOIN formularios_adopcion f ON f.solicitud_id = sa.id
  LEFT JOIN ciudades cf ON cf.id = f.ciudad_id
  LEFT JOIN tipos_vivienda tv ON tv.id = f.tipo_vivienda_id
`;

async function countWhere(where: string, values: unknown[]): Promise<number> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS total
     FROM solicitudes_adopcion sa
     INNER JOIN estados_solicitud_adopcion es ON es.id = sa.estado_id
     INNER JOIN usuarios ua ON ua.id = sa.adoptante_id
     INNER JOIN organizaciones o ON o.id = sa.organizacion_id
     INNER JOIN usuarios uf ON uf.id = o.usuario_id
     ${where}`,
    values
  );
  return Number(rows[0]?.total ?? 0);
}

export async function findAll(
  pagination: PaginationParams,
  sortClause: string,
  estado?: string
) {
  const values: unknown[] = [];
  const where = estado ? "WHERE es.codigo = ?" : "";
  if (estado) values.push(estado);

  const total = await countWhere(where, values);
  const [rows] = await pool.query<RowDataPacket[]>(
    `${SOLICITUD_SELECT} ${where} ORDER BY ${sortClause} LIMIT ? OFFSET ?`,
    [...values, pagination.limit, pagination.offset]
  );

  return {
    data: rows.map((row) => mapSolicitud(row)),
    meta: buildPaginationMeta(pagination.page, pagination.limit, total),
  };
}

export async function findByAdoptante(
  correo: string,
  pagination: PaginationParams,
  sortClause: string,
  estado?: string
) {
  const values: unknown[] = [correo];
  const clauses = ["ua.correo = ?"];
  if (estado) {
    clauses.push("es.codigo = ?");
    values.push(estado);
  }
  const where = `WHERE ${clauses.join(" AND ")}`;

  const total = await countWhere(where, values);
  const [rows] = await pool.query<RowDataPacket[]>(
    `${SOLICITUD_SELECT} ${where} ORDER BY ${sortClause} LIMIT ? OFFSET ?`,
    [...values, pagination.limit, pagination.offset]
  );

  return {
    data: rows.map((row) => mapSolicitud(row)),
    meta: buildPaginationMeta(pagination.page, pagination.limit, total),
  };
}

export async function findByFundacion(
  fundacionEmail: string,
  pagination: PaginationParams,
  sortClause: string,
  estado?: string
) {
  const values: unknown[] = [fundacionEmail];
  const clauses = ["uf.correo = ?"];
  if (estado) {
    clauses.push("es.codigo = ?");
    values.push(estado);
  }
  const where = `WHERE ${clauses.join(" AND ")}`;

  const total = await countWhere(where, values);
  const [rows] = await pool.query<RowDataPacket[]>(
    `${SOLICITUD_SELECT} ${where} ORDER BY ${sortClause} LIMIT ? OFFSET ?`,
    [...values, pagination.limit, pagination.offset]
  );

  return {
    data: rows.map((row) => mapSolicitud(row)),
    meta: buildPaginationMeta(pagination.page, pagination.limit, total),
  };
}

export async function findById(id: string) {
  const [rows] = await pool.query<RowDataPacket[]>(
    `${SOLICITUD_SELECT} WHERE sa.id = ? LIMIT 1`,
    [id]
  );
  if (!rows[0]) return null;
  rows[0].seguimientos_json = await findSeguimientosConContenido(id);
  return mapSolicitud(rows[0]);
}

async function findSeguimientosConContenido(solicitudId: string) {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT
       seg.id AS seguimiento_id,
       seg.periodo,
       seg.comentario,
       seg.creado_en,
       asg.id AS archivo_id,
       asg.nombre_archivo,
       asg.mime_type,
       asg.tamanio_bytes,
       asg.contenido
     FROM seguimientos_adopcion seg
     LEFT JOIN archivos_seguimiento asg ON asg.seguimiento_id = seg.id
     WHERE seg.solicitud_id = ?
     ORDER BY seg.creado_en DESC, asg.id ASC`,
    [solicitudId]
  );

  const seguimientos = new Map<
    number,
    {
      id: number;
      periodo: string;
      comentario: string;
      creadoEn: unknown;
      archivos: Array<{
        id: number;
        name: string;
        type: string;
        size: number;
        url: string;
      }>;
    }
  >();

  for (const row of rows) {
    const seguimientoId = Number(row.seguimiento_id);
    if (!seguimientos.has(seguimientoId)) {
      seguimientos.set(seguimientoId, {
        id: seguimientoId,
        periodo: String(row.periodo),
        comentario: String(row.comentario ?? ""),
        creadoEn: row.creado_en,
        archivos: [],
      });
    }
    if (row.archivo_id) {
      seguimientos.get(seguimientoId)!.archivos.push({
        id: Number(row.archivo_id),
        name: String(row.nombre_archivo ?? ""),
        type: String(row.mime_type ?? ""),
        size: Number(row.tamanio_bytes ?? 0),
        url: String(row.contenido ?? ""),
      });
    }
  }

  return [...seguimientos.values()];
}

export async function hasActiveForUserAndPet(correo: string, petId: number) {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT sa.id
     FROM solicitudes_adopcion sa
     INNER JOIN estados_solicitud_adopcion es ON es.id = sa.estado_id
     INNER JOIN usuarios u ON u.id = sa.adoptante_id
     WHERE u.correo = ? AND sa.mascota_id = ? AND es.codigo IN (?, ?, ?)
     LIMIT 1`,
    [correo, petId, ...ACTIVE_STATES]
  );
  return rows.length > 0;
}

export async function hasActiveForPet(petId: number, excludeId?: string) {
  const [rows] = await pool.query<RowDataPacket[]>(
    excludeId
      ? `SELECT sa.id
         FROM solicitudes_adopcion sa
         INNER JOIN estados_solicitud_adopcion es ON es.id = sa.estado_id
         WHERE sa.mascota_id = ? AND es.codigo IN (?, ?, ?) AND sa.id <> ?
         LIMIT 1`
      : `SELECT sa.id
         FROM solicitudes_adopcion sa
         INNER JOIN estados_solicitud_adopcion es ON es.id = sa.estado_id
         WHERE sa.mascota_id = ? AND es.codigo IN (?, ?, ?)
         LIMIT 1`,
    excludeId
      ? [petId, ...ACTIVE_STATES, excludeId]
      : [petId, ...ACTIVE_STATES]
  );
  return rows.length > 0;
}

export async function create(
  data: CrearSolicitudDTO,
  pet: Mascota,
  user: { id: number; nombre: string; correo: string }
) {
  const orgId = await mascotaRepo.findOrganizacionId(data.petId);
  if (!orgId) throw new Error("Organización de la mascota no encontrada.");

  const now = new Date();
  const id = `ADOP-${now.getFullYear()}-${now.getTime()}`;
  const estadoId = await catalog.getEstadoSolicitudAdopcionId("revision");
  const form = data.form as Record<string, unknown>;

  const ciudadId = await catalog.getOrCreateCiudadId(
    String(form.ciudad ?? pet.ubicacion ?? "Loja")
  );
  const viviendaId = await catalog.getOrCreateTipoViviendaId(
    String(form.tipoVivienda ?? "Casa")
  );

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    await conn.query(
      `INSERT INTO solicitudes_adopcion
        (id, mascota_id, adoptante_id, organizacion_id, estado_id, observaciones, proximo_paso)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.petId,
        user.id,
        orgId,
        estadoId,
        "Tu solicitud fue recibida. El equipo está revisando tu información.",
        "Espera la respuesta de la fundación en un plazo máximo de 48 horas.",
      ]
    );

    await conn.query(
      `INSERT INTO formularios_adopcion
        (solicitud_id, nombre_declarado, cedula_declarada, telefono_declarado, correo_declarado,
         direccion_declarada, ciudad_id, tipo_vivienda_id, personas_hogar, acuerdo_hogar,
         permanencia_animal, lugar_dormir, tiene_mascotas, cantidad_mascotas, vacunas,
         esterilizacion, responsable_cuidado, responsable_gastos, acepta_seguimiento,
         acepta_contrato, declaracion_veracidad)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        String(form.nombre ?? user.nombre),
        String(form.cedula ?? ""),
        String(form.telefono ?? ""),
        String(form.correo ?? user.correo),
        String(form.direccion ?? ""),
        ciudadId,
        viviendaId,
        String(form.personasHogar ?? ""),
        String(form.acuerdoHogar ?? ""),
        String(form.permanenciaAnimal ?? ""),
        String(form.lugarDormir ?? ""),
        String(form.tieneMascotas ?? ""),
        form.cantidadMascotas != null ? String(form.cantidadMascotas) : null,
        form.vacunas != null ? String(form.vacunas) : null,
        form.esterilizacion != null ? String(form.esterilizacion) : null,
        String(form.responsableCuidado ?? ""),
        String(form.responsableGastos ?? ""),
        String(form.seguimiento ?? ""),
        String(form.contrato ?? ""),
        form.declaracion ? 1 : 0,
      ]
    );

    const evidencias = Array.isArray(form.evidencias) ? form.evidencias : [];
    for (const ev of evidencias as Array<Record<string, unknown>>) {
      await conn.query(
        `INSERT INTO evidencias_adopcion
          (solicitud_id, nombre_archivo, mime_type, tamanio_bytes, contenido)
         VALUES (?, ?, ?, ?, ?)`,
        [
          id,
          String(ev.name ?? "archivo"),
          ev.type ? String(ev.type) : null,
          ev.size != null ? Number(ev.size) : null,
          ev.url ? String(ev.url) : null,
        ]
      );
    }

    await conn.commit();
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }

  return findById(id);
}

export async function updateEstado(
  id: string,
  data: ActualizarEstadoSolicitudDTO
) {
  const estadoId = await catalog.getEstadoSolicitudAdopcionId(data.estado);
  await pool.query(
    `UPDATE solicitudes_adopcion
     SET estado_id = ?,
         observaciones = COALESCE(?, observaciones),
         proximo_paso = COALESCE(?, proximo_paso)
     WHERE id = ?`,
    [estadoId, data.observaciones ?? null, data.proximoPaso ?? null, id]
  );
  return findById(id);
}

/**
 * Transición de estado con bloqueo pesimista: evita que dos solicitudes de
 * la misma mascota sean aprobadas concurrentemente (SELECT ... FOR UPDATE
 * sobre la mascota y sobre la propia solicitud, dentro de una transacción).
 * `allowedTransitions` se re-valida DENTRO del bloqueo por si el estado
 * cambió entre la lectura inicial (fuera de la transacción) y este punto.
 */
export async function updateEstadoConBloqueo(
  id: string,
  petId: number,
  data: ActualizarEstadoSolicitudDTO,
  allowedTransitions: Record<string, string[]>
) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [lockedSolicitud] = await conn.query<RowDataPacket[]>(
      `SELECT sa.id, es.codigo AS estado_codigo
       FROM solicitudes_adopcion sa
       INNER JOIN estados_solicitud_adopcion es ON es.id = sa.estado_id
       WHERE sa.id = ?
       FOR UPDATE`,
      [id]
    );
    const estadoActualCodigo = lockedSolicitud[0]
      ? String(lockedSolicitud[0].estado_codigo)
      : null;

    if (!estadoActualCodigo) {
      throw new Error("SOLICITUD_NO_ENCONTRADA");
    }

    const allowed = allowedTransitions[estadoActualCodigo] ?? [];
    if (!allowed.includes(data.estado)) {
      throw new Error("TRANSICION_NO_PERMITIDA");
    }

    // Bloquea la mascota para que ninguna otra transacción concurrente
    // pueda aprobar/rechazar una solicitud distinta para el mismo animal.
    await conn.query("SELECT id FROM mascotas WHERE id = ? FOR UPDATE", [petId]);

    const estadoId = await catalog.getEstadoSolicitudAdopcionId(data.estado, conn);
    await conn.query(
      `UPDATE solicitudes_adopcion
       SET estado_id = ?,
           observaciones = COALESCE(?, observaciones),
           proximo_paso = COALESCE(?, proximo_paso)
       WHERE id = ?`,
      [estadoId, data.observaciones ?? null, data.proximoPaso ?? null, id]
    );

    let nuevoEstadoMascota: string | null = null;

    if (data.estado === "aprobada") {
      nuevoEstadoMascota = "En proceso";
      const estadoRechazadaId = await catalog.getEstadoSolicitudAdopcionId("rechazada", conn);
      await conn.query(
        `UPDATE solicitudes_adopcion sa
         INNER JOIN estados_solicitud_adopcion es ON es.id = sa.estado_id
         SET sa.estado_id = ?,
             sa.observaciones = 'Otra solicitud fue aprobada para esta mascota.',
             sa.proximo_paso = 'Puedes postular por otra mascota disponible.'
         WHERE sa.mascota_id = ? AND es.codigo IN (?, ?, ?) AND sa.id <> ?`,
        [estadoRechazadaId, petId, ...ACTIVE_STATES, id]
      );
    } else if (data.estado === "seguimiento") {
      nuevoEstadoMascota = "Adoptado";
    } else if (data.estado === "rechazada") {
      const [others] = await conn.query<RowDataPacket[]>(
        `SELECT sa.id
         FROM solicitudes_adopcion sa
         INNER JOIN estados_solicitud_adopcion es ON es.id = sa.estado_id
         WHERE sa.mascota_id = ? AND es.codigo IN (?, ?, ?) AND sa.id <> ?
         LIMIT 1`,
        [petId, ...ACTIVE_STATES, id]
      );
      if (!others.length) nuevoEstadoMascota = "Disponible";
    }

    if (nuevoEstadoMascota) {
      const estadoMascotaId = await catalog.getEstadoMascotaId(nuevoEstadoMascota, conn);
      await conn.query("UPDATE mascotas SET estado_mascota_id = ? WHERE id = ?", [
        estadoMascotaId,
        petId,
      ]);
    }

    await conn.commit();
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }

  return findById(id);
}

export async function addSeguimiento(
  id: string,
  data: {
    periodo: string;
    comentario: string;
    archivos: Array<{
      nombreArchivo: string;
      mimeType: string;
      tamanioBytes: number;
      contenido: string;
    }>;
  }
) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [result] = await conn.query<ResultSetHeader>(
      `INSERT INTO seguimientos_adopcion (solicitud_id, periodo, comentario)
       VALUES (?, ?, ?)`,
      [id, data.periodo, data.comentario]
    );

    for (const archivo of data.archivos) {
      await conn.query(
        `INSERT INTO archivos_seguimiento
          (seguimiento_id, nombre_archivo, mime_type, tamanio_bytes, contenido)
         VALUES (?, ?, ?, ?, ?)`,
        [
          result.insertId,
          archivo.nombreArchivo,
          archivo.mimeType,
          archivo.tamanioBytes,
          archivo.contenido,
        ]
      );
    }

    await conn.commit();
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }

  return findById(id);
}

export async function hasSeguimientoEnPeriodo(solicitudId: string, periodo: string) {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id
     FROM seguimientos_adopcion
     WHERE solicitud_id = ? AND periodo = ?
     LIMIT 1`,
    [solicitudId, periodo]
  );
  return Boolean(rows[0]);
}

export async function addEvidencia(
  solicitudId: string,
  data: { nombreArchivo: string; mimeType?: string; tamanioBytes?: number; contenido?: string }
) {
  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO evidencias_adopcion
      (solicitud_id, nombre_archivo, mime_type, tamanio_bytes, contenido)
     VALUES (?, ?, ?, ?, ?)`,
    [
      solicitudId,
      data.nombreArchivo,
      data.mimeType ?? null,
      data.tamanioBytes ?? null,
      data.contenido ?? null,
    ]
  );
  return { evidenciaId: result.insertId, solicitud: await findById(solicitudId) };
}

export async function removeEvidencia(solicitudId: string, evidenciaId: number) {
  await pool.query(
    "DELETE FROM evidencias_adopcion WHERE id = ? AND solicitud_id = ?",
    [evidenciaId, solicitudId]
  );
  return findById(solicitudId);
}

export interface SeguimientoDetalle {
  id: number;
  solicitudId: string;
  comentario: string;
  fundacionEmail: string;
  adoptanteEmail: string;
}

export async function findSeguimientoById(id: number): Promise<SeguimientoDetalle | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT
      seg.id,
      seg.solicitud_id,
      seg.comentario,
      uf.correo AS fundacion_email,
      ua.correo AS adoptante_email
     FROM seguimientos_adopcion seg
     INNER JOIN solicitudes_adopcion sa ON sa.id = seg.solicitud_id
     INNER JOIN organizaciones o ON o.id = sa.organizacion_id
     INNER JOIN usuarios uf ON uf.id = o.usuario_id
     INNER JOIN usuarios ua ON ua.id = sa.adoptante_id
     WHERE seg.id = ?
     LIMIT 1`,
    [id]
  );
  const row = rows[0];
  if (!row) return null;
  return {
    id: Number(row.id),
    solicitudId: String(row.solicitud_id),
    comentario: String(row.comentario ?? ""),
    fundacionEmail: String(row.fundacion_email),
    adoptanteEmail: String(row.adoptante_email),
  };
}

export async function updateSeguimientoComentario(id: number, comentario: string) {
  await pool.query(
    "UPDATE seguimientos_adopcion SET comentario = ? WHERE id = ?",
    [comentario, id]
  );
  return findSeguimientoById(id);
}

export async function addArchivoSeguimiento(seguimientoId: number, nombreArchivo: string) {
  await pool.query(
    "INSERT INTO archivos_seguimiento (seguimiento_id, nombre_archivo) VALUES (?, ?)",
    [seguimientoId, nombreArchivo]
  );
  return findSeguimientoById(seguimientoId);
}

export async function removeArchivoSeguimiento(seguimientoId: number, archivoId: number) {
  await pool.query(
    "DELETE FROM archivos_seguimiento WHERE id = ? AND seguimiento_id = ?",
    [archivoId, seguimientoId]
  );
  return findSeguimientoById(seguimientoId);
}

export async function cancelActiveByPetId(petId: number) {
  const estadoRechazada =
    await catalog.getEstadoSolicitudAdopcionId("rechazada");
  await pool.query(
    `UPDATE solicitudes_adopcion sa
     INNER JOIN estados_solicitud_adopcion es ON es.id = sa.estado_id
     SET sa.estado_id = ?,
         sa.observaciones = 'La mascota fue retirada del catálogo.',
         sa.proximo_paso = 'Puedes postular por otra mascota disponible.'
     WHERE sa.mascota_id = ? AND es.codigo IN (?, ?, ?)`,
    [estadoRechazada, petId, ...ACTIVE_STATES]
  );
}

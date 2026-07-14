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

const ACTIVE_STATES = ["revision", "aprobada", "seguimiento"] as const;

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
    seg.id AS seguimiento_id,
    seg.comentario AS seguimiento_comentario,
    seg.creado_en AS seguimiento_creado_en,
    (
      SELECT GROUP_CONCAT(asg.nombre_archivo SEPARATOR ',')
      FROM archivos_seguimiento asg
      WHERE asg.seguimiento_id = seg.id
    ) AS seguimiento_archivos_nombres
  FROM solicitudes_adopcion sa
  INNER JOIN estados_solicitud_adopcion es ON es.id = sa.estado_id
  INNER JOIN mascotas m ON m.id = sa.mascota_id
  INNER JOIN unidades_edad ue ON ue.id = m.unidad_edad_id
  INNER JOIN razas rz ON rz.id = m.raza_id
  INNER JOIN ciudades ci ON ci.id = m.ciudad_id
  INNER JOIN usuarios ua ON ua.id = sa.adoptante_id
  INNER JOIN perfiles_usuario pu ON pu.usuario_id = ua.id
  INNER JOIN organizaciones o ON o.id = sa.organizacion_id
  INNER JOIN usuarios uf ON uf.id = o.usuario_id
  LEFT JOIN formularios_adopcion f ON f.solicitud_id = sa.id
  LEFT JOIN ciudades cf ON cf.id = f.ciudad_id
  LEFT JOIN tipos_vivienda tv ON tv.id = f.tipo_vivienda_id
  LEFT JOIN seguimientos_adopcion seg ON seg.solicitud_id = sa.id
`;

export async function findAll() {
  const [rows] = await pool.query<RowDataPacket[]>(
    `${SOLICITUD_SELECT} ORDER BY sa.creado_en DESC`
  );
  return rows.map((row) => mapSolicitud(row));
}

export async function findByAdoptante(correo: string) {
  const [rows] = await pool.query<RowDataPacket[]>(
    `${SOLICITUD_SELECT} WHERE ua.correo = ? ORDER BY sa.creado_en DESC`,
    [correo]
  );
  return rows.map((row) => mapSolicitud(row));
}

export async function findByFundacion(fundacionEmail: string) {
  const [rows] = await pool.query<RowDataPacket[]>(
    `${SOLICITUD_SELECT} WHERE uf.correo = ? ORDER BY sa.creado_en DESC`,
    [fundacionEmail]
  );
  return rows.map((row) => mapSolicitud(row));
}

export async function findById(id: string) {
  const [rows] = await pool.query<RowDataPacket[]>(
    `${SOLICITUD_SELECT} WHERE sa.id = ? LIMIT 1`,
    [id]
  );
  return rows[0] ? mapSolicitud(rows[0]) : null;
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

export async function addSeguimiento(
  id: string,
  data: {
    comentario: string;
    cantidadArchivos?: number;
    archivosNombres?: string[];
  }
) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [result] = await conn.query<ResultSetHeader>(
      `INSERT INTO seguimientos_adopcion (solicitud_id, comentario)
       VALUES (?, ?)`,
      [id, data.comentario]
    );

    for (const nombre of data.archivosNombres ?? []) {
      await conn.query(
        `INSERT INTO archivos_seguimiento (seguimiento_id, nombre_archivo)
         VALUES (?, ?)`,
        [result.insertId, nombre]
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

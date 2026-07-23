import type {
  FundacionPendiente,
  Mascota,
  Solicitud,
  Usuario,
} from "../types/frontend.js";
import { computeEdadGrupo, formatEdad } from "./edad.js";
import {
  formatFechaCorta,
  formatFechaLarga,
  formatHora,
  formatMiembroDesde,
  toDate,
} from "./dates.js";

export function mapUsuario(row: Record<string, unknown>): Usuario {
  const creado = toDate(row.creado_en);
  return {
    id: Number(row.id),
    nombre: String(row.nombre ?? ""),
    correo: String(row.correo ?? ""),
    cedula: String(row.cedula ?? ""),
    telefono: String(row.telefono ?? ""),
    direccion: String(row.direccion ?? ""),
    rol: String(row.rol_codigo ?? row.rol) as Usuario["rol"],
    estado: String(row.estado_codigo ?? row.estado ?? "Activo"),
    organizacion: row.organizacion_nombre
      ? String(row.organizacion_nombre)
      : undefined,
    miembroDesde: formatMiembroDesde(creado),
  };
}

export function mapMascota(row: Record<string, unknown>): Mascota {
  const valor = Number(row.edad_valor ?? 0);
  const unidad = String(row.unidad_edad ?? "Años");
  const tagsRaw = row.tags;
  const tags =
    typeof tagsRaw === "string"
      ? tagsRaw
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
      : Array.isArray(tagsRaw)
        ? (tagsRaw as string[])
        : [];

  return {
    id: Number(row.id),
    nombre: String(row.nombre ?? ""),
    especie: String(row.especie ?? ""),
    raza: String(row.raza ?? ""),
    edad: formatEdad(valor, unidad),
    edadGrupo: computeEdadGrupo(valor, unidad),
    sexo: String(row.sexo ?? ""),
    tamano: String(row.tamano ?? ""),
    ubicacion: String(row.ubicacion ?? ""),
    historia: String(row.historia ?? ""),
    requisitos: String(row.requisitos ?? ""),
    tags,
    imagen: String(row.imagen ?? ""),
    fundacion: String(row.fundacion ?? ""),
    fundacionEmail: String(row.fundacion_email ?? ""),
    estado: String(row.estado_codigo ?? row.estado ?? "Disponible"),
    fechaPublicacion: toDate(row.publicada_en).toISOString(),
    hidden: Boolean(row.oculto ?? row.hidden),
  };
}

export function mapSolicitud(row: Record<string, unknown>): Solicitud {
  const creado = toDate(row.creado_en);
  const formData = buildFormData(row);
  const seguimientos = parseSeguimientos(row.seguimientos_json);
  const ultimoSeguimiento = seguimientos[0];
  const nombres = ultimoSeguimiento?.archivos.map((archivo) => archivo.name) ?? [];

  return {
    id: String(row.id),
    petId: Number(row.mascota_id ?? row.pet_id),
    mascota: String(row.mascota_nombre ?? row.mascota ?? ""),
    raza: String(row.raza ?? ""),
    edad: formatEdad(
      Number(row.edad_valor ?? 0),
      String(row.unidad_edad ?? "Años")
    ),
    ubicacion: String(row.ubicacion ?? ""),
    codigo: String(row.id),
    fecha: formatFechaLarga(creado),
    fechaCorta: formatFechaCorta(creado),
    hora: formatHora(creado),
    estado: String(row.estado_codigo ?? row.estado ?? "revision"),
    adoptante: String(row.adoptante_nombre ?? row.adoptante ?? ""),
    adoptanteEmail: String(row.adoptante_email ?? ""),
    fundacion: String(row.fundacion ?? ""),
    fundacionEmail: String(row.fundacion_email ?? ""),
    observaciones: String(row.observaciones ?? ""),
    proximoPaso: String(row.proximo_paso ?? ""),
    imagen: String(row.imagen ?? ""),
    tags:
      typeof row.tags === "string"
        ? row.tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
        : [],
    formData,
    seguimientos,
    seguimientoEnviado: seguimientos.length > 0,
    seguimientoComentario: ultimoSeguimiento?.comentario,
    seguimientoArchivos: nombres.length || undefined,
    seguimientoArchivosNombres: nombres,
    seguimientoFecha: ultimoSeguimiento?.fecha,
  };
}

function parseSeguimientos(raw: unknown) {
  let values: unknown[] = [];
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      values = Array.isArray(parsed) ? parsed : [];
    } catch {
      values = [];
    }
  } else if (Array.isArray(raw)) {
    values = raw;
  }

  return values
    .filter((value): value is Record<string, unknown> => Boolean(value && typeof value === "object"))
    .map((value) => {
      const archivosRaw = Array.isArray(value.archivos) ? value.archivos : [];
      const creadoEn = toDate(value.creadoEn);
      return {
        id: Number(value.id),
        periodo: String(value.periodo ?? ""),
        comentario: String(value.comentario ?? ""),
        creadoEn: creadoEn.toISOString(),
        fecha: formatFechaCorta(creadoEn),
        archivos: archivosRaw
          .filter(
            (archivo): archivo is Record<string, unknown> =>
              Boolean(archivo && typeof archivo === "object")
          )
          .map((archivo) => ({
            id: Number(archivo.id),
            name: String(archivo.name ?? ""),
            type: String(archivo.type ?? ""),
            size: Number(archivo.size ?? 0),
            url: String(archivo.url ?? ""),
          })),
      };
    })
    .sort((a, b) => b.creadoEn.localeCompare(a.creadoEn));
}

function buildFormData(row: Record<string, unknown>): Record<string, unknown> {
  if (!row.form_nombre_declarado && !row.form_correo_declarado) {
    return {};
  }

  const evidenciasRaw = row.evidencias_json;
  let evidencias: unknown[] = [];
  if (typeof evidenciasRaw === "string") {
    try {
      evidencias = JSON.parse(evidenciasRaw);
    } catch {
      evidencias = [];
    }
  } else if (Array.isArray(evidenciasRaw)) {
    evidencias = evidenciasRaw;
  }

  return {
    nombre: String(row.form_nombre_declarado ?? ""),
    cedula: String(row.form_cedula_declarada ?? ""),
    telefono: String(row.form_telefono_declarado ?? ""),
    correo: String(row.form_correo_declarado ?? ""),
    direccion: String(row.form_direccion_declarada ?? ""),
    ciudad: String(row.form_ciudad ?? ""),
    tipoVivienda: String(row.form_tipo_vivienda ?? ""),
    personasHogar: String(row.form_personas_hogar ?? ""),
    acuerdoHogar: String(row.form_acuerdo_hogar ?? ""),
    permanenciaAnimal: String(row.form_permanencia_animal ?? ""),
    lugarDormir: String(row.form_lugar_dormir ?? ""),
    tieneMascotas: String(row.form_tiene_mascotas ?? ""),
    cantidadMascotas: row.form_cantidad_mascotas
      ? String(row.form_cantidad_mascotas)
      : undefined,
    tiposMascotas: row.form_tipos_mascotas ? String(row.form_tipos_mascotas) : undefined,
    vacunas: row.form_vacunas ? String(row.form_vacunas) : undefined,
    esterilizacion: row.form_esterilizacion
      ? String(row.form_esterilizacion)
      : undefined,
    responsableCuidado: String(row.form_responsable_cuidado ?? ""),
    responsableGastos: String(row.form_responsable_gastos ?? ""),
    seguimiento: String(row.form_acepta_seguimiento ?? ""),
    contrato: String(row.form_acepta_contrato ?? ""),
    declaracion: Boolean(row.form_declaracion_veracidad),
    evidencias,
  };
}

export function mapFundacion(row: Record<string, unknown>): FundacionPendiente {
  const creado = toDate(row.creado_en);
  const nombre = String(row.nombre_organizacion ?? row.nombre ?? "");
  return {
    id: String(row.id),
    nombre,
    organizacion: nombre,
    ruc: String(row.ruc ?? ""),
    representante: String(row.nombre_representante ?? row.representante ?? ""),
    correo: String(row.correo ?? ""),
    telefono: String(row.telefono ?? ""),
    ciudad: String(row.ciudad ?? ""),
    descripcion: String(row.descripcion ?? ""),
    documento: String(row.nombre_documento ?? row.documento ?? ""),
    estado: String(row.estado_codigo ?? row.estado ?? "pendiente"),
    fecha: formatFechaCorta(creado),
  };
}

export function mapMensaje(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    de: String(row.nombre_remitente ?? row.de ?? ""),
    correo: String(row.correo_remitente ?? row.correo ?? ""),
    asunto: String(row.asunto ?? ""),
    mensaje: String(row.cuerpo ?? row.mensaje ?? ""),
    solicitudId: row.solicitud_id ? String(row.solicitud_id) : null,
    fundacionEmail: row.fundacion_email ? String(row.fundacion_email) : null,
    fecha: formatFechaCorta(toDate(row.creado_en)),
    leido: Boolean(row.leido),
  };
}

export function mapDonacion(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    nombre: String(row.nombre_donante ?? row.nombre ?? ""),
    correo: String(row.correo_donante ?? row.correo ?? ""),
    tipo: String(row.tipo_nombre ?? row.tipo ?? ""),
    cantidad: String(row.cantidad_descripcion ?? row.cantidad ?? ""),
    direccion: String(row.direccion ?? ""),
    fecha: formatFechaCorta(toDate(row.creado_en)),
    estado: String(row.estado_codigo ?? row.estado ?? "Completado"),
  };
}

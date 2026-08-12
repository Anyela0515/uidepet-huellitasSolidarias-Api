import { z } from "zod";
import { hoyEcuadorISO } from "../utils/dates.js";
import { EVIDENCE_MIME_TYPES } from "../utils/fileSignature.js";

// Mismos límites que usa el frontend por defecto en filesToPersistedEntries
// (src/utils/constants.js): MAX_EVIDENCE_FILE_SIZE / MAX_EVIDENCE_VIDEO_SIZE.
const MAX_FOTO_HOGAR_BYTES = 5 * 1024 * 1024;
const MAX_VIDEO_HOGAR_BYTES = 10 * 1024 * 1024;

// Sin WEBP a propósito: algunas fundaciones no podían abrirlo al revisar
// las evidencias del hogar. Espejo de ACCEPT_EVIDENCE_HOGAR en el frontend
// (src/utils/fileValidation.js).
const HOGAR_MIME_TYPES = ["image/jpeg", "image/png", "video/mp4"] as const;

const evidenciaFormSchema = z.object({
  name: z.string().min(1).max(255),
  type: z.enum(HOGAR_MIME_TYPES),
  size: z.number().int().positive().max(MAX_VIDEO_HOGAR_BYTES),
  url: z
    .string()
    .max(14_000_000)
    .regex(/^data:(image\/jpeg|image\/png|video\/mp4);base64,/),
});

// Los límites de longitud coinciden con las columnas VARCHAR reales
// (los campos "declarado_*" de solicitudes_adopcion en db/schema.sql), para
// rechazar con 422 en vez de
// reventar con un error de MySQL (ER_DATA_TOO_LONG) si el cliente envía
// texto libre más largo de lo que la tabla admite. permanenciaAnimal y
// lugarDormir son descripciones libres (el frontend usa un textarea), por
// eso llevan un máximo generoso y no uno corto tipo "si/no".
export const formularioAdopcionSchema = z
  .object({
    nombre: z.string().min(3, "El nombre declarado es obligatorio.").max(120),
    cedula: z.string().length(10, "La cédula debe tener 10 dígitos."),
    telefono: z.string().min(7, "El teléfono declarado es obligatorio.").max(20),
    correo: z.string().email("Correo declarado inválido.").max(150),
    direccion: z.string().min(5, "La dirección declarada es obligatoria.").max(255),
    localidadId: z.number().int().positive({ message: "Debes elegir provincia, cantón y parroquia." }),
    tipoVivienda: z.string().min(2, "El tipo de vivienda es obligatorio.").max(40),
    personasHogar: z.string().min(1, "Indica cuántas personas viven en el hogar.").max(20),
    acuerdoHogar: z.string().min(1, "Indica si todo el hogar está de acuerdo.").max(10),
    permanenciaAnimal: z.string().min(1, "Indica dónde permanecerá el animal.").max(255),
    lugarDormir: z.string().min(1, "Indica dónde dormirá el animal.").max(255),
    tieneMascotas: z.string().min(1, "Indica si ya tienes otras mascotas.").max(10),
    cantidadMascotas: z.string().max(20).optional(),
    tiposMascotas: z.string().max(150).optional(),
    vacunas: z.string().max(20).optional(),
    esterilizacion: z.string().max(20).optional(),
    responsableCuidado: z.string().min(3, "Indica quién será responsable del cuidado.").max(120),
    responsableGastos: z.string().min(3, "Indica quién será responsable de los gastos.").max(120),
    seguimiento: z.string().min(1, "Indica si aceptas el seguimiento post-adopción.").max(10),
    contrato: z.string().min(1, "Indica si aceptas el compromiso de adopción.").max(10),
    declaracion: z.literal(true, {
      errorMap: () => ({ message: "Debes declarar que la información es verídica." }),
    }),
    evidencias: z.array(evidenciaFormSchema).max(5, "Máximo 5 archivos permitidos.").optional(),
  })
  .superRefine((data, ctx) => {
    const evidencias = data.evidencias || [];
    evidencias.forEach((evidencia, index) => {
      const esVideo = evidencia.type === "video/mp4";
      const limite = esVideo ? MAX_VIDEO_HOGAR_BYTES : MAX_FOTO_HOGAR_BYTES;
      if (evidencia.size > limite) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["evidencias", index, "size"],
          message: `${evidencia.name}: supera el tamaño máximo (${Math.round(limite / (1024 * 1024))} MB).`,
        });
      }
    });
    const totalEvidencias = evidencias.reduce((sum, evidencia) => sum + evidencia.size, 0);
    if (totalEvidencias > 20 * 1024 * 1024) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["evidencias"],
        message: "El total de archivos no puede superar 20 MB.",
      });
    }
    const videosEvidencia = evidencias.filter((evidencia) => evidencia.type === "video/mp4");
    if (videosEvidencia.length > 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["evidencias"],
        message: "Solo se permite un video MP4.",
      });
    }

    if (data.tieneMascotas !== "si") return;
    const requeridos: Array<[keyof typeof data, string]> = [
      ["cantidadMascotas", "Indica cuántas mascotas tienes actualmente."],
      ["tiposMascotas", "Indica qué tipo de mascotas tienes actualmente."],
      ["vacunas", "Indica si tus mascotas actuales están vacunadas."],
      ["esterilizacion", "Indica si tus mascotas actuales están esterilizadas."],
    ];
    for (const [campo, mensaje] of requeridos) {
      if (!data[campo]) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: [campo], message: mensaje });
      }
    }
  });

export const crearSolicitudSchema = z.object({
  petId: z.number().int().positive(),
  form: formularioAdopcionSchema,
});

export const actualizarEstadoSolicitudSchema = z.object({
  estado: z.enum(["revision", "aprobada", "rechazada", "seguimiento"]),
  observaciones: z.string().optional(),
  proximoPaso: z.string().optional(),
});

export const actualizarEntregaSolicitudSchema = z.object({
  fecha: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida.")
    .refine((fecha) => fecha >= hoyEcuadorISO(), {
      message: "No puedes agendar una entrega en una fecha pasada.",
    }),
  hora: z.string().regex(/^\d{2}:\d{2}$/, "Hora inválida."),
  lugar: z.string().trim().min(5, "Indica la dirección del refugio.").max(255),
  contacto: z.string().trim().min(7, "Indica un teléfono de contacto.").max(20),
});

const MAX_FOTO_SEGUIMIENTO_BYTES = 5 * 1024 * 1024;
const MAX_VIDEO_SEGUIMIENTO_BYTES = 10 * 1024 * 1024;

const archivoEvidenciaSeguimientoSchema = z.object({
  nombreArchivo: z.string().min(1).max(255),
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp", "video/mp4"]),
  tamanioBytes: z.number().int().positive().max(MAX_VIDEO_SEGUIMIENTO_BYTES),
  contenido: z
    .string()
    .max(14_000_000)
    .regex(/^data:(image\/jpeg|image\/png|image\/webp|video\/mp4);base64,/),
});

export const seguimientoSolicitudSchema = z
  .object({
    comentario: z.string().trim().min(10).max(2000),
    archivos: z.array(archivoEvidenciaSeguimientoSchema).min(1).max(5),
  })
  .superRefine((data, ctx) => {
    data.archivos.forEach((archivo, index) => {
      const esVideo = archivo.mimeType === "video/mp4";
      const limite = esVideo ? MAX_VIDEO_SEGUIMIENTO_BYTES : MAX_FOTO_SEGUIMIENTO_BYTES;
      if (archivo.tamanioBytes > limite) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["archivos", index, "tamanioBytes"],
          message: `${archivo.nombreArchivo}: supera el tamaño máximo (${Math.round(limite / (1024 * 1024))} MB).`,
        });
      }
    });

    const total = data.archivos.reduce((sum, archivo) => sum + archivo.tamanioBytes, 0);
    if (total > 20 * 1024 * 1024) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["archivos"],
        message: "El total de archivos no puede superar 20 MB.",
      });
    }
    const videos = data.archivos.filter((archivo) => archivo.mimeType === "video/mp4");
    if (videos.length > 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["archivos"],
        message: "Solo se permite un video MP4 por reporte mensual.",
      });
    }
  });

export const actualizarSeguimientoSchema = z.object({
  comentario: z.string().min(1),
});

export const archivoSeguimientoSchema = z.object({
  nombreArchivo: z.string().min(1),
});

export const evidenciaAdopcionSchema = z.object({
  nombreArchivo: z.string().min(1).max(255),
  mimeType: z.enum(EVIDENCE_MIME_TYPES),
  tamanioBytes: z.number().int().positive().max(MAX_VIDEO_HOGAR_BYTES),
  contenido: z
    .string()
    .max(14_000_000)
    .regex(/^data:(image\/jpeg|image\/png|image\/webp|video\/mp4);base64,/),
});

export type CrearSolicitudDTO = z.infer<typeof crearSolicitudSchema>;
export type ActualizarEstadoSolicitudDTO = z.infer<typeof actualizarEstadoSolicitudSchema>;

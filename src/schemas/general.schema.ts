import { z } from "zod";
import { EVIDENCE_MIME_TYPES } from "../utils/fileSignature.js";

const MAX_FOTO_EVIDENCIA_BYTES = 5 * 1024 * 1024;
const MAX_VIDEO_EVIDENCIA_BYTES = 10 * 1024 * 1024;
const MAX_EVIDENCIAS_TOTAL_BYTES = 20 * 1024 * 1024;

export const crearMensajeSchema = z.object({
  de: z.string().min(2),
  correo: z.string().email(),
  asunto: z.string().min(3),
  mensaje: z.string().min(10),
  solicitudId: z.string().optional().nullable(),
  fundacionEmail: z.string().email().optional().nullable(),
  organizacionId: z.number().int().positive().optional().nullable(),
});

export const crearDonacionSchema = z.object({
  nombre: z.string().min(2),
  correo: z.string().email(),
  telefono: z.string().regex(/^09\d{8}$/, "Ingresa un celular ecuatoriano válido."),
  tipo: z.string().min(2),
  cantidad: z.string().min(2).max(500),
  direccion: z.string().min(5),
  organizacionId: z.number().int().positive(),
  // Comprobante de pago del aporte económico (imagen o PDF en base64);
  // se envía por correo a la organización beneficiaria.
  comprobantePago: z
    .string()
    .regex(/^data:(image\/[a-zA-Z0-9.+-]+|application\/pdf);base64,/, "Formato de comprobante inválido.")
    .max(7 * 1024 * 1024)
    .optional()
    .nullable(),
});

export const actualizarRolSchema = z.object({
  rol: z.enum(["usuario", "fundacion", "admin"]),
});

export const actualizarEstadoUsuarioSchema = z.object({
  estado: z.enum(["Activo", "Suspendido"]),
});

export const actualizarEstadoDonacionSchema = z.object({
  estado: z.enum(["Completado", "Pendiente", "Cancelado"]),
});

export const crearReporteRescateSchema = z.object({
  tipoAnimal: z.enum(["Perro", "Gato", "Otro"]),
  urgencia: z.enum(["Crítica", "Alta", "Moderada"]),
  ubicacion: z.string().trim().min(3),
  referencia: z.string().trim().optional().nullable(),
  descripcion: z.string().trim().min(20),
  nombreContacto: z.string().trim().optional().nullable(),
  contacto: z.string().trim().optional().nullable(),
  correoNotificacion: z.string().trim().email("Correo inválido.").optional().nullable(),
  coordenadas: z
    .object({
      latitud: z.number().min(-90).max(90),
      longitud: z.number().min(-180).max(180),
    })
    .optional()
    .nullable(),
  evidencias: z
    .array(
      z.object({
        name: z.string().min(1).max(255),
        type: z.enum(EVIDENCE_MIME_TYPES),
        size: z.number().int().positive().max(MAX_VIDEO_EVIDENCIA_BYTES),
        url: z
          .string()
          .max(14_000_000)
          .regex(/^data:(image\/jpeg|image\/png|image\/webp|video\/mp4);base64,/),
      })
    )
    .min(1, "Adjunta al menos una foto o video como evidencia.")
    .max(5, "Máximo 5 archivos permitidos.")
    .superRefine((evidencias, ctx) => {
      evidencias.forEach((evidencia, index) => {
        const esVideo = evidencia.type === "video/mp4";
        const limite = esVideo ? MAX_VIDEO_EVIDENCIA_BYTES : MAX_FOTO_EVIDENCIA_BYTES;
        if (evidencia.size > limite) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [index, "size"],
            message: `${evidencia.name}: supera el tamaño máximo (${Math.round(limite / (1024 * 1024))} MB).`,
          });
        }
      });

      const total = evidencias.reduce((sum, evidencia) => sum + evidencia.size, 0);
      if (total > MAX_EVIDENCIAS_TOTAL_BYTES) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [],
          message: "El total de archivos no puede superar 20 MB.",
        });
      }

      const videos = evidencias.filter((evidencia) => evidencia.type === "video/mp4");
      if (videos.length > 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [],
          message: "Solo se permite un video por reporte.",
        });
      }
    }),
});

export const actualizarEstadoDenunciaSchema = z.object({
  estado: z.enum(["recibida", "revision", "atendida", "cerrada"]),
});

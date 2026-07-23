import { z } from "zod";

export const crearSolicitudSchema = z.object({
  petId: z.number().int().positive(),
  form: z.record(z.unknown()),
});

export const actualizarEstadoSolicitudSchema = z.object({
  estado: z.enum(["revision", "aprobada", "rechazada", "seguimiento"]),
  observaciones: z.string().optional(),
  proximoPaso: z.string().optional(),
});

const archivoEvidenciaSeguimientoSchema = z.object({
  nombreArchivo: z.string().min(1).max(255),
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp", "video/mp4"]),
  tamanioBytes: z.number().int().positive().max(5 * 1024 * 1024),
  contenido: z
    .string()
    .max(7_100_000)
    .regex(/^data:(image\/jpeg|image\/png|image\/webp|video\/mp4);base64,/),
});

export const seguimientoSolicitudSchema = z
  .object({
    comentario: z.string().trim().min(10).max(2000),
    archivos: z.array(archivoEvidenciaSeguimientoSchema).min(1).max(5),
  })
  .superRefine((data, ctx) => {
    const total = data.archivos.reduce((sum, archivo) => sum + archivo.tamanioBytes, 0);
    if (total > 10 * 1024 * 1024) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["archivos"],
        message: "El total de archivos no puede superar 10 MB.",
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
  nombreArchivo: z.string().min(1),
  mimeType: z.string().optional(),
  tamanioBytes: z.number().int().positive().optional(),
  contenido: z.string().optional(),
});

export type CrearSolicitudDTO = z.infer<typeof crearSolicitudSchema>;
export type ActualizarEstadoSolicitudDTO = z.infer<typeof actualizarEstadoSolicitudSchema>;

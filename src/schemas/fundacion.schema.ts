import { z } from "zod";

export const crearFundacionSchema = z.object({
  nombre: z.string().trim().min(3),
  organizacion: z.string().trim().min(3).optional(),
  ruc: z.string().trim().min(10),
  representante: z.string().trim().min(3),
  correo: z.string().trim().email(),
  telefono: z.string().trim().min(10),
  localidadId: z.number().int().positive(),
  descripcion: z.string().trim().min(10),
  documento: z.string().trim().optional(),

  documentoContenido: z.string().startsWith("data:application/pdf").max(7 * 1024 * 1024).optional(),
});

export const actualizarEstadoFundacionSchema = z.object({
  estado: z.enum(["pendiente", "aprobada", "rechazada"]),
});

export const actualizarPerfilFundacionSchema = z
  .object({
    telefono: z.string().trim().min(7).max(20).optional(),
    localidadId: z.number().int().positive().optional(),
    descripcion: z.string().trim().min(10).optional(),
    direccion: z.string().trim().min(5).optional(),

    imagenQr: z.string().startsWith("data:image/").max(7 * 1024 * 1024).nullable().optional(),

    imagen: z.string().startsWith("data:image/").max(7 * 1024 * 1024).nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Debes enviar al menos un campo para actualizar.",
  });

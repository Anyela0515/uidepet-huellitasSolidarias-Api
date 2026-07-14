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

export const seguimientoSolicitudSchema = z.object({
  comentario: z.string().min(1),
  cantidadArchivos: z.number().int().min(0).optional(),
  archivosNombres: z.array(z.string()).optional(),
});

export type CrearSolicitudDTO = z.infer<typeof crearSolicitudSchema>;
export type ActualizarEstadoSolicitudDTO = z.infer<typeof actualizarEstadoSolicitudSchema>;

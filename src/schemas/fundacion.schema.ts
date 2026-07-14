import { z } from "zod";

export const crearFundacionSchema = z.object({
  nombre: z.string().min(3),
  organizacion: z.string().min(3).optional(),
  ruc: z.string().min(10),
  representante: z.string().min(3),
  correo: z.string().email(),
  telefono: z.string().min(10),
  ciudad: z.string().min(2),
  descripcion: z.string().min(10),
  documento: z.string().optional(),
});

export const actualizarEstadoFundacionSchema = z.object({
  estado: z.enum(["pendiente", "aprobada", "rechazada"]),
});

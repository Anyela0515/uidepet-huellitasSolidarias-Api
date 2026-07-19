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

export const actualizarPerfilFundacionSchema = z
  .object({
    telefono: z.string().min(7).max(20).optional(),
    ciudad: z.string().min(2).optional(),
    descripcion: z.string().min(10).optional(),
    direccion: z.string().min(5).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Debes enviar al menos un campo para actualizar.",
  });

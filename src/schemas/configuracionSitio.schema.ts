import { z } from "zod";

export const actualizarConfiguracionSitioSchema = z
  .object({
    correo: z.string().email("Correo inválido.").optional(),
    telefono: z.string().min(7, "Teléfono demasiado corto.").max(20).optional(),
    horario: z.string().min(3).max(120).optional(),
    direccion: z.string().min(5).max(255).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Debes enviar al menos un campo para actualizar.",
  });

export type ActualizarConfiguracionSitioDTO = z.infer<
  typeof actualizarConfiguracionSitioSchema
>;

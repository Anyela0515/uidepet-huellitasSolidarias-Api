import { z } from "zod";

export const crearMascotaSchema = z.object({
  fk_organizacion_id: z.number().int().positive(),

  nombre: z.string().min(2, "El nombre debe tener mínimo 2 caracteres").max(80),

  especie: z.enum(["PERRO", "GATO", "CONEJO", "OTRO"]),

  raza: z.string().min(2).max(80).optional(),

  sexo: z.enum(["MACHO", "HEMBRA", "DESCONOCIDO"]),

  edad_aproximada: z.string().min(2).max(50),

  tamano: z.enum(["PEQUENO", "MEDIANO", "GRANDE", "NO_APLICA"]),

  color: z.string().min(2).max(80).optional(),

  descripcion: z
    .string()
    .min(10, "La descripción debe tener mínimo 10 caracteres"),

  historia: z
    .string()
    .min(10, "La historia debe tener mínimo 10 caracteres"),

  estado_salud: z.string().min(3).max(150),

  esterilizado: z.boolean().optional(),

  estado_adopcion: z
    .enum(["NO_DISPONIBLE", "DISPONIBLE", "EN_PROCESO", "ADOPTADO", "FALLECIDO"])
    .optional(),
});

export const actualizarMascotaSchema = crearMascotaSchema.partial();

export type CrearMascotaDTO = z.infer<typeof crearMascotaSchema>;
export type ActualizarMascotaDTO = z.infer<typeof actualizarMascotaSchema>;
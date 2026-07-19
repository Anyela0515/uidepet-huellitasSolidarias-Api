import { z } from "zod";

export const crearMascotaSchema = z.object({
  nombre: z.string().min(2).max(80),
  especie: z.string().min(2),
  raza: z.string().min(2).optional(),
  edad: z.string().min(1),
  edadGrupo: z.string().optional(),
  sexo: z.string().min(2),
  tamano: z.string().min(2),
  ubicacion: z.string().min(2),
  historia: z.string().min(10),
  requisitos: z.string().min(5),
  tags: z.array(z.string()).optional(),
  imagen: z.string().min(1),
  fundacion: z.string().optional(),
  fundacionEmail: z.string().email().optional(),
  estado: z.string().optional(),
  fechaPublicacion: z.string().optional(),
  hidden: z.boolean().optional(),
});

export const actualizarMascotaSchema = crearMascotaSchema.partial();

export const agregarTagSchema = z.object({
  tag: z.string().min(1).max(60),
});

export const agregarMedioSchema = z.object({
  tipo: z.enum(["imagen", "documento"]).optional(),
  contenido: z.string().min(1),
  esPrincipal: z.boolean().optional(),
});

export type CrearMascotaDTO = z.infer<typeof crearMascotaSchema>;
export type ActualizarMascotaDTO = z.infer<typeof actualizarMascotaSchema>;

import { z } from "zod";

export const loginSchema = z.object({
  correo: z.string().email("Correo inválido."),
  password: z.string().min(8, "La contraseña debe tener mínimo 8 caracteres."),
});

export const registerSchema = z.object({
  nombre: z.string().min(3),
  correo: z.string().email(),
  password: z.string().min(8),
  cedula: z.string().length(10),
  telefono: z.string().min(10),
  direccion: z.string().min(5),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(8),
  newPassword: z.string().min(8),
});

export const updateProfileSchema = z.object({
  nombre: z.string().min(3).optional(),
  telefono: z.string().min(10).optional(),
  direccion: z.string().min(5).optional(),
  cedula: z.string().length(10).optional(),
});

export type LoginDTO = z.infer<typeof loginSchema>;
export type RegisterDTO = z.infer<typeof registerSchema>;

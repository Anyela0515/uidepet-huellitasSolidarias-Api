import { z } from "zod";

// Entre 8 y 12 caracteres, con mayuscula, minuscula, numero y simbolo
// especial. Solo se aplica al crear o cambiar una contrasena. NUNCA se le
// pone tope maximo al login ni a currentPassword: son cuentas que ya existen
// y pueden tener una contrasena de otro largo de antes de esta regla — si el
// maximo tambien aplicara ahi, esas cuentas quedarian sin poder iniciar
// sesion nunca mas.
const PASSWORD_MIN = 8;
const PASSWORD_MAX = 12;
const PASSWORD_SEGURA_REGEX = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,12}$/;
const PASSWORD_SEGURA_MSG =
  "Debe tener entre 8 y 12 caracteres, con mayúscula, minúscula, número y símbolo especial.";

// Registro cerrado temporalmente para correos institucionales: por ahora la
// plataforma es solo para el publico general, no para la comunidad UIDE.
// Pensado para habilitarse en el futuro.
export const DOMINIO_INSTITUCIONAL = "@uide.edu.ec";
export const CORREO_INSTITUCIONAL_MSG = "Correo no permitido.";
export function esCorreoInstitucional(correo: string) {
  return correo.trim().toLowerCase().endsWith(DOMINIO_INSTITUCIONAL);
}

export const loginSchema = z.object({
  correo: z.string().email("Correo inválido."),
  password: z.string().min(8, "La contraseña debe tener mínimo 8 caracteres."),
});

export const registerSchema = z.object({
  nombre: z.string().min(3),
  correo: z.string().email().refine((correo) => !esCorreoInstitucional(correo), {
    message: CORREO_INSTITUCIONAL_MSG,
  }),
  password: z
    .string()
    .min(PASSWORD_MIN, PASSWORD_SEGURA_MSG)
    .max(PASSWORD_MAX, PASSWORD_SEGURA_MSG)
    .regex(PASSWORD_SEGURA_REGEX, PASSWORD_SEGURA_MSG),
  cedula: z.string().length(10),
  telefono: z.string().min(10),
  direccion: z.string().min(5),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(8),
  newPassword: z
    .string()
    .min(PASSWORD_MIN, PASSWORD_SEGURA_MSG)
    .max(PASSWORD_MAX, PASSWORD_SEGURA_MSG)
    .regex(PASSWORD_SEGURA_REGEX, PASSWORD_SEGURA_MSG),
});

export const googleLoginSchema = z.object({
  credential: z.string().min(100, "Credencial de Google inválida."),
});

export const forgotPasswordSchema = z.object({
  correo: z.string().email("Correo inválido."),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(32, "Token inválido."),
  newPassword: z
    .string()
    .min(PASSWORD_MIN, PASSWORD_SEGURA_MSG)
    .max(PASSWORD_MAX, PASSWORD_SEGURA_MSG)
    .regex(PASSWORD_SEGURA_REGEX, PASSWORD_SEGURA_MSG),
});

export const sendEmailVerificationSchema = z.object({
  correo: z.string().email("Correo inválido."),
  nombre: z.string().trim().min(1).max(100).optional(),
});

export const verifyEmailQuerySchema = z.object({
  token: z.string().min(32, "Token inválido."),
});

export const emailVerificationStatusQuerySchema = z.object({
  correo: z.string().email("Correo inválido."),
});

export const updateProfileSchema = z.object({
  nombre: z.string().min(3).optional(),
  telefono: z.string().min(10).optional(),
  direccion: z.string().min(5).optional(),
  cedula: z.string().length(10).optional(),
});

export type LoginDTO = z.infer<typeof loginSchema>;
export type GoogleLoginDTO = z.infer<typeof googleLoginSchema>;
export type RegisterDTO = z.infer<typeof registerSchema>;

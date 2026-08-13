import { z } from "zod";
import { esCedulaEcuatorianaValida, esTelefonoEcuatorianoValido } from "../utils/ecuador.js";

const PASSWORD_MIN = 8;
const PASSWORD_MAX = 12;
const PASSWORD_SEGURA_REGEX = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,12}$/;
const PASSWORD_SEGURA_MSG =
  "Debe tener entre 8 y 12 caracteres, con mayúscula, minúscula, número y símbolo especial.";

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
  cedula: z
    .string()
    .length(10)
    .refine(esCedulaEcuatorianaValida, { message: "La cédula ingresada no es válida." }),
  telefono: z
    .string()
    .min(10)
    .refine(esTelefonoEcuatorianoValido, { message: "Ingresa un teléfono válido (09xxxxxxxx)." }),
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
  telefono: z
    .string()
    .min(10)
    .refine(esTelefonoEcuatorianoValido, { message: "Ingresa un teléfono válido (09xxxxxxxx)." })
    .optional(),
  direccion: z.string().min(5).optional(),
  cedula: z
    .string()
    .length(10)
    .refine(esCedulaEcuatorianaValida, { message: "La cédula ingresada no es válida." })
    .optional(),

  imagen: z.string().startsWith("data:image/").max(7 * 1024 * 1024).nullable().optional(),
});

export type LoginDTO = z.infer<typeof loginSchema>;
export type GoogleLoginDTO = z.infer<typeof googleLoginSchema>;
export type RegisterDTO = z.infer<typeof registerSchema>;

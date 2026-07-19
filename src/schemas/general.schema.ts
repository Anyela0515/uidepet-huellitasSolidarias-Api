import { z } from "zod";

export const crearMensajeSchema = z.object({
  de: z.string().min(2),
  correo: z.string().email(),
  asunto: z.string().min(3),
  mensaje: z.string().min(10),
  solicitudId: z.string().optional().nullable(),
  fundacionEmail: z.string().email().optional().nullable(),
});

export const crearDonacionSchema = z.object({
  nombre: z.string().min(2),
  correo: z.string().email(),
  tipo: z.string().min(2),
  cantidad: z.string().min(2),
  direccion: z.string().min(5),
});

export const actualizarRolSchema = z.object({
  rol: z.enum(["usuario", "fundacion", "admin"]),
});

export const actualizarEstadoUsuarioSchema = z.object({
  estado: z.enum(["Activo", "Suspendido"]),
});

export const actualizarEstadoDonacionSchema = z.object({
  estado: z.enum(["Completado", "Pendiente", "Cancelado"]),
});

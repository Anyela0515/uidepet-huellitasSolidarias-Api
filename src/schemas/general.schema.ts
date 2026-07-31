import { z } from "zod";

export const crearMensajeSchema = z.object({
  de: z.string().min(2),
  correo: z.string().email(),
  asunto: z.string().min(3),
  mensaje: z.string().min(10),
  solicitudId: z.string().optional().nullable(),
  fundacionEmail: z.string().email().optional().nullable(),
  organizacionId: z.number().int().positive().optional().nullable(),
});

export const crearDonacionSchema = z.object({
  nombre: z.string().min(2),
  correo: z.string().email(),
  telefono: z.string().regex(/^09\d{8}$/, "Ingresa un celular ecuatoriano válido."),
  tipo: z.string().min(2),
  cantidad: z.string().min(2).max(500),
  direccion: z.string().min(5),
  organizacionId: z.number().int().positive(),
  // Comprobante de pago del aporte económico (imagen o PDF en base64);
  // se envía por correo a la organización beneficiaria.
  comprobantePago: z
    .string()
    .regex(/^data:(image\/[a-zA-Z0-9.+-]+|application\/pdf);base64,/, "Formato de comprobante inválido.")
    .max(7 * 1024 * 1024)
    .optional()
    .nullable(),
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

export const crearReporteRescateSchema = z.object({
  tipoAnimal: z.enum(["Perro", "Gato", "Otro"]),
  urgencia: z.enum(["Crítica", "Alta", "Moderada"]),
  ubicacion: z.string().trim().min(3),
  referencia: z.string().trim().optional().nullable(),
  descripcion: z.string().trim().min(20),
  nombreContacto: z.string().trim().optional().nullable(),
  contacto: z.string().trim().optional().nullable(),
  coordenadas: z
    .object({
      latitud: z.number().min(-90).max(90),
      longitud: z.number().min(-180).max(180),
    })
    .optional()
    .nullable(),
  evidencias: z
    .array(
      z.object({
        name: z.string(),
        type: z.string().optional().nullable(),
        size: z.number().optional().nullable(),
        url: z.string().optional().nullable(),
      })
    )
    .min(1, "Adjunta al menos una foto o video como evidencia."),
});

export const actualizarEstadoDenunciaSchema = z.object({
  estado: z.enum(["recibida", "revision", "atendida", "cerrada"]),
});

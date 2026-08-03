import rateLimit from "express-rate-limit";

/** Límite general de producción (lectura/escritura mixta). */
export const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Demasiadas peticiones. Intenta más tarde.",
  },
});

/** Más estricto en endpoints de autenticación. */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Demasiados intentos de autenticación. Intenta más tarde.",
  },
});

/**
 * Formularios públicos sin JWT que además disparan correos (mensajes,
 * reportes de rescate, donaciones): el límite general (300/15min) es
 * demasiado alto para estos — sin esto, alguien podría usarlos para
 * generar spam de correo o saturar la bandeja de las fundaciones.
 */
export const publicFormRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Demasiadas solicitudes. Intenta más tarde.",
  },
});

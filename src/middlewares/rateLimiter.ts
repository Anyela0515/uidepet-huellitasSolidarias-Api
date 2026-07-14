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

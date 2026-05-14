import rateLimit from 'express-rate-limit'

/**
 * Rate limiter para rutas de autenticación.
 * 5 intentos por IP cada 1 minuto.
 */
export const authLimiter = rateLimit({
  windowMs: 60_000, // 1 minuto
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos — esperá 1 minuto' },
})

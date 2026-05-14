import { type Request, type Response, type NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { config } from '../config'

export interface AuthPayload {
  userId: number
  email: string
}

// Extendemos Express Request para incluir `user`
declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload
    }
  }
}

/**
 * Middleware que requiere un token JWT válido.
 * Adjunta req.user con { userId, email } si es válido.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'No autorizado — token requerido' })
    return
  }

  const token = authHeader.split(' ')[1]

  try {
    const payload = jwt.verify(token, config.JWT_SECRET) as AuthPayload
    req.user = { userId: payload.userId, email: payload.email }
    next()
  } catch (err) {
    const message =
      (err as Error).name === 'TokenExpiredError'
        ? 'Sesión expirada — iniciá sesión de nuevo'
        : 'Token inválido — iniciá sesión de nuevo'
    res.status(401).json({ error: message })
  }
}

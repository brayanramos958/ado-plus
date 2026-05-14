import { body, validationResult } from 'express-validator'
import { type Request, type Response, type NextFunction } from 'express'

export const registerValidator = [
  body('email')
    .isEmail()
    .withMessage('Email inválido')
    .normalizeEmail()
    .custom((value: string) => {
      if (!value.endsWith('@itsinfocom.com')) {
        throw new Error('Solo se permiten emails @itsinfocom.com')
      }
      return true
    }),
  body('password')
    .isLength({ min: 8 })
    .withMessage('La contraseña debe tener al menos 8 caracteres'),
  body('pat')
    .isLength({ min: 30 })
    .withMessage('El PAT de Azure DevOps debe tener al menos 30 caracteres'),
]

export const loginValidator = [
  body('email')
    .isEmail()
    .withMessage('Email inválido')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('La contraseña es requerida'),
]

/**
 * Middleware que revisa los resultados de validación y devuelve 400 con los errores.
 */
export function handleValidationErrors(req: Request, res: Response, next: NextFunction): void {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    res.status(400).json({ error: 'Datos inválidos', details: errors.array() })
    return
  }
  next()
}

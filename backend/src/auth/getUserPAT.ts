import type { Request } from 'express'
import { getUserById, decryptPAT } from '../db'

/**
 * Extrae y desencripta el PAT del usuario autenticado.
 * Retorna undefined si el usuario no tiene PAT almacenado o si ocurre algún error.
 * NUNCA lanza — todos los errores son capturados para evitar crashes.
 */
export function getUserPAT(req: Request): string | undefined {
  try {
    const user = getUserById(req.user!.userId)
    if (!user?.pat_encrypted || !user?.pat_iv) return undefined
    return decryptPAT(user.pat_encrypted, user.pat_iv)
  } catch (err) {
    console.error('[getUserPAT] Error:', (err as Error).message)
    return undefined
  }
}

import { Router, type Request, type Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { config } from '../config'
import { getUserByEmail, createUser, encryptPAT, decryptPAT, getUserById, getDB } from '../db'
import { requireAuth } from '../auth/authMiddleware'
import { registerValidator, loginValidator, handleValidationErrors } from '../auth/validators'

const router = Router()

/**
 * POST /api/auth/register
 * Crea una cuenta nueva. Requiere email @itsinfocom.com, password 8+ chars, PAT 30+ chars.
 */
router.post(
  '/register',
  registerValidator,
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const { email, password, pat } = req.body

      // Verificar que el email no exista ya
      const existing = getUserByEmail(email)
      if (existing) {
        res.status(409).json({ error: 'Ya existe una cuenta con ese email' })
        return
      }

      // Encriptar PAT
      const { encrypted, iv } = encryptPAT(pat)

      // Hashear password
      const passwordHash = await bcrypt.hash(password, 10)

      // Crear usuario
      const userId = createUser(email, passwordHash, encrypted, iv)

      // Generar JWT
      const token = jwt.sign(
        { userId, email },
        config.JWT_SECRET,
        { expiresIn: config.JWT_EXPIRATION }
      )

      res.status(201).json({ token, user: { id: userId, email } })
    } catch (err) {
      console.error('[auth/register] Error:', (err as Error).message)

      // Manejar constraint UNIQUE de SQLite (race condition)
      if ((err as Error).message?.includes('UNIQUE constraint failed')) {
        res.status(409).json({ error: 'Ya existe una cuenta con ese email' })
        return
      }

      res.status(500).json({ error: 'Error interno al crear la cuenta' })
    }
  }
)

/**
 * POST /api/auth/login
 * Inicia sesión con email y password.
 */
router.post(
  '/login',
  loginValidator,
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body

      // Buscar usuario
      const user = getUserByEmail(email)
      if (!user) {
        res.status(401).json({ error: 'Credenciales inválidas' })
        return
      }

      // Comparar password
      const valid = await bcrypt.compare(password, user.password_hash)
      if (!valid) {
        res.status(401).json({ error: 'Credenciales inválidas' })
        return
      }

      // Generar JWT
      const token = jwt.sign(
        { userId: user.id, email: user.email },
        config.JWT_SECRET,
        { expiresIn: config.JWT_EXPIRATION }
      )

      res.status(200).json({
        token,
        user: {
          id: user.id,
          email: user.email,
          hasPAT: !!user.pat_encrypted,
        },
      })
    } catch (err) {
      console.error('[auth/login] Error:', (err as Error).message)
      res.status(500).json({ error: 'Error interno al iniciar sesión' })
    }
  }
)

/**
 * GET /api/auth/me
 * Devuelve los datos del usuario autenticado.
 */
router.get('/me', requireAuth, (req: Request, res: Response) => {
  try {
    const user = getUserById(req.user!.userId)
    if (!user) {
      res.status(404).json({ error: 'Usuario no encontrado' })
      return
    }

    res.json({
      id: user.id,
      email: user.email,
      hasPAT: !!user.pat_encrypted,
    })
  } catch (err) {
    console.error('[auth/me] Error:', (err as Error).message)
    res.status(500).json({ error: 'Error interno' })
  }
})

/**
 * PUT /api/auth/password
 * Cambia la contraseña del usuario autenticado.
 */
router.put('/password', requireAuth, async (req: Request, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body

    if (!newPassword || newPassword.length < 8) {
      res.status(400).json({ error: 'La nueva contraseña debe tener al menos 8 caracteres' })
      return
    }

    const user = getUserById(req.user!.userId)
    if (!user) {
      res.status(404).json({ error: 'Usuario no encontrado' })
      return
    }

    const valid = await bcrypt.compare(currentPassword, user.password_hash)
    if (!valid) {
      res.status(401).json({ error: 'Contraseña actual incorrecta' })
      return
    }

    const newHash = await bcrypt.hash(newPassword, 10)
    getDB().prepare("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?").run(newHash, user.id)

    res.json({ ok: true, message: 'Contraseña actualizada' })
  } catch (err) {
    console.error('[auth/password] Error:', (err as Error).message)
    res.status(500).json({ error: 'Error al cambiar la contraseña' })
  }
})

/**
 * GET /api/auth/pat-status
 * Verifica si el PAT actual del usuario sigue funcionando contra ADO.
 * Se usa después del login para decidir si mostrar el board o pedir PAT.
 */
router.get('/pat-status', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId
    const user = getUserById(userId)
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' })

    // Sin PAT en la DB
    if (!user.pat_encrypted || !user.pat_iv) {
      return res.json({ valid: false, reason: 'NO_PAT', message: 'No tenés una API Key configurada.' })
    }

    // Desencriptar y verificar contra ADO
    try {
      const pat = decryptPAT(user.pat_encrypted, user.pat_iv)
      const adoUrl = `https://dev.azure.com/${config.ADO_ORG}/_apis/projects?api-version=7.0`
      const auth = Buffer.from(`:${pat}`).toString('base64')
      const adoRes = await fetch(adoUrl, {
        headers: { Authorization: `Basic ${auth}`, Accept: 'application/json' },
        signal: AbortSignal.timeout(10_000)
      })

      if (adoRes.status === 401 || adoRes.status === 302 || adoRes.status === 203) {
        return res.json({ valid: false, reason: 'INVALID', message: 'Tu API Key está vencida o no tiene los permisos necesarios.' })
      }

      const ct = adoRes.headers.get('content-type') || ''
      if (!ct.includes('application/json')) {
        return res.json({ valid: false, reason: 'INVALID', message: 'Tu API Key está vencida o no tiene los permisos necesarios.' })
      }

      if (!adoRes.ok) {
        return res.json({ valid: false, reason: 'INVALID', message: 'Tu API Key está vencida o no tiene los permisos necesarios.' })
      }

      res.json({ valid: true })
    } catch {
      return res.json({ valid: false, reason: 'INVALID', message: 'Tu API Key está vencida o no tiene los permisos necesarios.' })
    }
  } catch (err) {
    console.error('[auth/pat-status] Error:', (err as Error).message)
    res.status(500).json({ error: 'Error al verificar el estado de la API Key' })
  }
})

/**
 * PUT /api/auth/pat
 * Actualiza el PAT del usuario. Primero verifica contra ADO que sea válido.
 */
router.put('/pat', requireAuth, async (req: Request, res: Response) => {
  try {
    const { pat } = req.body
    if (!pat || pat.length < 30) {
      return res.status(400).json({ error: 'API Key inválida — debe tener al menos 30 caracteres' })
    }

    const userId = req.user!.userId
    const user = getUserById(userId)
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' })

    // ── Verificar que el PAT funciona contra ADO ──
    try {
      const adoUrl = `https://dev.azure.com/${config.ADO_ORG}/_apis/projects?api-version=7.0`
      const auth = Buffer.from(`:${pat}`).toString('base64')
      const adoRes = await fetch(adoUrl, {
        headers: { Authorization: `Basic ${auth}`, Accept: 'application/json' },
        signal: AbortSignal.timeout(10_000)
      })

      if (adoRes.status === 401 || adoRes.status === 302 || adoRes.status === 203) {
        return res.status(400).json({ error: 'Tu API Key está vencida o no tiene los permisos necesarios. Generá una nueva en dev.azure.com → User Settings → Personal Access Tokens.' })
      }

      // Si ADO devuelve HTML (login page) en vez de JSON, el PAT no funciona
      const ct = adoRes.headers.get('content-type') || ''
      if (!ct.includes('application/json')) {
        return res.status(400).json({ error: 'Tu API Key está vencida o no tiene los permisos necesarios. Verificá que tenga los 3 scopes requeridos.' })
      }

      if (!adoRes.ok) {
        return res.status(400).json({ error: 'Tu API Key está vencida o no tiene los permisos necesarios. Verificá que tenga los 3 scopes requeridos.' })
      }
    } catch (err) {
      if ((err as Error).name === 'TimeoutError') {
        return res.status(504).json({ error: 'No se pudo verificar la API Key — Azure DevOps no respondió. Reintentá.' })
      }
      return res.status(502).json({ error: 'No se pudo conectar con Azure DevOps para verificar la API Key. Revisá tu conexión.' })
    }

    // ── Encriptar y guardar ──
    const { encrypted, iv } = encryptPAT(pat)
    getDB().prepare("UPDATE users SET pat_encrypted = ?, pat_iv = ?, updated_at = datetime('now') WHERE id = ?").run(encrypted, iv, userId)

    res.json({ ok: true, message: 'API Key actualizada y verificada correctamente' })
  } catch (err) {
    console.error('[auth/pat] Error:', (err as Error).message)
    res.status(500).json({ error: 'Error al actualizar la API Key' })
  }
})

export default router

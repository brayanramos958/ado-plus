import express, { type Request, type Response, type NextFunction } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { config, validateConfig } from './config'
import { initDB } from './db'
import { authLimiter } from './auth/rateLimiter'
import authRouter from './routes/auth'
import workitemsRouter from './routes/workitems'
import wiqlRouter from './routes/wiql'
import iterationsRouter from './routes/iterations'
import membersRouter from './routes/members'

const app = express()

app.use(helmet())
app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:3000'] }))
app.use(express.json({ limit: '15mb' }))

// Rate limiting en rutas de auth
app.use('/api/auth', authLimiter)
app.use('/api/auth', authRouter)

app.use('/api/workitems', workitemsRouter)
app.use('/api/wiql', wiqlRouter)
app.use('/api/iterations', iterationsRouter)
app.use('/api/members', membersRouter)

app.get('/api/health', (_req, res) => {
  try {
    validateConfig()
    res.json({ status: 'ok', org: config.ADO_ORG, project: config.ADO_PROJECT_NAME })
  } catch (err) {
    res.status(500).json({ status: 'error', error: (err as Error).message })
  }
})

// ── Global error handler (captura errores async no manejados en rutas) ──
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[backend] Unhandled error:', err.message)
  res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Error interno del servidor' })
})

if (require.main === module) {
  try {
    validateConfig()
    initDB()
  } catch (err) {
    console.error(`[backend] Error de configuración: ${(err as Error).message}`)
    console.error('[backend] Verifica que backend/.env contenga PAT_TOKEN y las variables requeridas.')
    process.exit(1)
  }

  app.listen(config.PORT, () => {
    console.log(`[backend] corriendo en http://localhost:${config.PORT}`)
    console.log(`[backend] org: ${config.ADO_ORG} | proyecto: ${config.ADO_PROJECT_NAME}`)
  })
}

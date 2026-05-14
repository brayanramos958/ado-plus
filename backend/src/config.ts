import dotenv from 'dotenv'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
dotenv.config()

const required = (key: string): string => {
  const val = process.env[key]
  if (!val) throw new Error(`Missing required env var: ${key}`)
  return val
}

/**
 * Genera y persiste en .env una variable si no existe.
 * Retorna el valor (existente o recién generado).
 */
function ensureEnvVar(key: string, generator: () => string): string {
  const existing = process.env[key]
  if (existing) return existing

  const value = generator()
  const envPath = path.resolve(__dirname, '..', '.env')
  const line = `\n${key}=${value}\n`

  try {
    fs.appendFileSync(envPath, line, 'utf-8')
    console.warn(`[config] ⚠️  ${key} no estaba en .env — generado y guardado automáticamente.`)
    // También lo seteamos en process.env para uso inmediato
    process.env[key] = value
  } catch (err) {
    console.error(`[config] ❌ No se pudo escribir ${key} en .env:`, (err as Error).message)
    console.warn(`[config] ⚠️  ${key} generado pero NO persistido. Agregalo manualmente:`)
    console.warn(`[config]    ${key}=${value}`)
    process.env[key] = value
  }

  return value
}

export const config = {
  _patToken: process.env.PAT_TOKEN,
  ADO_ORG: process.env.ADO_ORG ?? 'itsinfocom',
  ADO_PROJECT: process.env.ADO_PROJECT ?? 'DESARROLLO%20TECNOLOGICO',
  ADO_PROJECT_NAME: process.env.ADO_PROJECT_NAME ?? 'DESARROLLO TECNOLOGICO',
  ADO_TEAM: process.env.ADO_TEAM ?? 'DESARROLLO%20TECNOLOGICO%20Team',
  ADO_TEAM_ID: process.env.ADO_TEAM_ID ?? '3d8bbe19-d49c-41c4-9fc1-dc810bdef2d3',
  API_VERSION: '7.0',
  PORT: parseInt(process.env.PORT ?? '3001', 10),

  // Seguridad — auto-generados si no existen en .env
  JWT_SECRET: ensureEnvVar('JWT_SECRET', () => crypto.randomBytes(32).toString('hex')),
  ENCRYPTION_KEY: ensureEnvVar('ENCRYPTION_KEY', () => crypto.randomBytes(32).toString('hex').slice(0, 32)),
  JWT_EXPIRATION: 36_000, // 10 horas en segundos
  EMAIL_DOMAIN: '@itsinfocom.com',
}

/**
 * Valida que el PAT global exista (solo se usa como fallback si el usuario no tiene PAT propio).
 * Si no está, muestra warning pero NO tira error — la app puede funcionar solo con PATs de usuarios.
 */
export function validateConfig(): void {
  if (!process.env.PAT_TOKEN) {
    console.warn('[config] ⚠️  PAT_TOKEN no configurado. El proxy usará únicamente los PAT de los usuarios registrados. Si un usuario no tiene PAT propio, las llamadas a ADO fallarán.')
  }
  config._patToken = process.env.PAT_TOKEN
}

/** Obtiene el PAT global. Retorna undefined si no está configurado. */
export function getPATToken(): string | undefined {
  return config._patToken
}

export function getAuthHeader(): string {
  const token = getPATToken()
  if (!token) throw new Error('PAT_TOKEN no configurado y el usuario no tiene PAT propio')
  return `Basic ${Buffer.from(`:${token}`).toString('base64')}`
}

export const ADO_BASE = `https://dev.azure.com/${config.ADO_ORG}`
// PROJECT_PATH solo es el proyecto (para rutas que YA incluyen el proyecto al inicio)
export const PROJECT_PATH = `/${config.ADO_PROJECT}`
export const TEAM_PATH = `/${config.ADO_PROJECT}/${config.ADO_TEAM}`

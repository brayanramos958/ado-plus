import dotenv from 'dotenv'
dotenv.config()

const required = (key: string): string => {
  const val = process.env[key]
  if (!val) throw new Error(`Missing required env var: ${key}`)
  return val
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
}

/**
 * Valida que todas las variables requeridas estén presentes.
 * Se llama en startup y en /api/health, no en import time.
 */
export function validateConfig(): void {
  config._patToken = required('PAT_TOKEN')
}

/** Obtiene el PAT validado. Lanza si validateConfig() no fue llamado antes. */
export function getPATToken(): string {
  if (!config._patToken) {
    throw new Error('PAT_TOKEN no configurado. validateConfig() debe llamarse antes de usar getPATToken()')
  }
  return config._patToken
}

export function getAuthHeader(): string {
  return `Basic ${Buffer.from(`:${getPATToken()}`).toString('base64')}`
}

export const ADO_BASE = `https://dev.azure.com/${config.ADO_ORG}`
// PROJECT_PATH solo es el proyecto (para rutas que YA incluyen el proyecto al inicio)
export const PROJECT_PATH = `/${config.ADO_PROJECT}`
export const TEAM_PATH = `/${config.ADO_PROJECT}/${config.ADO_TEAM}`

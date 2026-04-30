import dotenv from 'dotenv'
dotenv.config()

const required = (key: string): string => {
  const val = process.env[key]
  if (!val) throw new Error(`Missing required env var: ${key}`)
  return val
}

export const config = {
  PAT_TOKEN: required('PAT_TOKEN'),
  ADO_ORG: process.env.ADO_ORG ?? 'itsinfocom',
  ADO_PROJECT: process.env.ADO_PROJECT ?? 'DESARROLLO%20TECNOLOGICO',
  ADO_PROJECT_NAME: process.env.ADO_PROJECT_NAME ?? 'DESARROLLO TECNOLOGICO',
  ADO_TEAM: process.env.ADO_TEAM ?? 'DESARROLLO%20TECNOLOGICO%20Team',
  ADO_TEAM_ID: process.env.ADO_TEAM_ID ?? '3d8bbe19-d49c-41c4-9fc1-dc810bdef2d3',
  API_VERSION: '7.0',
  PORT: parseInt(process.env.PORT ?? '3001', 10),
}

export const AUTH_HEADER = `Basic ${Buffer.from(`:${config.PAT_TOKEN}`).toString('base64')}`
export const ADO_BASE = `https://dev.azure.com/${config.ADO_ORG}`
// PROJECT_PATH solo es el proyecto (para rutas que YA incluyen el proyecto al inicio)
export const PROJECT_PATH = `/${config.ADO_PROJECT}`
export const TEAM_PATH = `/${config.ADO_PROJECT}/${config.ADO_TEAM}`

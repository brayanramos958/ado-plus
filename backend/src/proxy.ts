import { getAuthHeader, getPATToken, ADO_BASE, PROJECT_PATH, config } from './config'

function buildBasicAuth(pat: string): string {
  return `Basic ${Buffer.from(`:${pat}`).toString('base64')}`
}

interface ProxyOptions {
  method?: string
  body?: unknown
  contentType?: string
  /** Si se provee, se usa este PAT para autenticación en vez del global. */
  patToken?: string
}

const FETCH_TIMEOUT_MS = 30_000 // 30 segundos

export async function adoFetch(
  path: string,
  options: ProxyOptions = {}
): Promise<{ status: number; data: unknown }> {
  const { method = 'GET', body, contentType = 'application/json', patToken } = options

  const cleanPath = path.startsWith('/') ? path : `${PROJECT_PATH}${path}`
  
  const hasVersion = cleanPath.includes('api-version=')
  const url = hasVersion
    ? `${ADO_BASE}${cleanPath}`
    : `${ADO_BASE}${cleanPath}${cleanPath.includes('?') ? '&' : '?'}api-version=${config.API_VERSION}`

  const authToken = patToken || getPATToken()
  if (!authToken) {
    return { status: 401, data: { error: 'NO_PAT', message: 'No hay PAT configurado. Registrate en ADO Plus con tu API Key de Azure DevOps o agregá PAT_TOKEN en backend/.env.' } }
  }

  const headers: Record<string, string> = {
    Authorization: buildBasicAuth(authToken),
    Accept: 'application/json',
  }

  if (body !== undefined) {
    headers['Content-Type'] = contentType
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (response.status === 401) {
      return { status: 401, data: { error: 'ADO_PAT_EXPIRED', message: 'El token de Azure DevOps expiró. Renovarlo en dev.azure.com → User Settings → Personal access tokens.' } }
    }

    const contentTypeHeader = response.headers.get('content-type') || ''
    const isJson = contentTypeHeader.includes('application/json')

    if (!isJson) {
      const text = await response.text()
      // ADO devolvió HTML (login page) — el PAT es inválido o expiró
      console.warn('[proxy] ADO respondió con HTML (no-JSON). Probable PAT inválido. Preview:', text.slice(0, 150))
      return {
        status: 401,
        data: {
          error: 'ADO_PAT_EXPIRED',
          message: 'El token de Azure DevOps (PAT) no es válido o expiró.\nActualizalo desde tu perfil → Actualizar PAT.',
        },
      }
    }

    const data = await response.json()
    return { status: response.status, data }
  } catch (err) {
    clearTimeout(timeoutId)

    if ((err as Error).name === 'AbortError') {
      return { status: 504, data: { error: 'ADO_TIMEOUT', message: `La solicitud a ADO excedió ${FETCH_TIMEOUT_MS / 1000}s` } }
    }

    // Error de red (DNS, conexión rechazada, etc.)
    return { status: 502, data: { error: 'ADO_NETWORK_ERROR', message: 'No se pudo conectar con Azure DevOps', detail: (err as Error).message } }
  }
}

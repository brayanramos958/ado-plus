import { getAuthHeader, ADO_BASE, PROJECT_PATH, config } from './config'

interface ProxyOptions {
  method?: string
  body?: unknown
  contentType?: string
}

const FETCH_TIMEOUT_MS = 30_000 // 30 segundos

export async function adoFetch(
  path: string,
  options: ProxyOptions = {}
): Promise<{ status: number; data: unknown }> {
  const { method = 'GET', body, contentType = 'application/json' } = options

  // Si el path ya empieza con /, es una ruta absoluta desde el base
  // Si no, asumimos que es una ruta de proyecto (agregamos PROJECT_PATH)
  const cleanPath = path.startsWith('/') ? path : `${PROJECT_PATH}${path}`
  
  const hasVersion = cleanPath.includes('api-version=')
  const url = hasVersion
    ? `${ADO_BASE}${cleanPath}`
    : `${ADO_BASE}${cleanPath}${cleanPath.includes('?') ? '&' : '?'}api-version=${config.API_VERSION}`

  const headers: Record<string, string> = {
    Authorization: getAuthHeader(),
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
    let data: unknown

    if (isJson) {
      data = await response.json()
    } else {
      const text = await response.text()
      // Si ADO devuelve HTML (error de proxy, maintenance page), no lo exponemos crudo
      data = { error: 'ADO_NON_JSON_RESPONSE', message: 'ADO devolvió una respuesta no-JSON', status: response.status, preview: text.slice(0, 200) }
    }

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

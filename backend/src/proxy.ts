import { AUTH_HEADER, ADO_BASE, PROJECT_PATH, config } from './config'

interface ProxyOptions {
  method?: string
  body?: unknown
  contentType?: string
}

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
    Authorization: AUTH_HEADER,
    Accept: 'application/json',
  }

  if (body !== undefined) {
    headers['Content-Type'] = contentType
  }

  const response = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (response.status === 401) {
    return { status: 401, data: { error: 'ADO_PAT_EXPIRED', message: 'El token de Azure DevOps expiró. Renovarlo en dev.azure.com → User Settings → Personal access tokens.' } }
  }

  const isJson = response.headers.get('content-type')?.includes('application/json')
  const data = isJson ? await response.json() : await response.text()

  return { status: response.status, data }
}

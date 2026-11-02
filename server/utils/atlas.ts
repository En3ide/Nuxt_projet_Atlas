import { createError, getHeader, getRequestURL, type H3Event } from 'h3'

export async function callAtlas<T>(
  event: H3Event,
  path: string,
  options: { method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'; body?: Record<string, unknown> } = {},
): Promise<T> {
  const method = options.method || 'GET'
  if (method !== 'GET') {
    const origin = getHeader(event, 'origin')
    if (origin && origin !== getRequestURL(event).origin) {
      throw createError({ statusCode: 403, message: 'Origine de la requête refusée.' })
    }
  }
  const config = useRuntimeConfig(event)
  if (!config.atlasApiKey) {
    throw createError({ statusCode: 503, message: 'La connexion au backend Atlas n’est pas configurée.' })
  }
  try {
    return await $fetch<T>(`${config.atlasApiBase.replace(/\/$/, '')}/${path}`, {
      method,
      body: options.body,
      headers: { 'x-atlas-api-key': config.atlasApiKey },
      timeout: 8000,
      retry: 0,
    })
  } catch (error: unknown) {
    const upstream = error as { response?: { status: number }; data?: { message?: string | string[] } }
    const status = upstream.response?.status
    if (status === 400 || status === 404) {
      const messages = upstream.data?.message
      throw createError({ statusCode: status, message: Array.isArray(messages) ? messages.join(' · ') : messages || 'Requête caméra invalide.' })
    }
    throw createError({ statusCode: 503, message: 'Le backend Atlas est indisponible. Vérifie qu’il est démarré.' })
  }
}

export function cameraId(event: H3Event): string {
  const id = getRouterParam(event, 'id') || ''
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    throw createError({ statusCode: 400, message: 'Identifiant de caméra invalide.' })
  }
  return id
}

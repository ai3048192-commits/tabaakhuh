import { parseEnvelope, ApiError } from './envelope'
import { logger } from './logger'

const BASE_URL =
  ((import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '').replace(/\/$/, '')

let unauthorizedHandler: (() => void) | null = null

/**
 * Register a callback invoked once whenever a token-bearing request comes back
 * `401`. The auth layer uses this to end a live session (FR-016). Pass `null` to
 * clear.
 */
export function setUnauthorizedHandler(fn: (() => void) | null): void {
  unauthorizedHandler = fn
}

let tokenProvider: (() => string | null) | null = null

/**
 * Register an ambient bearer-token getter (symmetric with
 * `setUnauthorizedHandler`). The auth layer injects `readToken` here so feature
 * code never threads the token by hand. Pass `null` to clear.
 */
export function setTokenProvider(fn: (() => string | null) | null): void {
  tokenProvider = fn
}

/**
 * Like {@link apiRequest} but injects the ambient session token (FR-026). When
 * no token is available it rejects with `ApiError(0, …)` and never touches the
 * network. All envelope parsing, `ApiError` semantics, and the `401 →
 * unauthorized handler` behaviour are inherited unchanged.
 */
export async function authedRequest<T>(
  path: string,
  opts: Omit<HttpOptions, 'token'> = {},
): Promise<T> {
  const token = tokenProvider?.() ?? null
  if (!token) throw new ApiError(0, 'No active session')
  return apiRequest<T>(path, { ...opts, token })
}

export interface HttpOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH'
  body?: unknown
  /** When present, sent as `Authorization: Bearer <token>`. */
  token?: string | null
  signal?: AbortSignal
}

/**
 * Single `fetch` wrapper for the backend. Prepends the configured base URL,
 * always parses the standard envelope, normalises transport failures to
 * `ApiError(0, …)`, and notifies the unauthorized handler on a `401` to an
 * authenticated request.
 */
export async function apiRequest<T>(path: string, opts: HttpOptions = {}): Promise<T> {
  const { method = 'GET', body, token, signal } = opts

  const headers: Record<string, string> = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (token) headers.Authorization = `Bearer ${token}`

  let res: Response
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    })
  } catch (err) {
    if ((err as Error | undefined)?.name === 'AbortError') throw err
    logger.warn(`network failure on ${method} ${path}`)
    throw new ApiError(0, 'Network request failed')
  }

  try {
    return await parseEnvelope<T>(res)
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.status === 401 && token) {
        logger.warn(`401 on ${method} ${path} — ending session`)
        unauthorizedHandler?.()
      } else {
        logger.warn(`${err.status} on ${method} ${path}`)
      }
    }
    throw err
  }
}

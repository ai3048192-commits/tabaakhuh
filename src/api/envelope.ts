/**
 * The standard response envelope used by every backend endpoint
 * (admin-dashboard-api.md §0), success or failure.
 */
export interface ApiEnvelope<T> {
  success: boolean
  data: T
  message: string
  errors: Record<string, string[]> | null
}

/**
 * Thrown for any non-success response. `status` is the HTTP status, or `0` for a
 * transport / parse failure (offline, DNS, non-JSON body on an otherwise-ok
 * response). `fieldErrors` carries the envelope `errors` object for 422s.
 */
export class ApiError extends Error {
  readonly status: number
  readonly fieldErrors: Record<string, string[]> | null

  constructor(
    status: number,
    message: string,
    fieldErrors: Record<string, string[]> | null = null,
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.fieldErrors = fieldErrors
  }
}

/**
 * Parse a `fetch` Response as the standard envelope.
 * Resolves with `data` on `res.ok && success === true`; throws `ApiError` otherwise.
 */
export async function parseEnvelope<T>(res: Response): Promise<T> {
  let body: unknown
  try {
    body = await res.json()
  } catch {
    // Non-JSON body: an HTTP error page, a proxy failure, or a truncated response.
    throw new ApiError(
      res.ok ? 0 : res.status,
      `Malformed or non-JSON response (${res.status})`,
    )
  }

  const env = (body ?? {}) as Partial<ApiEnvelope<T>>

  if (!res.ok || env.success !== true) {
    throw new ApiError(
      res.status,
      typeof env.message === 'string' && env.message ? env.message : `Request failed (${res.status})`,
      (env.errors as Record<string, string[]> | null | undefined) ?? null,
    )
  }

  return env.data as T
}

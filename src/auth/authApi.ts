import { apiRequest } from '../api/httpClient'
import { logger } from '../api/logger'
import type { AccountProfile } from './types'

interface LoginData {
  user: AccountProfile
  token: string
}
interface MeData {
  user: AccountProfile
}

/** `POST /auth/login`. Propagates `ApiError` (401/422 bad creds, 429 throttled, …). */
export async function login(
  identifier: string,
  password: string,
): Promise<{ account: AccountProfile; token: string }> {
  const data = await apiRequest<LoginData>('/auth/login', {
    method: 'POST',
    body: { identifier, password },
  })
  return { account: data.user, token: data.token }
}

/** `GET /auth/me`. Propagates `ApiError`. */
export async function fetchMe(token: string): Promise<AccountProfile> {
  const data = await apiRequest<MeData>('/auth/me', { token })
  return data.user
}

/**
 * `POST /auth/logout`. Best-effort: swallows every error and always resolves
 * (FR-020, FR-005). `device_token` is included only when supplied.
 */
export async function logout(token: string, deviceToken?: string): Promise<void> {
  try {
    await apiRequest<null>('/auth/logout', {
      method: 'POST',
      token,
      body: deviceToken ? { device_token: deviceToken } : undefined,
    })
  } catch (err) {
    logger.warn('logout request failed (ignored)', {
      status: err instanceof Error && 'status' in err ? (err as { status: number }).status : undefined,
    })
  }
}

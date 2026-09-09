import type { AccountProfile } from './types'

/** localStorage keys. Written and cleared as a pair. */
export const STORAGE_KEYS = {
  token: 'tbk.admin.auth.token',
  profile: 'tbk.admin.auth.profile',
} as const

export function readToken(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEYS.token)
  } catch {
    return null
  }
}

/** Cached profile snapshot; `null` if absent or corrupt. */
export function readProfile(): AccountProfile | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.profile)
    if (!raw) return null
    return JSON.parse(raw) as AccountProfile
  } catch {
    return null
  }
}

export function writeSession(token: string, profile: AccountProfile): void {
  try {
    localStorage.setItem(STORAGE_KEYS.token, token)
    localStorage.setItem(STORAGE_KEYS.profile, JSON.stringify(profile))
  } catch {
    // Storage unavailable (private mode / quota). The session simply will not
    // survive a reload; the in-memory session continues for now.
  }
}

export function clearSession(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.token)
    localStorage.removeItem(STORAGE_KEYS.profile)
  } catch {
    // ignore
  }
}

/**
 * Subscribe to cross-tab changes of the token key (FR-026). The `storage` event
 * fires only in *other* tabs of the same origin. `key === null` means another
 * tab called `localStorage.clear()`. Returns an unsubscribe function.
 */
export function subscribeExternalChange(cb: (nextToken: string | null) => void): () => void {
  const handler = (e: StorageEvent) => {
    if (e.key !== null && e.key !== STORAGE_KEYS.token) return
    cb(readToken())
  }
  window.addEventListener('storage', handler)
  return () => window.removeEventListener('storage', handler)
}

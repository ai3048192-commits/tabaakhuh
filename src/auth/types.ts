/**
 * The authenticated administrator's account, as returned in `data.user` by
 * `POST /auth/login` and `GET /auth/me` (admin-dashboard-api.md Phase 1).
 * Field names mirror the backend payload exactly.
 */
export interface AccountProfile {
  id: number
  first_name: string
  last_name: string
  email: string
  phone: string
  /** Access gate. Must be exactly `"admin"` for dashboard access (FR-005). */
  role: string
  status: string
  email_verified: boolean
  avatar_url: string | null
}

/** `"First Last"`, trimmed. */
export function displayName(a: AccountProfile): string {
  return `${a.first_name} ${a.last_name}`.trim()
}

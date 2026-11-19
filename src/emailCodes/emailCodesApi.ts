import { authedRequest } from '../api/httpClient'

export type EmailCodeKind = 'verification' | 'password_reset'
export type EmailCodeState = 'active' | 'consumed' | 'expired'

/** One row of `GET /admin/email-codes`. */
export interface EmailCode {
  id: string
  kind: EmailCodeKind
  email: string
  user_id: number | null
  user_name: string | null
  user_role: 'customer' | 'cook' | 'driver' | 'admin' | null
  /** The 6 digits — null for a code sent before the dashboard kept copies. */
  code: string | null
  state: EmailCodeState
  /** ISO 8601. */
  created_at: string
  expires_at: string
}

/** `GET /admin/email-codes?q=` — newest first, latest 100. */
export function listEmailCodes(q: string, signal?: AbortSignal): Promise<EmailCode[]> {
  const sp = new URLSearchParams()
  if (q.trim() !== '') sp.set('q', q.trim())
  const qs = sp.toString()
  return authedRequest<{ items: EmailCode[] }>(`/admin/email-codes${qs ? `?${qs}` : ''}`, { signal }).then((d) => d.items)
}

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  type ReactNode,
} from 'react'
import { authReducer, initialAuthState, type AuthNotice, type AuthStatus } from './authMachine'
import type { AccountProfile } from './types'
import * as authApi from './authApi'
import { clearSession, readToken, subscribeExternalChange, writeSession } from './authStorage'
import { setTokenProvider, setUnauthorizedHandler } from '../api/httpClient'
import { ApiError } from '../api/envelope'
import { logger } from '../api/logger'

/** The backend's role value for an administrator (FR-005). */
const ADMIN_ROLE = 'admin'

export type SignInResult =
  | { ok: true }
  | {
      ok: false
      reason: 'bad_credentials' | 'rate_limited' | 'not_permitted' | 'server_error' | 'network_error'
    }

interface AuthContextValue {
  status: AuthStatus
  account: AccountProfile | null
  notice: AuthNotice
  signIn: (identifier: string, password: string) => Promise<SignInResult>
  signOut: () => Promise<void>
  clearNotice: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, readToken() !== null, initialAuthState)

  // --- Startup restore (FR-011..FR-015, FR-014a). Re-runs whenever we (re-)enter
  //     the "checking" state, e.g. after another tab signs in (EXTERNAL_RECHECK).
  useEffect(() => {
    if (state.status !== 'checking') return
    const token = readToken()
    if (!token) {
      dispatch({ type: 'RESTORE_REJECTED' })
      return
    }

    let cancelled = false
    authApi
      .fetchMe(token)
      .then((account) => {
        if (cancelled) return
        if (account.role !== ADMIN_ROLE) {
          clearSession()
          void authApi.logout(token) // best-effort revoke (FR-015)
          dispatch({ type: 'RESTORE_FORBIDDEN' })
          return
        }
        writeSession(token, account)
        dispatch({ type: 'RESTORE_OK', account })
      })
      .catch((err: unknown) => {
        if (cancelled) return
        if (err instanceof ApiError && err.status === 401) {
          clearSession() // definitively rejected (FR-014)
          dispatch({ type: 'RESTORE_REJECTED' })
        } else {
          // 5xx / network / timeout — keep the token, retry on next startup (FR-014a)
          logger.warn('startup restore unconfirmed', {
            status: err instanceof ApiError ? err.status : undefined,
          })
          dispatch({ type: 'RESTORE_UNCONFIRMED' })
        }
      })

    return () => {
      cancelled = true
    }
  }, [state.status])

  // --- Ambient token for authed requests (002 seam) + live 401 → end session (FR-016).
  useEffect(() => {
    setTokenProvider(readToken)
    setUnauthorizedHandler(() => {
      clearSession()
      dispatch({ type: 'SESSION_LOST' })
    })
    return () => {
      setTokenProvider(null)
      setUnauthorizedHandler(null)
    }
  }, [])

  // --- Cross-tab credential change (FR-026).
  useEffect(() => {
    return subscribeExternalChange((nextToken) => {
      if (nextToken === null) {
        dispatch({ type: 'EXTERNAL_CLEAR' })
      } else {
        // Another tab signed in — possibly as a different admin. Re-verify.
        dispatch({ type: 'EXTERNAL_RECHECK' })
      }
    })
  }, [])

  const signIn = useCallback(
    async (identifier: string, password: string): Promise<SignInResult> => {
      dispatch({ type: 'CLEAR_NOTICE' })
      try {
        const { account, token } = await authApi.login(identifier, password)
        if (account.role !== ADMIN_ROLE) {
          void authApi.logout(token) // best-effort revoke; never stored (FR-005)
          dispatch({ type: 'SIGNIN_FORBIDDEN' })
          return { ok: false, reason: 'not_permitted' }
        }
        writeSession(token, account)
        dispatch({ type: 'SIGNIN_OK', account })
        return { ok: true }
      } catch (err: unknown) {
        dispatch({ type: 'SIGNIN_FAILED' })
        if (err instanceof ApiError) {
          if (err.status === 401 || err.status === 422) return { ok: false, reason: 'bad_credentials' }
          if (err.status === 429) return { ok: false, reason: 'rate_limited' }
          if (err.status === 0) return { ok: false, reason: 'network_error' }
        }
        return { ok: false, reason: 'server_error' }
      }
    },
    [],
  )

  const signOut = useCallback(async (): Promise<void> => {
    const token = readToken()
    clearSession() // local state cleared first, regardless of the request (FR-020)
    dispatch({ type: 'SIGN_OUT' })
    if (token) await authApi.logout(token) // best-effort revoke (FR-019)
  }, [])

  const clearNotice = useCallback(() => dispatch({ type: 'CLEAR_NOTICE' }), [])

  return (
    <AuthContext.Provider
      value={{
        status: state.status,
        account: state.account,
        notice: state.notice,
        signIn,
        signOut,
        clearNotice,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>')
  return ctx
}

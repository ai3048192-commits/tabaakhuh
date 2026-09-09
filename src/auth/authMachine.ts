import type { AccountProfile } from './types'

export type AuthStatus = 'checking' | 'authenticated' | 'unauthenticated'
export type AuthNotice = 'not_permitted' | null

export interface AuthState {
  status: AuthStatus
  account: AccountProfile | null
  notice: AuthNotice
}

export type AuthAction =
  // startup restore (FR-011..FR-015, FR-014a)
  | { type: 'RESTORE_OK'; account: AccountProfile }
  | { type: 'RESTORE_REJECTED' } // 401 — credential discarded elsewhere
  | { type: 'RESTORE_FORBIDDEN' } // 200 but role !== admin
  | { type: 'RESTORE_UNCONFIRMED' } // 5xx / network / timeout — token retained
  // sign-in (FR-004..FR-010)
  | { type: 'SIGNIN_OK'; account: AccountProfile }
  | { type: 'SIGNIN_FAILED' } // bad creds / rate limit / server / network — message chosen by caller
  | { type: 'SIGNIN_FORBIDDEN' } // 200 but role !== admin
  // session end
  | { type: 'SIGN_OUT' }
  | { type: 'SESSION_LOST' } // 401 on a live authenticated request (FR-016)
  | { type: 'EXTERNAL_CLEAR' } // token removed in another tab (FR-026)
  | { type: 'EXTERNAL_RECHECK' } // token changed in another tab — re-verify
  | { type: 'CLEAR_NOTICE' }

const ANON: AuthState = { status: 'unauthenticated', account: null, notice: null }

export function initialAuthState(hasToken: boolean): AuthState {
  return hasToken ? { status: 'checking', account: null, notice: null } : ANON
}

export function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'RESTORE_OK':
    case 'SIGNIN_OK':
      return { status: 'authenticated', account: action.account, notice: null }

    case 'RESTORE_REJECTED':
    case 'RESTORE_UNCONFIRMED':
    case 'SIGNIN_FAILED':
    case 'SIGN_OUT':
    case 'SESSION_LOST':
    case 'EXTERNAL_CLEAR':
      return ANON

    case 'RESTORE_FORBIDDEN':
    case 'SIGNIN_FORBIDDEN':
      return { status: 'unauthenticated', account: null, notice: 'not_permitted' }

    case 'EXTERNAL_RECHECK':
      return { status: 'checking', account: null, notice: null }

    case 'CLEAR_NOTICE':
      return state.notice === null ? state : { ...state, notice: null }

    default:
      return state
  }
}

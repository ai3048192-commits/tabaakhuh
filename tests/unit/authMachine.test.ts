import { describe, it, expect } from 'vitest'
import { authReducer, initialAuthState, type AuthState } from '../../src/auth/authMachine'
import type { AccountProfile } from '../../src/auth/types'

const account: AccountProfile = {
  id: 1,
  first_name: 'Site',
  last_name: 'Admin',
  email: 'admin@tabbakha.com',
  phone: '+201000000000',
  role: 'admin',
  status: 'active',
  email_verified: true,
  avatar_url: null,
}

const anon: AuthState = { status: 'unauthenticated', account: null, notice: null }
const authed: AuthState = { status: 'authenticated', account, notice: null }
const checking: AuthState = { status: 'checking', account: null, notice: null }

describe('initialAuthState', () => {
  it('is "checking" when a stored token exists', () => {
    expect(initialAuthState(true)).toEqual(checking)
  })
  it('is "unauthenticated" when there is no token (FR-013)', () => {
    expect(initialAuthState(false)).toEqual(anon)
  })
})

describe('authReducer — startup restore', () => {
  it('RESTORE_OK → authenticated with account', () => {
    expect(authReducer(checking, { type: 'RESTORE_OK', account })).toEqual(authed)
  })
  it('RESTORE_REJECTED → unauthenticated, no notice (FR-014)', () => {
    expect(authReducer(checking, { type: 'RESTORE_REJECTED' })).toEqual(anon)
  })
  it('RESTORE_UNCONFIRMED → unauthenticated, no notice (FR-014a)', () => {
    expect(authReducer(checking, { type: 'RESTORE_UNCONFIRMED' })).toEqual(anon)
  })
  it('RESTORE_FORBIDDEN → unauthenticated + not_permitted (FR-015)', () => {
    expect(authReducer(checking, { type: 'RESTORE_FORBIDDEN' })).toEqual({ ...anon, notice: 'not_permitted' })
  })
})

describe('authReducer — sign-in', () => {
  it('SIGNIN_OK → authenticated', () => {
    expect(authReducer(anon, { type: 'SIGNIN_OK', account })).toEqual(authed)
  })
  it('SIGNIN_FAILED → unauthenticated, no notice', () => {
    expect(authReducer(anon, { type: 'SIGNIN_FAILED' })).toEqual(anon)
  })
  it('SIGNIN_FORBIDDEN → unauthenticated + not_permitted (FR-005)', () => {
    expect(authReducer(anon, { type: 'SIGNIN_FORBIDDEN' })).toEqual({ ...anon, notice: 'not_permitted' })
  })
})

describe('authReducer — session end', () => {
  it('SIGN_OUT → unauthenticated, clears account + notice', () => {
    expect(authReducer(authed, { type: 'SIGN_OUT' })).toEqual(anon)
  })
  it('SESSION_LOST → unauthenticated from authenticated (FR-016)', () => {
    expect(authReducer(authed, { type: 'SESSION_LOST' })).toEqual(anon)
  })
  it('EXTERNAL_CLEAR → unauthenticated from authenticated (FR-026)', () => {
    expect(authReducer(authed, { type: 'EXTERNAL_CLEAR' })).toEqual(anon)
  })
  it('EXTERNAL_RECHECK → checking', () => {
    expect(authReducer(authed, { type: 'EXTERNAL_RECHECK' })).toEqual(checking)
  })
  it('CLEAR_NOTICE clears a standing notice', () => {
    const withNotice: AuthState = { status: 'unauthenticated', account: null, notice: 'not_permitted' }
    expect(authReducer(withNotice, { type: 'CLEAR_NOTICE' })).toEqual(anon)
  })
})

describe('invariants', () => {
  it('authenticated ⟺ account !== null', () => {
    const s = authReducer(checking, { type: 'RESTORE_OK', account })
    expect(s.status === 'authenticated' && s.account !== null).toBe(true)
  })
  it('notice is only ever set alongside unauthenticated', () => {
    for (const action of [{ type: 'RESTORE_FORBIDDEN' }, { type: 'SIGNIN_FORBIDDEN' }] as const) {
      const s = authReducer(checking, action)
      expect(s.notice === null || s.status === 'unauthenticated').toBe(true)
    }
  })
})

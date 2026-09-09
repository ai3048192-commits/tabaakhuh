import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  STORAGE_KEYS,
  readToken,
  readProfile,
  writeSession,
  clearSession,
  subscribeExternalChange,
} from '../../src/auth/authStorage'
import type { AccountProfile } from '../../src/auth/types'

const profile: AccountProfile = {
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

afterEach(() => localStorage.clear())

describe('authStorage', () => {
  it('writes and reads the token + profile together', () => {
    writeSession('tok-1', profile)
    expect(readToken()).toBe('tok-1')
    expect(readProfile()).toEqual(profile)
  })

  it('clearSession removes both keys', () => {
    writeSession('tok-1', profile)
    clearSession()
    expect(localStorage.getItem(STORAGE_KEYS.token)).toBeNull()
    expect(localStorage.getItem(STORAGE_KEYS.profile)).toBeNull()
    expect(readToken()).toBeNull()
    expect(readProfile()).toBeNull()
  })

  it('readProfile returns null for corrupt JSON', () => {
    localStorage.setItem(STORAGE_KEYS.profile, '{ not json')
    expect(readProfile()).toBeNull()
  })

  it('subscribeExternalChange fires for the token key and ignores unrelated keys', () => {
    const cb = vi.fn()
    const unsub = subscribeExternalChange(cb)

    window.dispatchEvent(new StorageEvent('storage', { key: 'some.other.key', newValue: 'x' }))
    expect(cb).not.toHaveBeenCalled()

    localStorage.setItem(STORAGE_KEYS.token, 'tok-2')
    window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEYS.token, newValue: 'tok-2' }))
    expect(cb).toHaveBeenCalledWith('tok-2')

    unsub()
    window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEYS.token, newValue: 'tok-3' }))
    expect(cb).toHaveBeenCalledTimes(1)
  })

  it('treats key === null (another tab called storage.clear) as a clear', () => {
    const cb = vi.fn()
    const unsub = subscribeExternalChange(cb)
    window.dispatchEvent(new StorageEvent('storage', { key: null }))
    expect(cb).toHaveBeenCalledWith(null)
    unsub()
  })
})

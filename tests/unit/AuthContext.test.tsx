import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useState } from 'react'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AuthProvider, useAuth, type SignInResult } from '../../src/auth/AuthContext'
import { apiRequest } from '../../src/api/httpClient'
import { STORAGE_KEYS, writeSession } from '../../src/auth/authStorage'
import { installFetchMock, type FetchMock } from '../helpers/fetchMock'
import { adminUser, customerUser, ok, fail } from '../helpers/fixtures'

let fm: FetchMock

beforeEach(() => {
  fm = installFetchMock()
})
afterEach(() => {
  vi.unstubAllGlobals()
  localStorage.clear()
})

/** Test consumer: surfaces the whole `useAuth()` value and captures the last `signIn` result. */
function Probe() {
  const { status, account, notice, signIn, signOut } = useAuth()
  const [result, setResult] = useState<SignInResult | null>(null)

  return (
    <div>
      <output data-testid="status">{status}</output>
      <output data-testid="account">{account ? account.email : '-'}</output>
      <output data-testid="role">{account ? account.role : '-'}</output>
      <output data-testid="notice">{notice ?? '-'}</output>
      <output data-testid="result">{result ? (result.ok ? 'ok' : result.reason) : '-'}</output>
      <button onClick={async () => setResult(await signIn('admin@tabbakha.com', 'secret123'))}>
        signin
      </button>
      <button onClick={() => void signOut()}>signout</button>
    </div>
  )
}

function renderProvider() {
  return render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  )
}

const status = () => screen.getByTestId('status').textContent
const token = () => localStorage.getItem(STORAGE_KEYS.token)
const clickSignIn = () => userEvent.setup().click(screen.getByRole('button', { name: 'signin' }))
const clickSignOut = () => userEvent.setup().click(screen.getByRole('button', { name: 'signout' }))

// ---------------------------------------------------------------------------
describe('AuthProvider — startup restore', () => {
  it('with no stored token starts "unauthenticated" and never calls /auth/me (FR-013)', async () => {
    renderProvider()
    expect(status()).toBe('unauthenticated')
    await Promise.resolve()
    expect(fm.count('GET /auth/me')).toBe(0)
  })

  it('with a valid token restores to "authenticated" and refreshes the cached profile (FR-012)', async () => {
    writeSession('tok-live', adminUser)
    fm.reply('GET /auth/me', { json: ok({ user: adminUser }) })

    renderProvider()

    await waitFor(() => expect(status()).toBe('authenticated'))
    expect(screen.getByTestId('account')).toHaveTextContent('admin@tabbakha.com')
    expect(fm.count('GET /auth/me')).toBe(1)
    expect(fm.lastCall('GET /auth/me')?.authorization).toBe('Bearer tok-live')
    expect(token()).toBe('tok-live')
    expect(localStorage.getItem(STORAGE_KEYS.profile)).toContain('admin@tabbakha.com')
  })

  it('discards the token on a 401 and stays silent (FR-014)', async () => {
    writeSession('tok-bad', adminUser)
    fm.reply('GET /auth/me', { status: 401, json: fail('Unauthenticated.') })

    renderProvider()

    await waitFor(() => expect(status()).toBe('unauthenticated'))
    expect(token()).toBeNull()
    expect(screen.getByTestId('notice')).toHaveTextContent('-')
  })

  it('retains the token on a 5xx (FR-014a)', async () => {
    writeSession('tok-keep', adminUser)
    fm.reply('GET /auth/me', { status: 500, json: fail('boom') })

    renderProvider()

    await waitFor(() => expect(status()).toBe('unauthenticated'))
    expect(token()).toBe('tok-keep')
  })

  it('retains the token on a network failure (FR-014a)', async () => {
    writeSession('tok-keep2', adminUser)
    fm.reply('GET /auth/me', { networkError: true })

    renderProvider()

    await waitFor(() => expect(status()).toBe('unauthenticated'))
    expect(token()).toBe('tok-keep2')
  })

  it('on a non-admin role: clears storage, revokes, sets the not_permitted notice (FR-015)', async () => {
    writeSession('tok-cust', customerUser)
    fm.reply('GET /auth/me', { json: ok({ user: customerUser }) })
    fm.reply('POST /auth/logout', { json: ok(null) })

    renderProvider()

    await waitFor(() => expect(screen.getByTestId('notice')).toHaveTextContent('not_permitted'))
    expect(status()).toBe('unauthenticated')
    expect(token()).toBeNull()
    await waitFor(() => expect(fm.count('POST /auth/logout')).toBe(1))
    expect(fm.lastCall('POST /auth/logout')?.authorization).toBe('Bearer tok-cust')
  })

  it('stays "checking" while /auth/me is in flight (FR-017)', async () => {
    writeSession('tok-live', adminUser)
    fm.reply('GET /auth/me', { json: ok({ user: adminUser }), delayMs: 150 })

    renderProvider()

    expect(status()).toBe('checking')
    await waitFor(() => expect(status()).toBe('authenticated'))
  })
})

// ---------------------------------------------------------------------------
describe('AuthProvider — signIn', () => {
  it('an admin login authenticates, persists the token, and sends identifier + password', async () => {
    fm.reply('POST /auth/login', { json: ok({ user: adminUser, token: 'tok-new' }) })
    renderProvider()

    await clickSignIn()

    await waitFor(() => expect(screen.getByTestId('result')).toHaveTextContent('ok'))
    expect(status()).toBe('authenticated')
    expect(token()).toBe('tok-new')
    expect(screen.getByTestId('role')).toHaveTextContent('admin')
    expect(fm.lastCall('POST /auth/login')?.body).toEqual({
      identifier: 'admin@tabbakha.com',
      password: 'secret123',
    })
  })

  it('a non-admin login is refused, stores nothing, and best-effort revokes the issued token (FR-005)', async () => {
    fm.reply('POST /auth/login', { json: ok({ user: customerUser, token: 'tok-cust' }) })
    fm.reply('POST /auth/logout', { json: ok(null) })
    renderProvider()

    await clickSignIn()

    await waitFor(() => expect(screen.getByTestId('result')).toHaveTextContent('not_permitted'))
    expect(status()).toBe('unauthenticated')
    expect(screen.getByTestId('notice')).toHaveTextContent('not_permitted')
    expect(token()).toBeNull()
    expect(localStorage.getItem(STORAGE_KEYS.profile)).toBeNull()
    await waitFor(() => expect(fm.count('POST /auth/logout')).toBe(1))
    expect(fm.lastCall('POST /auth/logout')?.authorization).toBe('Bearer tok-cust')
  })

  it.each([
    ['401', { status: 401, json: fail('Unauthenticated.') }, 'bad_credentials'],
    ['422', { status: 422, json: fail('The given data was invalid.', { identifier: ['x'] }) }, 'bad_credentials'],
    ['429', { status: 429, json: fail('Too many requests.') }, 'rate_limited'],
    ['500', { status: 500, json: fail('boom') }, 'server_error'],
  ])('maps a %s response to reason "%s" and stores nothing', async (_label, reply, reason) => {
    fm.reply('POST /auth/login', reply)
    renderProvider()

    await clickSignIn()

    await waitFor(() => expect(screen.getByTestId('result')).toHaveTextContent(reason))
    expect(status()).toBe('unauthenticated')
    expect(token()).toBeNull()
  })

  it('maps a network failure to reason "network_error"', async () => {
    fm.reply('POST /auth/login', { networkError: true })
    renderProvider()

    await clickSignIn()

    await waitFor(() => expect(screen.getByTestId('result')).toHaveTextContent('network_error'))
    expect(token()).toBeNull()
  })

  it('clears a standing not_permitted notice when a new sign-in succeeds', async () => {
    // 1) non-admin restore leaves notice = not_permitted
    writeSession('tok-cust', customerUser)
    fm.reply('GET /auth/me', { json: ok({ user: customerUser }) })
    fm.reply('POST /auth/logout', { json: ok(null) })
    renderProvider()
    await waitFor(() => expect(screen.getByTestId('notice')).toHaveTextContent('not_permitted'))

    // 2) a successful admin sign-in clears it
    fm.reply('POST /auth/login', { json: ok({ user: adminUser, token: 'tok-admin' }) })
    await clickSignIn()

    await waitFor(() => expect(status()).toBe('authenticated'))
    expect(screen.getByTestId('notice')).toHaveTextContent('-')
  })
})

// ---------------------------------------------------------------------------
describe('AuthProvider — signOut', () => {
  async function renderAuthenticated() {
    writeSession('tok-live', adminUser)
    fm.reply('GET /auth/me', { json: ok({ user: adminUser }) })
    renderProvider()
    await waitFor(() => expect(status()).toBe('authenticated'))
  }

  it('clears local state, revokes the token, and ends up unauthenticated', async () => {
    await renderAuthenticated()
    fm.reply('POST /auth/logout', { json: ok(null) })

    await clickSignOut()

    await waitFor(() => expect(status()).toBe('unauthenticated'))
    expect(token()).toBeNull()
    expect(localStorage.getItem(STORAGE_KEYS.profile)).toBeNull()
    await waitFor(() => expect(fm.count('POST /auth/logout')).toBe(1))
    expect(fm.lastCall('POST /auth/logout')?.authorization).toBe('Bearer tok-live')
  })

  it('still clears local state when the logout request fails (FR-020, SC-004)', async () => {
    await renderAuthenticated()
    fm.reply('POST /auth/logout', { status: 500, json: fail('boom') })

    await clickSignOut()

    await waitFor(() => expect(status()).toBe('unauthenticated'))
    expect(token()).toBeNull()
  })

  it('clears storage before the (delayed) logout response resolves', async () => {
    await renderAuthenticated()
    fm.reply('POST /auth/logout', { json: ok(null), delayMs: 200 })

    await clickSignOut()

    await waitFor(() => expect(token()).toBeNull())
    expect(status()).toBe('unauthenticated')
  })
})

// ---------------------------------------------------------------------------
describe('AuthProvider — live 401 (FR-016)', () => {
  it('a 401 on any token-bearing request ends the session', async () => {
    writeSession('tok-live', adminUser)
    fm.reply('GET /auth/me', { json: ok({ user: adminUser }) })
    renderProvider()
    await waitFor(() => expect(status()).toBe('authenticated'))

    fm.reply('GET /admin/orders', { status: 401, json: fail('Unauthenticated.') })
    await act(async () => {
      await apiRequest('/admin/orders', { token: 'tok-live' }).catch(() => {})
    })

    await waitFor(() => expect(status()).toBe('unauthenticated'))
    expect(token()).toBeNull()
  })
})

// ---------------------------------------------------------------------------
describe('AuthProvider — cross-tab (FR-026)', () => {
  async function renderAuthenticated() {
    writeSession('tok-live', adminUser)
    fm.reply('GET /auth/me', { json: ok({ user: adminUser }) })
    renderProvider()
    await waitFor(() => expect(status()).toBe('authenticated'))
  }

  function fireStorage(key: string | null, newValue: string | null) {
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key, newValue }))
    })
  }

  it('a token removed in another tab drops this session to unauthenticated', async () => {
    await renderAuthenticated()
    localStorage.removeItem(STORAGE_KEYS.token)
    fireStorage(STORAGE_KEYS.token, null)
    await waitFor(() => expect(status()).toBe('unauthenticated'))
  })

  it('a full storage.clear() in another tab (key === null) also ends the session', async () => {
    await renderAuthenticated()
    localStorage.clear()
    fireStorage(null, null)
    await waitFor(() => expect(status()).toBe('unauthenticated'))
  })

  it('a token replaced with a new value re-verifies against /auth/me', async () => {
    await renderAuthenticated()
    expect(fm.count('GET /auth/me')).toBe(1)

    localStorage.setItem(STORAGE_KEYS.token, 'tok-2')
    fireStorage(STORAGE_KEYS.token, 'tok-2')

    await waitFor(() => expect(status()).toBe('authenticated'))
    expect(fm.count('GET /auth/me')).toBe(2)
    expect(fm.lastCall('GET /auth/me')?.authorization).toBe('Bearer tok-2')
  })
})

// ---------------------------------------------------------------------------
describe('useAuth', () => {
  it('throws when used outside <AuthProvider>', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const swallow = (e: Event) => e.preventDefault()
    window.addEventListener('error', swallow)
    try {
      expect(() => render(<Probe />)).toThrow(/AuthProvider/)
    } finally {
      window.removeEventListener('error', swallow)
      spy.mockRestore()
    }
  })
})

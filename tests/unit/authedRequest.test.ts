import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  authedRequest,
  setTokenProvider,
  setUnauthorizedHandler,
} from '../../src/api/httpClient'
import { ApiError } from '../../src/api/envelope'
import { installFetchMock, type FetchMock } from '../helpers/fetchMock'
import { ok, fail } from '../helpers/fixtures'

let fm: FetchMock

beforeEach(() => {
  fm = installFetchMock()
})
afterEach(() => {
  vi.unstubAllGlobals()
  setTokenProvider(null)
  setUnauthorizedHandler(null)
})

describe('authedRequest (002 seam, FR-026)', () => {
  it('attaches the ambient bearer token from the provider', async () => {
    setTokenProvider(() => 'tok-xyz')
    fm.reply('GET /admin/cooks/pending', { json: ok([]) })

    await authedRequest('/admin/cooks/pending')

    expect(fm.lastCall('GET /admin/cooks/pending')?.authorization).toBe('Bearer tok-xyz')
  })

  it('throws without touching the network when there is no session', async () => {
    setTokenProvider(() => null)

    await expect(authedRequest('/admin/cooks/pending')).rejects.toBeInstanceOf(ApiError)
    expect(fm.calls).toHaveLength(0)
  })

  it('a 401 still fires the registered unauthorized handler', async () => {
    const onUnauth = vi.fn()
    setTokenProvider(() => 'tok-stale')
    setUnauthorizedHandler(onUnauth)
    fm.reply('POST /admin/cooks/5/approve', { status: 401, json: fail('Unauthenticated.') })

    await expect(
      authedRequest('/admin/cooks/5/approve', { method: 'POST' }),
    ).rejects.toMatchObject({ status: 401 })
    expect(onUnauth).toHaveBeenCalledTimes(1)
  })
})

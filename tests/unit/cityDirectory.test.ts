import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useCityNames } from '../../src/cities/useCityNames'
import { __resetCityDirectory } from '../../src/cities/citiesApi'
import { setTokenProvider, setUnauthorizedHandler } from '../../src/api/httpClient'
import { installFetchMock, type FetchMock } from '../helpers/fetchMock'
import { ok, fail, cityList } from '../helpers/fixtures'

let fm: FetchMock

beforeEach(() => {
  fm = installFetchMock()
  __resetCityDirectory()
  setTokenProvider(() => 'tok-admin')
})
afterEach(() => {
  vi.unstubAllGlobals()
  setTokenProvider(null)
  setUnauthorizedHandler(null)
  __resetCityDirectory()
})

describe('useCityNames (FR-003a)', () => {
  it('resolves a known id to its Arabic name and an unknown id to the raw string', async () => {
    fm.reply('GET /admin/cities', { json: ok(cityList()) })
    const { result } = renderHook(() => useCityNames())

    await waitFor(() => expect(result.current.ready).toBe(true))
    expect(result.current.resolve(3)).toBe('المعادي')
    expect(result.current.resolve(999)).toBe('999')
  })

  it('an inactive city still resolves to its name', async () => {
    fm.reply('GET /admin/cities', { json: ok(cityList()) })
    const { result } = renderHook(() => useCityNames())

    await waitFor(() => expect(result.current.ready).toBe(true))
    expect(result.current.resolve(2)).toBe('الجيزة')
  })

  it('a failed fetch sets failed and resolve falls back to raw ids', async () => {
    fm.reply('GET /admin/cities', { status: 500, json: fail('Something went wrong.') })
    const { result } = renderHook(() => useCityNames())

    await waitFor(() => expect(result.current.failed).toBe(true))
    expect(result.current.resolve(3)).toBe('3')
  })

  it('memoises the directory — only one request across repeated mounts', async () => {
    fm.reply('GET /admin/cities', { json: ok(cityList()) })

    const first = renderHook(() => useCityNames())
    await waitFor(() => expect(first.result.current.ready).toBe(true))
    first.unmount()
    const second = renderHook(() => useCityNames())
    await waitFor(() => expect(second.result.current.ready).toBe(true))

    expect(fm.count('GET /admin/cities')).toBe(1)
  })
})

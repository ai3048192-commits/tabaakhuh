import { describe, it, expect } from 'vitest'
import {
  filtersFromSearchParams,
  filtersToSearchParams,
  defaultFrom,
} from '../../src/orders/urlState'
import type { OrderFilters } from '../../src/orders/types'

describe('filtersFromSearchParams (FR-010, FR-036, SC-017)', () => {
  it('empty query → default view (all / null / 30-day from / null / page 1)', () => {
    const { filters, page } = filtersFromSearchParams(new URLSearchParams())
    expect(filters).toEqual({ status: 'all', cityId: null, from: defaultFrom(), to: null })
    expect(page).toBe(1)
  })

  it('round-trips a fully filtered set', () => {
    const filters: OrderFilters = {
      status: 'completed',
      cityId: 3,
      from: '2026-08-01',
      to: '2026-08-31',
    }
    const sp = filtersToSearchParams(filters, 2)
    expect(filtersFromSearchParams(sp)).toEqual({ filters, page: 2 })
  })

  it('ignores unknown params and a malformed status/city/date', () => {
    const sp = new URLSearchParams(
      'status=nope&city=abc&from=2026-13-99&to=garbage&page=xyz&foo=bar',
    )
    const { filters, page } = filtersFromSearchParams(sp)
    expect(filters).toEqual({ status: 'all', cityId: null, from: defaultFrom(), to: null })
    expect(page).toBe(1)
  })

  it('clamps non-positive page to 1', () => {
    expect(filtersFromSearchParams(new URLSearchParams('page=0')).page).toBe(1)
    expect(filtersFromSearchParams(new URLSearchParams('page=-2')).page).toBe(1)
  })
})

describe('filtersToSearchParams (defaults omitted)', () => {
  it('default view emits an empty query string', () => {
    const sp = filtersToSearchParams(
      { status: 'all', cityId: null, from: defaultFrom(), to: null },
      1,
    )
    expect(sp.toString()).toBe('')
  })

  it('a fully filtered view on page 3 emits every key', () => {
    const sp = filtersToSearchParams(
      { status: 'cancelled', cityId: 7, from: '2026-07-01', to: '2026-07-31' },
      3,
    )
    expect(sp.get('status')).toBe('cancelled')
    expect(sp.get('city')).toBe('7')
    expect(sp.get('from')).toBe('2026-07-01')
    expect(sp.get('to')).toBe('2026-07-31')
    expect(sp.get('page')).toBe('3')
  })

  it('omits from when it equals the 30-day default but keeps a non-default from', () => {
    expect(
      filtersToSearchParams({ status: 'all', cityId: null, from: defaultFrom(), to: null }, 1)
        .has('from'),
    ).toBe(false)
    expect(
      filtersToSearchParams({ status: 'all', cityId: null, from: '2026-01-01', to: null }, 1)
        .get('from'),
    ).toBe('2026-01-01')
  })
})

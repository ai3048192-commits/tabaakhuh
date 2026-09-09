import { describe, it, expect } from 'vitest'
import { buildOrdersQuery, validateDateRange } from '../../src/orders/ordersQuery'
import type { OrderFilters } from '../../src/orders/types'

const base: OrderFilters = { status: 'all', cityId: null, from: '2026-08-08', to: null }

describe('buildOrdersQuery (FR-010..FR-016)', () => {
  it('default filters + page 1 → only placed_from and page', () => {
    expect(buildOrdersQuery(base, 1)).toBe('?placed_from=2026-08-08&page=1')
  })

  it('omits status when "all", includes it (first) otherwise', () => {
    expect(buildOrdersQuery({ ...base, status: 'completed' }, 1)).toBe(
      '?status=completed&placed_from=2026-08-08&page=1',
    )
  })

  it('includes city_id only when set', () => {
    expect(buildOrdersQuery({ ...base, cityId: 3 }, 2)).toBe(
      '?city_id=3&placed_from=2026-08-08&page=2',
    )
  })

  it('includes placed_to only when set', () => {
    expect(buildOrdersQuery({ ...base, to: '2026-08-31' }, 1)).toBe(
      '?placed_from=2026-08-08&placed_to=2026-08-31&page=1',
    )
  })

  it('page is always present and last, even for page 1 with everything set', () => {
    const q = buildOrdersQuery(
      { status: 'pending_review', cityId: 3, from: '2026-09-01', to: '2026-09-06' },
      1,
    )
    expect(q).toBe(
      '?status=pending_review&city_id=3&placed_from=2026-09-01&placed_to=2026-09-06&page=1',
    )
  })

  it('a from of null omits placed_from entirely', () => {
    expect(buildOrdersQuery({ ...base, from: null }, 1)).toBe('?page=1')
  })

  it('coerces a bad page to 1', () => {
    expect(buildOrdersQuery(base, 0)).toBe('?placed_from=2026-08-08&page=1')
    expect(buildOrdersQuery(base, -3)).toBe('?placed_from=2026-08-08&page=1')
  })
})

describe('validateDateRange (FR-014)', () => {
  it('from later than to → from_after_to', () => {
    expect(validateDateRange('2026-09-10', '2026-09-01')).toEqual({ code: 'from_after_to' })
  })

  it('from === to → null', () => {
    expect(validateDateRange('2026-09-01', '2026-09-01')).toBeNull()
  })

  it('one side null → null', () => {
    expect(validateDateRange('2026-09-01', null)).toBeNull()
    expect(validateDateRange(null, '2026-09-01')).toBeNull()
    expect(validateDateRange(null, null)).toBeNull()
  })
})

import { describe, it, expect } from 'vitest'
import { normalizeOverview } from '../../src/overview/overviewModel'
import { ROLE_ORDER, STATUS_ORDER, type RawOverview } from '../../src/overview/types'
import { overview } from '../helpers/fixtures'

describe('normalizeOverview (FR-006 / FR-017 / FR-018)', () => {
  it('a full payload → all four roles and all twelve statuses in fixed order', () => {
    const snap = normalizeOverview(overview())

    expect(snap.roles.map((r) => r.role)).toEqual([...ROLE_ORDER])
    expect(snap.roles.find((r) => r.role === 'customer')?.count).toBe(1240)

    const known = snap.statuses.filter((s) => s.known)
    expect(known).toHaveLength(12)
    expect(known.map((s) => s.status)).toEqual([...STATUS_ORDER])
    expect(known.every((s) => s.known)).toBe(true)
    expect(snap.statuses.find((s) => s.status === 'completed')?.count).toBe(980)
    expect(snap.revenue).toBe(154300)
  })

  it('a missing role key becomes a zero-count row still in position', () => {
    const raw = overview({ users_by_role: { customer: 5, cook: 2, admin: 1 } })
    const snap = normalizeOverview(raw)

    expect(snap.roles.map((r) => r.role)).toEqual([...ROLE_ORDER])
    expect(snap.roles.find((r) => r.role === 'driver')).toEqual({ role: 'driver', count: 0 })
  })

  it('missing status keys become zero-count rows still in STATUS_ORDER position', () => {
    const raw = overview({ orders_by_status: { pending: 3, completed: 9 } })
    const snap = normalizeOverview(raw)

    const known = snap.statuses.filter((s) => s.known)
    expect(known).toHaveLength(12)
    expect(known.map((s) => s.status)).toEqual([...STATUS_ORDER])
    expect(known.find((s) => s.status === 'quoted')).toEqual({
      status: 'quoted',
      count: 0,
      known: true,
    })
    expect(known.find((s) => s.status === 'picked_up')?.count).toBe(0)
  })

  it('an unknown status key is appended after the twelve, flagged known:false', () => {
    const raw = overview({
      orders_by_status: { ...overview().orders_by_status, archived: 4 },
    })
    const snap = normalizeOverview(raw)

    expect(snap.statuses).toHaveLength(13)
    expect(snap.statuses[12]).toEqual({ status: 'archived', count: 4, known: false })
  })

  it('multiple unknown keys keep object-key order, after all known rows', () => {
    const raw = overview({
      orders_by_status: {
        ...overview().orders_by_status,
        archived: 4,
        disputed: 1,
      },
    })
    const snap = normalizeOverview(raw)

    expect(snap.statuses.slice(12).map((s) => s.status)).toEqual(['archived', 'disputed'])
    expect(snap.statuses.slice(12).every((s) => s.known === false)).toBe(true)
  })

  it('revenue is coerced: a numeric string parses, non-finite / negative / missing → 0', () => {
    expect(normalizeOverview(overview({ total_sales_revenue: 1533.5 as number })).revenue).toBe(1533.5)
    expect(
      normalizeOverview(overview({ total_sales_revenue: '1533.5' as unknown as number })).revenue,
    ).toBe(1533.5)
    expect(normalizeOverview(overview({ total_sales_revenue: -10 })).revenue).toBe(0)
    expect(
      normalizeOverview(overview({ total_sales_revenue: NaN as unknown as number })).revenue,
    ).toBe(0)
    expect(
      normalizeOverview(overview({ total_sales_revenue: null as unknown as number })).revenue,
    ).toBe(0)
    expect(normalizeOverview({ users_by_role: {}, orders_by_status: {} } as RawOverview).revenue).toBe(0)
  })

  it('a stray count value of null / "7" / -2 coerces to 0 / 7 / 0', () => {
    const raw = overview({
      users_by_role: {
        customer: null as unknown as number,
        cook: '7' as unknown as number,
        driver: -2,
        admin: 3,
      },
    })
    const snap = normalizeOverview(raw)
    expect(snap.roles.find((r) => r.role === 'customer')?.count).toBe(0)
    expect(snap.roles.find((r) => r.role === 'cook')?.count).toBe(7)
    expect(snap.roles.find((r) => r.role === 'driver')?.count).toBe(0)
    expect(snap.roles.find((r) => r.role === 'admin')?.count).toBe(3)
  })

  it('an empty object → all-zero snapshot with no unknown rows', () => {
    const snap = normalizeOverview({} as RawOverview)

    expect(snap.roles).toEqual([
      { role: 'customer', count: 0 },
      { role: 'cook', count: 0 },
      { role: 'driver', count: 0 },
      { role: 'admin', count: 0 },
    ])
    expect(snap.statuses).toHaveLength(12)
    expect(snap.statuses.every((s) => s.count === 0 && s.known)).toBe(true)
    expect(snap.revenue).toBe(0)
  })
})

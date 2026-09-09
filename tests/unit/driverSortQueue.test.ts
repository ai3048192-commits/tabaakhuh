import { describe, it, expect } from 'vitest'
import { sortQueue } from '../../src/drivers/sortQueue'
import { pendingDriver } from '../helpers/fixtures'

const at = (submitted_at: string, id: number) => pendingDriver({ id, submitted_at })

describe('driver sortQueue (FR-010, SC-010)', () => {
  it('orders earlier submitted_at first', () => {
    const out = sortQueue([
      at('2026-09-04T09:00:00+00:00', 1),
      at('2026-09-01T09:00:00+00:00', 2),
      at('2026-09-02T09:00:00+00:00', 3),
    ])
    expect(out.map((e) => e.id)).toEqual([2, 3, 1])
  })

  it('breaks ties by ascending id', () => {
    const ts = '2026-09-02T09:00:00+00:00'
    const out = sortQueue([at(ts, 30), at(ts, 3), at(ts, 12)])
    expect(out.map((e) => e.id)).toEqual([3, 12, 30])
  })

  it('is pure — does not mutate the input', () => {
    const input = [at('2026-09-04T09:00:00+00:00', 1), at('2026-09-01T09:00:00+00:00', 2)]
    const snapshot = input.map((e) => e.id)
    sortQueue(input)
    expect(input.map((e) => e.id)).toEqual(snapshot)
  })

  it('is idempotent on its own output', () => {
    const once = sortQueue([at('2026-09-03T00:00:00+00:00', 5), at('2026-09-01T00:00:00+00:00', 9)])
    expect(sortQueue(once).map((e) => e.id)).toEqual(once.map((e) => e.id))
  })

  it('returns an empty array unchanged', () => {
    expect(sortQueue([])).toEqual([])
  })
})

import { describe, it, expect } from 'vitest'
import { sortQueue } from '../../src/cooks/sortQueue'
import type { PendingCookEntry } from '../../src/cooks/types'
import { cookProfile, signedContract } from '../helpers/fixtures'

function entry(id: number, signedAt: string | null): PendingCookEntry {
  return {
    profile: cookProfile({ id }),
    contract: signedAt === null ? null : signedContract({ signed_at: signedAt }),
  }
}

describe('sortQueue (FR-011 — oldest first)', () => {
  it('orders signed entries by signed_at ascending', () => {
    const out = sortQueue([
      entry(1, '2026-09-05T00:00:00+00:00'),
      entry(2, '2026-09-01T00:00:00+00:00'),
      entry(3, '2026-09-03T00:00:00+00:00'),
    ])
    expect(out.map((e) => e.profile.id)).toEqual([2, 3, 1])
  })

  it('places entries with no signed contract after all signed entries', () => {
    const out = sortQueue([
      entry(1, null),
      entry(2, '2026-09-02T00:00:00+00:00'),
      entry(3, null),
    ])
    expect(out.map((e) => e.profile.id)).toEqual([2, 1, 3])
  })

  it('breaks equal signed_at ties by ascending profile id', () => {
    const at = '2026-09-02T00:00:00+00:00'
    const out = sortQueue([entry(9, at), entry(4, at), entry(7, at)])
    expect(out.map((e) => e.profile.id)).toEqual([4, 7, 9])
  })

  it('orders an all-unsigned queue by ascending id', () => {
    const out = sortQueue([entry(30, null), entry(10, null), entry(20, null)])
    expect(out.map((e) => e.profile.id)).toEqual([10, 20, 30])
  })

  it('does not mutate the input and is idempotent on its own output', () => {
    const input = [entry(2, null), entry(1, '2026-09-01T00:00:00+00:00')]
    const snapshot = input.map((e) => e.profile.id)
    const once = sortQueue(input)
    const twice = sortQueue(once)
    expect(input.map((e) => e.profile.id)).toEqual(snapshot)
    expect(twice.map((e) => e.profile.id)).toEqual(once.map((e) => e.profile.id))
  })
})

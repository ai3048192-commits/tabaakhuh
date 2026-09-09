import { describe, it, expect } from 'vitest'
import { totalPages, clampPage } from '../../src/withdrawals/pagination'

describe('totalPages (FR-014)', () => {
  it('exact multiple', () => expect(totalPages(60, 20)).toBe(3))
  it('remainder rounds up', () => expect(totalPages(61, 20)).toBe(4))
  it('total 0 → 1', () => expect(totalPages(0, 20)).toBe(1))
  it('perPage 0 → 1', () => expect(totalPages(50, 0)).toBe(1))
})

describe('clampPage (FR-015 / FR-016)', () => {
  it('below 1 → 1', () => expect(clampPage(0, 3)).toBe(1))
  it('above pages → pages', () => expect(clampPage(9, 3)).toBe(3))
  it('fractional floors', () => expect(clampPage(2.9, 5)).toBe(2))
  it('a page beyond range clamps to totalPages', () => expect(clampPage(999, 4)).toBe(4))
  it('pages 0 treated as 1', () => expect(clampPage(3, 0)).toBe(1))
})

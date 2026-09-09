import { describe, it, expect } from 'vitest'
import { filterCities } from '../../src/cities/citySearch'
import type { City } from '../../src/cities/types'

const list: City[] = [
  { id: 1, name_ar: 'القاهرة', name_en: 'Cairo', is_active: true },
  { id: 2, name_ar: 'الإسكندرية', name_en: 'Alexandria', is_active: false },
  { id: 3, name_ar: 'المعادي', name_en: 'Maadi', is_active: true },
]

describe('filterCities (FR-042 / FR-043)', () => {
  it('matches on an Arabic substring', () => {
    expect(filterCities(list, 'إسكند').map((c) => c.id)).toEqual([2])
  })

  it('matches on an English substring', () => {
    expect(filterCities(list, 'aiR').map((c) => c.id)).toEqual([1]) // case-insensitive
  })

  it('a mixed-case English term matches', () => {
    expect(filterCities(list, 'MAADI').map((c) => c.id)).toEqual([3])
  })

  it('ignores leading/trailing whitespace in the term', () => {
    expect(filterCities(list, '  Cairo  ').map((c) => c.id)).toEqual([1])
  })

  it('an empty or whitespace term returns the full list unchanged', () => {
    expect(filterCities(list, '')).toBe(list)
    expect(filterCities(list, '   ')).toBe(list)
  })

  it('a term matching nothing returns an empty array', () => {
    expect(filterCities(list, 'zzz')).toEqual([])
  })

  it('preserves input order', () => {
    expect(filterCities(list, 'a').map((c) => c.id)).toEqual([1, 2, 3])
  })
})

import { describe, it, expect } from 'vitest'
import { tenure } from '../../src/users/tenure'

const now = new Date('2026-10-05T12:00:00Z')
const ago = (days: number) => new Date(now.getTime() - days * 86_400_000).toISOString()

describe('tenure', () => {
  it.each([
    [0, 'انضم النهارده'],
    [1, 'يوم'],
    [2, 'يومين'],
    [5, '٥ أيام'],
    [20, '٢٠ يوم'],
    [31, 'شهر'],
    [65, 'شهرين'],
    [150, '٤ شهور'],
    [366, 'سنة'],
    [460, 'سنة و٣ شهور'],
    [800, 'سنتين و٢ شهور'.replace('و٢ شهور', 'وشهرين')],
  ])('%i days → %s', (d, out) => {
    expect(tenure(ago(d), now)).toBe(out)
  })

  it('handles missing or bad dates', () => {
    expect(tenure(null, now)).toBeNull()
    expect(tenure('nope', now)).toBeNull()
  })
})

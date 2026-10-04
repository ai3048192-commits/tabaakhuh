import { describe, it, expect } from 'vitest'
import { DEFAULT_LANDING_CONTENT, mergeWithDefaults } from '../../src/landing/content'
import { safeHref, toInternationalPhone } from '../../src/landing/landingApi'

describe('mergeWithDefaults', () => {
  it('returns the defaults when nothing is stored', () => {
    expect(mergeWithDefaults(DEFAULT_LANDING_CONTENT, null)).toEqual(DEFAULT_LANDING_CONTENT)
  })

  it('keeps stored values and fills every missing field from the defaults', () => {
    const merged = mergeWithDefaults(DEFAULT_LANDING_CONTENT, {
      hero: { titleLine1: 'عنوان جديد', enabled: false },
    })
    expect(merged.hero.titleLine1).toBe('عنوان جديد')
    expect(merged.hero.enabled).toBe(false)
    expect(merged.hero.description).toBe(DEFAULT_LANDING_CONTENT.hero.description)
    expect(merged.contact).toEqual(DEFAULT_LANDING_CONTENT.contact)
  })

  it('takes a stored list as-is (so deleted items stay deleted), filling missing item fields', () => {
    const merged = mergeWithDefaults(DEFAULT_LANDING_CONTENT, {
      faq: { items: [{ id: 'x', question: 'سؤال؟' }] },
    })
    expect(merged.faq.items).toHaveLength(1)
    expect(merged.faq.items[0]).toEqual({ id: 'x', question: 'سؤال؟', hint: '', answer: '' })
  })

  it('an empty stored list stays empty', () => {
    expect(mergeWithDefaults(DEFAULT_LANDING_CONTENT, { why: { dishes: [] } }).why.dishes).toEqual([])
  })

  it('ignores values of the wrong type', () => {
    const merged = mergeWithDefaults(DEFAULT_LANDING_CONTENT, { hero: { title: 5, stats: 'x', enabled: 'yes' } })
    expect(merged.hero.stats).toEqual(DEFAULT_LANDING_CONTENT.hero.stats)
    expect(merged.hero.enabled).toBe(true)
  })

  it('gives list items without an id a fresh one', () => {
    const merged = mergeWithDefaults(DEFAULT_LANDING_CONTENT, { social: { links: [{ platform: 'x', url: 'https://x.com/a' }] } })
    expect(typeof merged.social.links[0].id).toBe('string')
    expect(merged.social.links[0].platform).toBe('x')
  })
})

describe('safeHref', () => {
  it.each([
    ['#app', '#app'],
    ['/terms/', '/terms/'],
    ['https://play.google.com/store', 'https://play.google.com/store'],
    ['tel:+201000000000', 'tel:+201000000000'],
    ['mailto:a@b.co', 'mailto:a@b.co'],
  ])('allows %s', (input, out) => {
    expect(safeHref(input)).toBe(out)
  })

  it.each(['javascript:alert(1)', 'data:text/html,hi', '//evil.example', '', '   ', 'not a url'])('drops %s', (input) => {
    expect(safeHref(input)).toBeUndefined()
  })
})

describe('toInternationalPhone', () => {
  it('turns an Egyptian local number into +20', () => {
    expect(toInternationalPhone('0155 564 1619')).toBe('+201555641619')
  })
  it('keeps international numbers', () => {
    expect(toInternationalPhone('+201555641619')).toBe('+201555641619')
    expect(toInternationalPhone('00201555641619')).toBe('+201555641619')
  })
})

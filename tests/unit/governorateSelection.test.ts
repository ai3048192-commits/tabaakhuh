import { describe, it, expect } from 'vitest'
import {
  buildRows,
  initialSelection,
  planActions,
  rowMatches,
} from '../../src/cities/governorateSelection'
import { GOVERNORATES, matchKey } from '../../src/cities/governorates'
import { city } from '../helpers/fixtures'

const cairo = city({ id: 1, name_ar: 'القاهرة', name_en: 'Cairo', is_active: true })
const giza = city({ id: 2, name_ar: 'الجيزة', name_en: 'Giza', is_active: false })
const tanta = city({ id: 3, name_ar: 'طنطا', name_en: 'Tanta', is_active: true })

const keyOf = (name_en: string) => matchKey({ name_ar: '', name_en })

describe('buildRows', () => {
  it('lists every catalogue governorate, in catalogue order, with no cities at all', () => {
    const rows = buildRows([])
    expect(rows).toHaveLength(GOVERNORATES.length)
    expect(rows.map((r) => r.name_en)).toEqual(GOVERNORATES.map((g) => g.name_en))
    expect(rows.every((r) => r.city === undefined && !r.custom)).toBe(true)
  })

  it('attaches the live city to its catalogue row, matching on the English name', () => {
    const rows = buildRows([cairo, giza])
    const row = rows.find((r) => r.name_en === 'Cairo')!
    expect(row.city).toEqual(cairo)
    expect(row.custom).toBe(false)
    expect(rows.find((r) => r.name_en === 'Giza')!.city).toEqual(giza)
  })

  it('matches case- and spacing-insensitively', () => {
    const rows = buildRows([city({ id: 7, name_ar: 'كفر الشيخ', name_en: '  kafr  el   sheikh ' })])
    expect(rows.find((r) => r.name_en === 'Kafr El Sheikh')!.city?.id).toBe(7)
    expect(rows.filter((r) => r.custom)).toHaveLength(0)
  })

  it('appends a live city that is not in the catalogue, flagged as custom', () => {
    const rows = buildRows([cairo, tanta])
    expect(rows).toHaveLength(GOVERNORATES.length + 1)
    const extra = rows[rows.length - 1]
    expect(extra).toMatchObject({ name_ar: 'طنطا', custom: true })
    expect(extra.city).toEqual(tanta)
  })

  it('keeps the first of two cities sharing a name rather than hiding one behind the other', () => {
    const dupe = city({ id: 99, name_ar: 'القاهرة', name_en: 'Cairo', is_active: false })
    const rows = buildRows([cairo, dupe])
    expect(rows.find((r) => r.name_en === 'Cairo')!.city?.id).toBe(1)
    expect(rows.filter((r) => r.custom)).toHaveLength(0)
  })
})

describe('initialSelection', () => {
  it('ticks only the governorates that are live and active', () => {
    const selected = initialSelection(buildRows([cairo, giza, tanta]))
    expect(selected.has(keyOf('Cairo'))).toBe(true)
    expect(selected.has(keyOf('Tanta'))).toBe(true)
    expect(selected.has(keyOf('Giza'))).toBe(false) // live but inactive
    expect(selected.has(keyOf('Aswan'))).toBe(false) // not on the platform
    expect(selected.size).toBe(2)
  })
})

describe('planActions', () => {
  const rows = buildRows([cairo, giza, tanta])

  it('plans nothing for an untouched selection', () => {
    expect(planActions(rows, initialSelection(rows))).toEqual([])
  })

  it('creates a governorate that has never been added', () => {
    const selected = initialSelection(rows)
    selected.add(keyOf('Aswan'))
    expect(planActions(rows, selected)).toEqual([
      { op: 'create', key: keyOf('Aswan'), name_ar: 'أسوان', name_en: 'Aswan' },
    ])
  })

  it('enables a live-but-inactive governorate rather than creating it again', () => {
    const selected = initialSelection(rows)
    selected.add(keyOf('Giza'))
    expect(planActions(rows, selected)).toEqual([
      { op: 'enable', key: keyOf('Giza'), city: giza },
    ])
  })

  it('disables an un-ticked governorate and never deletes it', () => {
    const selected = initialSelection(rows)
    selected.delete(keyOf('Cairo'))
    expect(planActions(rows, selected)).toEqual([
      { op: 'disable', key: keyOf('Cairo'), city: cairo },
    ])
  })

  it('plans nothing for an un-ticked governorate that was never on the platform', () => {
    const selected = initialSelection(rows)
    selected.delete(keyOf('Aswan'))
    expect(planActions(rows, selected)).toEqual([])
  })

  it('plans several changes in row order', () => {
    const selected = initialSelection(rows)
    selected.add(keyOf('Giza'))
    selected.add(keyOf('Aswan'))
    selected.delete(keyOf('Tanta'))
    expect(planActions(rows, selected).map((a) => [a.op, a.key])).toEqual([
      ['enable', keyOf('Giza')],
      ['create', keyOf('Aswan')],
      ['disable', keyOf('Tanta')],
    ])
  })
})

describe('rowMatches', () => {
  const row = buildRows([])[0] // Cairo

  it('matches everything on a blank or whitespace term', () => {
    expect(rowMatches(row, '')).toBe(true)
    expect(rowMatches(row, '   ')).toBe(true)
  })

  it('matches on an Arabic or English substring, ignoring case', () => {
    expect(rowMatches(row, 'قاهر')).toBe(true)
    expect(rowMatches(row, 'cai')).toBe(true)
    expect(rowMatches(row, 'CAIRO')).toBe(true)
    expect(rowMatches(row, 'giza')).toBe(false)
  })
})

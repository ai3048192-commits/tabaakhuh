import { GOVERNORATES, matchKey } from './governorates'
import type { City } from './types'

/** One line in the picker: a governorate the admin can switch on or off. */
export interface GovernorateRow {
  /** Stable identity across renders and re-fetches — see `matchKey`. */
  key: string
  name_ar: string
  name_en: string
  /** The live city this row maps to, or `undefined` when never added. */
  city?: City
  /** On the platform but absent from the static catalogue (added by hand). */
  custom: boolean
}

/** One API call the picker will make when the admin saves. */
export type GovernorateAction =
  | { op: 'create'; key: string; name_ar: string; name_en: string }
  | { op: 'enable'; key: string; city: City }
  | { op: 'disable'; key: string; city: City }

/**
 * The picker's rows: every catalogue governorate in catalogue order, followed
 * by any live city that isn't in the catalogue — so a city added before this
 * screen existed is still visible and can still be switched off.
 */
export function buildRows(cities: City[]): GovernorateRow[] {
  const byKey = new Map<string, City>()
  for (const c of cities) {
    const k = matchKey(c)
    // First city wins: a duplicate name would otherwise hide the original.
    if (!byKey.has(k)) byKey.set(k, c)
  }

  const rows: GovernorateRow[] = GOVERNORATES.map((g) => {
    const key = matchKey(g)
    const city = byKey.get(key)
    return { key, name_ar: g.name_ar, name_en: g.name_en, city, custom: false }
  })

  const known = new Set(rows.map((r) => r.key))
  for (const c of cities) {
    const key = matchKey(c)
    if (known.has(key)) continue
    known.add(key)
    rows.push({ key, name_ar: c.name_ar, name_en: c.name_en, city: c, custom: true })
  }

  return rows
}

/** The keys that start out ticked: every governorate live *and* active. */
export function initialSelection(rows: GovernorateRow[]): Set<string> {
  return new Set(rows.filter((r) => r.city?.is_active).map((r) => r.key))
}

/**
 * The calls needed to make the platform match `selected`. Rows that already
 * agree with the selection produce nothing, so saving an untouched picker is a
 * no-op. Un-ticking never deletes — the API has no delete for cities (FR-026),
 * so it deactivates and the governorate stays in the list, ready to be ticked
 * again.
 */
export function planActions(
  rows: GovernorateRow[],
  selected: Set<string>,
): GovernorateAction[] {
  const plan: GovernorateAction[] = []
  for (const row of rows) {
    const wanted = selected.has(row.key)
    const current = row.city?.is_active ?? false
    if (wanted === current) continue
    if (!row.city) {
      plan.push({ op: 'create', key: row.key, name_ar: row.name_ar, name_en: row.name_en })
    } else if (wanted) {
      plan.push({ op: 'enable', key: row.key, city: row.city })
    } else {
      plan.push({ op: 'disable', key: row.key, city: row.city })
    }
  }
  return plan
}

/** Match a row against the picker's search box (Arabic or English, substring). */
export function rowMatches(row: GovernorateRow, term: string): boolean {
  const q = term.trim().toLowerCase()
  if (q === '') return true
  return (
    row.name_ar.toLowerCase().includes(q) || row.name_en.toLowerCase().includes(q)
  )
}

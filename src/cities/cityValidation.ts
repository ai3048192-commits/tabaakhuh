import { cityMessages as M } from './messages'
import type { NameErrors } from './types'

const MAX = 255

interface Values {
  name_ar: string
  name_en: string
}

/**
 * Pre-submit validation for the name form (FR-009 / FR-010 / FR-018 / FR-019).
 * `{}` means submission is allowed.
 *
 * - `add`: both names required (blank-after-trim → required).
 * - `edit`: at least one non-blank name that differs from `initial`, else a
 *   form-level "at least one name" error. `initial` is required for `edit`.
 * - both modes: a non-blank field longer than 255 raw chars → length error; a
 *   whitespace-only (non-empty) field → required.
 */
export function validateNames(
  values: Values,
  mode: 'add' | 'edit',
  initial?: Values,
): NameErrors {
  const errors: NameErrors = {}
  const ar = values.name_ar ?? ''
  const en = values.name_en ?? ''

  if (ar.trim() !== '' && ar.length > MAX) errors.name_ar = M.nameTooLong
  if (en.trim() !== '' && en.length > MAX) errors.name_en = M.nameTooLong

  if (mode === 'add') {
    if (!errors.name_ar && ar.trim() === '') errors.name_ar = M.nameRequired
    if (!errors.name_en && en.trim() === '') errors.name_en = M.nameRequired
    return errors
  }

  // edit
  if (!errors.name_ar && ar !== '' && ar.trim() === '') errors.name_ar = M.nameRequired
  if (!errors.name_en && en !== '' && en.trim() === '') errors.name_en = M.nameRequired

  const base = initial ?? { name_ar: '', name_en: '' }
  const changed =
    (ar.trim() !== '' && ar !== base.name_ar) || (en.trim() !== '' && en !== base.name_en)
  if (!errors.name_ar && !errors.name_en && !changed) errors.form = M.atLeastOneName

  return errors
}

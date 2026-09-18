/**
 * A platform city, from `GET /admin/cities` (admin-dashboard-api.md Phase 5).
 * Consumed read-only by the cook-review feature to resolve `city_id` → name.
 */
export interface City {
  id: number
  name_ar: string
  name_en: string
  is_active: boolean
}

// --- Cities management (admin-dashboard-api.md Phase 5) --------------------

/** `POST /admin/cities` body — both names required. */
export interface NewCityInput {
  name_ar: string
  name_en: string
}

/** Result of a create / edit / status-change attempt (see data-model.md §5). */
export type CityMutationOutcome =
  | { ok: true; message: string }
  | {
      ok: false
      reason: 'validation'
      fieldErrors?: { name_ar?: string; name_en?: string }
      message: string
    }
  | { ok: false; reason: 'not_found' }
  | { ok: false; reason: 'transient' }

export type CitiesStatus = 'loading' | 'ready' | 'error'

/** Per-row toggle state; absent ⇒ `idle`. */
export type RowState = 'idle' | 'submitting'

/** The one open dialog, or `null` when none (see data-model.md §7). */
export type DialogState =
  | null
  | {
      /**
       * The governorate picker — opened both by "add" and by a row's edit
       * control, which only differ by which row opens focused.
       */
      kind: 'picker'
      focusKey?: string
      busy: boolean
      /** Actions applied / total, while a save is running. */
      progress?: { done: number; total: number }
      formError?: string
    }
  | { kind: 'toggle'; city: City; busy: boolean; formError?: string }

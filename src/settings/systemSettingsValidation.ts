/**
 * Client-side validation for the non-fee System Settings fields, mirroring the
 * backend rules in `admin-dashboard-api.md` §6.2 so an obviously-bad value is
 * caught before the `PUT` (the backend's keyed `422` is still the source of
 * truth and is shown per-field when it comes back).
 */
import { settingsMessages as M } from './messages'

export type NumberField =
  | 'commission_percent'
  | 'min_order_total'
  | 'default_delivery_radius_km'

export type StringField =
  | 'store_name'
  | 'support_email'
  | 'support_phone'
  | 'logo_url'
  | 'icon_url'

export type ToggleField =
  | 'first_order_discount_enabled'
  | 'cashback_enabled'
  | 'notif_push_enabled'
  | 'notif_new_orders_enabled'
  | 'notif_sms_cooks_enabled'
  | 'notif_order_status_enabled'

/** An optional leading `-`, digits, and at most one `.<digits>` group. No exponents. */
const NUMERIC = /^-?\d+(\.\d+)?$/
// Deliberately lenient — matches the backend `email` / `url` intent without
// re-implementing their full grammar; the server rejects the true edge cases.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const URL_RE = /^https?:\/\/[^\s]+$/

interface NumberRule {
  min: number
  max?: number
  /** Empty input clears the setting (sends `null`) instead of being "required". */
  clearable?: boolean
  rangeError: string
}

const NUMBER_RULES: Record<NumberField, NumberRule> = {
  commission_percent: { min: 0, max: 100, rangeError: M.vCommissionRange },
  min_order_total: { min: 0, rangeError: M.vMinOrderRange },
  default_delivery_radius_km: { min: 1, max: 200, clearable: true, rangeError: M.vRadiusRange },
}

interface StringRule {
  max: number
  kind: 'text' | 'email' | 'url' | 'phone'
}

const STRING_RULES: Record<StringField, StringRule> = {
  store_name: { max: 255, kind: 'text' },
  support_email: { max: 255, kind: 'email' },
  support_phone: { max: 32, kind: 'phone' },
  logo_url: { max: 2048, kind: 'url' },
  icon_url: { max: 2048, kind: 'url' },
}

export interface NumberFieldResult {
  /** The value to send in the patch: a number, or `null` for a cleared clearable field. */
  value: number | null
  error: string | null
}

export function validateNumberField(field: NumberField, raw: string): NumberFieldResult {
  const trimmed = raw.trim()
  const rule = NUMBER_RULES[field]

  if (trimmed === '') {
    return rule.clearable ? { value: null, error: null } : { value: null, error: M.vRequired }
  }
  if (!NUMERIC.test(trimmed)) return { value: null, error: M.vNotNumber }

  const value = Number(trimmed)
  if (!Number.isFinite(value)) return { value: null, error: M.vNotNumber }
  if (value < rule.min || (rule.max !== undefined && value > rule.max)) {
    return { value, error: rule.rangeError }
  }
  return { value, error: null }
}

export interface StringFieldResult {
  /** Trimmed string, or `null` when empty (an empty string clears the setting). */
  value: string | null
  error: string | null
}

export function validateStringField(field: StringField, raw: string): StringFieldResult {
  const trimmed = raw.trim()
  const rule = STRING_RULES[field]

  if (trimmed === '') return { value: null, error: null }
  if (trimmed.length > rule.max) return { value: trimmed, error: M.vTooLong }
  if (rule.kind === 'email' && !EMAIL.test(trimmed)) return { value: trimmed, error: M.vEmail }
  if (rule.kind === 'url' && !URL_RE.test(trimmed)) return { value: trimmed, error: M.vUrl }
  return { value: trimmed, error: null }
}

export const NUMBER_FIELDS = Object.keys(NUMBER_RULES) as NumberField[]
export const STRING_FIELDS = Object.keys(STRING_RULES) as StringField[]
export const TOGGLE_FIELDS: ToggleField[] = [
  'first_order_discount_enabled',
  'cashback_enabled',
  'notif_push_enabled',
  'notif_new_orders_enabled',
  'notif_sms_cooks_enabled',
  'notif_order_status_enabled',
]

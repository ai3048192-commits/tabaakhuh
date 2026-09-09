# Contract — Internal UI: Platform Settings

Feature: `006-platform-settings`

Internal module boundaries for the new `src/settings/` folder, plus the two edits to existing files. Types are described, not restated verbatim — see [data-model.md](../data-model.md).

---

## `src/api/httpClient.ts` (edited — one line)

```ts
// before
method?: 'GET' | 'POST'
// after
method?: 'GET' | 'POST' | 'PUT'
```

- Additive union widening only. `apiRequest` already forwards `method` to `fetch`; no other change. Existing `'GET'`/`'POST'` callers and `tests/unit/authedRequest.test.ts` / `tests/unit/envelope.test.ts` are unaffected.
- If Phase 5 (Cities) has already widened this union (it needs `'PUT' | 'PATCH'`), Phase 6 makes **no** edit here — the merge is a superset.

---

## `src/App.tsx` (edited — route repoint)

- Remove `import Settings from './pages/Settings'`; add `import SettingsPage from './settings/SettingsPage'`.
- `<Route path="/settings" element={<Settings />} />` → `<Route path="/settings" element={<SettingsPage />} />`.
- No other route, no guard change (`/*` is already wrapped in `<RequireAdmin>`).

## `src/pages/Settings.tsx` (deleted)

Placeholder mock (hard-coded city chips, fake uploads, decorative cards, no API). Removed once the route is repointed. Not referenced anywhere else.

## `src/components/Sidebar.tsx` (unchanged)

The entry `{ name: 'إعدادات النظام', icon: Settings, path: '/settings' }` already exists and already points at the route this feature now owns. No edit. (A later cosmetic pass could rename the label to "الإعدادات".)

---

## `src/settings/settingsApi.ts` (new)

```ts
function getSettings(signal?: AbortSignal): Promise<PlatformSettings>
// GET /admin/settings → data ({ delivery_fee }). Propagates ApiError.

function updateSettings(delivery_fee: number): Promise<PlatformSettings>
// PUT /admin/settings, body { delivery_fee } (a JS number). Resolves with data on 200. Propagates ApiError.
```

- Both call `authedRequest`, never `apiRequest` directly.
- No memo / cache — the hook holds the single value for the life of the screen.
- No `404` handling — the endpoint is a singleton.

---

## `src/settings/types.ts` (new)

```ts
interface PlatformSettings { delivery_fee: number }

type FeeError = 'required' | 'not_a_number' | 'negative' | 'too_many_decimals' | null
interface FeeValidation { value: number | null; error: FeeError }

type SettingsMutationOutcome =
  | { ok: true; message: string }
  | { ok: false; reason: 'validation'; message: string }
  | { ok: false; reason: 'transient' }

type SettingsStatus = 'loading' | 'ready' | 'error'
```

---

## `src/settings/feeValidation.ts` (new — pure)

```ts
function validateFeeInput(raw: string): FeeValidation
```

- Trims `raw`. Rule order: `required` → `not_a_number` → `negative` → `too_many_decimals` → ok. See [data-model.md §3](../data-model.md) for the full table.
- Accepts an integer or a decimal with ≤ 2 fractional digits, `≥ 0`; `'0'` and `'0.00'` are valid; no upper bound.
- Rejects `''`, non-numeric text, scientific notation, a bare `-`, `'1.'`, `'.5'`, negatives, and `> 2` decimal places.
- Pure, no side effects, no message text (returns the `FeeError` tag; the caller maps it to a `messages.ts` string).

Unit tests: see [data-model.md §3](../data-model.md).

---

## `src/settings/mutationOutcome.ts` (new — pure)

```ts
function classifySettingsMutation(err: unknown | null): SettingsMutationOutcome
```

- `err == null` → `{ ok: true, message: '' }` (the caller fills the real toast text from the envelope `message` on the resolved path).
- `err instanceof ApiError`:
  - `status === 422` → `{ ok: false, reason: 'validation', message: <fieldErrors.delivery_fee[0] ?? err.message> }`
  - `status === 0` or `status >= 500` → `{ ok: false, reason: 'transient' }`
  - any other status → `{ ok: false, reason: 'transient' }`
- non-`ApiError` throw → `{ ok: false, reason: 'transient' }`

Unit tests: see [data-model.md §4](../data-model.md).

---

## `src/settings/usePlatformSettings.ts` (new — hook)

Public shape: see [data-model.md §6](../data-model.md).

```ts
interface UsePlatformSettings {
  status: SettingsStatus
  savedFee: number | null
  draft: string
  fieldError: string | null
  dirty: boolean
  canSave: boolean
  saving: boolean
  setDraft: (raw: string) => void
  reload: () => void
  save: () => Promise<SettingsMutationOutcome>
}
```

- Mount → `load()` → `getSettings()` → `savedFee`, `draft = savedFee.toFixed(2)`, `status='ready'`; on failure `status='error'`.
- `setDraft` sets the string only and recomputes `validateFeeInput(draft)` → `fieldError` (mapped from the `FeeError` tag) and `dirty`. No network.
- `save()`:
  1. `validateFeeInput(draft)`; if `error !== null` → set `fieldError`, **no request**, return `{ ok:false, reason:'validation', message }`.
  2. `saving = true` → `updateSettings(value)` → `classifySettingsMutation` → apply effect ([data-model.md §4](../data-model.md)) → `saving = false` → return the outcome.
- `reload()` re-runs `load()` for the Retry panel.
- A `401` on either call is handled by the shared `unauthorizedHandler` and never observed here.

---

## Components (new)

| Component | Key props | Responsibility |
|---|---|---|
| `SettingsPage` | — | `/settings` screen. Header (`messages.pageTitle`); renders one of: loading indicator / error panel + **Retry** / `DeliveryFeeForm`. Holds the toast state + one polite `aria-live` region (Phase 3 pattern). Maps `SettingsMutationOutcome` → toast text: `ok` → envelope `message` (fallback `messages.updatedToast`); `transient` → `messages.saveRetryToast`; `validation` → no toast (message goes under the field). RTL, Tajawal, brand `#7a0d0d`. |
| `DeliveryFeeForm` | `savedFee: number`, `draft: string`, `fieldError: string \| null`, `canSave: boolean`, `saving: boolean`, `onDraftChange(raw)`, `onSave()` | A read-only line showing the current fee via `formatFee(savedFee)` ("NN.NN ج.م"); a labelled numeric field — `<label htmlFor>`, `type="text"`, `inputMode="decimal"`, `dir="ltr"`, unit suffix "ج.م" (`aria-describedby` includes a node naming the unit); the field error node (`role`-appropriate, `aria-describedby`/`aria-invalid` wired) shown under the input when `fieldError`; a **Save** button disabled unless `canSave`, `aria-busy={saving}`, label swaps to `messages.saving` while saving. Submits on click / `Enter` (form `onSubmit` → `onSave`). **No** confirmation step. |

`formatFee(fee: number): string` — small helper (in `messages.ts` or `feeValidation.ts`): `fee.toFixed(2)` + ' ' + unit, Western digits.

---

## `src/settings/messages.ts` (new)

Arabic, RTL, provisional wording. Keys (non-exhaustive):

```
pageTitle: 'إعدادات المنصة'
subtitle: 'الإعدادات العامة للمنصة'
loading: 'جارٍ تحميل الإعدادات…'
loadError: 'حدث خطأ ما. حاول مرة أخرى.'
retry: 'إعادة المحاولة'

currentFeeLabel: 'رسوم التوصيل الحالية'
feeFieldLabel: 'رسوم التوصيل'
feeUnit: 'ج.م'
feeHint: 'المبلغ بالجنيه المصري، صفر أو أكثر.'

feeRequired: 'أدخل قيمة رسوم التوصيل.'
feeNotNumber: 'أدخل رقماً صحيحاً.'
feeNegative: 'لا يمكن أن تكون الرسوم بالسالب.'
feeTooManyDecimals: 'استخدم رقمين عشريين على الأكثر.'

save: 'حفظ'
saving: 'جارٍ الحفظ…'

updatedToast: 'تم تحديث رسوم التوصيل.'          // fallback; the envelope message is used when present
saveRetryToast: 'تعذّر حفظ التغيير. حاول مرة أخرى.'
```

---

## `tests/helpers` (extended)

- `fixtures.ts`:
  - `settings(fee = 25): PlatformSettings` → `{ delivery_fee: fee }`
  - `settingsResponse(fee = 25)` → `ok({ delivery_fee: fee })`  *(message `'OK'`)*
  - `updatedSettings(fee = 30)` → `ok({ delivery_fee: fee }, 'Delivery fee updated.')`
  - reuse `fail(...)` for the `422`, e.g. `fail('The given data was invalid.', { delivery_fee: ['يجب أن تكون القيمة صفراً أو أكثر.'] })`
- `harness.tsx`: `renderAtSettings(fm, { seedMe = true, admin = true } = {})` — mirrors `renderAtDrivers`: seeds token + profile, optional `GET /auth/me`, renders the real `SettingsPage` at `/settings` inside `<RequireAdmin>` in a `MemoryRouter` (`/login` stub route for the session-loss assertion). Pass `{ admin: false }` for the non-admin case (FR-022).

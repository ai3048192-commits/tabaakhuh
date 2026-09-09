# Phase 1 Data Model: Platform Settings

Feature: `006-platform-settings` · Date: 2026-09-07

Client-only feature. "Entities" are the in-memory shapes the dashboard holds — no database tables, no persistence. Field names mirror the backend payloads in `admin-dashboard-api.md` Phase 6.

---

## 1. PlatformSettings

The whole settings object, from `data` in `GET /admin/settings` and from the `data` of `PUT /admin/settings`. One record for the platform; read and replaced, never created or deleted from this screen.

| Field | Type | Source | Notes |
|---|---|---|---|
| `delivery_fee` | `number` | `data.delivery_fee` | Flat fee in Egyptian pounds added to every order. Non-negative; `0` allowed; no upper bound. Returned as a decimal (`25.0`, `30.0`); the client treats it as a JS `number`. |

```ts
interface PlatformSettings {
  delivery_fee: number
}
```

**Rules**
- The only mutation is `updateSettings(delivery_fee)`. Its `200` body returns the updated `PlatformSettings`; the client adopts `data.delivery_fee` as the new saved value, or — if the body is unreadable (FR-018) — adopts the value it just sent and opportunistically re-issues `GET /admin/settings`.
- There is no list, no pagination, no id. `/admin/settings` is a singleton, so there is **no `404`** outcome.
- Additional settings may be added to this object later; this feature reads and writes only `delivery_fee` and ignores unknown keys.

---

## 2. Draft input state (in-memory, `usePlatformSettings`)

The editable field is held as the **raw string the administrator typed**, not a number.

```ts
interface DraftState {
  draft: string            // exactly what is in the input
  savedFee: number | null  // the last value confirmed by the server; null until first load
}
```

| Derived value | Definition |
|---|---|
| `validation` | `validateFeeInput(draft)` — see §3 |
| `parsedValue` | `validation.value` (a `number`, or `null` when invalid/empty) |
| `dirty` | `parsedValue !== null && validation.error === null && parsedValue !== savedFee` |
| `canSave` | `dirty && !saving` |

- On a successful load: `savedFee = data.delivery_fee`; `draft = savedFee.toFixed(2)` (a stable currency-shaped seed; parses equal to `savedFee`, so `dirty` starts `false`).
- Reverting `draft` to any string that parses to `savedFee` (`"25"`, `"25.0"`, `" 25.00 "`) makes `dirty` false → Save disabled and the field error cleared (FR-016). Formatting-only differences are **not** dirty.
- `draft`, `fieldError`, and `saving` are dropped when `SettingsPage` unmounts — this is how "unsaved changes discarded on navigation" (FR-017) is met, with no blocker and no persistence.

---

## 3. FeeValidation (client field validation)

Produced by the pure `validateFeeInput` (`src/settings/feeValidation.ts`).

```ts
type FeeError = 'required' | 'not_a_number' | 'negative' | 'too_many_decimals' | null

interface FeeValidation {
  value: number | null   // the parsed amount when error === null; null otherwise
  error: FeeError
}

function validateFeeInput(raw: string): FeeValidation
```

| `raw` after `.trim()` | `error` | `value` | Message key (from `messages.ts`) |
|---|---|---|---|
| `''` | `'required'` | `null` | `feeRequired` — "أدخل قيمة رسوم التوصيل." |
| not `/^\d+(\.\d+)?$/` (e.g. `abc`, `1.2.3`, `1e3`, `1.`, `.5`, `-`) | `'not_a_number'` | `null` | `feeNotNumber` — "أدخل رقماً صحيحاً." |
| parses `< 0` (a leading `-` was present) | `'negative'` | the parsed `number` | `feeNegative` — "لا يمكن أن تكون الرسوم بالسالب." |
| valid number but `> 2` digits after `.` | `'too_many_decimals'` | the parsed `number` | `feeTooManyDecimals` — "استخدم رقمين عشريين على الأكثر." |
| otherwise (incl. `'0'`, `'0.00'`, large integers) | `null` | `Number(raw)` | — |

- Order matters: `required` → `not_a_number` → `negative` → `too_many_decimals`.
- `value` is populated even for `negative` / `too_many_decimals` so the caller *could* show the parsed number, but Save stays blocked while `error !== null`.
- No maximum is enforced (FR: only `min:0`). A very large value passes client validation; if the backend rejects it, its `422` message is shown (see §4).
- Pre-submit failures set `fieldError` and **send no request** (FR-008/FR-009/FR-010, SC-004).

Unit tests: `''`→required; `'abc'`/`'1.2.3'`/`'1e3'`/`'1.'` →not_a_number; `'-5'`→negative; `'10.005'`→too_many_decimals; `'0'`,`'0.00'`,`'10'`,`'10.5'`,`'10.50'`,`'  10.5  '`,`'1000000'`→ok.

---

## 4. SettingsMutationOutcome

Discriminated union produced by `classifySettingsMutation` (`src/settings/mutationOutcome.ts`, pure) from the API result; the page maps it to a toast and/or the field error.

```ts
type SettingsMutationOutcome =
  | { ok: true; message: string }
  | { ok: false; reason: 'validation'; message: string }
  | { ok: false; reason: 'transient' }
```

| Variant | Trigger | Hook effect | Surface |
|---|---|---|---|
| `{ ok: true, message }` | `200`; body may be unreadable | `savedFee = sentValue`; `draft = sentValue.toFixed(2)`; clear `fieldError`; opportunistic `GET /admin/settings` resync | success toast — envelope `message` ("Delivery fee updated."), fallback `messages.updatedToast` (FR-012 / FR-018 / FR-019) |
| `{ ok: false, reason: 'validation', message }` | `ApiError.status === 422` — `message` = `fieldErrors.delivery_fee[0]` if present, else `err.message` | set `fieldError = message`; `savedFee` **unchanged**; `draft` **unchanged** (value preserved) | message **under the field**; **no** toast (FR-014 / FR-020) |
| `{ ok: false, reason: 'transient' }` | `ApiError.status === 0` or `>= 500`, any other unexpected status, or a non-`ApiError` throw | nothing changes | retryable toast `messages.saveRetryToast` (FR-015 / FR-024) |

- Client pre-submit validation (§3) short-circuits **before** any request and is surfaced through the same `fieldError` channel as a server `422`, so the field shows exactly one message at a time.
- There is **no `not_found` / `404`** variant — `/admin/settings` is a singleton.
- `401` never reaches this union — handled by the Phase 1 `unauthorizedHandler` inside `apiRequest`.

Unit tests: `null`→ok; `ApiError(422,{delivery_fee:['…']})`→validation(field msg); `ApiError(422,null)`→validation(err.message); `ApiError(0)`→transient; `ApiError(500)`→transient; `ApiError(418)`→transient; `new Error('x')`→transient.

---

## 5. SettingsStatus (screen load state)

`usePlatformSettings().status: 'loading' | 'ready' | 'error'`

| Situation | status |
|---|---|
| First load in flight, nothing shown yet | `loading` — no form, no Save (FR-003) |
| `GET /admin/settings` resolved | `ready` — form rendered, pre-filled with `savedFee` |
| `GET /admin/settings` rejected | `error` — retryable "something went wrong" panel + **Retry**; **no** editable value shown (FR-004) |

- Retry re-runs `load()`; on success → `ready`.
- Unlike Phase 5 there is no "failed refresh with a list already shown" nuance — a single value has no partial state; any load failure is the screen `error` state.
- A failed **opportunistic resync** after an unreadable-body `200` (FR-018) does **not** flip `status` to `error` — the optimistically-adopted value stands until the next visit.

---

## 6. usePlatformSettings — public shape

```ts
interface UsePlatformSettings {
  status: 'loading' | 'ready' | 'error'
  savedFee: number | null
  draft: string
  fieldError: string | null      // from validateFeeInput OR a server 422; null when clean
  dirty: boolean
  canSave: boolean               // dirty && !saving
  saving: boolean

  setDraft: (raw: string) => void   // sets draft only; recomputes validation/dirty; no network
  reload: () => void                // retry a failed load
  save: () => Promise<SettingsMutationOutcome>
}
```

- `save()` runs `validateFeeInput(draft)` first; on a client error it sets `fieldError`, sends **no** request, and returns `{ ok: false, reason: 'validation', message }`.
- Otherwise it sets `saving`, calls `updateSettings(value)`, classifies the result (§4), applies the hook effect, clears `saving`, and returns the outcome so the page can drive the toast.
- A `401` on `getSettings` or `updateSettings` is handled upstream and never observed here.

---

## Data flow (one screen open)

```
mount /settings
  └─ usePlatformSettings: savedFee=null, draft='', status='loading'
        authedRequest GET /admin/settings
        → savedFee = data.delivery_fee; draft = savedFee.toFixed(2); status='ready'
        → load fails → status='error' (Retry panel, no value shown)                 (FR-004)

Retry              → reload(): GET /admin/settings again → ready on success          (FR-005)

type in field      → setDraft(raw): validation = validateFeeInput(raw)
                     invalid (required / not_a_number / negative / too_many_decimals)
                       → fieldError set; canSave=false; NO request                    (FR-008/009/010)
                     valid & parsed !== savedFee → dirty=true → canSave=true          (FR-007)
                     valid & parsed === savedFee → dirty=false → canSave=false;
                       fieldError cleared                                             (FR-016)

Save (canSave)     → saving=true (aria-busy; one PUT)                                 (FR-013)
                     authedRequest PUT /admin/settings { delivery_fee: <number> }
                     → outcome (§4):
                         200        → savedFee = sentValue; draft = sentValue.toFixed(2);
                                      success toast (envelope message); GET resync    (FR-012/018/019)
                         422        → fieldError = server msg; savedFee & draft kept; no toast   (FR-014/020)
                         0 / >=500  → nothing changes; retryable toast; value kept    (FR-015/024)
                     saving=false

navigate away w/ dirty draft → SettingsPage unmounts → draft/fieldError/saving dropped;
                               next mount reloads savedFee from server               (FR-017)
any call → 401     → Phase 1 unauthorizedHandler → clearSession → /login             (FR-021)
```

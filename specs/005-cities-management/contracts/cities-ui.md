# Contract — Internal UI: Cities Management

Feature: `005-cities-management`

Internal module boundaries for `src/cities/` (management additions) plus the one shared-component move. Types are described, not restated verbatim — see [data-model.md](../data-model.md).

---

## `src/shared/DialogShell.tsx` (moved)

`src/review/DialogShell.tsx` moves here **verbatim**; `src/review/DialogShell.tsx` becomes `export { default } from '../shared/DialogShell'`. Unchanged API:

```ts
function DialogShell(props: {
  label: string            // accessible name for role="dialog"
  onDismiss: () => void    // called on Esc and (by convention) backdrop
  children: ReactNode
}): ReactPortal
```

Behaviour (already implemented): portal to `<body>`, backdrop, `role="dialog"` + `aria-modal="true"`, `dir="rtl"`, `Esc` → `onDismiss`, lightweight Tab focus trap, focus restore to the previously focused element on unmount. `max-w-sm` box. Cook-review and driver-review keep importing it through the shim; **no cook/driver file or test changes**.

---

## `src/cities/citiesApi.ts` (extended — additive)

Existing, untouched: `fetchCityDirectory()`, `__resetCityDirectory()`, `CityDirectory`.

New exports:

```ts
function listCities(signal?: AbortSignal): Promise<City[]>
// GET /admin/cities → data (City[]) verbatim. Propagates ApiError.

function createCity(input: NewCityInput): Promise<City>
// POST /admin/cities, body { name_ar, name_en }. Resolves with data on 201. Propagates ApiError.

function updateCity(id: number, patch: CityNamePatch): Promise<City>
// PUT /admin/cities/{id}, body = only the changed name key(s). Propagates ApiError (incl. 404).

function setCityStatus(id: number, is_active: boolean): Promise<City>
// PATCH /admin/cities/{id}/status, body { is_active }. Propagates ApiError (incl. 404).
```

- All four call `authedRequest`, never `apiRequest`.
- None of them touch or read the `fetchCityDirectory` memo. Invalidation is the hook's job (see below).
- `__resetCityDirectory()`'s doc-comment is updated to note it is also the production invalidation point (name unchanged — `tests/helpers/harness.tsx` imports it).

---

## `src/cities/citySearch.ts` (new — pure)

```ts
function filterCities(list: City[], term: string): City[]
```

- `term.trim()` empty → returns `list` (same reference is fine).
- Otherwise: case-insensitive `includes` against `name_ar` **or** `name_en` (lower-case both sides; no locale-aware folding beyond `toLowerCase`).
- Pure, no side effects, stable order (preserves input order).

Unit tests: Arabic-substring match, English-substring match, mixed-case term, leading/trailing spaces in term, empty term → full list, term matching nothing → `[]`.

---

## `src/cities/cityValidation.ts` (new — pure)

```ts
function validateNames(
  values: { name_ar: string; name_en: string },
  mode: 'add' | 'edit',
  initial?: { name_ar: string; name_en: string },   // required for mode 'edit'
): NameErrors
```

Rules producing `NameErrors` (`{}` ⇒ submit allowed):

| Condition | Result |
|---|---|
| `mode: 'add'`, `name_ar` blank after trim | `name_ar: <required msg>` |
| `mode: 'add'`, `name_en` blank after trim | `name_en: <required msg>` |
| `mode: 'edit'`, both fields blank **or** both equal to `initial` | `form: <at-least-one msg>` |
| either mode, a **non-blank** field whose raw length > 255 | `<that field>: <length msg>` |
| either mode, a field that is whitespace-only (non-empty but blank after trim) | `<that field>: <required msg>` |

Messages come from `messages.ts` (the pure module takes them as constants or returns keys — implementer's choice, keep it dependency-free).

Unit tests: add both-required, add one-missing, edit neither-changed → `form`, edit one-changed → `{}`, 255 exactly → ok, 256 → length error, `"   "` → required error.

---

## `src/cities/mutationOutcome.ts` (new — pure)

```ts
function classifyMutation(err: unknown | null): CityMutationOutcome
```

- `err == null` → `{ ok: true, message: '' }` (the caller supplies the real envelope message from the resolved `City`/response path; or pass the message in — implementer's choice, keep pure).
- `err instanceof ApiError`:
  - `status === 422` and `err.fieldErrors` has a non-empty `name_ar` / `name_en` → `{ ok:false, reason:'validation', fieldErrors: { name_ar?, name_en? }, message: err.message }`
  - `status === 422` otherwise → `{ ok:false, reason:'validation', message: err.message }` (form-level)
  - `status === 404` → `{ ok:false, reason:'not_found' }`
  - `status === 0` or `status >= 500` → `{ ok:false, reason:'transient' }`
  - anything else (unexpected 4xx) → `{ ok:false, reason:'transient' }`
- non-`ApiError` throw → `{ ok:false, reason:'transient' }`

Unit tests: each branch above, plus a `422` whose `errors` map has only an unrelated key → form-level.

---

## `src/cities/useCitiesManagement.ts` (new — hook)

```ts
interface UseCitiesManagement {
  status: 'loading' | 'ready' | 'error'
  cities: City[]            // visibleCities = filterCities(allCities, search)
  totalCount: number        // allCities.length (for "showing X of Y" / announcements)
  search: string
  noCities: boolean         // status==='ready' && allCities.length === 0
  noMatch: boolean          // status==='ready' && allCities.length>0 && cities.length===0
  dialog: DialogState
  rowState: (id: number) => 'idle' | 'submitting'

  refresh: () => void
  setSearch: (term: string) => void
  openAdd: () => void
  openEdit: (city: City) => void
  openToggle: (city: City) => void
  closeDialog: () => void

  create: (input: NewCityInput) => Promise<CityMutationOutcome>
  update: (id: number, patch: CityNamePatch) => Promise<CityMutationOutcome>
  toggleStatus: (city: City) => Promise<CityMutationOutcome>
}
```

- On mount: `load()` → `listCities()` → `allCities`, `status='ready'` (or `'error'` if nothing shown).
- `create` / `update` / `toggleStatus` run `runMutation(kind, call)` → `classifyMutation` → on `ok` or `not_found`: `refresh()` + `__resetCityDirectory()`; on `validation`: set `dialog.serverErrors` and keep the dialog; on `transient`: clear busy only. They **return** the outcome so the page can drive toasts/focus.
- `setSearch` sets the string only — no network.
- A `401` on any call is handled upstream and never observed here.

---

## Components (new)

| Component | Key props | Responsibility |
|---|---|---|
| `CitiesPage` | — | `/cities` screen. Header + Refresh; `SearchBox`; renders one of loading / error+Retry / "no cities" / "no cities match" / `CitiesTable`; two polite `aria-live` regions (toast, filtered-count); mounts `CityFormDialog` / `StatusToggleDialog` from `dialog`. Maps `CityMutationOutcome` → toast text (`messages.ts`). RTL, Tajawal, brand `#7a0d0d`. |
| `SearchBox` | `value`, `onChange`, `resultCount` | Labelled text input (`<label htmlFor>`), `Search` icon, a clear (`×`) button when non-empty. No debounce. |
| `CitiesTable` | `cities`, `rowState`, `onEdit`, `onToggle` | Semantic `<table>`; `<th scope="col">` for Arabic name, English name, status, actions. One `CityRow` per city. |
| `CityRow` | `city`, `state`, `onEdit`, `onToggle` | `name_ar` (RTL cell); `name_en` in a `dir="ltr"` cell; `<CityStatusBadge>`; an Edit button (`Pencil`); a status toggle (`role="switch"` or labelled button) whose accessible name states the current state and the action; toggle disabled + progress while `state === 'submitting'`. **No delete control.** |
| `CityStatusBadge` | `active: boolean` | Arabic label ("مُفعّلة" / "معطّلة") + a shape/icon; never colour-only (FR-003 / FR-041 / SC-007). |
| `CityFormDialog` | `mode: 'add' \| 'edit'`, `initialValues?`, `serverErrors`, `busy`, `onSubmit(values|patch)`, `onCancel` | On `src/shared/DialogShell`. Two labelled fields (`maxLength=255`, RTL/LTR `dir`). Live `validateNames` → disables submit + shows field/form messages. Merges `serverErrors`; clears a field's error on edit. Stays mounted with values on `422`/transient. First field auto-focused. `add` emits `NewCityInput`; `edit` emits a `CityNamePatch` of only-changed keys. |
| `StatusToggleDialog` | `city`, `nextActive: boolean`, `busy`, `onConfirm`, `onCancel` | On `src/shared/DialogShell`. Confirm-only; activate vs deactivate copy from `messages.ts`; Confirm auto-focused; `Esc`/Cancel/backdrop send nothing (FR-027). |

---

## `src/cities/messages.ts` (new)

Arabic, RTL, provisional wording. Keys (non-exhaustive):

```
pageTitle: 'إدارة المدن'
subtitle: (n) => `${n} مدينة`
loading, listError, retry, refresh
emptyNoCities: 'لا توجد مدن بعد.'
emptyNoMatch: 'لا توجد مدن مطابقة لبحثك.'
searchLabel: 'ابحث باسم المدينة'
searchClear: 'مسح البحث'
colNameAr: 'الاسم بالعربية'
colNameEn: 'الاسم بالإنجليزية'
colStatus: 'الحالة'
colActions: 'إجراءات'
statusActive: 'مُفعّلة'
statusInactive: 'معطّلة'
addCity: 'إضافة مدينة'
editCity: 'تعديل اسم المدينة'
fieldNameAr: 'الاسم بالعربية'
fieldNameEn: 'الاسم بالإنجليزية'
nameRequired: 'هذا الحقل مطلوب.'
nameTooLong: 'الحد الأقصى 255 حرفاً.'
atLeastOneName: 'أدخل الاسم بالعربية أو بالإنجليزية على الأقل.'
nameDuplicateFallback: 'اسم المدينة مستخدم بالفعل.'
save: 'حفظ'
cancel: 'إلغاء'
editLabel: (nameAr) => `تعديل مدينة ${nameAr}`
toggleToInactiveTitle: (nameAr) => `تعطيل مدينة ${nameAr}؟`
toggleToActiveTitle: (nameAr) => `تفعيل مدينة ${nameAr}؟`
toggleToInactiveBody: 'لن تظهر هذه المدينة للعملاء حتى يُعاد تفعيلها.'
toggleToActiveBody: 'ستظهر هذه المدينة للعملاء مرة أخرى.'
confirmToggle: 'تأكيد'
rowToggleToInactive: (nameAr) => `تعطيل ${nameAr}`
rowToggleToActive: (nameAr) => `تفعيل ${nameAr}`
createdToast, updatedToast, statusUpdatedToast     // driven by envelope message, these are fallbacks
notFoundToast: 'تعذّر العثور على المدينة.'
mutationRetryToast: 'تعذّر إتمام العملية. حاول مرة أخرى.'
```

---

## `tests/helpers` (extended)

- `fixtures.ts`: `city(overrides?)` → `City` with a sequence id; `citiesResponse(cities)` → `ok(cities)`; `createdCity(overrides?)` → `ok(city({is_active:true,...}), 'City created.')`; `updatedCity(overrides?)` → `ok(city(...), 'City updated.')`; reuse the existing `cityList()` seed and `fail(msg, errors)` (e.g. `fail('The given data was invalid.', { name_ar: ['اسم المدينة مستخدم بالفعل.'] })`).
- `harness.tsx`: `renderAtCities(fm, { seedMe = true, admin = true } = {})` — mirrors `renderAtDrivers`: seeds token + profile, optional `GET /auth/me`, `__resetCityDirectory()`, renders the real `CitiesPage` at `/cities` inside `<RequireAdmin>` in a `MemoryRouter`.

# Phase 1 Data Model: Cities Management

Feature: `005-cities-management` · Date: 2026-09-07

Client-only feature. "Entities" are the in-memory shapes the dashboard holds — no database tables, no persistence. Field names mirror the backend payloads in `admin-dashboard-api.md` Phase 5.

---

## 1. City

One platform city, from each element of `data` in `GET /admin/cities` and from the `data` object of every mutation response. `City` **already exists** in `src/cities/types.ts` (read-only, consumed by the city directory); this feature reuses it unchanged.

| Field | Type | Source | Notes |
|---|---|---|---|
| `id` | `number` | `data[].id` | Targets `PUT /admin/cities/{id}` and `PATCH /admin/cities/{id}/status`. Not shown as a primary column; used internally. |
| `name_ar` | `string` | `data[].name_ar` | Arabic name, 1–255 chars. Primary display column (RTL cell). |
| `name_en` | `string` | `data[].name_en` | English name, 1–255 chars. Shown in an `dir="ltr"` cell. |
| `is_active` | `boolean` | `data[].is_active` | `true` = in service. Drives the status badge and the toggle's next value. A newly created city is `true`. |

**Rules**
- Read-only in the list. The only mutations are `createCity` / `updateCity` / `setCityStatus`; their `200`/`201` body returns the updated `City` but the client **discards it** and re-fetches the whole list (FR-006 / FR-032).
- The client does not re-order or de-duplicate `data` — the backend order is used as-is (no sort in this version).
- Name uniqueness is enforced by the backend and reported as a `422`; the client does **not** pre-check for duplicates.
- Cities are never deleted — there is no delete operation or control (FR-026).

---

## 2. Lifecycle — status only

```
        ┌──────── PATCH {is_active:false} ────────┐
        ▼                                         │
   is_active:true  ◄──── PATCH {is_active:true} ──┘  is_active:false
        ▲                                              (out of service, not deleted)
        └── created here (POST → 201, is_active:true)
```

| State | Arabic label (provisional) | Row control offered |
|---|---|---|
| `is_active: true` | مُفعّلة | "تعطيل" toggle → confirm → `PATCH {is_active:false}` |
| `is_active: false` | معطّلة | "تفعيل" toggle → confirm → `PATCH {is_active:true}` |

- Free movement both ways; no terminal state; no delete.
- The name is editable in either state, independently of `is_active`.

---

## 3. NewCityInput / CityNamePatch (request bodies)

```ts
interface NewCityInput { name_ar: string; name_en: string }        // POST /admin/cities  — both required
type CityNamePatch =                                               // PUT /admin/cities/{id} — ≥ 1 key
  | { name_ar: string; name_en?: string }
  | { name_ar?: string; name_en: string }
```

**Rules**
- `NewCityInput`: both fields present, each trimmed-non-blank and ≤ 255 chars — enforced client-side before the request (FR-009 / FR-010) and again by the backend.
- `CityNamePatch`: only the keys the administrator actually changed are sent; **at least one** must be present (FR-017 / FR-018). A field left equal to its pre-filled value is omitted. If the result would be an empty body, the client blocks submission and shows "at least one name required" — no request is sent.
- `PATCH /admin/cities/{id}/status` body is always `{ is_active: boolean }` — the client only ever sends a real boolean (FR-028 is unreachable from the UI).

---

## 4. NameErrors (client + server field errors)

```ts
interface NameErrors { name_ar?: string; name_en?: string; form?: string }
```

| Key | Set by | Meaning |
|---|---|---|
| `name_ar` / `name_en` | `validateNames` (pre-submit) **or** a `422` `errors` map | field-specific: required, whitespace-only, over 255, or "name already in use" (duplicate) |
| `form` | `validateNames` (edit, neither name supplied) **or** a `422` with no usable `errors` map | dialog-level message shown above the buttons |

- `validateNames(values, mode)` (`src/cities/cityValidation.ts`, pure) produces the pre-submit `NameErrors`; an empty object means "submit allowed".
- A `422` response's `errors` map is narrowed to just the `name_ar` / `name_en` keys and merged into `NameErrors`; anything else falls to `form` using the envelope `message`.
- Field errors are shown under the input and cleared when that field is next edited; the dialog stays open with the entered values (FR-012 / FR-021).

---

## 5. CityMutationOutcome

Discriminated union produced by `classifyMutation` (`src/cities/mutationOutcome.ts`, pure) from the API result; the page maps it to a toast and/or dialog state.

| Variant | Trigger | Effect | Surface |
|---|---|---|---|
| `{ ok: true, message }` | `201` (create) / `200` (edit, toggle); body may be unreadable | close dialog (if any) → `refresh()` → `__resetCityDirectory()` | success toast — envelope `message` verbatim (FR-011 / FR-020 / FR-028) |
| `{ ok: false, reason: 'validation', fieldErrors }` | `ApiError.status === 422` with a usable `errors` map | keep dialog open, values preserved, render `fieldErrors` under the fields | in-dialog field error(s); **no** toast, **no** re-fetch (FR-012 / FR-021) |
| `{ ok: false, reason: 'validation', message }` | `422` with no usable `errors` map | keep dialog open; render `message` as the `form` error | in-dialog form error; no re-fetch |
| `{ ok: false, reason: 'not_found' }` | `ApiError.status === 404` (edit / toggle only) | close dialog → `refresh()` → `__resetCityDirectory()` | fixed toast "تعذّر العثور على المدينة." (FR-022 / FR-030) |
| `{ ok: false, reason: 'transient' }` | `ApiError.status === 0` or `>= 500` | **no** change — dialog stays open with values / row toggle → `idle`; **no** re-fetch | fixed retryable toast "تعذّر إتمام العملية. حاول مرة أخرى." (FR-014 / FR-024 / FR-031) |

`401` never reaches this union — handled by the Phase 1 `unauthorizedHandler` inside `apiRequest`.

---

## 6. RowState (in-memory, per city id)

`Map<number, 'submitting'>` in the hook; drives one row's toggle control. Absent ⇒ `idle`.

| Value | Meaning | UI |
|---|---|---|
| `idle` | default | Edit button + status toggle enabled |
| `submitting` | a `PATCH …/status` is in flight for this row | that row's toggle disabled + progress (FR-029); other rows unaffected |

There is no per-row `error` state — a transient toggle failure returns the row to `idle` with the list unchanged and shows a retryable toast (FR-031). Edit's in-flight state lives on the dialog (`DialogState.busy`), not the row.

---

## 7. DialogState (in-memory, `useCitiesManagement`)

```ts
type DialogState =
  | null
  | { kind: 'add'; busy: boolean; serverErrors: NameErrors }
  | { kind: 'edit'; city: City; busy: boolean; serverErrors: NameErrors }
  | { kind: 'toggle'; city: City; busy: boolean }
```

- Exactly one dialog open at a time; `null` ⇒ none.
- `kind: 'edit'` carries the target `City` so the form pre-fills and the `PUT` has the id; `serverErrors` starts `{}` and is replaced from a `422`.
- `kind: 'toggle'` carries the target `City`; the next `is_active` is `!city.is_active`. `busy` mirrors that row's `RowState` for button disabling inside the dialog.
- `closeDialog()` sets `null` and clears the matching `RowState`/`serverErrors`. `DialogShell` restores focus to the control that opened it.

---

## 8. Search state (in-memory, `useCitiesManagement`)

`search: string` — the raw text in the box. Derived, not stored:

- `visibleCities = filterCities(allCities, search)` — pure; trims `search`, lower-cases both sides, keeps a city when `name_ar` **or** `name_en` includes the term; empty/whitespace term → `allCities` unchanged.
- `noCities = status === 'ready' && allCities.length === 0` → "no cities" state (FR-005).
- `noMatch = status === 'ready' && allCities.length > 0 && visibleCities.length === 0` → "no cities match your search" state (FR-043).

Search never triggers a network request and never affects which city a mutation targets (FR-042 / FR-043).

---

## 9. List-load outcome (screen status)

`useCitiesManagement().status: 'loading' | 'ready' | 'error'`

| Situation | status |
|---|---|
| First load in flight, nothing shown yet | `loading` |
| A city array is in hand | `ready` (empty array → "no cities" state, not `error`) |
| Load rejected and nothing currently shown | `error` (screen-level, with Retry) |
| Load rejected but a list is already shown (failed refresh / post-mutation re-fetch) | stays `ready`; a transient toast is shown, the existing list remains (mirrors Phases 2–3) |

---

## Data flow (one screen open)

```
mount /cities
  └─ useCitiesManagement: allCities=[], search='', status='loading'
        authedRequest GET /admin/cities
        → allCities = data (City[]); status='ready'
        → allCities.length === 0 → "no cities" state (FR-005)

type in search        → setSearch(text): visibleCities = filterCities(allCities, text)   (no network; FR-042)
                         visibleCities empty & allCities non-empty → "no match" state     (FR-043)

Add City → openAdd()  → DialogState={kind:'add',busy:false,serverErrors:{}}
  submit (validateNames add → both required, ≤255)
    → busy=true → authedRequest POST /admin/cities { name_ar, name_en }
    → outcome (§5):
        201        → close dialog → toast(msg) → refresh() → __resetCityDirectory()   (new city active in list)
        422+errors → serverErrors set → dialog stays open, values kept                (FR-012)
        0 / >=500  → toast(retry) → dialog stays open, values kept                     (FR-014)

Edit → openEdit(city) → DialogState={kind:'edit',city,busy:false,serverErrors:{}}
  submit (validateNames edit → ≥1 changed name, ≤255; empty patch blocked)
    → busy=true → authedRequest PUT /admin/cities/{city.id} { …changed names }
    → outcome (§5):
        200        → close dialog → toast(msg) → refresh() → __resetCityDirectory()
        422+errors → serverErrors set → dialog stays open                              (FR-021)
        404        → close dialog → toast("not found") → refresh() → __resetCityDirectory()  (FR-022)
        0 / >=500  → toast(retry) → dialog stays open                                  (FR-024)

Toggle → openToggle(city) → DialogState={kind:'toggle',city,busy:false}
  confirm → RowState[city.id]='submitting'; busy=true
    → authedRequest PATCH /admin/cities/{city.id}/status { is_active: !city.is_active }
    → outcome (§5):
        200        → close dialog → toast(msg) → refresh() → __resetCityDirectory()
        404        → close dialog → toast("not found") → refresh() → __resetCityDirectory()  (FR-030)
        0 / >=500  → RowState[id]→idle → toast(retry); no re-fetch                      (FR-031)
  cancel → nothing sent; dialog closes; focus restored                                 (FR-027)

refresh()             → re-GET /admin/cities; existing list kept on failure (FR-006)
unmount /cities        → allCities, search, dialog, row states all dropped
any call → 401         → Phase 1 unauthorizedHandler → clearSession → /login (FR-035)
```

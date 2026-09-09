# Contract — External API: Cities Management

Feature: `005-cities-management` · Source: `admin-dashboard-api.md` Phase 5

Every endpoint is under `/admin`, requires `Authorization: Bearer <token>` + `Accept: application/json`, and returns the standard envelope `{ success, data, message, errors }`. The dashboard calls all four through `authedRequest` in `src/cities/citiesApi.ts`; a `401` is handled by the Phase 1 `unauthorizedHandler` and never surfaces to feature code.

Shared error responses (all endpoints):

| HTTP | When | Envelope `message` | Client handling |
|---|---|---|---|
| `401` | token missing / invalid | `Unauthenticated.` | Phase 1 session-loss → `/login` (FR-035) |
| `403` | signed in but not `admin` | `You do not have permission to perform this action.` | not reachable — `<RequireAdmin>` gates the shell (FR-036); treated as a generic error if seen |
| `404` | city id not found | `The requested resource was not found.` | edit/toggle: `not_found` outcome → toast + re-fetch (FR-022 / FR-030) |
| `422` | validation / duplicate name | `The given data was invalid.` (+ `errors`) | `validation` outcome → field error(s) in the dialog, kept open (FR-012 / FR-021) |
| `500` | unexpected | `Something went wrong. Please try again.` | `transient` outcome → retryable toast, no change (FR-014 / FR-024 / FR-031 / FR-037) |
| `0` | network / offline / non-JSON | (synthetic) | same as `500` — `transient` |

---

## 1. `GET /admin/cities`

List **every** city, active and inactive. Unpaginated.

**Request**: no params, no body.

**Response `200`**

```jsonc
{
  "success": true,
  "data": [
    { "id": 1, "name_ar": "القاهرة",     "name_en": "Cairo",      "is_active": true },
    { "id": 2, "name_ar": "الجيزة",      "name_en": "Giza",       "is_active": false }
  ],
  "message": "OK",
  "errors": null
}
```

**Client** — `listCities(signal?): Promise<City[]>`
- Called on mount, on `refresh()`, and after every successful mutation.
- `data` is stored verbatim as `allCities`; no client sort or de-dupe.
- `data: []` → the "no cities" empty state (FR-005), **not** an error.
- A rejected call with nothing shown → screen `error` + Retry; a rejected call with a list already shown → keep the list + transient toast (FR-006 / FR-007).

---

## 2. `POST /admin/cities`

Create a city. It starts **active**.

**Request body**

```json
{ "name_ar": "الإسكندرية", "name_en": "Alexandria" }
```

| Field | Rules |
|---|---|
| `name_ar` | required, string, 1–255 (trimmed-non-blank, raw length ≤ 255) — enforced client-side pre-submit (FR-009 / FR-010) |
| `name_en` | required, string, 1–255 — same |

**Response `201`**

```jsonc
{
  "success": true,
  "data": { "id": 3, "name_ar": "الإسكندرية", "name_en": "Alexandria", "is_active": true },
  "message": "City created.",
  "errors": null
}
```

**Response `422`** (duplicate name or missing/invalid field)

```jsonc
{
  "success": false,
  "data": null,
  "message": "The given data was invalid.",
  "errors": { "name_ar": ["اسم المدينة مستخدم بالفعل."] }   // or name_en, or both
}
```

**Client** — `createCity(input: NewCityInput): Promise<City>`
- Body is exactly `{ name_ar, name_en }`.
- `201` → success outcome: close dialog, success toast (`message`), `refresh()`, `__resetCityDirectory()`. The `201` body is not spliced locally — the re-fetch shows the new active city (FR-011).
- `422` → `validation` outcome: the `errors` map is narrowed to `name_ar` / `name_en` and shown under the fields; the dialog stays open with the entered values (FR-012). No re-fetch.
- `0` / `≥ 500` → `transient`: no city added, form values preserved, retryable toast (FR-014).

---

## 3. `PUT /admin/cities/{id}`

Edit a city's name. `{id}` = `City.id`. One or both names; **at least one** required.

**Request body** (only the changed keys are sent)

```json
{ "name_ar": "إسكندرية" }
```

| Field | Rules |
|---|---|
| `name_ar` | optional, string, 1–255 |
| `name_en` | optional, string, 1–255 |
| — | at least one of `name_ar` / `name_en` present, else `422`. The client blocks an empty body before sending (FR-018). |

**Response `200`**

```jsonc
{
  "success": true,
  "data": { "id": 3, "name_ar": "إسكندرية", "name_en": "Alexandria", "is_active": true },
  "message": "City updated.",
  "errors": null
}
```

**Response `422`** — duplicate name, or (defensively) "no name supplied":

```jsonc
{ "success": false, "data": null, "message": "The given data was invalid.",
  "errors": { "name_ar": ["اسم المدينة مستخدم بالفعل."] } }
```

**Response `404`** — city no longer exists.

**Client** — `updateCity(id: number, patch: CityNamePatch): Promise<City>`
- `patch` contains only keys the administrator actually changed; a field left equal to its pre-filled value is omitted.
- `200` → success outcome (close, toast, `refresh()`, `__resetCityDirectory()`); the returned `City` is discarded in favour of the re-fetch (FR-020 / FR-032).
- `422` with an `errors` map → field error(s) in the dialog, kept open, values preserved (FR-021); a `422` with no usable map → a form-level dialog error.
- `404` → `not_found` outcome: close the dialog, "could not be found" toast, `refresh()`, `__resetCityDirectory()` (FR-022).
- `0` / `≥ 500` → `transient`: name unchanged, dialog stays open, retryable toast (FR-024).
- **Concurrency**: no version token is sent; a `200` wins unconditionally (last-write-wins, clarify Q2 / SC-012). The `refresh()` shows the resulting state.

---

## 4. `PATCH /admin/cities/{id}/status`

Activate or deactivate a city. `{id}` = `City.id`.

**Request body**

```json
{ "is_active": false }
```

| Field | Rules |
|---|---|
| `is_active` | required, boolean. The client always sends `!city.is_active` (a real boolean), so the "not a boolean" `422` is unreachable from the UI. |

**Response `200`**

```jsonc
{
  "success": true,
  "data": { "id": 3, "name_ar": "إسكندرية", "name_en": "Alexandria", "is_active": false },
  "message": "City status updated.",
  "errors": null
}
```

**Response `404`** — city no longer exists.

**Client** — `setCityStatus(id: number, is_active: boolean): Promise<City>`
- Only invoked after the confirmation dialog is confirmed (FR-027).
- `200` → success outcome (close, toast, `refresh()`, `__resetCityDirectory()`) (FR-028).
- `404` → `not_found` outcome: toast + `refresh()` + `__resetCityDirectory()` (FR-030).
- `0` / `≥ 500` → `transient`: status unchanged, that row's toggle back to `idle`, retryable toast, no re-fetch (FR-031).

---

## Request-shape assertions (tests)

`fetchMock` keys carry no query string for this feature. Integration tests assert:

| Call | Method + path | Body | Auth header |
|---|---|---|---|
| list / refresh | `GET /admin/cities` | none | `Bearer <token>` |
| create | `POST /admin/cities` | `{ name_ar, name_en }` — both keys | `Bearer <token>` |
| edit (one name) | `PUT /admin/cities/12` | `{ name_ar }` **only** (unchanged key omitted) | `Bearer <token>` |
| edit (both names) | `PUT /admin/cities/12` | `{ name_ar, name_en }` | `Bearer <token>` |
| toggle | `PATCH /admin/cities/12/status` | `{ is_active: false }` (boolean) | `Bearer <token>` |
| post-mutation re-fetch | `GET /admin/cities` (ordered 2nd reply) | none | `Bearer <token>` |

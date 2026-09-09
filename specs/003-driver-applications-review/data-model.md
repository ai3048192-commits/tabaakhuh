# Phase 1 Data Model: Driver Applications Review

Feature: `003-driver-applications-review` · Date: 2026-09-07

Client-only feature. "Entities" are the in-memory shapes the dashboard holds — no database tables, no persistence. Field names mirror the backend payloads in `admin-dashboard-api.md` Phase 3 (and the `GET /admin/cities` read dependency reused from Phase 2).

---

## 1. DriverApplication (`entry`)

One pending driver, from each element of the `data` array in `GET /admin/drivers/pending`. Unlike the cook queue, each element **is** the profile object — there is no wrapper and no nested contract.

| Field | Type | Source | Notes |
|---|---|---|---|
| `id` | `number` | `id` | Identifies the application in `POST /admin/drivers/{id}/approve\|reject`. Also the ordering tie-breaker (FR-010). |
| `vehicle_type` | `string` | `vehicle_type` | e.g. `"motorcycle"`. Shown. `—` placeholder if empty (FR-003b). |
| `vehicle_model` | `string` | `vehicle_model` | Shown. `—` if empty. |
| `vehicle_year` | `number` | `vehicle_year` | Shown when numeric; `—` if missing/zero. |
| `vehicle_color` | `string` | `vehicle_color` | Shown. `—` if empty. |
| `vehicle_plate_no` | `string` | `vehicle_plate_no` | Shown next to the letters. `—` if empty. |
| `vehicle_plate_letters` | `string` | `vehicle_plate_letters` | e.g. `"ن م ص"`. Shown next to the number. `—` if empty. |
| `national_id_front_url` | `string \| null` | `national_id_front_url` | Verification document. Sensitive (FR-031). `null` → "document unavailable" tile (FR-005). |
| `national_id_back_url` | `string \| null` | `national_id_back_url` | Verification document. Sensitive (FR-031). |
| `license_url` | `string \| null` | `license_url` | Driving-licence image. Verification document. Sensitive (FR-031). |
| `city_id` | `number` | `city_id` | Resolved to a name via the city directory; raw id shown on miss (FR-003a). |
| `birth_date` | `string` | `birth_date` | `YYYY-MM-DD`. Shown as a formatted date, **reference only** — no age computation or gate (FR-003c). |
| `is_available` | `boolean` | `is_available` | Shown as current availability state. `false` for a not-yet-approved driver. |
| `submitted_at` | `string` (ISO 8601) | `submitted_at` | e.g. `"2026-09-02T09:00:00+00:00"`. Shown as submission date; **primary queue sort key** (FR-010). |
| `approval_status` | `'pending' \| 'approved' \| 'rejected'` | `approval_status` | Always `"pending"` for entries in this queue. |
| `rejection_reason` | `string \| null` | `rejection_reason` | `null` while pending; not displayed in the queue. |
| `rating_avg` | `number` | `rating_avg` | Shown as rating summary. `0` for a new driver. |
| `rating_count` | `number` | `rating_count` | Shown alongside `rating_avg`. |

**Rules**
- Read-only in the queue. The only mutations are the approve/reject calls, whose 200 response returns the updated driver object (used only to confirm; the entry is then removed from the queue — FR-014/FR-019/FR-026).
- Only `approval_status === "pending"` entries appear (the endpoint already filters; the client does not re-filter but asserts it in tests — FR-002).
- Any of `national_id_front_url`, `national_id_back_url`, `license_url` may be `null` or may fail to load at render time → per-document "unavailable" state; never blocks a decision (FR-005).
- Any identity/vehicle string field may be missing/empty → per-field `—` placeholder; the card still renders and stays actionable (FR-003b).

---

## 2. DocumentRef (derived, per entry)

The ordered list handed to `DocumentViewer`. For a driver it is always exactly three image documents (no PDF).

| Field | Type | Notes |
|---|---|---|
| `kind` | `'id_front' \| 'id_back' \| 'license'` | Drives the tile label and viewer heading. (The shared `DocumentKind` union also contains cook-only values `'avatar' \| 'banner' \| 'contract'`, unused here.) |
| `url` | `string \| null` | From the matching `*_url` field; `null` → "document unavailable" (FR-005). |
| `label` | `string` | Localized, for `alt` text + viewer heading (`M.docIdFront` / `M.docIdBack` / `M.docLicense`). |

`documents(entry)` → `[{id_front}, {id_back}, {license}]` in that fixed order. Entries whose `url` is `null` are kept in the list (shown as unavailable), not omitted, so the viewer's index math and the tile count stay stable.

---

## 3. CardStatus (in-memory, per driver id)

`Map<number, CardStatus>` in the hook; drives one card's controls. Identical semantics to Phase 2.

| Value | Meaning | UI |
|---|---|---|
| `idle` | default | approve + reject enabled |
| `confirming` | `ApproveDialog` or `RejectDialog` open for this card | dialog modal; card controls inert behind it |
| `submitting` | a decision request is in flight for this card | both controls on the card disabled, spinner (FR-015 / FR-021) |
| `error` | last decision attempt failed transiently (network / 5xx) | controls re-enabled; retryable toast shown; for reject, dialog stays open with text (FR-020, FR-025) |

Absent from the map ⇒ `idle`. On a successful or reconciled-away decision the entry (and its map key) is deleted.

---

## 4. DecisionOutcome (return of `approve` / `reject`)

Discriminated union the hook produces from the API result; the page maps it to a toast.

| Variant | Trigger | Queue effect | Toast |
|---|---|---|---|
| `{ ok: true; message: string }` | 200 | remove entry | success, envelope `message` (FR-014 / FR-019) |
| `{ ok: false; reason: 'not_pending'; message: string }` | `422` domain message | remove entry + background `refresh()` | info: envelope `message` ("no longer awaiting review") (FR-023) |
| `{ ok: false; reason: 'not_found' }` | `404` | remove entry + background `refresh()` | info: "could not be found" (FR-024) |
| `{ ok: false; reason: 'transient' }` | `ApiError.status === 0` or `>= 500` | keep entry, `CardStatus = error` | retryable "please try again" (FR-025 / FR-032) |
| `{ ok: false; reason: 'validation'; message: string }` | `422` with `errors.reason` (should not occur — client blocks it) | keep entry + dialog | surface the field error on the reason input (FR-027) |

`401` never reaches this union — handled by the Phase 1 `unauthorizedHandler` inside `apiRequest`.

---

## 5. RejectFormModel (component-local, `RejectDialog`)

Ephemeral. Never persisted.

| Field | Type | Validation (client, pre-request) |
|---|---|---|
| `reason` | `string` | Required. `reason.trim().length >= 1` (FR-017) and `reason.length <= 1000` (FR-018). `<textarea maxLength={1000}>` as a hard stop; submit disabled otherwise. |
| `submitting` | `boolean` | Mirrors `CardStatus === 'submitting'`; disables submit + Cancel. |

On a `transient` failure the component remains mounted and `reason` is retained (FR-020). On `ok`, `not_pending`, or `not_found` the dialog unmounts with the card. Cancel / `Esc` / backdrop → unmount, no request (FR-022).

---

## 6. CityDirectory (reused from Phase 2, `src/cities/`)

From `GET /admin/cities` (Phase 5 endpoint, read-only here). **No change from Phase 2.**

| Field | Type | Source | Notes |
|---|---|---|---|
| `id` | `number` | `cities[].id` | Key. |
| `name_ar` | `string` | `cities[].name_ar` | Displayed name (`dir="rtl"` UI). |
| `name_en` | `string` | `cities[].name_en` | Held; not currently shown. |
| `is_active` | `boolean` | `cities[].is_active` | Held; **not** a filter — inactive cities still resolve. |

**Shape held**: `Map<number, { name_ar, name_en }>`, built once per browser session (module-level memoised promise). Shared across the cook and driver review screens — whichever opens first triggers the single fetch.

**Resolution rules (FR-003a)**
- `resolve(cityId)` → `map.get(cityId)?.name_ar ?? String(cityId)`.
- Fetch rejected ⇒ `failed = true`, `resolve` returns `String(cityId)` for every id; the screen renders normally (edge case "City list unavailable").
- Loaded in parallel with the pending queue; the queue never awaits it.

---

## Data flow (one screen open)

```
mount /drivers
  ├─ useDriverApplications: authedRequest GET /admin/drivers/pending
  │     → DriverApplication[] → sortQueue (submitted_at asc, id tie-break) → state.entries
  │     → count = entries.length (FR-006); entries.length === 0 → empty state (FR-007)
  │     → initial fetch pending → loading state (FR-008); initial fetch failed → error state (FR-032)
  └─ useCityNames: fetchCityDirectory() (memoised, shared with /cooks) → resolve() ready, or failed→raw ids

open a document        → DocumentViewer(documents(entry), index)   [3 images, no copy retained]
approve(entry.id)
  ├─ ApproveDialog confirm → CardStatus submitting → authedRequest POST …/approve
  └─ outcome → remove entry + success toast | keep + retry toast     (§4)
reject(entry.id, reason)
  ├─ RejectDialog (reason valid) → CardStatus submitting → authedRequest POST …/reject {reason}
  └─ outcome → remove entry + success toast | keep + retry toast (reason preserved)   (§4, §5)
refresh()              → re-fetch + re-sort; scroll position kept (FR-009)
unmount /drivers       → entries, card states, viewer state all dropped (FR-031, SC-008)
any call → 401         → Phase 1 unauthorizedHandler → clearSession → /login (FR-028)
```

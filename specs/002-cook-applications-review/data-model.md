# Phase 1 Data Model: Cook Applications Review

Feature: `002-cook-applications-review` · Date: 2026-09-07

Client-only feature. "Entities" are the in-memory shapes the dashboard holds — no database tables, no persistence. Field names mirror the backend payloads in `admin-dashboard-api.md` Phase 2 (and the Phase 5 `GET /admin/cities` read dependency).

---

## 1. CookApplication (`profile`)

One pending cook, from each element's `cook_profile` object in `GET /admin/cooks/pending`.

| Field | Type | Source | Notes |
|---|---|---|---|
| `id` | `number` | `cook_profile.id` | Identifies the application in `POST /admin/cooks/{id}/approve|reject`. Also the ordering tie-breaker (FR-011). |
| `store_name` | `string` | `cook_profile.store_name` | Shown as the card title; named in the success toast (FR-014). |
| `bio` | `string` | `cook_profile.bio` | Shown. May be empty. |
| `avatar_url` | `string \| null` | `cook_profile.avatar_url` | Verification document "profile photo". Thumbnail + viewer. `null` → "document unavailable" (FR-005). |
| `national_id_front_url` | `string \| null` | `cook_profile.national_id_front_url` | Verification document. Sensitive (FR-028). |
| `national_id_back_url` | `string \| null` | `cook_profile.national_id_back_url` | Verification document. Sensitive (FR-028). |
| `banner_url` | `string \| null` | `cook_profile.banner_url` | Verification document "storefront banner". |
| `city_id` | `number` | `cook_profile.city_id` | Resolved to a name via the city directory; raw id shown on miss (FR-003a). |
| `area` | `string` | `cook_profile.area` | Shown. |
| `address_text` | `string` | `cook_profile.address_text` | Shown. |
| `lat` | `number` | `cook_profile.lat` | Held; optional small map/coords display. |
| `lng` | `number` | `cook_profile.lng` | Held; optional. |
| `delivery_radius_km` | `number` | `cook_profile.delivery_radius_km` | Shown. |
| `is_open` | `boolean` | `cook_profile.is_open` | Shown as current open/closed state. |
| `approval_status` | `string` | `cook_profile.approval_status` | Always `"pending"` for entries in this queue. Values: `pending \| approved \| rejected`. |
| `rejection_reason` | `string \| null` | `cook_profile.rejection_reason` | `null` while pending; not displayed in the queue. |
| `rating_avg` | `number` | `cook_profile.rating_avg` | Shown as rating summary. `0` for a new cook. |
| `rating_count` | `number` | `cook_profile.rating_count` | Shown alongside `rating_avg`. |

**Rules**
- Read-only in the queue. The only mutations are the approve/reject calls, whose 200 response returns the updated profile (used only to confirm; the entry is then removed from the queue — FR-014/FR-019/FR-025).
- Only `approval_status === "pending"` entries appear (the endpoint already filters; the client does not re-filter but asserts it in tests — FR-002).
- Any `*_url` may be `null` or may fail to load at render time → per-document "unavailable" state; never blocks a decision (FR-005).

---

## 2. SignedContract (`contract`)

Per entry, the `contract` object in `GET /admin/cooks/pending`. **Nullable** — `null` until the cook signs.

| Field | Type | Source | Notes |
|---|---|---|---|
| `template_version` | `string` | `contract.template_version` | e.g. `"v1"`. Shown in the contract block. |
| `signed_file_url` | `string` | `contract.signed_file_url` | PDF. Opened in the `DocumentViewer` `<iframe>`, new-tab fallback. |
| `signed_at` | `string` (ISO 8601) | `contract.signed_at` | e.g. `"2026-09-01T12:30:00+00:00"`. Shown as signed date; **primary queue sort key** (FR-011). |

**Rules**
- `contract === null` → the card shows a clear "no contract signed yet" indicator (FR-007) and sorts **after** all entries that have a contract (FR-011). Approve/reject remain available (edge case: contract not a precondition).
- ISO strings are compared as strings for ordering (lexicographic == chronological for this format).

---

## 3. PendingCookEntry (in-memory, `useCookApplications`)

The client's per-row shape.

| Field | Type | Notes |
|---|---|---|
| `profile` | `CookApplication` | §1. |
| `contract` | `SignedContract \| null` | §2. |

Derived, not stored:
- `documents(entry)` → ordered `DocumentRef[]` for the viewer: `id_front`, `id_back`, `avatar`, `banner`, then `contract` when present. Each `{ kind, url, label }`; entries whose url is `null` are shown as unavailable rather than omitted.
- `sortKey(entry)` → `[entry.contract ? 0 : 1, entry.contract?.signed_at ?? "", entry.profile.id]`.

---

## 4. CardState (in-memory, per cook id)

`Map<number, CardState>` in the hook; drives one card's controls.

| Value | Meaning | UI |
|---|---|---|
| `idle` | default | approve + reject enabled |
| `confirming` | `ApproveDialog` or `RejectDialog` open for this card | dialog modal; card controls inert behind it |
| `submitting` | a decision request is in flight for this card | both controls on the card disabled, spinner (FR-015 / FR-021) |
| `error` | last decision attempt failed transiently (network / 5xx) | controls re-enabled; retryable toast shown; for reject, dialog stays open with text (FR-020, FR-024) |

Absent from the map ⇒ `idle`. On a successful or reconciled-away decision the entry (and its map key) is deleted.

---

## 5. DecisionOutcome (return of `approve` / `reject`)

Discriminated union the hook produces from the API result; the page maps it to a toast.

| Variant | Trigger | Queue effect | Toast |
|---|---|---|---|
| `{ ok: true, storeName }` | 200 | remove entry | success, names the store (FR-014 / FR-019) |
| `{ ok: false, reason: 'not_pending', message }` | `422` domain message | remove entry + background `refresh()` | info: envelope `message` ("no longer awaiting review") (FR-022) |
| `{ ok: false, reason: 'not_found' }` | `404` | remove entry + background `refresh()` | info: "could not be found" (FR-023) |
| `{ ok: false, reason: 'transient' }` | `ApiError.status === 0` or `>= 500` | keep entry, `CardState = error` | retryable "please try again" (FR-024 / FR-029) |

`401` never reaches this union — handled by the Phase 1 `unauthorizedHandler` inside `apiRequest`.

---

## 6. RejectFormModel (component-local, `RejectDialog`)

Ephemeral. Never persisted.

| Field | Type | Validation (client, pre-request) |
|---|---|---|
| `reason` | `string` | Required. `reason.trim().length >= 1` (FR-017) and `reason.length <= 1000` (FR-018). `<textarea maxLength={1000}>` as a hard stop; submit disabled otherwise. |
| `submitting` | `boolean` | Mirrors `CardState === 'submitting'`; disables submit + Cancel-safe. |

On a `transient` failure the component remains mounted and `reason` is retained (FR-020). On `ok`, `not_pending`, or `not_found` the dialog unmounts with the card.

---

## 7. CityDirectory (in-memory, `src/cities/`)

From `GET /admin/cities` (Phase 5 endpoint, read-only here).

| Field | Type | Source | Notes |
|---|---|---|---|
| `id` | `number` | `cities[].id` | Key. |
| `name_ar` | `string` | `cities[].name_ar` | Displayed name (`dir="rtl"` UI). |
| `name_en` | `string` | `cities[].name_en` | Held; not currently shown. |
| `is_active` | `boolean` | `cities[].is_active` | Held; **not** a filter — inactive cities still resolve (edge case). |

**Shape held**: `Map<number, { name_ar, name_en }>`, built once per browser session (module-level memoised promise — R5).

**Resolution rules (FR-003a)**
- `resolve(cityId)` → `map.get(cityId)?.name_ar ?? String(cityId)`.
- Fetch rejected ⇒ `failed = true`, `resolve` returns `String(cityId)` for every id; the screen renders normally (edge case "City list unavailable").
- Loaded in parallel with the pending queue; the queue never awaits it.

---

## Data flow (one screen open)

```
mount /cooks
  ├─ useCookApplications: authedRequest GET /admin/cooks/pending
  │     → map to PendingCookEntry[] → sortQueue → state.entries
  │     → count = entries.length (FR-008); entries.length === 0 → empty state (FR-009)
  └─ useCityNames: fetchCityDirectory() (memoised) → resolve() ready, or failed→raw ids

open a document        → DocumentViewer(documents(entry), index)   [no copy retained]
approve(entry.profile.id)
  ├─ ApproveDialog confirm → CardState submitting → authedRequest POST …/approve
  └─ outcome → remove entry | keep + retry toast     (§5)
reject(entry.profile.id, reason)
  ├─ RejectDialog (reason valid) → CardState submitting → authedRequest POST …/reject {reason}
  └─ outcome → remove entry | keep + retry toast (reason preserved)   (§5, §6)
refresh()              → re-fetch + re-sort; scroll position kept (FR-010)
unmount /cooks         → entries, card states, viewer state all dropped (FR-028, SC-007)
any call → 401         → Phase 1 unauthorizedHandler → clearSession → /login (FR-026)
```

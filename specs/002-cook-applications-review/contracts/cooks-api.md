# Contract: Backend Cook-Review API (consumed by the dashboard)

Feature: `002-cook-applications-review`. Source of truth: `admin-dashboard-api.md` Phase 2, plus the Phase 5 `GET /admin/cities` read dependency. This file restates only what the client depends on and how it reacts. The client does **not** implement these endpoints; it treats them as a fixed external contract (Assumption in spec.md).

Base URL: `import.meta.env.VITE_API_BASE_URL` (e.g. `https://<host>/api/v1`).
All four calls are **authenticated + admin-only**: `Authorization: Bearer <token>` (attached by `authedRequest` — see `cook-review-ui.md`), `Accept: application/json`, and `Content-Type: application/json` when there is a body.

Response envelope (all responses, success or failure):

```jsonc
{ "success": boolean, "data": object|array|null, "message": string, "errors": object|null }
```

Shared status handling (from `admin-dashboard-api.md` §0, same as Phase 1):

| Status | Meaning | Client behaviour in this feature |
|---|---|---|
| `200` / `201` | OK | resolve with `data` |
| `401` | missing/invalid token | **not handled in feature code** — `apiRequest` fires the Phase 1 `unauthorizedHandler` → `clearSession()` → redirect to `/login` (FR-026) |
| `403` | authenticated but not admin | treated like `401` for routing (defensive; the route is already behind `<RequireAdmin>`) |
| `404` | resource not found | decision calls: reconcile the entry out of the queue + background `refresh()` (FR-023) |
| `422` | validation / domain rule | see per-endpoint rows |
| `500` / non-JSON / offline | unexpected / transport | `ApiError.status` is `>= 500` or `0` → keep the entry, retryable toast (FR-024, FR-029) |

---

## 1. `GET /admin/cooks/pending`

List every cook application with `approval_status === "pending"`, each with its verification document URLs and its signed contract (or `null`).

### Request

No query params. No body.

### Responses

| Status | Body shape | Client behaviour |
|---|---|---|
| `200` | `data`: array of `{ cook_profile: {...}, contract: {...} \| null }` | Map to `PendingCookEntry[]`, `sortQueue` (contract `signed_at` asc, null-contract last, tie-break `cook_profile.id` asc — FR-011), render as one plain list (FR-011a). `data.length` → the awaiting-review count (FR-008). `data.length === 0` → empty state (FR-009). |
| `500` / non-JSON / offline | — | Screen-level error state with a retry action; no partial list shown as authoritative (FR-029, edge case "Unexpected server error on the queue request"). |

`cook_profile` fields consumed: `id`, `store_name`, `bio`, `avatar_url`, `national_id_front_url`, `national_id_back_url`, `banner_url`, `city_id`, `area`, `address_text`, `lat`, `lng`, `delivery_radius_km`, `is_open`, `approval_status`, `rejection_reason`, `rating_avg`, `rating_count` (see data-model.md §1). Any `*_url` may be `null` → per-document "unavailable" state (FR-005).

`contract` (nullable) fields consumed: `template_version`, `signed_file_url`, `signed_at` (see data-model.md §2). `null` → "no contract signed yet" indicator (FR-007); such entries sort after all signed entries (FR-011).

### Contract tests (integration, mocked `fetch`)

- 200 with 3 entries (2 signed at different times, 1 `contract: null`) ⇒ rendered order is: earlier `signed_at`, later `signed_at`, then the null-contract entry; count shows "3".
- 200 with `[]` ⇒ empty-state message, no card, count "0" (FR-009).
- 200 entry with `avatar_url: null` ⇒ that document tile shows "unavailable"; approve/reject still enabled (FR-005).
- 200 entry with `contract: null` ⇒ "no contract signed yet" shown; no contract tile in the viewer list (FR-007).
- Request carries `Authorization: Bearer <token>` (FR-026) and no query string.
- 500 ⇒ screen error state with a retry control; a subsequent 200 on retry renders the list.
- `fetch` rejects ⇒ same error state (FR-029).
- Two consecutive loads with the same payload ⇒ identical DOM order (stable sort, FR-011).

---

## 2. `POST /admin/cooks/{id}/approve`

Approve a pending application. `{id}` = `cook_profile.id`. **No request body.**

### Responses

| Status | Body shape | Client behaviour |
|---|---|---|
| `200` | `data`: updated `cook_profile` with `approval_status: "approved"` | Remove the entry from the queue; success toast naming `store_name` (FR-014). If `data` is unreadable but status is 200 → still treat as approved and remove (FR-025). |
| `404` | not found | Remove the entry; info toast "could not be found"; background `refresh()` (FR-023). |
| `422` | `message` = the domain exception text (application not in `pending` state) | Remove the entry; info toast = the envelope `message` ("no longer awaiting review"); background `refresh()` (FR-022). |
| `500` / offline | — | Keep the entry; `CardState = error`; retryable toast (FR-024). |

### Contract tests

- 200 ⇒ one `POST /admin/cooks/{id}/approve` with the bearer header and **no body**; the card disappears; success toast contains the store name (FR-014, SC-002).
- While in flight ⇒ that card's approve **and** reject controls are `disabled` / `aria-busy`; a second click sends no second request (FR-015, SC-005).
- Cancelling the confirm dialog ⇒ **zero** `approve` requests; the card stays (FR-013).
- 422 not-pending ⇒ card removed, info toast text equals the envelope `message`, a follow-up `GET /admin/cooks/pending` is issued (FR-022, SC-004).
- 404 ⇒ card removed, "not found" toast, follow-up `GET /admin/cooks/pending` issued (FR-023).
- 500 / `fetch` reject ⇒ card remains, retryable toast, controls re-enabled, no local "approved" state (FR-024).
- 200 with an empty/garbled `data` ⇒ card still removed, success toast still shown (FR-025).

---

## 3. `POST /admin/cooks/{id}/reject`

Reject a pending application with a mandatory reason. `{id}` = `cook_profile.id`.

### Request body

```json
{ "reason": "صور البطاقة غير واضحة" }
```

| Field | Rules (server) | Client pre-checks |
|---|---|---|
| `reason` | required, string, `min:1`, `max:1000` | `reason.trim().length >= 1` (FR-017) **and** `reason.length <= 1000` (FR-018); `<textarea maxLength=1000>` hard stop. Submit disabled until valid. |

### Responses

| Status | Body shape | Client behaviour |
|---|---|---|
| `200` | `data`: updated `cook_profile` with `approval_status: "rejected"`, `rejection_reason` filled | Remove the entry; success toast (FR-019). Unreadable `data` + 200 → still removed (FR-025). |
| `404` | not found | Remove the entry; "not found" toast; background `refresh()` (FR-023). |
| `422` (missing `reason`) | `errors: { reason: [...] }` | Should not occur — the client blocks empty submits (FR-017). If it does: keep the dialog open, surface the field error (FR-027). |
| `422` (not `pending`) | `message` = domain exception text | Remove the entry; info toast = `message`; background `refresh()` (FR-022). |
| `500` / offline | — | Keep the entry; keep the `RejectDialog` open with the typed reason intact (FR-020); retryable toast (FR-024). |

### Contract tests

- Empty or whitespace-only reason ⇒ submit control `disabled`, missing-reason message shown, **zero** `reject` requests sent (FR-017, SC-003).
- Reason of 1001 chars pasted ⇒ value truncated at 1000 (or submit blocked with the limit shown); never sent over-length (FR-018).
- Valid reason ⇒ one `POST /admin/cooks/{id}/reject` with body `{ "reason": <text> }` and the bearer header; card removed; success toast (FR-019).
- In flight ⇒ both card controls disabled; single request under rapid clicks (FR-021, SC-005).
- 500 / `fetch` reject ⇒ card remains, dialog still open, `reason` value unchanged, retryable toast (FR-020, FR-024).
- 422 not-pending ⇒ card removed, info toast = envelope `message`, follow-up `GET /admin/cooks/pending` (FR-022).
- 100% of sent rejects include a non-empty `reason` (assert across all reject tests — SC-003).

---

## 4. `GET /admin/cities` — read dependency (Phase 5 endpoint)

Used only to resolve `cook_profile.city_id` to a display name (FR-003a). The client does not create, edit, or toggle cities in this feature.

### Request

No params. No body. Bearer header.

### Responses

| Status | Body shape | Client behaviour |
|---|---|---|
| `200` | `data`: array of `{ id, name_ar, name_en, is_active }` (active **and** inactive) | Build `Map<number, { name_ar, name_en }>`, memoised at module scope for the session (R5). `resolve(city_id)` → `name_ar`. |
| any non-2xx / offline | — | `useCityNames().failed = true`; `resolve(id)` returns `String(id)` for every id; the queue screen renders normally and stays fully usable (edge case "City list unavailable"). |

### Contract tests

- 200 ⇒ card shows `name_ar` for a known `city_id`; only **one** `GET /admin/cities` request even when `/cooks` is opened, left, and reopened (module memo, R5).
- `city_id` absent from the list (e.g. inactive-and-pruned, or unknown) ⇒ card shows the raw id, still renders, decisions still work (FR-003a, edge case "Unknown or inactive service city").
- 500 / `fetch` reject ⇒ every card shows raw ids; no error state on the queue screen; approve/reject unaffected.
- The cities load runs in parallel with `GET /admin/cooks/pending`; the queue renders without waiting for cities.

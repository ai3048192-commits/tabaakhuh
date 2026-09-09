# Contract: Backend Driver-Review API (consumed by the dashboard)

Feature: `003-driver-applications-review`. Source of truth: `admin-dashboard-api.md` Phase 3, plus the `GET /admin/cities` read dependency (Phase 5 endpoint, already integrated in Phase 2). This file restates only what the client depends on and how it reacts. The client does **not** implement these endpoints; it treats them as a fixed external contract (Assumption in spec.md).

Base URL: `import.meta.env.VITE_API_BASE_URL` (e.g. `https://<host>/api/v1`).
All calls are **authenticated + admin-only**: `Authorization: Bearer <token>` (attached by `authedRequest` — see `driver-review-ui.md`), `Accept: application/json`, and `Content-Type: application/json` when there is a body.

Response envelope (all responses, success or failure):

```jsonc
{ "success": boolean, "data": object|array|null, "message": string, "errors": object|null }
```

Shared status handling (from `admin-dashboard-api.md` §0, same as Phases 1–2):

| Status | Meaning | Client behaviour in this feature |
|---|---|---|
| `200` / `201` | OK | resolve with `data` |
| `401` | missing/invalid token | **not handled in feature code** — `apiRequest` fires the Phase 1 `unauthorizedHandler` → `clearSession()` → redirect to `/login` (FR-028) |
| `403` | authenticated but not admin | treated like `401` for routing (defensive; the route is already behind `<RequireAdmin>`, FR-029) |
| `404` | resource not found | decision calls: reconcile the entry out of the queue + background `refresh()` (FR-024) |
| `422` | validation / domain rule | see per-endpoint rows |
| `500` / non-JSON / offline | unexpected / transport | `ApiError.status` is `>= 500` or `0` → keep the entry, retryable toast (FR-025, FR-032) |

---

## 1. `GET /admin/drivers/pending`

List every driver application with `approval_status === "pending"`, each with its identity, vehicle, and verification-document fields.

### Request

No query params. No body. **Not paginated** — the full array is returned.

### Responses

| Status | Body shape | Client behaviour |
|---|---|---|
| `200` | `data`: **flat array** of driver objects (see fields below) | Map to `DriverApplication[]`, `sortQueue` (`submitted_at` asc, tie-break `id` asc — FR-010), render as one plain list (FR-011). `data.length` → the awaiting-review count (FR-006). `data.length === 0` → empty state (FR-007). |
| `500` / non-JSON / offline | — | Screen-level error state with a retry action; no partial list shown as authoritative (FR-032, edge case "Unexpected server error on the queue request"). |

Driver object fields consumed: `id`, `vehicle_type`, `vehicle_plate_no`, `national_id_front_url`, `national_id_back_url`, `license_url`, `city_id`, `vehicle_model`, `vehicle_plate_letters`, `vehicle_year`, `vehicle_color`, `birth_date`, `is_available`, `approval_status`, `submitted_at`, `rejection_reason`, `rating_avg`, `rating_count` (see data-model.md §1).

- Any of `national_id_front_url` / `national_id_back_url` / `license_url` may be `null` → per-document "unavailable" state (FR-005).
- Any identity/vehicle string field may be missing/empty → per-field `—` placeholder (FR-003b).
- `birth_date` is displayed as a formatted date only — no age logic (FR-003c).
- `submitted_at` is the primary sort key; it is present on every row (no signed/unsigned split like the cook queue).

### Contract tests (integration, mocked `fetch`)

- 200 with 3 entries at different `submitted_at` values ⇒ rendered order is ascending by `submitted_at`; count shows "3".
- 200 with two entries sharing `submitted_at` ⇒ the one with the lower `id` renders first; order is identical across two consecutive loads (stable sort, FR-010 / SC-010).
- 200 with `[]` ⇒ empty-state message, no card, count "0" (FR-007).
- 200 entry with `license_url: null` ⇒ that document tile shows "unavailable"; approve/reject still enabled (FR-005).
- 200 entry with `vehicle_plate_letters: ""` (or missing) ⇒ that field shows `—`; the rest of the card renders and the controls work (FR-003b).
- Request carries `Authorization: Bearer <token>` (FR-028) and no query string.
- 500 ⇒ screen error state with a retry control; a subsequent 200 on retry renders the list.
- `fetch` rejects ⇒ same error state (FR-032).
- The cities load (`GET /admin/cities`) runs in parallel; the queue renders without waiting for it.

---

## 2. `POST /admin/drivers/{id}/approve`

Approve a pending application. `{id}` = the driver object's `id`. **No request body.**

### Responses

| Status | Body shape | Client behaviour |
|---|---|---|
| `200` | `data`: updated driver object with `approval_status: "approved"`; `message` = `"Application approved."` | Remove the entry from the queue; success toast from the envelope `message` (FR-014). If `data` is unreadable but status is 200 → still treat as approved and remove (FR-026). |
| `404` | not found | Remove the entry; info toast "could not be found"; background `refresh()` (FR-024). |
| `422` | `message` = the domain exception text (application not in `pending` state) | Remove the entry; info toast = the envelope `message` ("no longer awaiting review"); background `refresh()` (FR-023). |
| `500` / offline | — | Keep the entry; `CardStatus = error`; retryable toast (FR-025). |

### Contract tests

- 200 ⇒ one `POST /admin/drivers/{id}/approve` with the bearer header and **no body**; the card disappears without a page reload; success toast shown (FR-014, SC-002).
- Confirm dialog required: cancelling it ⇒ **zero** `approve` requests; the card stays (FR-013).
- While in flight ⇒ that card's approve **and** reject controls are `disabled` / `aria-busy`; a second click sends no second request (FR-015, SC-005).
- 422 not-pending ⇒ card removed, info toast text equals the envelope `message`, a follow-up `GET /admin/drivers/pending` is issued (FR-023, SC-004).
- 404 ⇒ card removed, "not found" toast, follow-up `GET /admin/drivers/pending` issued (FR-024).
- 500 / `fetch` reject ⇒ card remains, retryable toast, controls re-enabled, no local "approved" state (FR-025).
- 200 with an empty/garbled `data` ⇒ card still removed, success toast still shown (FR-026).

---

## 3. `POST /admin/drivers/{id}/reject`

Reject a pending application with a mandatory reason. `{id}` = the driver object's `id`.

### Request body

```json
{ "reason": "الرخصة منتهية" }
```

| Field | Rules (server) | Client pre-checks |
|---|---|---|
| `reason` | required, string, `min:1`, `max:1000` | `reason.trim().length >= 1` (FR-017) **and** `reason.length <= 1000` (FR-018); `<textarea maxLength=1000>` hard stop. Submit disabled until valid. |

### Responses

| Status | Body shape | Client behaviour |
|---|---|---|
| `200` | `data`: updated driver object with `approval_status: "rejected"`, `rejection_reason` filled; `message` = `"Application rejected."` | Remove the entry; success toast from `message` (FR-019). Unreadable `data` + 200 → still removed (FR-026). |
| `404` | not found | Remove the entry; "not found" toast; background `refresh()` (FR-024). |
| `422` (missing `reason`) | `errors: { reason: [...] }` | Should not occur — the client blocks empty submits (FR-017). If it does: keep the dialog open, surface the field error (FR-027). |
| `422` (not `pending`) | `message` = domain exception text | Remove the entry; info toast = `message`; background `refresh()` (FR-023). |
| `500` / offline | — | Keep the entry; keep the `RejectDialog` open with the typed reason intact (FR-020); retryable toast (FR-025). |

### Contract tests

- Empty or whitespace-only reason ⇒ submit control `disabled`, missing-reason message shown, **zero** `reject` requests sent (FR-017, SC-003).
- Reason of 1001 chars pasted ⇒ value truncated at 1000 (or submit blocked with the limit shown); never sent over-length (FR-018).
- Valid reason ⇒ one `POST /admin/drivers/{id}/reject` with body `{ "reason": <text> }` and the bearer header; card removed; success toast (FR-019).
- Cancelling / dismissing the modal ⇒ **zero** `reject` requests; the card stays (FR-022).
- In flight ⇒ both card controls and the modal submit disabled; single request under rapid clicks (FR-021, SC-005).
- 500 / `fetch` reject ⇒ card remains, dialog still open, `reason` value unchanged, retryable toast (FR-020, FR-025).
- 422 not-pending ⇒ card removed, info toast = envelope `message`, follow-up `GET /admin/drivers/pending` (FR-023).
- 100% of sent rejects include a non-empty `reason` of ≤1000 chars (assert across all reject tests — SC-003).

---

## 4. `GET /admin/cities` — read dependency (Phase 5 endpoint, reused from Phase 2)

Used only to resolve the driver's `city_id` to a display name (FR-003a). The client does not create, edit, or toggle cities in this feature. Behaviour and the module-level session memo are **unchanged from Phase 2** — whichever review screen opens first triggers the single fetch.

### Request

No params. No body. Bearer header.

### Responses

| Status | Body shape | Client behaviour |
|---|---|---|
| `200` | `data`: array of `{ id, name_ar, name_en, is_active }` (active **and** inactive) | Build `Map<number, { name_ar, name_en }>`, memoised at module scope for the session. `resolve(city_id)` → `name_ar`. |
| any non-2xx / offline | — | `useCityNames().failed = true`; `resolve(id)` returns `String(id)` for every id; the queue screen renders normally and stays fully usable (edge case "City list unavailable"). |

### Contract tests

- 200 ⇒ card shows `name_ar` for a known `city_id`; only **one** `GET /admin/cities` request even when `/drivers` is opened, left, and reopened (module memo).
- `city_id` absent from the list (unknown or inactive-and-pruned) ⇒ card shows the raw id, still renders, decisions still work (FR-003a, edge case "Unknown or inactive service city").
- 500 / `fetch` reject ⇒ every card shows raw ids; no error state on the queue screen; approve/reject unaffected.
- The cities load runs in parallel with `GET /admin/drivers/pending`; the queue renders without waiting for cities.

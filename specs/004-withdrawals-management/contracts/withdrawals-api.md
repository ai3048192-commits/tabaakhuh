# Contract: Withdrawals API (external surface consumed)

Feature: `004-withdrawals-management`. The backend endpoints this feature calls, from `admin-dashboard-api.md` Phase 4 and the §0 conventions. The dashboard consumes these **unchanged**; this file is the reference the client and its tests are written against.

Base URL: `import.meta.env.VITE_API_BASE_URL` (e.g. `https://<host>/api/v1`).
Every request carries `Authorization: Bearer <token>`, `Accept: application/json` (and `Content-Type: application/json` only when a body is sent — none of the action calls send one).

All responses use the standard envelope:

```jsonc
{ "success": true,  "data": <T>,   "message": "OK", "errors": null }
{ "success": false, "data": null,  "message": "<why>", "errors": { "field": ["…"] } | null }
```

Shared status codes: `401` unauthenticated (`Unauthenticated.`) → client session-loss path; `403` authenticated non-admin; `404` resource not found; `422` validation / domain-rule violation (envelope `message` carries the reason, `errors` may carry field detail); `500` unexpected (`Something went wrong. Please try again.`).

---

## 1. `GET /admin/withdrawals` — paginated list

Query parameters:

| Param | Type | Rule | Client behaviour |
|---|---|---|---|
| `status` | `pending \| approved \| rejected \| paid` | optional | sent only when the active filter ≠ `all`; omitted entirely for `all` |
| `page` | integer ≥ 1 | optional, default `1` | always sent |

Request: no body.

Response `200` — `data` is the pagination shape (`admin-dashboard-api.md` §0):

```jsonc
{
  "success": true,
  "data": {
    "items": [
      {
        "id": 45,
        "amount": 500.0,
        "payment_details": "InstaPay: 01000000000",
        "status": "pending",
        "requested_at": "2026-09-03T08:00:00+00:00",
        "processed_at": null
      }
    ],
    "page": 1,
    "per_page": 20,
    "total": 3
  },
  "message": "OK",
  "errors": null
}
```

- `per_page` is fixed at `20` by the backend. The client reads it from the response and does not hard-code the literal (FR-013).
- `items` is `[]` for a filter with no matches and for a `page` beyond the last page (the echoed `page` still reflects the request).
- `items` order is the backend's; the client does not re-sort.

Errors: `422` when `status` is not one of the four values (envelope `message` = the exception text). Not reachable from the UI (the filter offers only valid values); handled defensively — keep any page already shown, show an error toast.

---

## 2. `POST /admin/withdrawals/{id}/approve`

`{id}` = `withdrawal.id`. Request: **no body**.

Response `200`:

```jsonc
{
  "success": true,
  "data": {
    "id": 45, "amount": 500.0, "payment_details": "InstaPay: 01000000000",
    "status": "approved",
    "requested_at": "2026-09-03T08:00:00+00:00",
    "processed_at": "2026-09-06T10:00:00+00:00"
  },
  "message": "Withdrawal request approved.",
  "errors": null
}
```

Errors:

| Code | Meaning | Client outcome (see data-model §6) |
|---|---|---|
| `404` | request not found | `not_found` → toast + re-fetch |
| `422` | current status does not allow the transition to `approved` (e.g. already decided) | `invalid_transition` → toast(envelope `message`) + re-fetch |
| `0` / `≥500` | network / server error | `transient` → no change + retryable toast |

The client discards `data` and re-fetches the current filter+page; only `envelope.message` and `envelope.success` are used.

---

## 3. `POST /admin/withdrawals/{id}/reject`

`{id}` = `withdrawal.id`. Request: **no body** (a withdrawal rejection takes no reason — unlike cook/driver rejection).

Response `200` — same object shape as §2 with `"status": "rejected"` and `processed_at` populated. `message`: `Withdrawal request rejected.`

Errors: `404` and `422` as in §2 (`422` = current status does not allow rejection). `0`/`≥500` → `transient`.

---

## 4. `POST /admin/withdrawals/{id}/mark-paid`

`{id}` = `withdrawal.id`. Used after approval, once the transfer has actually happened outside the dashboard. Request: **no body**.

Response `200` — same object shape as §2 with `"status": "paid"`. `message`: `Withdrawal request marked paid.`

Errors:

| Code | Meaning | Client outcome |
|---|---|---|
| `404` | request not found | `not_found` → toast + re-fetch |
| `422` | request is **not** in `approved` status | `invalid_transition` → toast(envelope `message`) + re-fetch |
| `0` / `≥500` | network / server error | `transient` → no change + retryable toast |

---

## Contract notes for tests

- `fetchMock` keys are `"<METHOD> <path>"` **including the query string**. Assert the exact strings the hook builds:
  - `all` filter, page 1 → `GET /admin/withdrawals?page=1`
  - `pending` filter, page 2 → `GET /admin/withdrawals?status=pending&page=2`
- The three action calls MUST be sent with `method: "POST"`, **no `body`**, and the bearer header. Assert `lastCall(...)` has `body === undefined` and a non-null `authorization`.
- Post-action re-fetch: configure the list key with **ordered replies** — the pre-action page, then the post-action page.
- `401` on any of the four calls must reach the Phase 1 `unauthorizedHandler` (token-bearing `401`), ending the session.

# Contract — External API: Dashboard Reports / Overview

Feature: `008-dashboard-reports-overview` · Source: `admin-dashboard-api.md` Phase 8

One endpoint, under `/admin`, requiring `Authorization: Bearer <token>` + `Accept: application/json`, returning the standard envelope `{ success, data, message, errors }`. The dashboard calls it through `authedRequest` in `src/overview/overviewApi.ts`; a `401` is handled by the Phase 1 `unauthorizedHandler` and never surfaces to feature code.

Error responses:

| HTTP | When | Envelope `message` | Client handling |
|---|---|---|---|
| `401` | token missing / invalid | `Unauthenticated.` | Phase 1 session-loss → `/login` (FR-001). On the **first** load the screen is unmounted by the redirect; on a **refresh** likewise — no local error state is shown. |
| `403` | signed in but not `admin` | `You do not have permission to perform this action.` | Not reachable — `<RequireAdmin>` gates the shell (FR-001). If seen, treated as a generic load/refresh failure. |
| `500` | unexpected | `Something went wrong. Please try again.` | First load → screen `error` state + **Retry** (FR-011). Refresh → keep last good figures + "couldn't refresh" notice + retry (FR-014). |
| `0` | network / offline / non-JSON | (synthetic) | Same as `500`. |

There is **no `404`** and **no `422`** — the endpoint takes no parameters and returns a singleton computed view.

---

## `GET /admin/reports/overview`

Fetch the live platform overview snapshot for the dashboard home screen. Computed on every request, no caching.

**Request**: no query params, no body.

```
GET /admin/reports/overview
Authorization: Bearer <token>
Accept: application/json
```

**Response `200`**

```jsonc
{
  "success": true,
  "data": {
    "users_by_role": {
      "customer": 1240,
      "cook": 85,
      "driver": 60,
      "admin": 3
    },
    "orders_by_status": {
      "pending": 12,
      "accepted": 5,
      "preparing": 8,
      "ready_for_pickup": 2,
      "assigned_to_driver": 3,
      "picked_up": 1,
      "on_the_way": 4,
      "delivered": 6,
      "completed": 980,
      "cancelled": 47,
      "pending_review": 2,
      "quoted": 1
    },
    "total_sales_revenue": 154300.0
  },
  "message": "OK",
  "errors": null
}
```

| Field | Meaning | Client treatment |
|---|---|---|
| `users_by_role` | count of users per role (`customer` / `cook` / `driver` / `admin`) | Read as `Partial<Record<Role, number>>`. A missing role key → `0` (FR-017). Extra/unknown keys are ignored (roles are a closed set). |
| `orders_by_status` | count of orders per `OrderStatus` | Read as `Record<string, number>`. A missing known status → `0` (FR-017). A key that is **not** one of the twelve known statuses → still shown, with a fallback label, appended after the known rows (FR-018). |
| `total_sales_revenue` | sum of `total` over `completed` orders only | Coerced with `Number(x)`; non-finite / negative / missing → `0`. Rendered via `formatCurrency` ("`154,300.00 ج.م`"). The "completed orders only" scope is shown on the card (FR-007). |

**Client** — `getOverview(signal?: AbortSignal): Promise<RawOverview>`

- Path is exactly `/admin/reports/overview` — **no query string**, no body.
- Called: once on mount; on **Retry** after a failed first load; on every manual **Refresh**; on every 60-second interval tick **while the tab is visible**; once immediately when the tab returns to visible (FR-016).
- Resolves with `data` (the `RawOverview`) on `res.ok && success === true`; the caller passes it to `normalizeOverview`.
- Rejects with `ApiError` otherwise. `status === 0` for transport/parse failures, `>= 500` for server errors — both are "transient" to the caller.
- A `401` triggers the shared `unauthorizedHandler` inside `apiRequest` before the rejection reaches this function's callers.

---

## Request-shape assertions (tests)

`fetchMock` keys carry no query string for this feature. Integration tests assert:

| Call | Method + path | Body | Auth header |
|---|---|---|---|
| initial load | `GET /admin/reports/overview` | none | `Bearer <token>` |
| retry after failed load | `GET /admin/reports/overview` (ordered 2nd reply) | none | `Bearer <token>` |
| manual refresh | `GET /admin/reports/overview` (ordered next reply) | none | `Bearer <token>` |
| 60 s tick while visible | `GET /admin/reports/overview` (ordered next reply) | none | `Bearer <token>` |
| tick while hidden | — | — | **no call** |
| on tab → visible | `GET /admin/reports/overview` (ordered next reply) | none | `Bearer <token>` |

Assertions that must hold across the suite:

- A single mount issues **exactly one** `GET /admin/reports/overview`.
- A manual **Refresh** click issues **exactly one** more, even under rapid repeated clicks (button `disabled` + `aria-busy` while in flight; single-flight guard).
- Advancing fake timers by `REFRESH_INTERVAL_MS` while `document.visibilityState === 'hidden'` issues **zero** calls.
- Advancing fake timers by `REFRESH_INTERVAL_MS` while visible issues **exactly one** call.
- Dispatching `visibilitychange` after setting `visibilityState` back to `'visible'` issues **exactly one** call immediately.
- The overlap case (a tick and a visibility-regain within the same frame) issues **at most one** concurrent call (the second is dropped by the guard).
- On a rejected call, no request is recorded as a "success" — `lastUpdated` does not advance and (on refresh) `snapshot` is unchanged.

# Contract — External API: Platform Settings

Feature: `006-platform-settings` · Source: `admin-dashboard-api.md` Phase 6

Both endpoints are under `/admin`, require `Authorization: Bearer <token>` + `Accept: application/json`, and return the standard envelope `{ success, data, message, errors }`. The dashboard calls both through `authedRequest` in `src/settings/settingsApi.ts`; a `401` is handled by the Phase 1 `unauthorizedHandler` and never surfaces to feature code.

Shared error responses (both endpoints):

| HTTP | When | Envelope `message` | Client handling |
|---|---|---|---|
| `401` | token missing / invalid | `Unauthenticated.` | Phase 1 session-loss → `/login` (FR-021) |
| `403` | signed in but not `admin` | `You do not have permission to perform this action.` | not reachable — `<RequireAdmin>` gates the shell (FR-022); treated as a generic `transient` error if seen |
| `422` | validation (negative / non-numeric / missing `delivery_fee`) | `The given data was invalid.` (+ `errors`) | `validation` outcome → message shown **under the field**, saved fee unchanged, entered value kept (FR-014 / FR-020) |
| `500` | unexpected | `Something went wrong. Please try again.` | `transient` outcome → retryable toast, nothing changes (FR-015 / FR-024) |
| `0` | network / offline / non-JSON | (synthetic) | same as `500` — `transient` |

There is **no `404`** for either endpoint — `/admin/settings` is a singleton platform record.

---

## 1. `GET /admin/settings`

Fetch the current platform settings for display.

**Request**: no params, no body.

**Response `200`**

```jsonc
{
  "success": true,
  "data": { "delivery_fee": 25.0 },
  "message": "OK",
  "errors": null
}
```

**Client** — `getSettings(signal?: AbortSignal): Promise<PlatformSettings>`
- Called on mount and on **Retry** after a failed load, and opportunistically once after a save whose `200` body was unreadable (FR-018).
- `data.delivery_fee` is stored as `savedFee` (a JS `number`); the editable field is seeded with `savedFee.toFixed(2)`.
- A rejected call → screen `error` state + Retry, with **no** editable value shown (FR-004). There is no "value already shown" nuance — any load failure is the screen error state.

---

## 2. `PUT /admin/settings`

Replace the delivery fee.

**Request body**

```json
{ "delivery_fee": 30 }
```

| Field | Rules |
|---|---|
| `delivery_fee` | required, numeric, `min:0`. The client sends a JS **number** (e.g. `30`, `30.5`), never a string. Client pre-submit validation blocks empty, non-numeric, negative, and `> 2` decimal places (FR-008/FR-009/FR-010) so those never reach the wire; the backend re-checks `required` / `numeric` / `min:0`. No maximum is enforced by either side. |

**Response `200`**

```jsonc
{
  "success": true,
  "data": { "delivery_fee": 30.0 },
  "message": "Delivery fee updated.",
  "errors": null
}
```

**Response `422`** (negative, non-numeric, or missing value)

```jsonc
{
  "success": false,
  "data": null,
  "message": "The given data was invalid.",
  "errors": { "delivery_fee": ["يجب أن تكون القيمة صفراً أو أكثر."] }
}
```

**Client** — `updateSettings(delivery_fee: number): Promise<PlatformSettings>`
- Body is exactly `{ delivery_fee: <number> }`.
- `200` → success outcome: adopt the sent value as `savedFee` (the `data.delivery_fee` echo is equivalent; if the body is unreadable the sent value is used and a background `GET /admin/settings` resync is issued — FR-018), reseed `draft` from it, clear any field error, show a success toast using the envelope `message` (fallback `messages.updatedToast`) (FR-012 / FR-019).
- `422` → `validation` outcome: `errors.delivery_fee[0]` (or the envelope `message` if the map is absent/empty) is shown **under the field**; `savedFee` and the entered value are left unchanged; **no** toast, **no** GET (FR-014 / FR-020).
- `0` / `≥ 500` / any other unexpected status → `transient`: nothing changes, a retryable "please try again" toast, the entered value preserved (FR-015 / FR-024).
- **No confirmation dialog** precedes this call — Save submits directly (Clarifications 2026-09-07).

---

## Request-shape assertions (tests)

`fetchMock` keys carry no query string for this feature. Integration tests assert:

| Call | Method + path | Body | Auth header |
|---|---|---|---|
| load / retry | `GET /admin/settings` | none | `Bearer <token>` |
| save | `PUT /admin/settings` | `{ delivery_fee: <number> }` — a JS number, not a string (e.g. `30`, `30.5`, `0`) | `Bearer <token>` |
| post-save resync (unreadable-body case only) | `GET /admin/settings` (ordered 2nd reply) | none | `Bearer <token>` |
| retry-after-failed-load | `GET /admin/settings` (ordered 2nd reply) | none | `Bearer <token>` |

Assertions that must hold across the suite:
- A pre-submit-invalid Save (empty / non-numeric / negative / `> 2` decimals) produces **zero** `PUT /admin/settings` calls.
- A single confirmed Save produces **exactly one** `PUT`, even under rapid repeated clicks (Save disabled + `aria-busy` while in flight).
- The `PUT` body value is a number: `expect(fm.lastCall('PUT /admin/settings')?.body).toEqual({ delivery_fee: 30 })`.

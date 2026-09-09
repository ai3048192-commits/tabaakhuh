# Contract — External API: Orders Oversight

Feature: `007-orders-oversight`

The one backend endpoint this feature consumes, from `admin-dashboard-api.md` Phase 7. **Read-only** — no write endpoints. All requests carry `Authorization: Bearer <token>` + `Accept: application/json` via `authedRequest`. Standard envelope `{ success, data, message, errors }`.

---

## `GET /admin/orders`

One server-paginated page of orders across the platform.

**Access**: `auth:sanctum` + `role:admin`. A missing/invalid token → `401`; a signed-in non-admin → `403` (never reached — `<RequireAdmin>` gates the route).

### Query parameters

| Param | Type | Sent by the client when | Notes |
|---|---|---|---|
| `status` | enum | a specific status is chosen (not "all") | one of the 12 `OrderStatus` values (below). Omitted entirely for "all statuses". An unrecognised value → `422`. |
| `city_id` | int | a city is chosen | the **cook's** city id. A city that exists but is deactivated is **accepted**. A non-existent id → `422`. Options come from the memoised city directory (`fetchCityDirectory`). |
| `placed_from` | `YYYY-MM-DD` | always in a live filter set (default = 30 days ago, Africa/Cairo) | start of that day, Cairo time. |
| `placed_to` | `YYYY-MM-DD` | only when the range has an explicit end | backend snaps to `23:59:59` Cairo time. Omitted → open-ended. An unparseable date → `422`. `placed_from` later than `placed_to` → `422` (the client also blocks this locally before sending). |
| `page` | int | **always** | default `1`; `per_page` is fixed at `20` by the backend. |

**Client query construction** (`buildOrdersQuery`, params in this fixed order): `?[status=…&][city_id=…&][placed_from=…&][placed_to=…&]page=N`. Examples:

- Default view, page 1: `GET /admin/orders?placed_from=2026-08-08&page=1`
- Filtered: `GET /admin/orders?status=completed&city_id=3&placed_from=2026-09-01&placed_to=2026-09-06&page=2`

### `OrderStatus` values (12)

`pending` · `accepted` · `preparing` · `ready_for_pickup` · `assigned_to_driver` · `picked_up` · `on_the_way` · `delivered` · `completed` · `cancelled` · `pending_review` · `quoted`

### Response `200` — `data` shape

```jsonc
{
  "success": true,
  "data": {
    "items": [
      {
        "id": 901,
        "order_number": "ORD-2026-000901",
        "customer_id": 55,
        "cook_id": 12,
        "cook_name": "مطبخ أم أحمد",
        "cook_avatar_url": "https://cdn/.../avatar.jpg",   // or null
        "type": "regular",                                  // "regular" | "custom"
        "status": "completed",                              // OrderStatus
        "delivery_address_id": 88,
        "requested_delivery_date": "2026-09-05",            // YYYY-MM-DD
        "delivery_time_slot": "13:00-15:00",
        "subtotal": 180.0,
        "delivery_fee": 25.0,
        "total": 205.0,
        "customer_note": "بدون شطة",                        // or null
        "cancel_reason": null,                              // string when status === "cancelled"
        "items": [
          { "id": 1, "dish_id": 300, "item_name": "كشري", "unit_price": 45.0, "quantity": 4, "line_total": 180.0 }
        ],
        "custom_details": null,                             // object when type === "custom" (below)
        "quote": null,                                      // ALWAYS null here — ignored by the client
        "status_history": []                                // ALWAYS [] here — ignored by the client
      }
    ],
    "page": 1,
    "per_page": 20,
    "total": 42
  },
  "message": "OK",
  "errors": null
}
```

`custom_details` (only for `type: "custom"`):

```jsonc
{
  "occasion_type": "زفاف",
  "guest_count": 120,
  "requested_dishes_text": "أرز، خروف، حلويات",
  "budget_min": 5000.0,
  "budget_max": 8000.0,
  "requested_delivery_date_time": "2026-10-01T18:00:00+02:00"
}
```
Any of these fields may be `null`/absent — the detail renders only the ones present.

- The client reads `per_page` from the response; it does not hard-code `20`.
- `quote` and `status_history` are **never** read or rendered (FR-026). A future phase populates a reserved slot from a different endpoint.
- A page number past the last page returns `items: []` with the requested `page` and the real `total`.

### Error responses

| Status | When | Client handling |
|---|---|---|
| `422` | invalid `status` value | envelope `errors.status` (or `message`) → inline message on the status control; list not updated (FR-015). The control only offers valid values, so this is a safeguard. |
| `422` | non-existent `city_id` | `errors.city_id` (or `message`) → inline message on the city control; list not updated (FR-015). Safeguard — options are real cities. |
| `422` | unparseable `placed_from` / `placed_to` | `errors.placed_from` / `errors.placed_to` (or `message`) → inline message on the date fields; list not updated (FR-015). |
| `422` | `placed_from` later than `placed_to` | client blocks this **before** sending (local `validateDateRange`); if the server still returns it, surfaced as an inline date-field message, results unchanged (FR-014). |
| `401` | missing/expired token | Phase 1 `unauthorizedHandler` → `clearSession()` → redirect `/login` (FR-029). Never surfaced in-feature. |
| `403` | non-admin | not reachable — `<RequireAdmin>` gates the route (FR-030). |
| `0` (transport) / `>= 500` | offline, DNS, proxy, server error | first load with nothing shown → screen "something went wrong" + Retry (FR-008); a failed refresh/auto-refresh with a page shown → keep the page + transient toast (FR-032). |
| non-JSON / malformed envelope | proxy/error page | `ApiError(0 or status, …)` → treated as transport failure above. |

### Idempotency / methods

`GET` only. This feature issues **no** `POST` / `PUT` / `PATCH` / `DELETE` — there is no control anywhere that changes an order (FR-028).

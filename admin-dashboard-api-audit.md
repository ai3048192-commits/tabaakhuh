# Admin Dashboard API — Coverage Audit

Audit of [admin-dashboard-api.md](admin-dashboard-api.md) Section A (21 endpoints) against the
codebase on branch `feat/home-discovery-endpoints` (2026-09-08).

**Bottom line:** all 21 endpoints are routed and implemented
([routes/api.php](../routes/api.php) lines 232–260), and response shapes match the contract
almost everywhere. The gaps are in **error semantics** (wrong HTTP status codes) and one
**timezone** decision. Nothing is missing; 8 endpoints diverge on error behavior.

## Endpoint-by-endpoint

| # | Endpoint | Routed | Shape | Errors |
|---|----------|--------|-------|--------|
| 1 | `POST /auth/login` | yes | ok | ok (throttled `login`+`login-ip`) |
| 2 | `GET /auth/me` | yes | ok | ok |
| 3 | `POST /auth/logout` | yes | ok, msg `"Logged out successfully."` | ok |
| 4 | `GET /admin/cooks/pending` | yes | ok (incl. `contract` block) | ok |
| 5 | `POST /admin/cooks/{id}/approve` | yes | ok | **404 → 409**, not-pending **422 → 409** (D1, D2) |
| 6 | `POST /admin/cooks/{id}/reject` | yes | ok (`reason` 1–1000) | same as #5 |
| 7 | `GET /admin/drivers/pending` | yes | ok | ok |
| 8 | `POST /admin/drivers/{id}/approve` | yes | ok | **404 → 409**, not-pending **422 → 409** (D1, D2) |
| 9 | `POST /admin/drivers/{id}/reject` | yes | ok | same as #8 |
| 10 | `GET /admin/withdrawals` | yes | ok, `per_page`=20 in body | **invalid `status` → 500**, not 422 (D3) |
| 11 | `POST /admin/withdrawals/{id}/approve` | yes, no body | ok | **404 → 409**, bad transition **422 → 409** (D1, D2) |
| 12 | `POST /admin/withdrawals/{id}/reject` | yes, no body | ok | same as #11 |
| 13 | `POST /admin/withdrawals/{id}/mark-paid` | yes, no body | ok | same as #11 |
| 14 | `GET /admin/cities` | yes | ok, unpaginated, incl. inactive | ok |
| 15 | `POST /admin/cities` | yes | ok, 201, `"City created."` | ok (dup name → 422) |
| 16 | `PUT /admin/cities/{id}` | yes | ok | **empty body `{}` → 200 no-op**, contract wants 422 (D6) |
| 17 | `PATCH /admin/cities/{id}/status` | yes | ok | ok |
| 18 | `GET /admin/settings` | yes | ok, `{delivery_fee}` | ok |
| 19 | `PUT /admin/settings` | yes | ok, `"Delivery fee updated."` | ok (`errors.delivery_fee` keyed) |
| 20 | `GET /admin/orders` | yes | ok, `quote`=null, `status_history`=[], `per_page`=20 | **UTC not Africa/Cairo** (D4); filter errors return `errors:null` (D5) |
| 21 | `GET /admin/reports/overview` | yes | ok | ok |

## Divergences (ranked)

### D1 — "not found" returns 409, not 404 (endpoints 5, 6, 8, 9, 11, 12, 13)

`ApproveCookUseCase` line 28 throws `CookApplicationNotPendingException('Application not found.')`
and `ApproveWithdrawalUseCase` line 38 throws
`InvalidWithdrawalTransitionException('Withdrawal request not found.')`. Both exceptions have
`httpStatus() => 409`. A missing `{id}` therefore returns **409 with a misleading message**,
where the contract (and REST) expect **404**. Same pattern in the Reject / MarkPaid / Driver
use cases.

### D2 — invalid transition / not-pending returns 409, not 422 (same 7 endpoints)

`CookApplicationNotPendingException`, `DriverApplicationNotPendingException`,
`InvalidWithdrawalTransitionException`, `WithdrawalConflictException` all hardcode
`httpStatus() => 409`. Contract explicitly says **422** ("الطلب ليس pending" /
"الحالة الحالية لا تسمح بالانتقال"). The `message` text *is* passed through verbatim
([bootstrap/app.php](../bootstrap/app.php) line 92), so only the status code is wrong.
Existing tests bake in the 409 (`tests/Feature/Api/V1/AdminWithdrawalTest.php` line 77).

### D3 — `GET /admin/withdrawals?status=<invalid>` → 500 (endpoint 10)

`AdminWithdrawalController` line 40 calls `WithdrawalStatus::from(...)` unguarded. An unknown
value throws `\ValueError`, which no handler branch catches → **500 "Something went wrong."**
Contract wants **422**. (`GET /admin/orders` does this correctly via `OrderStatus::tryFrom` +
`InvalidOrderFilterException`.)

### D4 — `GET /admin/orders` day boundaries are UTC, not Africa/Cairo (doc Decision #1)

`APP_TIMEZONE=UTC` (`.env` line 5, `config/app.php` line 68). `AdminOrderController::parseDate`
(lines 62–67) builds `new \DateTimeImmutable('2026-09-05')` (→ UTC midnight) and
`setTime(23,59,59)` (→ UTC), and `EloquentOrderRepository::searchAllOrders` (lines 223–227)
compares raw against `orders.created_at` (UTC). **Result: a 2–3h skew vs. the frontend's Cairo
assumption.** This is the doc's open Decision #1 — currently answered "UTC" by the code.

Fix if Cairo stands: parse with `new DateTimeImmutable($v, new DateTimeZone('Africa/Cairo'))`
(and the end-of-day `setTime` on that zone), or set `APP_TIMEZONE`.

### D5 — `GET /admin/orders` filter errors have `errors: null`

Invalid `status` / `city_id` / unparseable date all raise `InvalidOrderFilterException` (a
`DomainException`), and `bootstrap/app.php` lines 91–93 render domain exceptions as
`{success:false, message:<reason>, errors:null}`. Contract Phase 7 asks for keyed
`errors.status` / `errors.city_id` / `errors.placed_from`. The reason is human-readable in
`message`, so this only matters if the frontend keys off `errors`.

### D6 — `PUT /admin/cities/{id}` with no fields → 200 no-op

`UpdateCityRequest` has both fields `sometimes`; `UpdateCityUseCase` lines 26–27 coalesce to
current values. Contract wants 422 "لا حقل مُرسَل". Minor.

### D7 (trivial) — login success `message`

`"Logged in successfully."` not `"OK"`. Frontend ignores `message` on login; no action.

## The 3 decisions the doc asks for

1. **Timezone** — code currently evaluates in **UTC** (D4). If the frontend's Cairo assumption
   stands, `AdminOrderController::parseDate` needs an `Africa/Cairo` `DateTimeZone` (or an
   `APP_TIMEZONE` change).
2. **`per_page` fixed at 20, returned in body** — already true for both `withdrawals`
   (`config('wallet.per_page', 20)`) and `orders` (`config('admin.orders_per_page')`,
   env-overridable, defaults 20). Both echo `per_page` in the response.
3. **Withdrawal actions bodyless, `422` message shown literally** — bodyless is correct
   (controllers take only `int $id`, no FormRequest). Message text passes through literally,
   but **status is 409, not 422** (D2).

## Suggested fix order

1. D3 (500 bug) — guard `WithdrawalStatus::from` → 422, mirror `AdminOrderController`.
2. D1 + D2 (status codes) — split "not found" into a 404 exception; drop
   not-pending/transition exceptions to 422. Update `AdminWithdrawalTest` expectations.
3. D4 — confirm Cairo vs UTC with frontend, then adjust `parseDate`.
4. D5, D6 — low priority, only if the frontend needs them.

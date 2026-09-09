# Quickstart & Validation: Platform Settings

Feature: `006-platform-settings` · Date: 2026-09-07

How to run the dashboard against the settings backend and verify every acceptance scenario from [spec.md](./spec.md). Design details live in [plan.md](./plan.md), [research.md](./research.md), [data-model.md](./data-model.md), and [contracts/](./contracts/).

---

## Prerequisites

- Node ≥ 20; `npm install` completed.
- Phase 1 (`001-admin-auth-session`) implemented and working — this feature reuses its session, transport (`authedRequest` / `setTokenProvider`), and route guard.
- A reachable backend implementing `admin-dashboard-api.md` **Phase 6**: `GET /admin/settings`, `PUT /admin/settings`.
- Seed data: a configured `delivery_fee` (any non-negative number, e.g. `25`).
- An `admin` test account (from Phase 1) and one non-`admin` account (for FR-022).

## Setup

```bash
cp .env.example .env
# VITE_API_BASE_URL=https://<your-host>/api/v1   (same var as Phase 1)
npm install
npm run dev            # http://localhost:5173  → sign in, open /settings (sidebar: "إعدادات النظام")
```

## Automated checks

```bash
npm run test           # Vitest watch (unit + integration + a11y)
npm run test:run       # single pass, for CI
npm run build          # vite build (tsc) must pass
```

| Suite | File | Covers |
|---|---|---|
| Fee validation | `tests/unit/feeValidation.test.ts` | `validateFeeInput` — required, non-numeric, negative, `>2` decimals, `0`, trimmed, large (FR-008/009/010/011, SC-004) |
| Mutation outcome | `tests/unit/settingsMutationOutcome.test.ts` | `classifySettingsMutation` — `null`→ok, `422`+errors→validation(field), `422` bare→validation(form), `0`/`5xx`/other→transient (data-model §4) |
| Transport (regression) | `tests/unit/authedRequest.test.ts`, `tests/unit/envelope.test.ts` | **pre-existing** — must stay green after `HttpOptions.method` gains `'PUT'` |
| View / load | `tests/integration/settings-view.test.tsx` | US1 AC1–4, FR-001–005, FR-022, SC-001/007 |
| Update | `tests/integration/settings-update.test.tsx` | US2 AC1–9, FR-006–016, FR-018–020, FR-023/024, SC-002/003/004/005/006 |
| Session / access | `tests/integration/settings-session.test.tsx` | FR-021 (`401` → `/login`), FR-022 (non-admin never reaches `/settings`) |
| Settings a11y (axe) | `tests/a11y/settings-a11y.test.tsx` | FR-026/027, SC-008 (automated portion), SC-009 (RTL smoke) |

> `fetchMock` keys are `"<METHOD> <path>"` with **no query string** for this feature. Tests assert `GET /admin/settings` (no body) and `PUT /admin/settings` with body `{ delivery_fee: <number> }` (a JS number, e.g. `30` — never `"30"`). The retry-after-failed-load and the unreadable-body resync are exercised with **ordered replies** on the `GET /admin/settings` key. A pre-submit-invalid Save must produce **zero** `PUT` calls; a confirmed Save exactly **one**.
> jsdom cannot evaluate colour contrast, true focus visibility, or real RTL glyph layout — those parts of SC-008/SC-009 stay in the manual checklist below.

---

## Manual validation scenarios

Run against `npm run dev`, signed in as `admin`, on `/settings`. Use the Network tab to inspect requests and bodies.

### US1 — View the current delivery fee (P1)

1. **Fee shown as EGP amount (AC1, FR-001/002)** — open `/settings`. → One `GET /admin/settings` with the bearer header; the current delivery fee is shown as an Egyptian-pound amount (e.g. "25.00 ج.م"), matching `data.delivery_fee`.
2. **Loading state (AC2, FR-003)** — throttle the network and reload. → A loading indicator shows first; the fee field and **Save** are not yet present.
3. **Failed load → error + Retry (AC3, FR-004/005)** — set Network to Offline and reload `/settings`. → A "حدث خطأ ما. حاول مرة أخرى." panel with a **Retry** button; **no** editable fee value is shown. Go back online and click Retry → a second `GET /admin/settings`; the fee appears and the form becomes usable.
4. **Non-admin (FR-022)** — sign in as a non-admin (or drop the role). → `/settings` is not reachable; the admin shell redirects as for every other admin route.

### US2 — Update the delivery fee (P2)

1. **Save disabled while unchanged (AC1, FR-007)** — on load, without touching the field. → **Save** is disabled.
2. **Save enables on valid change (AC2, FR-007)** — change the value to a different valid amount (e.g. `25` → `30`). → Save becomes enabled.
3. **Revert re-disables Save (AC9, FR-016)** — after changing it, type the original value back (`30` → `25`, or `25.0`, or `" 25 "`). → Save is disabled again and any field error clears. Formatting-only changes never enable Save.
4. **Negative blocked (AC4, FR-008)** — enter `-5` → attempt Save. → A field message "لا يمكن أن تكون الرسوم بالسالب."; Save stays disabled; **no** `PUT` in the Network tab.
5. **Empty / non-numeric blocked (AC5, FR-009)** — clear the field, or type `abc` / `1.2.3` → attempt Save. → "أدخل قيمة رسوم التوصيل." / "أدخل رقماً صحيحاً." under the field; no request.
6. **More than two decimals blocked (FR-010, Clarifications)** — enter `30.005` → attempt Save. → "استخدم رقمين عشريين على الأكثر." under the field; **no** rounding, **no** request.
7. **Zero is valid (FR-011)** — enter `0` → Save. → One `PUT /admin/settings` body `{ "delivery_fee": 0 }`; success.
8. **Happy path (AC3, FR-012/019, SC-002)** — enter a valid new amount → Save. → Exactly one `PUT /admin/settings` body `{ "delivery_fee": <number> }` with the bearer header; on `200` the displayed current fee updates to the new value and a success toast shows the server message ("Delivery fee updated."). **No** confirmation dialog appears before the request.
9. **Backend validation error (AC6, FR-014/020, SC-005)** — configure the backend to reject the value (e.g. a value it considers out of range) → Save. → `422`; the response's message appears **under the field**; the displayed current fee is unchanged; the entered value stays in the field for correction; no toast.
10. **In-flight lock (AC7, FR-013, SC-006)** — throttle the network, Save, then hammer the button. → Save is disabled and shows "جارٍ الحفظ…"; exactly one `PUT` goes out.
11. **Transient failure (AC8, FR-015/024)** — go Offline, Save. → The displayed fee is unchanged; the entered value is preserved; a retryable "تعذّر حفظ التغيير. حاول مرة أخرى." toast.
12. **Unreadable success body (FR-018)** — make the backend return `200` with a non-JSON/empty body on the `PUT`. → The change is still treated as applied: success toast, the displayed fee updates to the value you sent, and a follow-up `GET /admin/settings` is issued to resync.
13. **Discard on navigation (FR-017, Clarifications)** — change the field but do **not** save; navigate to another sidebar screen and back to `/settings`. → No prompt; the change is gone; the field shows the saved fee from a fresh `GET`.

### Session loss (FR-021)

1. On `/settings`, revoke the token server-side (or corrupt the stored token in DevTools), then trigger a call (Retry, or Save). → `401` → the Phase 1 handler clears the session and redirects to `/login`; no broken view.

### Accessibility — WCAG 2.1 AA (FR-026/027, SC-008) and RTL (FR-026, SC-009)

Automated: `tests/a11y/settings-a11y.test.tsx` must report **zero** axe violations on the loading state, the error+Retry panel, the pristine form, the form showing a field error, and the saving state.

Manual sign-off (keyboard only + a screen reader — VoiceOver / NVDA):

- [ ] Tab reaches the fee field and the Save button in a sensible order; visible focus ring throughout.
- [ ] The fee field has a programmatic label; its unit (Egyptian pounds) is announced (via `aria-describedby` or label text), not conveyed by the visual suffix alone.
- [ ] A field validation error is programmatically associated with the input (`aria-describedby` + `aria-invalid`) and is announced when it appears / changes.
- [ ] The Save button exposes its busy state (`aria-busy`) while saving; its label change to "جارٍ الحفظ…" is announced.
- [ ] Success and retry messages are announced via the `aria-live` region without moving the pointer.
- [ ] Colour contrast of the button, field border, field text, error text, and toast text meets AA (brand red `#7a0d0d`).
- [ ] RTL: the whole screen — heading, current-fee line, field + label + unit, Save button, error text, loading and error states — lays out right-to-left with nothing clipped, mis-mirrored, or overlapping; the number and its unit read left-to-right within their span.

---

## Definition of done for this feature

- All Vitest suites green; `npm run test:run` and `npm run build` clean; the pre-existing `tests/unit/authedRequest.test.ts` and `tests/unit/envelope.test.ts` still pass after `HttpOptions.method` gains `'PUT'`.
- Every manual scenario above passes against a real Phase 6 backend.
- The a11y manual checklist is fully ticked and `vitest-axe` shows zero violations.
- `/settings` renders `SettingsPage` inside `<RequireAdmin>`; `src/pages/Settings.tsx` is deleted; `src/App.tsx` imports `SettingsPage`; `Sidebar.tsx` is unchanged.
- No feature module reads the bearer token directly; both calls go through `authedRequest`.
- Save sends `PUT /admin/settings` body `{ delivery_fee: <number> }` (a JS number); a pre-submit-invalid Save sends nothing; a confirmed Save sends exactly one `PUT`; there is no confirmation dialog and no navigation-block prompt.
- A negative, empty, non-numeric, or `>2`-decimal value is rejected in the screen with a field message and no request; `0` is accepted; no upper bound is imposed by the client.

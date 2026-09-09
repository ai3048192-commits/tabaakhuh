# Quickstart & Validation: Driver Applications Review

Feature: `003-driver-applications-review` · Date: 2026-09-07

How to run the dashboard against the driver-review backend and verify every acceptance scenario from [spec.md](./spec.md). Design details live in [plan.md](./plan.md), [research.md](./research.md), [data-model.md](./data-model.md), and [contracts/](./contracts/).

---

## Prerequisites

- Node ≥ 20; `npm install` completed.
- Phase 1 (`001-admin-auth-session`) and Phase 2 (`002-cook-applications-review`) implemented and working — this feature reuses their session, transport (`authedRequest` / `setTokenProvider`), route guard, city directory (`src/cities/`), and the promoted `src/review/` viewer.
- A reachable backend implementing `admin-dashboard-api.md` **Phase 3** (`GET /admin/drivers/pending`, `POST /admin/drivers/{id}/approve`, `POST /admin/drivers/{id}/reject`) and **Phase 5** `GET /admin/cities` (read-only here).
- Seed data: at least 3 driver profiles with `approval_status: "pending"` — with **distinct** `submitted_at` values; at least two sharing a `submitted_at` (to check the `id` tie-break); at least one with a `null` verification-document URL (e.g. `license_url: null`); at least one with an empty/missing vehicle field (e.g. `vehicle_plate_letters: ""`); at least one whose `city_id` is **not** in `GET /admin/cities`.
- An `admin` test account (from Phase 1).

## Setup

```bash
cp .env.example .env
# VITE_API_BASE_URL=https://<your-host>/api/v1   (same var as Phases 1–2)
npm install
npm run dev            # http://localhost:5173  → sign in, open the "طلبات السائقين" sidebar entry (/drivers)
```

## Automated checks

```bash
npm run test           # Vitest watch (unit + integration + a11y)
npm run test:run       # single pass, for CI
npm run build          # tsc + vite build must pass
```

| Suite | File | Covers |
|---|---|---|
| Queue ordering | `tests/unit/driverSortQueue.test.ts` | FR-010, SC-010 |
| Outcome classifier (if extracted) | `tests/unit/driverOutcome.test.ts` | FR-014/019/023/024/025/026/027 |
| Review queue (list) | `tests/integration/driver-review-list.test.tsx` | US1 AC1–6, FR-001–011, FR-032, SC-007 |
| Approve | `tests/integration/driver-approve.test.tsx` | US2 AC1–6, FR-012–015, FR-023–026, SC-002, SC-004, SC-005 |
| Reject | `tests/integration/driver-reject.test.tsx` | US3 AC1–7, FR-016–022, SC-003 |
| Session loss | `tests/integration/driver-review-session.test.tsx` | FR-028 (401 on any call → `/login`) |
| Review a11y (axe) | `tests/a11y/driver-review-a11y.test.tsx` | FR-034, SC-009 (automated portion) |

> Also run `npm run test:run` over the **Phase 2** cook suites after the `src/review/` promotion — they must stay green with no code changes (only import paths moved).
> jsdom cannot evaluate colour contrast or true focus visibility — those parts of SC-009 stay in the manual checklist below.

---

## Manual validation scenarios

Run against `npm run dev`, signed in as `admin`, on `/drivers`. Use the Network tab to count requests and inspect bodies.

### US1 — Review the pending queue (P1)

1. **Queue + ordering (AC1, FR-006, FR-010, SC-010)** — open `/drivers`. → Every pending driver is listed, ordered by ascending `submitted_at`; two entries with the same `submitted_at` are ordered by ascending `id`; a visible count matches the number of cards; approved/rejected drivers do not appear. Reload — the order is identical.
2. **Detail fields (AC2, FR-003 / FR-003a / FR-003b / FR-003c)** — inspect a card. → driver id, vehicle type / model / year / colour, plate number + letters, **city name** (not a number), birth date (a date, no age), availability state, submission date, rating avg + count all shown. For the driver whose `city_id` is not in the cities list → the raw id is shown instead. For the driver with an empty vehicle field → that field shows `—`, the rest of the card is fine.
3. **Document viewer (AC3, FR-004 / FR-004a, SC-001)** — click the national-ID-front tile. → An in-dashboard overlay opens (the URL bar does **not** change to the file); zoom in until ID text is legible; press `→` / `←` to move across id-front → id-back → licence; press `Esc` to close and focus returns to the tile. Do it all with the keyboard only.
4. **Document unavailable (FR-005)** — the card whose document URL is `null` (or block the CDN host in DevTools). → That tile shows "document unavailable"; the viewer shows the unavailable panel for that index; approve/reject on the card still work.
5. **Empty state (AC4, FR-007)** — decide every pending application (or point at an empty queue). → "no applications awaiting review" message, not a blank area.
6. **Loading state (FR-008)** — throttle the network and open `/drivers`. → A loader/skeleton with no cards shows until the response arrives, distinct from the empty state.
7. **Refresh (AC5, FR-009)** — have a colleague (or a second tab / curl) add or decide a pending application, then click Refresh. → The list reflects the change; your scroll position is roughly kept.
8. **Volume (SC-007)** — against a seed of ~200 pending applications: the list is scrollable/interactive within ~3 s of the response and scrolls without stutter; no pagination controls appear.
9. **Queue load error (FR-032)** — set Network to Offline and reload `/drivers`. → A screen-level error with a Retry button; Retry after going online loads the list.
10. **Non-admin (FR-029)** — sign in as a non-admin (or downgrade the test account) and navigate to `/drivers`. → Access is refused by `<RequireAdmin>`; the screen never renders.

### US2 — Approve (P2)

1. **Confirm required (AC6, FR-013)** — click Approve, then Cancel in the dialog. → No `POST …/approve` in Network; the card stays.
2. **Approve happy path (AC1, FR-014, SC-002)** — click Approve, Confirm. → One `POST /admin/drivers/{id}/approve` with the bearer header and **no body**; the card disappears without a page reload; a success toast shows the envelope message.
3. **In-flight lock (AC2, FR-015, SC-005)** — throttle the network, click Approve → Confirm, then hammer both buttons. → Approve and Reject on that card are disabled with a spinner; exactly one request goes out.
4. **Already decided elsewhere (AC3, FR-023, SC-004)** — before confirming, have another client reject the same application; then Confirm. → `422`; the card is removed; an info toast shows the server's message ("no longer awaiting review"); a follow-up `GET /admin/drivers/pending` is issued.
5. **Not found (AC4, FR-024)** — delete the application server-side, then Confirm. → `404`; card removed; "could not be found" toast; queue refetched.
6. **Transient failure (AC5, FR-025)** — go Offline, Confirm. → Card stays; retryable "please try again" toast; buttons re-enabled; no local "approved" state.

### US3 — Reject with a reason (P3)

1. **Reason required (AC1–2, FR-016, FR-017, SC-003)** — click Reject; a modal opens. Leave the box empty or type only spaces. → Submit is disabled; a "reason required" message shows; no `POST …/reject` sent.
2. **Max length (AC3, FR-018)** — paste 1500 characters. → The field stops at 1000 (counter shows `1000 / 1000`); submitting never sends more than 1000.
3. **Reject happy path (AC4, FR-019)** — type a real reason, Submit. → One `POST /admin/drivers/{id}/reject` with body `{ "reason": "<text>" }`; card removed; success toast.
4. **Text preserved on failure (AC6, FR-020, FR-025)** — go Offline, Submit. → Dialog stays open with your text intact; retryable toast; Submit becomes available again when back online.
5. **Modal cancel (AC7, FR-022)** — open Reject, type something, press `Esc` or Cancel. → Dialog closes; no `POST …/reject` sent; the card stays.
6. **Already decided (AC5, FR-023)** — have another client approve the application first, then Submit. → `422`; card removed; info toast = server message; queue refetched.

### Session loss (FR-028)

1. On `/drivers`, revoke the token server-side (or corrupt `tbk.admin.auth.token` in DevTools), then trigger any of the three API calls (Refresh, or confirm an approve). → `401` → the Phase 1 handler clears the session and redirects to `/login`; no broken view.

### Sensitive documents (FR-031, SC-008)

1. Open the ID and licence images in the viewer, then navigate away from `/drivers` (e.g. to `/dashboard`).
2. In DevTools → Application → Local Storage / Session Storage / IndexedDB and Cache Storage: **no** entry holds a document image, blob, or data URL written by the dashboard.
3. Console/Network logs contain no document URLs.
4. (Known residual: the cross-origin CDN's own HTTP cache may still hold the image bytes — outside the dashboard's control, documented in research.md R4.)

### Accessibility — WCAG 2.1 AA (FR-034, SC-009)

Automated: `tests/a11y/driver-review-a11y.test.tsx` must report **zero** axe violations on the list, a card, the image viewer, `ApproveDialog`, `RejectDialog`, the empty state, and the error state.

Manual sign-off (keyboard only + a screen reader — VoiceOver / NVDA):

- [ ] Tab reaches every card's three document tiles, Approve, and Reject in a sensible order; visible focus ring throughout.
- [ ] Each document tile / image has meaningful alt text naming which document it is (national ID front / back / driving licence).
- [ ] `DocumentViewer`: focus is trapped while open; `Esc` closes; `←`/`→` move between the three documents (RTL: `←` is visually "next"); `+` / `-` / `0` zoom; focus returns to the invoking tile on close.
- [ ] `ApproveDialog` / `RejectDialog`: focus moves into the dialog on open, is trapped, and returns to the triggering button on close; `Esc` cancels with no request.
- [ ] `RejectDialog`: the textarea has an associated label; the character counter is announced via `aria-describedby`; the "reason required" state is announced.
- [ ] Success / info / retry toasts are announced via an `aria-live` region without moving the pointer.
- [ ] "No longer awaiting review" and "not found" messages are announced.
- [ ] Colour contrast of buttons, toast text, and the "unavailable" / `—` placeholder states meets AA (check the brand red `#7a0d0d` and status colours against their backgrounds).

---

## Definition of done for this feature

- All Vitest suites green — the new driver suites **and** the untouched Phase 1/2 suites; `npm run test:run` and `npm run build` clean.
- Every manual scenario above passes against a real Phase 3 + `GET /admin/cities` backend.
- The a11y manual checklist is fully ticked and `vitest-axe` shows zero violations.
- `/drivers` renders `DriverApplicationsPage` behind `<RequireAdmin>`; the `طلبات السائقين` sidebar entry navigates to it; the mocked `/delivery` screen is unchanged.
- `DialogShell` + `DocumentViewer` live in `src/review/`; `src/cooks/` re-export shims keep Phase 2 behaviour identical.
- No feature module reads the bearer token directly; all three calls go through `authedRequest`.
- No document image, blob, or data URL is written to any dashboard storage; document URLs are absent from logs.

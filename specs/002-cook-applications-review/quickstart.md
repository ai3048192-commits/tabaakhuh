# Quickstart & Validation: Cook Applications Review

Feature: `002-cook-applications-review` · Date: 2026-09-07

How to run the dashboard against the cook-review backend and verify every acceptance scenario from [spec.md](./spec.md). Design details live in [plan.md](./plan.md), [research.md](./research.md), [data-model.md](./data-model.md), and [contracts/](./contracts/).

---

## Prerequisites

- Node ≥ 20; `npm install` completed.
- Phase 1 (`001-admin-auth-session`) implemented and working — this feature reuses its session, transport, and route guard.
- A reachable backend implementing `admin-dashboard-api.md` **Phase 2** (`GET /admin/cooks/pending`, `POST /admin/cooks/{id}/approve`, `POST /admin/cooks/{id}/reject`) and **Phase 5** `GET /admin/cities` (read-only here).
- Seed data: at least 3 cook profiles with `approval_status: "pending"` — one with a signed contract dated earliest, one signed later, one with `contract: null`; at least one with a `null` verification-document URL; at least one whose `city_id` is **not** in `GET /admin/cities`.
- An `admin` test account (from Phase 1).

## Setup

```bash
cp .env.example .env
# VITE_API_BASE_URL=https://<your-host>/api/v1   (same var as Phase 1)
npm install
npm run dev            # http://localhost:5173  → sign in, go to /cooks
```

## Automated checks

```bash
npm run test           # Vitest watch (unit + integration + a11y)
npm run test:run       # single pass, for CI
npm run build          # tsc + vite build must pass
```

| Suite | File | Covers |
|---|---|---|
| Queue ordering | `tests/unit/sortQueue.test.ts` | FR-011 |
| City directory resolution | `tests/unit/cityDirectory.test.ts` | FR-003a, "City list unavailable" edge case |
| Authed request seam | `tests/unit/authedRequest.test.ts` | FR-026 |
| Review queue (list) | `tests/integration/cook-review-list.test.tsx` | US1 AC1–7, FR-001–011a, FR-029, SC-006a |
| Approve | `tests/integration/cook-approve.test.tsx` | US2 AC1–6, FR-012–015, FR-022–025, SC-002, SC-004, SC-005 |
| Reject | `tests/integration/cook-reject.test.tsx` | US3 AC1–6, FR-016–021, SC-003 |
| Session loss | `tests/integration/cook-review-session.test.tsx` | FR-026 (401 on any call → `/login`) |
| Review a11y (axe) | `tests/a11y/cook-review-a11y.test.tsx` | FR-030, SC-008 (automated portion) |

> jsdom cannot evaluate colour contrast or true focus visibility — those parts of SC-008 stay in the manual checklist below.

---

## Manual validation scenarios

Run against `npm run dev`, signed in as `admin`, on `/cooks`. Use the Network tab to count requests and inspect bodies.

### US1 — Review the pending queue (P1)

1. **Queue + ordering (AC1, FR-008, FR-011)** — open `/cooks`. → Every pending cook is listed; order is earliest `signed_at` first, then later `signed_at`, then the `contract: null` entry last; a visible count matches the number of cards; approved/rejected cooks do not appear.
2. **Detail fields (AC2, FR-003 / FR-003a)** — inspect a card. → store name, bio, **city name** (not a number), area, address, delivery radius, open/closed state, rating avg + count all shown. For the cook whose `city_id` is not in the cities list → the raw id is shown instead, card still fine.
3. **Document viewer (AC3, FR-004 / FR-004a, SC-001)** — click the national-ID-front tile. → An in-dashboard overlay opens (URL bar does **not** change to the file); zoom in until ID text is legible; press `→` / `←` to move across id-front → id-back → photo → banner; press `Esc` to close and focus returns to the tile. Do it all with the keyboard only.
4. **Document unavailable (FR-005)** — the card whose document URL is `null` (or block the CDN host in DevTools). → That tile shows "document unavailable"; approve/reject on the card still work.
5. **Contract present (AC4, FR-006)** — a card with a contract. → template version + signed date shown; "open contract" opens the PDF in the overlay (`<iframe>`); if your browser blocks inline PDF, an "open in new tab" link appears.
6. **Contract absent (AC5, FR-007)** — the `contract: null` card. → "no contract signed yet" is clearly shown; approve/reject still available.
7. **Empty state (AC6, FR-009)** — decide every pending application (or point at an empty queue). → "no applications awaiting review" message, not a blank area.
8. **Refresh (AC7, FR-010)** — have a colleague (or a second tab / curl) add or decide a pending application, then click Refresh. → The list reflects the change; your scroll position is roughly kept.
9. **Volume (SC-006a)** — against a seed of ~200 pending applications: the list is scrollable/interactive within ~3 s of the response and scrolls without stutter; no pagination controls appear.
10. **Queue load error (FR-029)** — set Network to Offline and reload `/cooks`. → A screen-level error with a Retry button; Retry after going online loads the list.

### US2 — Approve (P2)

1. **Confirm required (AC6, FR-013)** — click Approve, then Cancel in the dialog. → No `POST …/approve` in Network; the card stays.
2. **Approve happy path (AC1, FR-014, SC-002)** — click Approve, Confirm. → One `POST /admin/cooks/{id}/approve` with the bearer header and **no body**; the card disappears without a page reload; a success toast names the store.
3. **In-flight lock (AC2, FR-015, SC-005)** — throttle the network, click Approve → Confirm, then hammer both buttons. → Approve and Reject on that card are disabled with a spinner; exactly one request goes out.
4. **Already decided elsewhere (AC3, FR-022, SC-004)** — before confirming, have another client reject the same application; then Confirm. → `422`; the card is removed; an info toast shows the server's message ("no longer awaiting review"); a follow-up `GET /admin/cooks/pending` is issued.
5. **Not found (AC4, FR-023)** — delete the application server-side, then Confirm. → `404`; card removed; "could not be found" toast; queue refetched.
6. **Transient failure (AC5, FR-024)** — go Offline, Confirm. → Card stays; retryable "please try again" toast; buttons re-enabled; no local "approved" state.

### US3 — Reject with a reason (P3)

1. **Reason required (AC1–2, FR-017, SC-003)** — click Reject; leave the box empty or type only spaces. → Submit is disabled; a "reason required" message shows; no `POST …/reject` sent.
2. **Max length (AC3, FR-018)** — paste 1500 characters. → The field stops at 1000 (counter shows `1000 / 1000`); submitting never sends more than 1000.
3. **Reject happy path (AC4, FR-019)** — type a real reason, Submit. → One `POST /admin/cooks/{id}/reject` with body `{ "reason": "<text>" }`; card removed; success toast.
4. **Text preserved on failure (AC6, FR-020, FR-024)** — go Offline, Submit. → Dialog stays open with your text intact; retryable toast; Submit becomes available again when back online.
5. **Already decided (AC5, FR-022)** — have another client approve the application first, then Submit. → `422`; card removed; info toast = server message; queue refetched.

### Session loss (FR-026)

1. On `/cooks`, revoke the token server-side (or use DevTools to corrupt `tbk.admin.auth.token`), then click Refresh or open a document that triggers no call — trigger any of the three API calls. → `401` → the Phase 1 handler clears the session and redirects to `/login`; no broken view.

### Sensitive documents (FR-028, SC-007)

1. Open several ID documents in the viewer, then navigate away from `/cooks` (e.g. to `/dashboard`).
2. In DevTools → Application → Local Storage / Session Storage / IndexedDB and Cache Storage: **no** entry holds a document image, blob, or data URL written by the dashboard.
3. Console/Network logs contain no document URLs.
4. (Known residual: the cross-origin CDN's own HTTP cache may still hold the image bytes — outside the dashboard's control, documented in research.md R4.)

### Accessibility — WCAG 2.1 AA (FR-030, SC-008)

Automated: `tests/a11y/cook-review-a11y.test.tsx` must report **zero** axe violations on the list, a card, the image viewer, the contract viewer, `ApproveDialog`, `RejectDialog`, the empty state, and the error state.

Manual sign-off (keyboard only + a screen reader — VoiceOver / NVDA):

- [ ] Tab reaches every card's document tiles, Approve, and Reject in a sensible order; visible focus ring throughout.
- [ ] Each document tile / image has meaningful alt text naming which document it is.
- [ ] `DocumentViewer`: focus is trapped while open; `Esc` closes; `←`/`→` move between documents (RTL: `←` is visually "next"); `+` / `-` / `0` zoom; focus returns to the invoking tile on close.
- [ ] `ApproveDialog` / `RejectDialog`: focus moves into the dialog on open, is trapped, and returns to the triggering button on close; `Esc` cancels with no request.
- [ ] `RejectDialog`: the textarea has an associated label; the character counter is announced via `aria-describedby`; the "reason required" state is announced.
- [ ] Success / info / retry toasts are announced via an `aria-live` region without moving the pointer.
- [ ] "No longer awaiting review" and "not found" messages are announced.
- [ ] Colour contrast of buttons, toast text, and the "unavailable" / "no contract" states meets AA (check the brand red `#7a0d0d` and status colours against their backgrounds).

---

## Definition of done for this feature

- All Vitest suites green; `npm run test:run` and `npm run build` clean.
- Every manual scenario above passes against a real Phase 2 + `GET /admin/cities` backend.
- The a11y manual checklist is fully ticked and `vitest-axe` shows zero violations.
- `/cooks` renders `CookApplicationsPage` (the mocked `CooksManagement.tsx` is no longer routed).
- `authedRequest` / `setTokenProvider` added to `src/api/httpClient.ts`; no feature module reads the token directly.
- No document image, blob, or data URL is written to any dashboard storage; document URLs are absent from logs.

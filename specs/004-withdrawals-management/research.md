# Phase 0 Research: Withdrawals Management

Feature: `004-withdrawals-management` · Date: 2026-09-07

All Technical Context unknowns are resolved below. No open `NEEDS CLARIFICATION` remain — the spec resolved every underspecified point in its Assumptions section (default `pending` filter, explicit confirmation for each action, no reject reason, one fixed 20-row page at a time, filter change resets to page 1, re-fetch after each success). This document records the design decisions that follow.

---

## R1. Authenticated request seam (FR-034, all endpoints)

**Decision**: Reuse the Phase 1 / Phase 2 seam in `src/api/httpClient.ts` **unchanged**:

- `authedRequest<T>(path, opts)` reads the ambient token; if `null`, throws `ApiError(0, "No active session")` without a network call; otherwise delegates to `apiRequest<T>` with `Authorization: Bearer <token>`.
- `AuthProvider` already calls `setTokenProvider(readToken)` and `setUnauthorizedHandler(...)` on mount (added in Phase 2). All Phase 4 API functions call `authedRequest`, never `apiRequest` directly.

**Rationale**: Feature code never sees or stores the bearer token. `401` handling is already centralised — `apiRequest` calls `unauthorizedHandler` on a token-bearing `401`, which the Phase 1 `AuthContext` wires to `clearSession()` + `SESSION_LOST` → `<RequireAdmin>` redirects to `/login`. Phase 4 gets FR-034 for free with no per-call code.

**Alternatives considered**:
- *Expose `token` from `useAuth()`* — rejected: forces every call site to thread the token and widens the misuse surface.
- *A new withdrawals-specific transport* — rejected: the existing wrapper already does envelope parsing, `ApiError` normalisation, and `401` routing.

---

## R2. Paginated list load, status filter, and refresh (FR-007..FR-016)

**Decision**: `useWithdrawals()` owns `{ filter: StatusFilter, page: number }` plus the current page payload:

- `listWithdrawals({ status, page }, signal)` builds the query: `page` is always sent; `status` is sent **only** when `filter !== 'all'`. Path: `/admin/withdrawals?page=<n>` or `/admin/withdrawals?status=<s>&page=<n>`.
- Response `data` is `{ items: Withdrawal[], page, per_page, total }` — held verbatim as `pageData`. `per_page` is read from the response, never hard-coded (documented as 20; the client does not depend on the literal).
- On mount the hook loads `{ filter: 'pending', page: 1 }` (FR-009).
- `setFilter(next)` sets the filter **and** resets `page` to `1` (FR-011), then loads.
- `setPage(n)` clamps to `[1, totalPages]` and loads. `totalPages = Math.max(1, Math.ceil(total / per_page))`.
- `refresh()` re-loads the current `{ filter, page }` without changing either.
- Screen status: `loading` on the first load and on any load with no prior page shown; `ready` once a page is in hand; `error` only when a load fails **and** nothing is currently shown (a failed refresh keeps the page the administrator already has — mirrors Phase 2 `useCookApplications`).
- Page-beyond-range: the backend returns `items: []` with the requested `page`. The screen shows the empty state plus a "back to first page" control (FR-016); it does **not** auto-jump, except that after a successful action's re-fetch, if `items` is empty and `page > 1`, the hook retries once at `min(page, totalPages)` so removing the last row on a page does not strand the administrator (see R3).

**Rationale**: The endpoint is genuinely server-paginated (`?page=N`, fixed `per_page`, `total` in the body) — unlike the Phase 2/3 pending endpoints which return one unsorted array. Holding exactly one page and replacing it on navigation (FR-013) is the simplest correct model and keeps every render ≤20 rows. No client sort is needed or offered — the backend returns the queue order.

**Alternatives considered**:
- *Merge/append pages for infinite scroll* — rejected by FR-013; also complicates "total" display and the post-action re-fetch.
- *Cache visited pages* — rejected: a stale cached page would contradict FR-007's "re-retrieve after any action"; each page is one cheap `GET`.
- *Sync `filter`/`page` into the route query string* — deferred: the spec never asks for shareable/bookmarkable list URLs; in-memory state is simpler and the back button still leaves the screen cleanly. Trivial to add later.
- *Client-side filtering of an all-statuses fetch* — rejected: the endpoint is paginated, so the client never holds the whole set; `?status=` is the intended mechanism.

---

## R3. Action outcome handling (FR-017..FR-033)

**Decision**: `approve(id)` / `reject(id)` / `markPaid(id)` in the hook share one `runAction(id, kind, call)`:

1. Set that row's `RowStatus` to `submitting`; its action buttons disable (FR-020 / FR-024 / FR-028).
2. Call the no-body `POST` (`approveWithdrawal` / `rejectWithdrawal` / `markWithdrawalPaid`).
3. **Success (200)** → success toast using the envelope `message` (FR-019 / FR-023 / FR-027), then `refresh()` the current filter+page (FR-007 / FR-032). If the 200 body cannot be read, still treat as applied (FR-032). After the refresh, if `items` is empty and `page > 1`, retry once at `min(page, totalPages)`.
4. **`ApiError.status === 422`** → `invalid_transition` outcome; toast the envelope `message` verbatim ("current status does not allow…" / "not in approved status"), then `refresh()` to reconcile (FR-029). Covers both the "decided by someone else" race and Mark Paid on a non-approved row.
5. **`ApiError.status === 404`** → `not_found` outcome; toast "could not be found", then `refresh()` (FR-030).
6. **`ApiError.status === 0` (network) or `>= 500`** → `transient` outcome; **no** state change, row status back to `idle`, retryable "please try again" toast (FR-031). No `refresh()`.
7. **`401`** → never reaches here; handled by the shared `unauthorizedHandler` inside `apiRequest`.

`RowStatus` is a `Map<number, 'confirming' | 'submitting'>` in the hook (absent ⇒ `idle`). Unlike Phase 2 the row is **not** removed locally on success — its status simply changes and it may or may not still belong to the active filter; the authoritative re-fetch (FR-007) settles both the row and the pager.

**Rationale**: `422`/`404` mean the local page is stale, so the envelope message + a re-fetch is the reconciliation the spec asks for. `500`/network are transient, so the row must be left exactly as it was for a retry. Re-fetch-after-success (rather than local patch) is required by FR-007 and also keeps `total`/`totalPages` correct when a row leaves the filtered set.

**Alternatives considered**:
- *Local status patch without re-fetch* — rejected: violates FR-007 and would desynchronise `total`/pagination when the filter is not `all`.
- *Optimistic status change before the response* — rejected: a `500`/network failure would need a rollback; confirm-then-server-200 gives certainty first, and the row set is small so the re-fetch flash is negligible.

---

## R4. Confirmation dialogs — one shell, one confirm-only dialog (FR-018 / FR-022 / FR-026 / FR-040)

**Decision**:
- Promote `src/cooks/DialogShell.tsx` verbatim to `src/shared/DialogShell.tsx` (portal to `<body>`, backdrop, `role="dialog"` + `aria-modal`, `Esc` to dismiss, focus trap, focus restore). Leave `src/cooks/DialogShell.tsx` as `export { default } from '../shared/DialogShell'` so no Phase 2 file or test changes.
- Add one `src/withdrawals/ConfirmDialog.tsx` on that shell: props `{ title, body, confirmLabel, confirmTone: 'approve' | 'reject' | 'neutral', busy, onConfirm, onCancel }`. Confirm button auto-focuses on open; both buttons disable while `busy`; `Esc`/Cancel/backdrop send nothing (FR-018/022/026). No text input — a withdrawal rejection collects no reason (spec Assumptions; contrast Phase 2/3).
- The page renders exactly one `ConfirmDialog` driven by the hook's `confirming: { id, kind } | null`; `messages.ts` supplies the per-kind copy (approve / reject / mark-paid).

**Rationale**: All three actions are "confirm a consequential, parameterless operation" — one dialog with swappable copy is enough. `DialogShell` is already generic and axe-clean from Phase 2; sharing it avoids a second focus-trap implementation. `src/shared/` (not `src/review/`) because withdrawals are not a "review" feature.

**Alternatives considered**:
- *Three bespoke dialogs* — rejected: identical structure, only strings differ.
- *`window.confirm()`* — rejected: not styleable, not WCAG-auditable, wrong language/RTL.
- *Keep `DialogShell` in `src/cooks/` and import across features* — rejected: a cross-feature import into `src/cooks/` is the wrong dependency direction; a shared folder is clearer and matches the Phase 3 plan's intent (retargeted from `src/review/` to `src/shared/`).

---

## R5. Row rendering, status badge, and contextual actions (FR-002 / FR-003 / FR-004 / FR-017 / FR-021 / FR-025)

**Decision**: `WithdrawalsTable` is a semantic `<table>`:
- Column headers (`<th scope="col">`): #, amount, payment details, status, requested date, processed date, actions.
- `WithdrawalRow` renders `id`; `formatAmount(amount)`; `payment_details`; `<StatusBadge status>`; `formatDateTime(requested_at)`; `formatDateTime(processed_at)` (→ a neutral "—" placeholder when `null`, FR-002); then action buttons by status:
  - `pending` → **Approve** + **Reject**
  - `approved` → **Mark Paid**
  - `rejected` / `paid` → no buttons (a muted "—" or nothing in the actions cell)
- `amount` or `payment_details` missing/malformed (`null`, `undefined`, `NaN`, empty string) → that cell shows the neutral placeholder; the rest of the row still renders and its status-appropriate actions still work (FR-004).
- `StatusBadge` pairs a short Arabic label with a shape/icon per status (e.g. dot styles or a lucide glyph) so status is never distinguished by colour alone (FR-003 / FR-040 / SC-003).

**Rationale**: A real table gives header association and keyboard/AT semantics for free (FR-040). Deriving the action set purely from `status` keeps FR-017/021/025 in one place and makes the "no action on terminal rows" case (US3 AC6, US4 AC2) fall out naturally.

**Alternatives considered**:
- *Card list like Phase 2* — rejected: withdrawal rows are a uniform, dense record set; a table reads better and paginates cleanly.
- *A data-grid library* — rejected: 7 columns, ≤20 rows, no sorting/resizing needed.

---

## R6. Pager (FR-014 / FR-015 / FR-016)

**Decision**: `Pager` props `{ page, totalPages, total, onPage }`:
- Shows "صفحة {page} من {totalPages}" and the total matching count.
- **Previous** disabled when `page <= 1`; **Next** disabled when `page >= totalPages`.
- When the current page is beyond range (empty `items`, `page > 1`), the page shows the empty state and the Pager renders a single "العودة للصفحة الأولى" button calling `onPage(1)`.
- Pure arithmetic lives in `src/withdrawals/pagination.ts` (`totalPages`, `clampPage`) and is unit-tested independently.

**Rationale**: `total` + `per_page` from the envelope is all that is needed; no "load more" or windowing. Disable rules and the beyond-range affordance are the literal FR-015/FR-016 text.

**Alternatives considered**:
- *Numbered page links* — deferred: Prev/Next + position satisfies the spec; numbered links can be added without changing the hook.

---

## R7. Toasts and the live region (FR-019 / FR-023 / FR-027 / FR-029 / FR-030 / FR-031 / FR-036 / FR-040)

**Decision**: Replicate the Phase 2 `CookApplicationsPage` toast pattern inline in `WithdrawalsPage`: a visually-hidden `role="status"` `aria-live="polite"` region always in the DOM, plus a transient styled bubble, cleared after ~6 s. The hook returns an `ActionOutcome`; the page maps it to a message — success/`invalid_transition` use the envelope `message`, `not_found`/`transient` use fixed Arabic strings from `messages.ts`.

**Rationale**: Matches Phase 2 exactly, so announcements behave identically. The envelope `message` is surfaced verbatim for success and domain errors (FR-036); the two non-message outcomes have fixed copy.

**Alternatives considered**:
- *Extract a shared `useToast` into `src/shared/`* — deferred: it would require editing Phase 2's screen to adopt it; the ~15-line pattern is duplicated once for now, with consolidation left as a later cross-feature cleanup.
- *A toast library* — rejected: one dependency for one bubble.

---

## R8. Routing, sidebar, and the guard (FR-035)

**Decision**: In `src/App.tsx` `AdminLayout`, import `WithdrawalsPage` and add `<Route path="/withdrawals" element={<WithdrawalsPage />} />` inside the existing `<Routes>` (already wrapped by `<RequireAdmin>` on `/*`). In `src/components/Sidebar.tsx` add `{ name: 'طلبات السحب', icon: Wallet, path: '/withdrawals' }` immediately before `'التقارير المالية'`. No new guard — `<RequireAdmin>` already gates the whole admin shell, so a signed-in non-admin never reaches `/withdrawals` (FR-035).

**Rationale**: The route, layout, guard, header, and sidebar all exist from Phase 1; this feature only adds one page body and one nav entry. `Wallet` is a stable lucide-react icon; financial adjacency to the reports entry matches the mental model.

**Alternatives considered**:
- *Nest under `/reports/withdrawals`* — rejected: withdrawals are an operational queue, not a report; a top-level entry is clearer and matches `admin-dashboard-api.md`'s Phase grouping.

---

## R9. Testing & accessibility tooling (SC-009, all ACs)

**Decision**: Reuse the Phase 1/2 harness unchanged — `tests/helpers/fetchMock.ts` (`installFetchMock().reply("GET /admin/withdrawals?status=pending&page=1", …)` with ordered replies for post-action re-fetch), `tests/helpers/harness.tsx`, `tests/setup.ts`. Extend `tests/helpers/fixtures.ts` with `withdrawal(overrides)` and `withdrawalPage(items, { page, per_page, total })` builders producing envelope-shaped payloads from `admin-dashboard-api.md` Phase 4. Add `renderAtWithdrawals(fm, opts)` to `harness.tsx` mirroring `renderAtCooks`. New specs per the Project Structure tree. `vitest-axe` runs on each visual state: the list/table, the filter control, the pager, the confirm dialog, the empty state, the error state. Keyboard-only flows (`user-event`) cover changing the filter, paging, and completing an approve through the dialog.

> `fetchMock` keys are `"<METHOD> <path>"` including the query string, so tests assert the exact `?status=…&page=…` the hook builds (including the omission of `status` for the `all` filter).

**Rationale**: The tooling and fetch-mock already exist and mirror the same envelope. Automated axe gives measurable AA coverage; residual manual checks (contrast, true focus visibility) are the same short list Phases 1–2 used and are scripted in `quickstart.md`.

**Alternatives considered**:
- *MSW* — rejected: the per-test `fetchMock` already handles ordered replies and query-string keys.
- *Playwright e2e* — deferred: integration tests with mocked `fetch` cover every acceptance scenario.

---

## Resolved Technical Context summary

| Field | Value |
|---|---|
| Auth to API | Reuse `authedRequest` + `setTokenProvider` (already wired in `AuthProvider`); `401` → existing `unauthorizedHandler` → `/login` |
| List load | `useWithdrawals()` — `GET /admin/withdrawals?[status=&]page=` on mount + on filter/page change + `refresh()` |
| Filter | `all \| pending \| approved \| rejected \| paid`; default `pending`; `status` omitted from the query when `all`; changing it resets `page` to 1 |
| Pagination | server-side; hold one page `{ items, page, per_page, total }`; `totalPages = ceil(total / per_page)`; replace on navigate, never merge |
| Beyond-range page | backend returns `items: []`; show empty state + "back to first page"; post-action re-fetch retries once at `min(page, totalPages)` |
| Row actions | derived from `status`: pending → Approve/Reject; approved → Mark Paid; rejected/paid → none |
| Confirmation | one `ConfirmDialog` (confirm-only, no reason) on `src/shared/DialogShell`; `Esc`/Cancel send nothing |
| Action outcomes | 200 → toast(envelope msg) + re-fetch; 422 → toast(envelope msg) + re-fetch; 404 → toast + re-fetch; 0/5xx → no change + retryable toast |
| In-flight | per-row `RowStatus` map; action buttons disabled + progress while `submitting`; one request per confirmed action |
| Status display | `StatusBadge` = label + shape/icon, never colour-only |
| Retention | no page cache; payment details dropped on route unmount; amounts + payment details excluded from `logger` |
| Dialog shell | `src/cooks/DialogShell.tsx` promoted to `src/shared/DialogShell.tsx`; one-line re-export shim left behind; no Phase 2 test change |
| Routing | `App.tsx` adds `/withdrawals` → `<WithdrawalsPage>`; `RequireAdmin` already gates it; Sidebar gains one entry |
| Testing | Phase 1/2 Vitest + Testing Library + `vitest-axe` + `fetchMock`; extend `fixtures.ts` + `harness.tsx`; 3 unit + 5 integration + 1 a11y spec |
| Config | no new env; `VITE_API_BASE_URL` reused |

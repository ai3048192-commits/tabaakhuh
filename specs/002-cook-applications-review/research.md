# Phase 0 Research: Cook Applications Review

Feature: `002-cook-applications-review` · Date: 2026-09-07

All Technical Context unknowns are resolved below. No open `NEEDS CLARIFICATION` remain — the four points from the `/speckit-clarify` session (queue volume, ordering, city resolution, document viewer) are already encoded in the spec and drive the decisions here.

---

## R1. Authenticated request seam (FR-026, all endpoints)

**Decision**: Add two additive exports to `src/api/httpClient.ts`, symmetric with the existing `setUnauthorizedHandler`:

- `setTokenProvider(fn: (() => string | null) | null)` — registers an ambient token getter.
- `authedRequest<T>(path, opts)` — reads the ambient token; if `null`, throws `ApiError(0, "No active session")` without a network call; otherwise delegates to `apiRequest<T>(path, { ...opts, token })`.

`AuthProvider` calls `setTokenProvider(readToken)` once on mount (next to its existing `setUnauthorizedHandler(...)` effect). All Phase 2 API functions call `authedRequest`, never `apiRequest` directly.

**Rationale**:
- Feature code never sees or stores the bearer token — keeps the Phase 1 hygiene rule ("never shown in UI, never threaded by hand") intact as more phases are added.
- 401 handling is already centralised: `apiRequest` calls `unauthorizedHandler` on a token-bearing `401`, which the Phase 1 `AuthContext` wires to `clearSession()` + `SESSION_LOST` → `<RequireAdmin>` redirects to `/login`. Phase 2 gets FR-026 for free, no per-call code.
- `src/api/` stays dependency-free: the token getter is *injected* by the auth layer, so `httpClient` never imports `src/auth/`.

**Alternatives considered**:
- *Expose `token` from `useAuth()`* — rejected: forces every call site (this phase and every later one) to thread the token and widens the misuse surface.
- *Import `readToken` directly into a feature api module* — rejected: works, but each feature re-implements the "no session" guard and the layering (`api` → `auth`) is inconsistent.

---

## R2. Queue load, ordering, and refresh (FR-010, FR-011, FR-011a)

**Decision**: `useCookApplications()` owns the queue:
- On mount (and on `refresh()`), call `listPendingCooks()` → `GET /admin/cooks/pending`.
- Map each raw entry to `PendingCookEntry { profile, contract }` (contract may be `null`).
- Sort with the pure `sortQueue(entries)`: primary key `contract.signed_at` ascending (ISO strings compare lexicographically = chronologically); entries with `contract === null` sort **after** all signed entries; within each group, tie-break ascending by `profile.id`. `Array.prototype.sort` on a copy; the comparator is total so order is stable and identical across refreshes.
- Hold the ordered array in state plus a `Map<cookId, CardState>` for per-card decision status (`idle | confirming | submitting | error`).
- Render as a single `entries.map(...)` of `<CookApplicationCard>` — no windowing.

**Rationale**:
- Clarify session fixed "oldest first (first-come-first-served)". `signed_at` is the only timestamp in the pending payload; the documented `cook_profile` has no `created_at`, so ascending `id` is the creation-order proxy for not-yet-signed applications (recorded in spec Assumptions).
- Clarify session capped realistic volume at ~200; ~200 lightweight cards render and scroll well below the SC-006a 3-second / smooth-scroll bar without virtualization, which would add complexity and a11y/scroll-restoration risk for no benefit at this size.

**Alternatives considered**:
- *Sort on the backend* — not available; the endpoint documents no ordering and no sort params.
- *`react-window` / virtualization* — rejected per FR-011a and the volume clarification.
- *Server-side pagination* — endpoint returns the full array with no `page` param.

---

## R3. Decision outcome handling (FR-014, FR-019, FR-022–FR-025)

**Decision**: `approve(id)` / `reject(id, reason)` in the hook:
1. Set card state `submitting`; both buttons on that card disable (FR-015 / FR-021).
2. Call `approveCook(id)` / `rejectCook(id, reason)`.
3. **Success (200)** → remove the entry from the ordered array, fire a success toast naming the store (FR-014 / FR-019). If the response body can't be read but the status was 200, still treat as decided (FR-025).
4. **`ApiError.status === 422`** with the domain "not pending" message, or **`404`** → remove the entry, fire an info toast ("no longer awaiting review" / "not found"), and call `refresh()` in the background to reconcile the rest of the queue (FR-022 / FR-023).
5. **`ApiError.status === 0` (network) or `>= 500`** → leave the entry, set card state `error`, fire a retryable toast (FR-024). For reject, the `RejectDialog` stays mounted with the typed reason intact (FR-020).
6. **`401`** → not handled here; the shared `unauthorizedHandler` already fired inside `apiRequest`.

Distinguishing 422 "missing reason" (validation, should never happen — client blocks it, FR-017) from 422 "not pending" (domain): the client pre-validates the reason, so any 422 on reject with a non-empty reason is treated as the domain/not-pending case; the envelope `message` is surfaced verbatim as the toast text.

**Rationale**: `422` and `404` mean the local queue is stale, so removing the card + a background refresh is the reconciliation FR-022/FR-023 ask for. `500`/network are transient, so the card must survive for a retry (FR-024). Matches the Phase 1 status-handling table.

**Alternatives considered**:
- *Full refetch after every decision* — rejected: on the happy path it causes a visible list reflow and re-fetches ~200 entries; local removal is instant and the background refetch only runs on the stale-detected branches.
- *Optimistic removal before the response* — rejected: a `500`/network failure would then need a re-insert at the correct sorted position; confirm-then-server-200 already gives us certainty before removing.

---

## R4. In-dashboard document viewer (FR-004, FR-004a, FR-028, FR-030, SC-001, SC-007)

**Decision**: `<DocumentViewer>` is a portal-rendered overlay (`role="dialog"` `aria-modal="true"`) opened from a card. It receives the ordered list of that application's documents (`[{ kind: 'id_front'|'id_back'|'avatar'|'banner'|'contract', url, label }]`) and an index.
- **Images** render as `<img referrerPolicy="no-referrer" alt={label}>` inside a pan/zoom area; zoom is CSS `transform: scale()` (buttons + `+`/`-`/`0` keys), 1×–4×; drag or arrow-keys to pan when zoomed.
- **Contract PDF** renders in an `<iframe title="signed contract">` sized to the overlay; if the browser blocks inline PDF (detectable via `onError` / a short load timeout), show a "open in a new tab" link as the documented fallback (spec clarification).
- Keyboard: `Esc` closes; `ArrowLeft`/`ArrowRight` move between the application's documents (RTL-aware: in `dir="rtl"` the visual "next" is `ArrowLeft`); focus is trapped while open and restored to the invoking thumbnail on close.
- On unmount, no document data is kept — component state holds only the URLs passed in, which themselves vanish with the queue state on route unmount.

**Retention interpretation (FR-028 / SC-007)**: "not retained by the dashboard" = the dashboard creates no `Blob`, object URL, `dataURL`, `localStorage`/`IndexedDB` copy, or cache of any document; it only ever sets an `<img>`/`<iframe>` `src` to the CDN URL from the API response, and drops those URLs from memory when the `/cooks` route unmounts. The cross-origin CDN's own HTTP `Cache-Control` is not controllable from the dashboard — a documented residual, analogous to the Phase 1 `localStorage`/XSS note. Document URLs are excluded from all `logger` calls.

**Rationale**: Keeping images in an overlay (never a top-level navigation to the raw file) keeps focus management, `alt` text, and Esc/arrow handling inside the WCAG scope (FR-030) and keeps the ID image inside the authenticated view. CSS-transform zoom is dependency-free and instant (SC-001).

**Alternatives considered**:
- *`window.open(url)` / `<a target="_blank">`* — rejected for images: hands the ID image to a bare browser tab outside the dashboard's control and outside FR-030's a11y scope. Kept only as the contract-PDF fallback.
- *A PDF rendering library (e.g. pdf.js)* — rejected: a large new dependency; the native `<iframe>` viewer is adequate and the new-tab fallback covers the rare block.
- *Download + blob URL for zoom fidelity* — rejected: creates a dashboard-held copy, violating FR-028.

---

## R5. City directory resolution (FR-003, FR-003a)

**Decision**: `src/cities/citiesApi.ts` exposes `fetchCityDirectory(): Promise<Map<number, { name_ar: string; name_en: string }>>`, calling `GET /admin/cities` via `authedRequest` and memoising the resolved promise at module scope for the browser session. `useCityNames()` wraps it and returns `{ resolve(cityId): string, ready: boolean, failed: boolean }`:
- `resolve(id)` → `name_ar` when the id is in the map; otherwise the raw id as a string (FR-003a).
- `failed` is `true` if the fetch rejected; the screen still renders every card with raw ids and stays fully usable (edge case "City list unavailable").
- The directory load runs in parallel with the pending-queue load; the queue never blocks on it.

**Rationale**: The pending payload carries only `city_id`. The clarification chose name resolution as a read dependency on the Phase 5 Cities data, with a raw-id fallback. A module-level memo means one `GET /admin/cities` per session regardless of how many times the administrator opens `/cooks`. `GET /admin/cities` returns active *and* inactive cities, so a deactivated city still resolves to a name.

**Alternatives considered**:
- *A React context provider for cities* — deferred to Phase 5, which owns cities management; a memoised module function is enough for one read-only consumer now and is trivially replaceable later.
- *Per-card lookup request* — rejected: N requests for one screen; no per-city endpoint is documented anyway.
- *Bundling a static city list* — rejected: drifts from the backend; the list is small and cacheable.

---

## R6. Confirmation & rejection dialogs (FR-012, FR-013, FR-016–FR-018, FR-020, FR-030)

**Decision**:
- `<ApproveDialog>` — a focus-trapped `role="dialog"` with the store name, a warning line, and Confirm / Cancel. Cancel or `Esc` → no request (FR-013). Confirm calls the hook's `approve(id)` and shows an in-dialog busy state until it resolves.
- `<RejectDialog>` — same shell plus a `<textarea>` (`aria-describedby` a live character counter `N / 1000`). Submit is disabled while the trimmed value is empty (FR-017) or `length > 1000` (FR-018); the textarea also has `maxLength={1000}` as a hard stop. On a failed request the dialog stays open with the text intact (FR-020); on success it closes and the card is removed.
- Both dialogs: labelled controls, focus moves to the dialog on open and back to the triggering button on close, `aria-live` region announces the success/error result (FR-030).

**Rationale**: An explicit confirm step for both actions was the clarified default (consequential action). Client-side reason validation makes the 422 "missing reason" path unreachable in normal use, so the reject error handling only has to cover the domain/not-pending and transient cases.

**Alternatives considered**:
- *Inline (non-modal) approve with an undo toast* — rejected: the spec asks for an explicit confirmation, and an undo window complicates the "already decided elsewhere" reconciliation.
- *`window.confirm()`* — rejected: not styleable, not WCAG-auditable, wrong language/RTL.

---

## R7. Routing & the superseded placeholder (FR-001)

**Decision**: In `src/App.tsx`, change the `/cooks` route element from `<CooksManagement />` to `<CookApplicationsPage />` (import swap). `CookApplicationsPage` renders only inside `<RequireAdmin>` (already wrapping `/*`), satisfying "reachable only within an administrator session". `src/pages/CooksManagement.tsx` is left in the tree but no longer routed; `AddCookModal` (triggered from the Dashboard quick-actions, unrelated to review) is untouched. Optionally, the sidebar label for `/cooks` becomes "طلبات الطهاة" — cosmetic, not required.

**Rationale**: The route, layout, guard, header, and sidebar already exist from Phase 1; this feature only replaces the page body. Deleting the old mock file is avoided to keep the diff focused and reversible.

**Alternatives considered**:
- *A new `/cooks/pending` route* — rejected: `/cooks` is already the cooks destination in the nav; no second route needed for one screen.

---

## R8. Testing & accessibility tooling (SC-008, all ACs)

**Decision**: Reuse the Phase 1 harness unchanged — `tests/helpers/fetchMock.ts` (`installFetchMock().reply("GET /admin/cooks/pending", …)`), `tests/helpers/harness.tsx`, `tests/setup.ts`. Extend `tests/helpers/fixtures.ts` with `pendingCook(overrides)`, `signedContract(overrides)`, and `cityList()` builders producing envelope-shaped payloads from `admin-dashboard-api.md`. New specs per the Project Structure tree. `vitest-axe` (`expect(await axe(container)).toHaveNoViolations()`) runs on each visual state: list, a card, the viewer (image + contract), `ApproveDialog`, `RejectDialog`, empty state, error state. Keyboard-only flows (`user-event` `keyboard`) cover viewer open/navigate/zoom/close and a full reject; a short manual screen-reader pass is scripted in `quickstart.md` for the SC-008 sign-off.

**Rationale**: The tooling and fetch-mock already exist and mirror the same envelope; nothing new to add. Automated axe gives measurable AA coverage; the residual manual checks (focus order narration, SR announcement wording) are the same short list Phase 1 used.

**Alternatives considered**:
- *MSW* — rejected: the per-test `fetchMock` already handles four endpoints and ordered replies.
- *Playwright e2e* — deferred: integration tests with mocked `fetch` cover every acceptance scenario; e2e is a later cross-feature concern.

---

## Resolved Technical Context summary

| Field | Value |
|---|---|
| Auth to API | `setTokenProvider(readToken)` in `AuthProvider`; feature calls go through `authedRequest`; 401 → existing `unauthorizedHandler` |
| Queue load | `useCookApplications()` — `GET /admin/cooks/pending` on mount + `refresh()` |
| Ordering | pure `sortQueue`: `contract.signed_at` asc, null-contract entries last, tie-break `profile.id` asc (FR-011) |
| Rendering | single `.map()` of `<CookApplicationCard>`, ~200 entries, no virtualization (FR-011a) |
| Decision outcomes | 200 → local remove + toast; 422/404 → remove + info + background `refresh()`; 0/5xx → keep + retryable toast (reason preserved) |
| Document viewer | portal overlay, `<img>` CSS-transform zoom + `<iframe>` contract, focus trap, Esc/arrow/+- keys, new-tab PDF fallback |
| Doc retention | dashboard holds no copy/cache; URLs from API only; dropped on route unmount; excluded from logs; CDN HTTP cache is a documented residual |
| City names | `src/cities/` — `fetchCityDirectory()` module-memoised `GET /admin/cities`; `resolve(id)` → `name_ar` or raw id; `failed` never blocks the screen |
| Dialogs | `<ApproveDialog>` confirm-only; `<RejectDialog>` textarea, non-empty + ≤1000 enforced pre-request, text kept on failure |
| Routing | `App.tsx` `/cooks` → `<CookApplicationsPage>`; `CooksManagement.tsx` unrouted; guard already in place |
| Testing | Phase 1 Vitest + Testing Library + `vitest-axe` + `fetchMock`; extend `fixtures.ts`; 3 unit + 4 integration + 1 a11y spec |
| Config | no new env; `VITE_API_BASE_URL` reused |

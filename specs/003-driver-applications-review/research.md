# Phase 0 Research: Driver Applications Review

Feature: `003-driver-applications-review` · Date: 2026-09-07

All Technical Context unknowns are resolved below. No open `NEEDS CLARIFICATION` remain — the three points from the `/speckit-clarify` session (document viewer mechanism, approve confirmation, birth-date handling) are encoded in the spec and drive the decisions here. This feature is a deliberate near-clone of Phase 2 (Cook Applications Review); each decision below states what is reused and what differs.

---

## R1. Authenticated request seam (FR-028, all endpoints)

**Decision**: Reuse the Phase 2 additions to `src/api/httpClient.ts` **unchanged**:

- `setTokenProvider(fn)` — already registered once by `AuthProvider` on mount.
- `authedRequest<T>(path, opts)` — reads the ambient token; throws `ApiError(0, 'No active session')` without a network call when absent; otherwise delegates to `apiRequest`, inheriting envelope parsing, `ApiError` semantics, and the `401 → unauthorizedHandler` behaviour.

All three Phase 3 API functions (`listPendingDrivers`, `approveDriver`, `rejectDriver`) call `authedRequest`, never `apiRequest` directly. No new code in `src/api/` or `src/auth/`.

**Rationale**: The seam was designed in Phase 2 to serve every later admin phase. FR-028 (bearer on every request; 401 → shared session-loss → `/login`) is satisfied with zero per-call code.

**Alternatives considered**: None — reusing the existing seam is the whole point of having built it.

---

## R2. Queue load, ordering, and refresh (FR-009, FR-010, FR-011)

**Decision**: `useDriverApplications()` owns the queue:
- On mount (and on `refresh()`), call `listPendingDrivers()` → `GET /admin/drivers/pending`.
- The response `data` is a **flat array of driver objects** (unlike Phase 2's `{cook_profile, contract}` rows) — map straight to `DriverApplication[]`.
- Sort with the pure `sortQueue(entries)`: primary key `submitted_at` ascending (ISO 8601 strings compare lexicographically = chronologically); tie-break ascending by `id`. `Array.prototype.sort` on a copy; the comparator is a total order so the result is stable and identical across refreshes (SC-010).
- Hold the ordered array in state plus a `Map<driverId, CardStatus>` for per-card decision status (`idle | confirming | submitting | error`).
- Render as a single `entries.map(...)` of `<DriverApplicationCard>` — no windowing (FR-011).

**Rationale**:
- The clarify session for Phase 2 fixed "oldest first (first-come-first-served)". The driver payload **does** carry `submitted_at`, so ordering is a straight single-key sort — simpler than Phase 2's signed/unsigned split. `id` is the deterministic tie-breaker for identical timestamps.
- Volume is treated as ~200 by analogy with the Phase 2 clarification (same dashboard, same kind of review queue, same unpaginated endpoint). ~200 lightweight cards render and scroll well within the SC-007 3-second / smooth-scroll bar without virtualization, which would add complexity and a11y/scroll-restoration risk for no benefit at this size.

**Alternatives considered**:
- *Sort on the backend* — not available; `GET /admin/drivers/pending` documents no ordering and no sort params.
- *Virtualization (`react-window`)* — rejected per FR-011 and the volume assumption.
- *Server-side pagination* — the endpoint returns the full array with no `page` param.

---

## R3. Decision outcome handling (FR-014, FR-019, FR-023–FR-026)

**Decision**: `approve(id)` / `reject(id, reason)` in the hook, identical in shape to Phase 2 R3:
1. Set card state `submitting`; both buttons on that card disable (FR-015 / FR-021).
2. Call `approveDriver(id)` / `rejectDriver(id, reason)`.
3. **Success (200)** → remove the entry from the ordered array, fire a success toast using the envelope `message` (FR-014 / FR-019). If the body can't be read but the status was 200, still treat as decided (FR-026).
4. **`ApiError.status === 422`** (domain "not pending"), or **`404`** → remove the entry, fire an info toast (envelope `message` / "not found"), and call `refresh()` in the background to reconcile the rest of the queue (FR-023 / FR-024).
5. **`ApiError.status === 0` (network) or `>= 500`** → leave the entry, set card state `error`, fire a retryable toast (FR-025). For reject, the `RejectDialog` stays mounted with the typed reason intact (FR-020).
6. **`401`** → not handled here; the shared `unauthorizedHandler` already fired inside `apiRequest`.

Because the client pre-validates the reject reason (non-empty, ≤1000 — FR-017/FR-018), a `422` on reject is always treated as the domain/not-pending case and the envelope `message` is surfaced verbatim. If a `422` ever carries `errors.reason` instead, the dialog stays open and surfaces the field error (FR-027).

**Rationale**: `422`/`404` mean the local queue is stale → remove the card + background refresh (FR-023/FR-024). `500`/network are transient → the card must survive for a retry (FR-025). Matches the Phase 1 status table and the Phase 2 implementation.

**Alternatives considered**:
- *Full refetch after every decision* — rejected: visible list reflow and a re-fetch of ~200 entries on the happy path; local removal is instant and the background refetch only runs on the stale-detected branches.
- *Optimistic removal before the response* — rejected: a `500`/network failure would then need a re-insert at the correct sorted position; server-200-then-remove gives certainty first.

---

## R4. In-dashboard document viewer (FR-004, FR-004a, FR-031, FR-034, SC-001, SC-008)

**Decision**: Reuse the Phase 2 `<DocumentViewer>` — promoted to `src/review/DocumentViewer.tsx` (see R9). It is a portal-rendered overlay (`role="dialog"` `aria-modal="true"`) opened from a card with the ordered list of that application's documents and an index. For drivers the list is always three **image** documents:

```ts
[
  { kind: 'id_front', url: national_id_front_url, label: M.docIdFront },
  { kind: 'id_back',  url: national_id_back_url,  label: M.docIdBack  },
  { kind: 'license',  url: license_url,           label: M.docLicense },
]
```

- Images render as `<img referrerPolicy="no-referrer" alt={label}>` inside a pan/zoom area; zoom is CSS `transform: scale()` (buttons + `+`/`-`/`0` keys), 1×–4×; drag or arrow-keys to pan when zoomed.
- Keyboard: `Esc` closes; `ArrowLeft`/`ArrowRight` move between the application's documents (RTL-aware: in `dir="rtl"` the visual "next" is `ArrowLeft`); focus is trapped while open and restored to the invoking thumbnail on close.
- `url === null` (or an `<img>` load error) → "document unavailable" panel (FR-005); the decision controls still work.
- The **contract/`<iframe>` branch of the shared viewer is never exercised by the driver feature** — there is no PDF in the driver flow. It stays in the component for Phase 2.

**Retention interpretation (FR-031 / SC-008)**: same as Phase 2 R4 — the dashboard creates no `Blob`, object URL, `dataURL`, `localStorage`/`IndexedDB` copy, or cache of any document; it only ever sets an `<img>` `src` to the CDN URL from the API response, and drops those URLs from memory when the `/drivers` route unmounts. The cross-origin CDN's own HTTP `Cache-Control` is not controllable from the dashboard — a documented residual. Document URLs are excluded from all `logger` calls.

**Rationale**: Confirmed by the clarify session (Q1 → in-dashboard overlay, not new-tab links). Keeping ID and licence images in an overlay keeps focus management, `alt` text, and Esc/arrow handling inside the WCAG scope (FR-034) and keeps the images inside the authenticated view. CSS-transform zoom is dependency-free and instant (SC-001).

**Alternatives considered**:
- *`window.open(url)` / `<a target="_blank">`* — explicitly rejected in the clarify session: hands the ID/licence image to a bare browser tab outside the dashboard's control and outside FR-034's a11y scope.
- *A new driver-only viewer* — rejected: duplicates ~200 lines of a11y-critical code; promoting the shared one (R9) is cleaner.
- *Download + blob URL for zoom fidelity* — rejected: creates a dashboard-held copy, violating FR-031.

---

## R5. City directory resolution (FR-003, FR-003a)

**Decision**: Reuse the Phase 2 `src/cities/` module **verbatim** — `fetchCityDirectory()` (module-memoised `GET /admin/cities`) and `useCityNames()` returning `{ resolve(cityId): string, ready, failed }`. `DriverApplicationsPage` calls `useCityNames()` alongside `useDriverApplications()`; `DriverApplicationCard` shows `resolve(entry.city_id)` — `name_ar` on a hit, the raw id as a string on a miss or a failed directory fetch (FR-003a, edge case "City list unavailable"). The directory load runs in parallel with the pending-queue load and the queue never blocks on it.

**Rationale**: The driver payload carries only `city_id`, exactly like the cook payload. The Phase 2 module already handles active + inactive cities, the module-level memo, and the raw-id fallback. One `GET /admin/cities` per browser session regardless of which review screen opened first.

**Alternatives considered**:
- *A React context provider for cities* — still deferred to Phase 5 (Cities Management), which owns that data; the memoised module function is enough for a second read-only consumer.
- *Per-card lookup request* — rejected: N requests per screen; no per-city endpoint is documented.

---

## R6. Confirmation & rejection dialogs (FR-012, FR-013, FR-016–FR-018, FR-020, FR-022, FR-034)

**Decision**:
- `<ApproveDialog>` — a focus-trapped `role="dialog"` (built on `src/review/DialogShell`) with the driver identity, a warning line, and Confirm / Cancel. Cancel or `Esc` → no request (FR-013). Confirm calls the hook's `approve(id)` and shows an in-dialog busy state until it resolves.
- `<RejectDialog>` — same shell plus a `<textarea maxLength={1000}>` with a live `N / 1000` counter announced via `aria-describedby`. Submit is disabled while the trimmed value is empty (FR-017) or `length > 1000` (FR-018). On a failed request the dialog stays open with the text intact (FR-020); on success it closes and the card is removed. Cancel/`Esc`/backdrop dismiss with no request (FR-022).
- Both dialogs: labelled controls, focus moves to the dialog on open and back to the triggering button on close, an `aria-live` region announces the success/error result (FR-034).

**Rationale**: The clarify session (Q2) confirmed an explicit confirm step for approve. Client-side reason validation makes the `422` "missing reason" path unreachable in normal use, so reject error handling only has to cover the domain/not-pending and transient cases. Identical to Phase 2 R6, minus the store-name specifics.

**Alternatives considered**:
- *Inline (non-modal) approve with an undo toast* — rejected: the spec asks for an explicit confirmation, and an undo window complicates the "already decided elsewhere" reconciliation.
- *`window.confirm()`* — rejected: not styleable, not WCAG-auditable, wrong language/RTL.

---

## R7. Birth date display (FR-003, FR-003c)

**Decision**: `DriverApplicationCard` renders `birth_date` as a formatted date string (e.g. `10 أبريل 1995` via `Intl.DateTimeFormat('ar-EG')`, or the raw `YYYY-MM-DD` if formatting is unavailable). No age is computed, no age-based warning is shown, and the approve action is never gated on age.

**Rationale**: The clarify session (Q3) settled this — driver eligibility rules stay with the backend; the dashboard shows birth date only so the administrator can cross-check it against the ID document. Computing an unspecified minimum-age threshold on the client risks false warnings.

**Alternatives considered**:
- *Compute age + non-blocking warning under a stated minimum* — rejected in the clarify session (no threshold specified).
- *Hard client-side age gate on Approve* — rejected in the clarify session.

---

## R8. Missing / malformed vehicle fields (FR-003b, edge case)

**Decision**: `DriverApplicationCard` treats each identity/vehicle field defensively. When a value is `null`, `undefined`, or an empty string, that field shows a neutral placeholder (e.g. `—`) and the rest of the card still renders and stays actionable. `vehicle_year` is shown as-is when numeric; a missing/zero year shows the placeholder. No field's absence blocks the viewer or the approve/reject controls.

**Rationale**: `admin-dashboard-api.md` presents all vehicle fields as populated, but the spec's edge case requires graceful degradation. A per-field fallback in the card is trivial and keeps the queue usable against imperfect data.

**Alternatives considered**:
- *Hide the card if any field is missing* — rejected: hides a reviewable application.
- *Show a card-level "incomplete data" error* — rejected: noisier than a per-field `—`; the administrator can still see everything the ID documents show.

---

## R9. Sharing `DialogShell` + `DocumentViewer` (structure decision)

**Decision**: Move `src/cooks/DialogShell.tsx` and `src/cooks/DocumentViewer.tsx` to a new `src/review/` folder:
- `src/review/DialogShell.tsx` — moved verbatim (already fully generic: `label`, `onDismiss`, `children`).
- `src/review/DocumentViewer.tsx` — moved; the seven viewer-chrome strings it currently pulls from `cookMessages` (close, prev, next, zoom in/out/reset, "document unavailable", open-in-new-tab, contract label) move to a new `src/review/messages.ts` `reviewMessages` constant, which becomes the component's default. An optional `strings?: Partial<typeof reviewMessages>` prop allows per-feature overrides but neither feature needs it.
- `src/cooks/DialogShell.tsx` and `src/cooks/DocumentViewer.tsx` become one-line re-exports (`export { default } from '../review/…'`). `src/cooks/messages.ts` re-exports the moved keys from `reviewMessages` (or the two internal `src/cooks` call sites are repointed) so Phase 2 source and its tests are byte-for-byte unaffected in behaviour.

**Rationale**: Both review features need the same portal + focus-trap + keyboard-nav overlay. Duplicating it would fork an a11y-critical, axe-audited component. Promotion with re-export shims is the minimal change that avoids the fork and touches no Phase 2 behaviour. Mirrors how Phase 2 introduced `src/cities/` the moment a shared read appeared.

**Alternatives considered**:
- *Import `../cooks/DocumentViewer` from `src/drivers/`* — rejected: feature-to-feature import; `src/cooks/` would own a component two features depend on.
- *Copy the component into `src/drivers/`* — rejected: two divergent copies of the same a11y logic to maintain and re-audit.
- *Leave it and give drivers a minimal bespoke viewer* — rejected: the zoom + focus-trap + RTL arrow-nav is exactly the fiddly part; re-implementing it invites regressions against FR-034 / SC-009.

---

## R10. Routing, the new sidebar entry, and the `/delivery` mock (FR-029, FR-033)

**Decision**: Add `<Route path="/drivers" element={<DriverApplicationsPage />} />` inside `AdminLayout` in `src/App.tsx` (already wrapped by `<RequireAdmin>`), and add one `menuItems` entry to `src/components/Sidebar.tsx`: `{ name: 'طلبات السائقين', icon: Bike, path: '/drivers' }`. The existing `/delivery` route and its `{ name: 'إدارة الدليفري', … }` entry — a fully mocked live-delivery-tracking screen (`src/pages/DeliveryPage.tsx`) — are **left untouched**; driver *application review* is a different concern from live delivery oversight and belongs on its own route.

**Rationale**: FR-029 needs the screen behind `<RequireAdmin>` — satisfied by any route under `AdminLayout`. FR-033 explicitly calls for a sidebar entry. `lucide-react`'s `Bike` icon is already imported in `Sidebar.tsx`. Keeping `/delivery` as-is avoids conflating two features and keeps the diff focused.

**Alternatives considered**:
- *Repoint `/delivery` to the review screen (mirroring how Phase 2 repointed `/cooks`)* — rejected here: `/cooks` in Phase 2 was the cooks-management destination and cook review legitimately superseded its mock; `/delivery`'s mock is live-delivery tracking, a distinct later feature, not an applications queue. A dedicated `/drivers` entry is clearer and is what FR-033 asks for.
- *Nest under `/delivery/applications`* — rejected: an extra path segment for one screen; a top-level entry matches `/cooks`.

---

## R11. Testing & accessibility tooling (SC-009, all ACs)

**Decision**: Reuse the Phase 1/2 harness unchanged — `tests/helpers/fetchMock.ts` (`installFetchMock().reply('GET /admin/drivers/pending', …)`), `tests/setup.ts`, `vitest-axe`. Extend:
- `tests/helpers/fixtures.ts` with `pendingDriver(overrides)` producing an envelope-shaped driver object from `admin-dashboard-api.md` Phase 3; reuse the existing `ok`, `fail`, `cityList` helpers.
- `tests/helpers/harness.tsx` with `renderAtDrivers()` alongside `renderAtCooks()`.

New specs per the Project Structure tree: 1–2 unit (`driverSortQueue`, optional `driverOutcome`), 3 integration (list / approve / reject), 1 session, 1 a11y. `vitest-axe` (`expect(await axe(container)).toHaveNoViolations()`) runs on each visual state: list, a card, the image viewer, `ApproveDialog`, `RejectDialog`, empty state, error state. Keyboard-only flows (`user-event` `keyboard`) cover viewer open/navigate-across-3-docs/zoom/close and a full reject; a short manual screen-reader pass is scripted in `quickstart.md` for the SC-009 sign-off.

**Rationale**: The tooling, fetch-mock, and envelope shape already exist and are shared. Nothing new to add. Automated axe gives measurable AA coverage; the residual manual checks (focus-order narration, SR announcement wording, colour contrast) are the same short list Phases 1–2 used.

**Alternatives considered**:
- *MSW* — rejected: the per-test `fetchMock` already handles the endpoints and ordered replies.
- *Playwright e2e* — deferred: integration tests with mocked `fetch` cover every acceptance scenario; e2e is a later cross-feature concern.

---

## Resolved Technical Context summary

| Field | Value |
|---|---|
| Auth to API | Reuse Phase 2 `authedRequest` / `setTokenProvider`; feature calls go through `authedRequest`; 401 → existing `unauthorizedHandler` (FR-028) |
| Queue load | `useDriverApplications()` — `GET /admin/drivers/pending` on mount + `refresh()`; response is a flat driver array |
| Ordering | pure `sortQueue`: `submitted_at` asc, tie-break `id` asc (FR-010, SC-010) — no signed/unsigned split |
| Rendering | single `.map()` of `<DriverApplicationCard>`, ~200 entries, no virtualization (FR-011) |
| Decision outcomes | 200 → local remove + toast; 422/404 → remove + info + background `refresh()`; 0/5xx → keep + retryable toast (reject reason preserved) |
| Document viewer | shared `src/review/DocumentViewer` overlay; 3 image docs, CSS-transform zoom, focus trap, Esc/arrow/+- keys; no PDF branch used |
| Doc retention | dashboard holds no copy/cache; URLs from API only; dropped on route unmount; excluded from logs; CDN HTTP cache is a documented residual |
| City names | reuse `src/cities/` unchanged — `fetchCityDirectory()` memoised `GET /admin/cities`; `resolve(id)` → `name_ar` or raw id; `failed` never blocks the screen |
| Birth date | displayed as a formatted date; no age math, no warning, no approve gate (FR-003c) |
| Missing fields | per-field `—` placeholder; card still renders and stays actionable (FR-003b) |
| Dialogs | `<ApproveDialog>` confirm-only; `<RejectDialog>` textarea, non-empty + ≤1000 enforced pre-request, text kept on failure |
| Shared code | `DialogShell` + `DocumentViewer` moved to `src/review/`; `src/cooks/` keeps re-export shims (R9) |
| Routing | new `/drivers` route in `App.tsx` + `طلبات السائقين` sidebar entry; `/delivery` mock untouched |
| Testing | Phase 1/2 Vitest + Testing Library + `vitest-axe` + `fetchMock`; add `pendingDriver()` fixture + `renderAtDrivers()`; ~2 unit + 3 integration + 1 session + 1 a11y spec |
| Config | no new env; `VITE_API_BASE_URL` reused |

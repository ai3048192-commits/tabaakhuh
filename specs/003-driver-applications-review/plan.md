# Implementation Plan: Driver Applications Review

**Branch**: `003-driver-applications-review` | **Date**: 2026-09-07 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-driver-applications-review/spec.md`

## Summary

Add a "Driver Applications" review screen to the Tabaakhuh admin dashboard on a new `/drivers` route with its own sidebar entry. An administrator sees every driver whose `approval_status` is `pending` (from `GET /admin/drivers/pending`), reads each applicant's identity and vehicle details, inspects the three verification images (national ID front, national ID back, driving licence) in an in-dashboard zoomable overlay, then approves (`POST /admin/drivers/{id}/approve`, with an explicit confirm step) or rejects (`POST /admin/drivers/{id}/reject` with a required 1–1000 char reason entered in a modal). Decided or missing applications are reconciled out of the queue on `422`/`404`; connectivity/5xx failures leave the card in place with a retryable message and preserve any typed reject reason. The queue is ordered oldest-first by `submitted_at` (ascending, tie-break by `id`), rendered as one plain list sized for ~200 entries, and each `city_id` is resolved to a name via the platform city directory (`GET /admin/cities`, a read dependency already built in Phase 2).

Technical approach: this is a near-clone of Phase 2 (Cook Applications Review) with a simpler shape — the pending endpoint returns a flat array of driver objects (no nested contract), every document is an image (no PDF/iframe branch), and the payload carries a real `submitted_at` timestamp so ordering needs no signed/unsigned split. Reuse the Phase 1 transport seam (`authedRequest` + `setTokenProvider`, already added in Phase 2) so feature code never handles the bearer token and 401s route through the existing session-loss path (FR-028). Reuse the Phase 2 `src/cities/` directory module unchanged for id→name resolution. Promote the two generic, a11y-critical components `DialogShell` and `DocumentViewer` from `src/cooks/` to a shared `src/review/` module (Phase 2 keeps working via thin re-export shims), and add a `src/drivers/` feature folder holding the API wrapper, a `useDriverApplications` hook, a pure `sortQueue`, `messages.ts`, and the screen + card + `ApproveDialog` + `RejectDialog` components. No new runtime dependencies; tests use the existing Vitest + Testing Library + `vitest-axe` harness.

## Technical Context

**Language/Version**: TypeScript `~6.0.2` (`typescript` in package.json), compiled by Vite 8; `target` ES2023, `jsx: react-jsx`, `verbatimModuleSyntax: true`. `@types/react` 19.x against a React 18.x runtime — pre-existing, not touched.

**Primary Dependencies**: React 18, react-dom 18, react-router-dom 7 (routing already in place), Tailwind CSS 4, lucide-react (icons). No HTTP client, state library, or data-fetching library — native `fetch` (via the Phase 1 `apiRequest`) + React hooks are sufficient for three endpoints plus the one shared cities read.

**Storage**: None new. The bearer token continues to live in `localStorage` under the Phase 1 keys and is read only through the `authStorage` / `setTokenProvider` seam. The pending queue, resolved city names, and viewer state are in-memory only and are dropped when the administrator leaves the `/drivers` route (FR-031, SC-008). The city directory memo is the module-level cache from Phase 2 (`src/cities/citiesApi.ts`), shared for the browser session.

**Testing**: Vitest + @testing-library/react + @testing-library/user-event + jsdom for unit/integration; `vitest-axe` for the WCAG checks (SC-009). Reuses `tests/helpers/fetchMock.ts`, `tests/helpers/harness.tsx`, `tests/helpers/fixtures.ts`, `tests/setup.ts`. `fetch` is mocked per test with envelope fixtures mirroring `admin-dashboard-api.md` Phase 3 + the existing `cityList()` builder.

**Target Platform**: Modern desktop browsers (Chromium, Firefox, Safari current). Static SPA, RTL Arabic UI (`dir="rtl"` already on `AdminLayout`).

**Project Type**: Web — single existing frontend project in `src/`. No backend work.

**Performance Goals**:
- SC-007: with ~200 pending entries the list becomes scrollable/interactive within 3 s of data arrival and scrolls without perceptible stutter — met by a plain keyed `.map()` of lightweight cards (no virtualization) plus deferred image loading (`loading="lazy"` thumbnails; full images fetched only when the viewer opens).
- SC-001: any application's three documents openable and judged legible within 10 s — the viewer opens instantly from already-known URLs; zoom is CSS-transform only.

**Constraints**:
- FR-004 / FR-004a / FR-031 / SC-008: verification images open in an in-dashboard overlay, never by navigating the raw file URL as a top-level page; the dashboard keeps no blob/dataURL/localStorage copy; queue state (with URLs) is discarded on route unmount; document URLs are never logged. Residual browser HTTP-cache retention on the cross-origin CDN is outside dashboard control (documented caveat, mirrors the Phase 1 XSS note and Phase 2 R4).
- FR-010: client-side stable sort — `submitted_at` ascending; tie-break ascending by `id`.
- FR-011: single plain list, no pagination / incremental loading / virtualization; built for ~200 entries.
- FR-003a: `city_id` → name via `GET /admin/cities` (includes inactive cities); missing entry or unavailable list → show the raw id; never blocks review.
- FR-003c: birth date is displayed verbatim; the client does no age computation, warning, or approve gate.
- FR-013 / FR-016..FR-018: approve requires explicit confirmation; reject requires a non-whitespace reason capped at 1000 characters, enforced before the request.
- FR-025: connectivity / 5xx on a decision leaves the card in the queue, records nothing locally, shows a retryable message; the reject reason is preserved (FR-020).
- FR-028: every request goes through `authedRequest`; a 401 triggers the Phase 1 `unauthorizedHandler` → session ends → redirect to `/login`.
- FR-029: `/drivers` renders only inside `<RequireAdmin>`; a signed-in non-admin never reaches it.
- WCAG 2.1 AA for the screen, `DocumentViewer`, both dialogs, and all error/empty/loading states (FR-034).
- Backend base URL stays `import.meta.env.VITE_API_BASE_URL`; no new env vars.

**Scale/Scope**: ~9 new source files under `src/drivers/`, 2 files moved into a new `src/review/` folder with 2 re-export shims left in `src/cooks/`, 1 new route + 1 sidebar entry in `src/App.tsx` / `src/components/Sidebar.tsx`, `tests/helpers/fixtures.ts` + `tests/helpers/harness.tsx` extended, ~7 new test files. 34 functional requirements, 10 success criteria, 3 user stories (P1 review queue, P2 approve, P3 reject). No change to `src/api/`, `src/auth/`, or `src/cities/`.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` is an unratified template — every principle and section is still a `[PLACEHOLDER]`. There are **no project-specific constitutional gates to enforce**. The plan holds itself to the general principles the template gestures at, consistent with Phases 1 and 2:

| Principle (template intent) | How this plan complies |
|---|---|
| Test-First | The Vitest harness already exists. Each user story's acceptance scenarios become integration tests written alongside the implementation; `sortQueue` and the outcome classifier get unit tests first. |
| Simplicity / YAGNI | Zero new runtime dependencies. Reuses the Phase 1 `authedRequest` / `ApiError` / `unauthorizedHandler` and the Phase 2 `src/cities/` module and `DocumentViewer` (promoted, not duplicated). No virtualization, no data-fetching library, no global store — one feature hook + local component state. |
| Integration testing on contract boundaries | `src/drivers/driversApi.ts` gets integration tests against mocked `fetch` responses mirroring `admin-dashboard-api.md` Phase 3; the 401/422/404/5xx branches are covered explicitly. |
| Observability | Non-2xx envelope failures and decision outcomes are logged via the existing `logger` seam; document URLs and applicant PII beyond an id are excluded. |
| Versioning | N/A — no published library surface; app version stays `0.0.0`. |

**Result**: PASS (no violations; Complexity Tracking table left empty).

*Post-Phase 1 re-check*: PASS — the design adds zero runtime dependencies and no extra projects. The only shared-surface change is promoting two already-generic components from `src/cooks/` to `src/review/` with re-export shims so Phase 2 imports and tests are untouched. See [research.md](./research.md) decisions R1–R9.

## Project Structure

### Documentation (this feature)

```text
specs/003-driver-applications-review/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── drivers-api.md       # External: GET /admin/drivers/pending, POST approve, POST reject, + GET /admin/cities (read dep)
│   └── driver-review-ui.md  # Internal: src/review/ shared surface, useDriverApplications / driversApi, component props, messages
├── checklists/
│   └── requirements.md  # Pre-existing spec-quality checklist
└── tasks.md             # Created later by /speckit-tasks
```

### Source Code (repository root)

```text
src/
├── api/                      # UNCHANGED — authedRequest / setTokenProvider seam already added in Phase 2
├── auth/                     # UNCHANGED — session, RequireAdmin, unauthorized handler reused as-is
├── cities/                   # UNCHANGED — fetchCityDirectory() + useCityNames() reused verbatim
│   ├── citiesApi.ts
│   ├── useCityNames.ts
│   └── types.ts
├── review/                   # NEW shared folder — generic review primitives promoted out of src/cooks/
│   ├── DialogShell.tsx           # MOVED from src/cooks/ verbatim (portal, focus trap, Esc, focus restore)
│   ├── DocumentViewer.tsx        # MOVED from src/cooks/; viewer-chrome strings now come from reviewMessages
│   │                             #   (default) or an optional `strings` prop. Image + iframe paths both kept.
│   └── messages.ts               # reviewMessages: close / prev / next / zoom / "document unavailable" / open-in-new-tab
├── cooks/
│   ├── DialogShell.tsx           # REPLACED with: export { default } from '../review/DialogShell'
│   ├── DocumentViewer.tsx        # REPLACED with: export { default } from '../review/DocumentViewer'
│   ├── messages.ts               # EDIT: drop the moved viewer-chrome keys (now in reviewMessages); re-export them
│   │                             #   from reviewMessages for source compatibility, or update the 2 internal call sites
│   └── …                         # everything else UNCHANGED
├── drivers/
│   ├── driversApi.ts         # listPendingDrivers() / approveDriver(id) / rejectDriver(id, reason) via authedRequest
│   ├── types.ts              # DriverApplication, DocumentRef, DecisionOutcome, CardStatus
│   ├── sortQueue.ts          # pure: stable oldest-first order — submitted_at asc, then id asc (FR-010)
│   ├── useDriverApplications.ts  # hook: load / sort / refresh / per-card decision state / remove-on-success /
│   │                             #   reconcile-on-422/404 / count / empty|error|loading flags
│   ├── messages.ts           # Arabic strings (page, fields, confirmations, errors, empty state)
│   ├── DriverApplicationsPage.tsx    # /drivers screen: header + count, loading/empty/error states, refresh, list
│   ├── DriverApplicationCard.tsx     # one application: identity + vehicle rows, city name, 3 doc thumbnails,
│   │                                 #   approve/reject buttons with in-flight disable (FR-015 / FR-021)
│   ├── ApproveDialog.tsx         # confirm-only modal (FR-013) — uses src/review/DialogShell
│   └── RejectDialog.tsx          # reason textarea + validation (non-empty, ≤1000), preserves text on failure
├── pages/
│   └── DeliveryPage.tsx      # UNCHANGED — the mocked "إدارة الدليفري" live-delivery screen stays on /delivery
└── App.tsx                   # EDIT: add <Route path="/drivers" element={<DriverApplicationsPage/>} />

src/components/
└── Sidebar.tsx              # EDIT: add a menu item { name: 'طلبات السائقين', icon: Bike, path: '/drivers' }

tests/
├── helpers/
│   ├── fixtures.ts          # EDIT: add pendingDriver(overrides) builder; reuse ok/fail/cityList
│   └── harness.tsx          # EDIT: add renderAtDrivers() alongside renderAtCooks()
├── unit/
│   ├── driverSortQueue.test.ts   # submitted_at ordering, id tie-break, stability/idempotence
│   └── driverOutcome.test.ts     # 200 / 404 / 422 / 0 / 5xx → DecisionOutcome mapping (if classifier is extracted pure)
├── integration/
│   ├── driver-review-list.test.tsx   # US1: queue ordered, all identity/vehicle fields, city name + raw-id fallback,
│   │                                 #   count, empty state, doc-unavailable, missing-field placeholder, refresh
│   ├── driver-approve.test.tsx       # US2: confirm→approve→removed+toast; cancel; in-flight disables both controls;
│   │                                 #   422 not-pending → removed + info + reconcile; 404; 5xx retryable
│   ├── driver-reject.test.tsx        # US3: reason required, whitespace-only blocked, >1000 blocked, success removes,
│   │                                 #   reason preserved on 5xx, modal cancel, 422 not-pending path
│   └── driver-review-session.test.tsx   # FR-028: 401 on any call → Phase 1 session-loss → redirect to /login
└── a11y/
    └── driver-review-a11y.test.tsx  # axe on list / card / viewer / approve dialog / reject dialog / empty / error;
                                     #   keyboard-only: open viewer, navigate the 3 docs, zoom, close; complete a reject
```

**Structure Decision**: Keep the existing single Vite SPA. New feature code lands in `src/drivers/`, mirroring `src/cooks/`. Two components that are already free of cook-specific logic (`DialogShell`, `DocumentViewer`) move to a new `src/review/` folder so both review features share one focus-trapped, keyboard-navigable, axe-clean implementation; `src/cooks/` keeps one-line re-export files so Phase 2 code and its tests do not change. The Phase 1 `src/api/` transport and the Phase 2 `src/cities/` directory are reused with no edits. `/drivers` is a new route + sidebar entry (driver *application review* is distinct from the mocked `/delivery` live-delivery screen, which is left untouched). Tests extend the existing `tests/` tree, mirroring the three user stories.

## Complexity Tracking

*No constitutional violations — table intentionally empty.*

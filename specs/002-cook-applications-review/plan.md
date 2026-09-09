# Implementation Plan: Cook Applications Review

**Branch**: `002-cook-applications-review` | **Date**: 2026-09-07 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-cook-applications-review/spec.md`

## Summary

Give the Tabaakhuh admin dashboard a real "cook applications review" screen at the existing `/cooks` route, replacing the fully-mocked `src/pages/CooksManagement.tsx` placeholder. An administrator sees every cook whose `approval_status` is `pending` (from `GET /admin/cooks/pending`), inspects each applicant's four verification images in an in-dashboard zoomable overlay viewer and their signed contract PDF, then approves (`POST /admin/cooks/{id}/approve`, with an explicit confirm step) or rejects (`POST /admin/cooks/{id}/reject` with a required 1–1000 char reason). Decided or missing applications are reconciled out of the queue on `422`/`404`; connectivity/5xx failures leave the card in place with a retryable message. The queue is ordered oldest-first (contract `signed_at` asc, then cook id), rendered as one plain list sized for ~200 entries, and each city reference is resolved to a name via the platform city list (`GET /admin/cities`, a read dependency).

Technical approach: reuse the Phase 1 transport (`src/api/httpClient.ts` envelope + `ApiError` + `setUnauthorizedHandler`) with one new seam — `setTokenProvider` + an `authedRequest` helper — so feature code never handles the bearer token and 401s automatically route through the existing session-loss path (FR-026). A new `src/cooks/` feature folder holds the API wrapper, a `useCookApplications` hook (load / sort / refresh / remove-on-decision), and the screen + card + `DocumentViewer` + `ApproveDialog` + `RejectDialog` components. A small shared `src/cities/` module fetches and memoises the city directory for id→name resolution. No new runtime dependencies; tests use the Phase 1 Vitest + Testing Library + `vitest-axe` harness.

## Technical Context

**Language/Version**: TypeScript `~6.0.2` (`typescript` in package.json), compiled by Vite 8; `target` ES2023, `jsx: react-jsx`, `verbatimModuleSyntax: true`. `@types/react` 19.x against a React 18.x runtime — pre-existing, not touched.

**Primary Dependencies**: React 18, react-dom 18, react-router-dom 7 (routing already in place), Tailwind CSS 4, lucide-react (icons). No HTTP client, state library, or data-fetching library — native `fetch` (via the Phase 1 `apiRequest`) + React hooks are sufficient for four endpoints.

**Storage**: None new. The bearer token continues to live in `localStorage` under the Phase 1 keys and is read only through the `authStorage` / new `setTokenProvider` seam. The pending queue, city directory, and viewer state are in-memory only and are dropped when the administrator leaves the `/cooks` route (FR-028, SC-007). The city directory is memoised in a module-level cache for the browser session (not persisted).

**Testing**: Vitest + @testing-library/react + @testing-library/user-event + jsdom for unit/integration; `vitest-axe` for the WCAG checks (SC-008). Reuses `tests/helpers/fetchMock.ts`, `tests/helpers/harness.tsx`, `tests/helpers/fixtures.ts`, `tests/setup.ts` from Phase 1. `fetch` mocked per test with envelope fixtures mirroring `admin-dashboard-api.md` Phase 2 + the Phase 5 `GET /admin/cities` shape.

**Target Platform**: Modern desktop browsers (Chromium, Firefox, Safari current). Static SPA, RTL Arabic UI (`dir="rtl"` already on `AdminLayout`).

**Project Type**: Web — single existing frontend project in `src/`. No backend work.

**Performance Goals**:
- SC-006a: with ~200 pending entries the list becomes scrollable/interactive within 3 s of data arrival and scrolls without perceptible stutter — met by a plain keyed `.map()` of lightweight cards (no virtualization) plus deferred image loading (`loading="lazy"` thumbnails; full images fetched only when the viewer opens).
- SC-001: any application's four documents openable and judged legible within 10 s — the viewer opens instantly from already-known URLs; zoom is CSS-transform only.

**Constraints**:
- FR-004 / FR-028 / SC-007: verification images open in an in-dashboard overlay, never by navigating the raw file URL as a top-level page; the dashboard keeps no blob/dataURL/localStorage copy; queue state (with URLs) is discarded on route unmount; document URLs are never logged. Residual browser HTTP-cache retention on the cross-origin CDN is outside dashboard control (documented caveat, mirrors the Phase 1 XSS note).
- FR-011: client-side stable sort — contract `signed_at` ascending; entries with no contract after those, ascending by cook profile id (creation-order proxy, since the pending payload carries no submission timestamp).
- FR-011a: single plain list, no pagination / incremental loading / virtualization; built for ~200 entries.
- FR-003a: city id → name via `GET /admin/cities` (includes inactive cities); missing entry or unavailable list → show the raw id; never blocks review.
- FR-013 / FR-016..FR-018: approve requires explicit confirmation; reject requires a non-whitespace reason capped at 1000 characters, enforced before the request.
- FR-024: connectivity / 5xx on a decision leaves the card in the queue, records nothing locally, shows a retryable message; the reject reason is preserved (FR-020).
- FR-026: every request goes through `authedRequest`; a 401 triggers the Phase 1 `unauthorizedHandler` → session ends → redirect to `/login`.
- WCAG 2.1 AA for the screen, `DocumentViewer`, both dialogs, and all error/empty/loading states (FR-030).
- Backend base URL stays `import.meta.env.VITE_API_BASE_URL`; no new env vars.

**Scale/Scope**: ~10 new source files under `src/cooks/` + ~3 under `src/cities/`, 1 route repoint in `App.tsx`, 1 small edit to `src/api/httpClient.ts` (token seam) + 1 line in `src/auth/AuthContext.tsx`, ~7 test files. 30 functional requirements, 8 success criteria, 3 user stories (P1 review queue, P2 approve, P3 reject). The mocked `src/pages/CooksManagement.tsx` is superseded for the `/cooks` route.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` is an unratified template — every principle and section is still a `[PLACEHOLDER]`. There are **no project-specific constitutional gates to enforce**. The plan holds itself to the general principles the template gestures at, consistent with Phase 1:

| Principle (template intent) | How this plan complies |
|---|---|
| Test-First | The Vitest harness already exists. Each user story's acceptance scenarios become integration tests written alongside the implementation; the queue-sort and city-resolution logic get unit tests first. |
| Simplicity / YAGNI | Zero new runtime dependencies. Reuses the Phase 1 `apiRequest` / `ApiError` / `unauthorizedHandler`. No virtualization, no data-fetching library, no global store — one feature hook + local component state. |
| Integration testing on contract boundaries | `src/cooks/cooksApi.ts` and `src/cities/citiesApi.ts` get integration tests against mocked `fetch` responses mirroring `admin-dashboard-api.md`; the 401/422/404 branches are covered explicitly. |
| Observability | Non-2xx envelope failures and decision outcomes are logged via the existing `logger` seam; document URLs and any applicant PII beyond an id are excluded. |
| Versioning | N/A — no published library surface; app version stays `0.0.0`. |

**Result**: PASS (no violations; Complexity Tracking table left empty).

*Post-Phase 1 re-check*: PASS — the design adds zero runtime dependencies and no extra projects; the only shared-surface change is the additive `setTokenProvider` seam in `httpClient.ts` (symmetric with the existing `setUnauthorizedHandler`). See [research.md](./research.md) decisions R1–R8.

## Project Structure

### Documentation (this feature)

```text
specs/002-cook-applications-review/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── cooks-api.md         # External: GET /admin/cooks/pending, POST approve, POST reject, + GET /admin/cities (read dep)
│   └── cook-review-ui.md    # Internal: authedRequest seam, useCookApplications / useCityNames surface, component props, messages
├── checklists/
│   └── requirements.md  # Pre-existing spec-quality checklist
└── tasks.md             # Created later by /speckit-tasks
```

### Source Code (repository root)

```text
src/
├── api/
│   ├── envelope.ts           # unchanged (Phase 1)
│   ├── logger.ts             # unchanged (Phase 1)
│   └── httpClient.ts         # EDIT: add setTokenProvider(fn) + authedRequest<T>(path, opts)
│   │                         #   authedRequest reads the ambient token, delegates to apiRequest,
│   │                         #   throws a typed "no session" error if absent
├── auth/
│   └── AuthContext.tsx       # EDIT: one line — setTokenProvider(readToken) alongside setUnauthorizedHandler
├── cities/
│   ├── citiesApi.ts          # fetchCityDirectory(): GET /admin/cities → Map<number, CityName>; module-level memo
│   ├── useCityNames.ts       # hook: { resolve(id) => string, ready, failed }; raw-id fallback (FR-003a)
│   └── types.ts              # City { id, name_ar, name_en, is_active }
├── cooks/
│   ├── cooksApi.ts           # listPendingCooks() / approveCook(id) / rejectCook(id, reason) via authedRequest
│   ├── types.ts              # CookApplication, SignedContract, PendingCookEntry, DecisionOutcome
│   ├── sortQueue.ts          # pure: stable oldest-first order (signed_at asc, then id asc) — FR-011
│   ├── useCookApplications.ts# hook: load, refresh, ordered list, per-card decision state, remove-on-success,
│   │                         #   reconcile-on-422/404, count, empty/error/loading flags
│   ├── messages.ts           # Arabic strings (confirmations, errors, empty state, "no longer awaiting review")
│   ├── CookApplicationsPage.tsx   # /cooks screen: header + count, loading/empty/error states, refresh, list
│   ├── CookApplicationCard.tsx    # one application: details row, city name, doc thumbnails, contract block,
│   │                              #   approve/reject buttons with in-flight disable (FR-015/FR-021)
│   ├── DocumentViewer.tsx         # in-dashboard overlay: zoomable image OR contract <iframe>; focus trap,
│   │                              #   Esc/arrow/+- keys, prev-next across an application's docs (FR-004/FR-004a)
│   ├── ApproveDialog.tsx         # confirm-only modal (FR-013)
│   └── RejectDialog.tsx          # reason textarea + validation (non-empty, <=1000), preserves text on failure
├── pages/
│   └── CooksManagement.tsx   # LEFT IN TREE but no longer routed; superseded by CookApplicationsPage
└── App.tsx                   # EDIT: /cooks route element → <CookApplicationsPage/> (import swap)

tests/
├── helpers/                  # reused from Phase 1 (fetchMock, harness, fixtures)
│   └── fixtures.ts           # EDIT: add pendingCook(), signedContract(), cityList() builders
├── unit/
│   ├── sortQueue.test.ts         # signed_at ordering, no-contract entries last by id, stability
│   ├── cityDirectory.test.ts     # id→name, unknown id → raw, list 5xx/empty → raw fallback, memoisation
│   └── authedRequest.test.ts     # attaches token, throws typed error when no session, 401 → handler fires
├── integration/
│   ├── cook-review-list.test.tsx # US1: renders queue ordered, all detail fields, city name, count,
│   │                             #   empty state, contract present vs "not signed", doc-unavailable state, refresh
│   ├── cook-approve.test.tsx     # US2: confirm→approve→removed+toast; cancel confirm; in-flight disables both
│   │                             #   controls; 422 not-pending → removed + info + reconcile; 404; 5xx retryable
│   ├── cook-reject.test.tsx      # US3: reason required, whitespace-only blocked, >1000 blocked, success removes,
│   │                             #   reason preserved on 5xx, 422 not-pending path
│   └── cook-review-session.test.tsx  # 401 on any call → Phase 1 session-loss → redirect to /login
└── a11y/
    └── cook-review-a11y.test.tsx # axe on list / card / viewer / approve dialog / reject dialog / empty / error;
                                  #   keyboard-only: open viewer, navigate docs, zoom, close; complete a reject
```

**Structure Decision**: Keep the existing single Vite SPA. New code lands in two cohesive folders: `src/cooks/` (this feature) and `src/cities/` (a shared read of the city directory that Phase 5 will own and extend). The Phase 1 `src/api/` transport is reused; its only change is the additive `setTokenProvider` seam so no feature ever threads the token by hand. Tests extend the existing `tests/` tree, mirroring the three user stories. No backend, no monorepo split, no new runtime packages.

## Complexity Tracking

*No constitutional violations — table intentionally empty.*

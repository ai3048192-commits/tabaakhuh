# Implementation Plan: Withdrawals Management

**Branch**: `004-withdrawals-management` | **Date**: 2026-09-07 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-withdrawals-management/spec.md`

## Summary

Add a "Withdrawals" screen to the Tabaakhuh admin dashboard on a new `/withdrawals` route with its own sidebar entry. An administrator sees one page of balance-withdrawal requests at a time from `GET /admin/withdrawals?status=<s>&page=<n>` (backend-fixed `per_page` = 20), filters by status (all / pending / approved / rejected / paid), and pages through the result set. Each row shows the request id, amount, payment details, a status badge, the requested date, and the processed date. Contextual actions follow the lifecycle: **Approve** and **Reject** on `pending` rows (`POST …/approve`, `POST …/reject` — both no body), **Mark Paid** on `approved` rows (`POST …/mark-paid` — no body); `rejected` and `paid` rows expose no action. Every action passes through an explicit confirmation dialog (no reason input — a withdrawal rejection collects none). On success the current filter+page is re-fetched so the row's new status and the pager stay accurate; `422` (invalid transition / bad filter) and `404` surface the envelope message and reconcile; `0`/`5xx` leave the row untouched with a retryable toast.

Technical approach: this is the same shape as Phase 2 (Cook Applications Review) — a feature folder, a data hook, an API wrapper, an Arabic `messages.ts`, a screen plus small presentational components, and confirm dialogs on the shared modal shell — with two differences that drive the new code: (1) the list is **server-paginated with a status filter** rather than one unsorted array, so the hook owns `{ filter, page }` and the page is replaced (never merged) on navigation; (2) there is **no document viewer, no city resolution, and no free-text reason**, so the row is a table cell set and the three actions share one confirm-only dialog. Reuse the Phase 1 transport seam (`authedRequest` + `setTokenProvider`, already in `src/api/httpClient.ts` since Phase 2) so feature code never handles the bearer token and 401s route through the existing session-loss path (FR-034). Promote the generic `src/cooks/DialogShell.tsx` to a feature-neutral `src/shared/DialogShell.tsx` (Phase 2 keeps working via a one-line re-export shim) and add a `src/withdrawals/` folder. No new runtime dependencies; tests use the existing Vitest + Testing Library + `vitest-axe` + `fetchMock` harness.

## Technical Context

**Language/Version**: TypeScript `~6.0.2` (`typescript` in package.json), compiled by Vite 8; `target` ES2023, `jsx: react-jsx`, `verbatimModuleSyntax: true`. `@types/react` 19.x against a React 18.x runtime — pre-existing, not touched.

**Primary Dependencies**: React 18, react-dom 18, react-router-dom 7 (routing already in place), Tailwind CSS 4, lucide-react (icons — `Wallet` for the sidebar, `ChevronRight`/`ChevronLeft` for the pager, `RefreshCw` for refresh). No HTTP client, state library, data-fetching library, or table library — native `fetch` (via the Phase 1 `authedRequest`) + React hooks are sufficient for one paginated list endpoint plus three no-body action endpoints.

**Storage**: None new. The bearer token continues to live in `localStorage` under the Phase 1 keys and is read only through the `setTokenProvider` seam. The current page of requests, the active filter, the page number, and per-row action state are in-memory only and are dropped when the administrator leaves the `/withdrawals` route (FR-038, SC-008). No client cache of pages.

**Testing**: Vitest + @testing-library/react + @testing-library/user-event + jsdom for unit/integration; `vitest-axe` for the WCAG checks (SC-009). Reuses `tests/helpers/fetchMock.ts`, `tests/helpers/harness.tsx`, `tests/helpers/fixtures.ts`, `tests/setup.ts`. `fetch` is mocked per test with envelope fixtures mirroring `admin-dashboard-api.md` Phase 4, including the `{ items, page, per_page, total }` pagination shape.

**Target Platform**: Modern desktop browsers (Chromium, Firefox, Safari current). Static SPA, RTL Arabic UI (`dir="rtl"` already on `AdminLayout`).

**Project Type**: Web — single existing frontend project in `src/`. No backend work.

**Performance Goals**:
- SC-001: the pending requests are visible within 5 s of the response arriving — met trivially by rendering one 20-row table (no virtualization, no per-row async work).
- SC-007: paging through ≥60 matching requests (3+ pages) reaches every request with the page position and total always shown — met by server pagination; each page swap is one `GET` and a full table re-render of ≤20 rows.

**Constraints**:
- FR-008..FR-012: the status filter offers exactly `all | pending | approved | rejected | paid`; an arbitrary value is not enterable. Default filter on first open is `pending` (FR-009). The active filter is visibly indicated (FR-010). Changing the filter returns the view to page 1 (FR-011).
- FR-013: exactly one backend page (≤20 rows) is held and shown at a time; pages are never merged, incrementally loaded, or virtualized. `per_page` is read from the response, not assumed.
- FR-014/FR-015/FR-016: the pager shows current page and total matching count; Previous is disabled on page 1, Next is disabled at/after the last page (`ceil(total / per_page)`); landing on a page beyond range shows an empty result plus a "back to first page" control, not an error.
- FR-017/FR-021/FR-025: Approve/Reject render only on `pending` rows; Mark Paid renders only on `approved` rows; `rejected` and `paid` rows show no action.
- FR-018/FR-022/FR-026: each action requires an explicit confirmation dialog; cancelling sends nothing. No reason field on reject.
- FR-007/FR-019/FR-023/FR-027/FR-029/FR-030/FR-032: after any successful action (or a `422`/`404` reconcile) the dashboard re-fetches the active filter+page rather than locally patching the row.
- FR-020/FR-024/FR-028: while an action is in flight the row's action controls are disabled with a progress indicator; only one request per confirmed action.
- FR-031/FR-037: `0` (network) / `≥500` on an action leaves the row's status unchanged, records nothing locally, and shows a retryable "please try again" toast.
- FR-033: no action is shown as successful unless the envelope `success` is `true`.
- FR-034: every request goes through `authedRequest`; a `401` triggers the Phase 1 `unauthorizedHandler` → session ends → redirect to `/login`.
- FR-035: `/withdrawals` renders only inside `<RequireAdmin>`; a signed-in non-admin never reaches it.
- FR-036: the standard envelope drives success/error toasts; field-level `errors` are surfaced where present.
- FR-038: payment details are never written to any dashboard storage and are dropped from memory on route unmount; payment details and amounts are excluded from all `logger` calls.
- FR-040: WCAG 2.1 AA for the screen, the filter control, the table, the pager, the confirm dialog, and all loading/empty/error states — status conveyed by text/shape not colour alone, table headers programmatically associated, full keyboard operation, dialog focus trap + restore, live-region announcements for every success/error message.
- Backend base URL stays `import.meta.env.VITE_API_BASE_URL`; no new env vars.

**Scale/Scope**: ~8 new source files under `src/withdrawals/`, 1 component moved to a new `src/shared/` folder with a re-export shim left in `src/cooks/`, 1 new route + 1 sidebar entry in `src/App.tsx` / `src/components/Sidebar.tsx`, `tests/helpers/fixtures.ts` + `tests/helpers/harness.tsx` extended, ~9 new test files. 40 functional requirements, 10 success criteria, 4 user stories (P1 review/filter/paginate, P2 approve, P3 reject, P4 mark paid). No change to `src/api/`, `src/auth/`, or `src/cities/`.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` is an unratified template — every principle and section is still a `[PLACEHOLDER]`. There are **no project-specific constitutional gates to enforce**. The plan holds itself to the general principles the template gestures at, consistent with Phases 1–3:

| Principle (template intent) | How this plan complies |
|---|---|
| Test-First | The Vitest harness already exists. Each user story's acceptance scenarios become integration tests written alongside the implementation; the pure helpers (`totalPages`, amount/date formatting, filter guard, outcome classifier) get unit tests first. |
| Simplicity / YAGNI | Zero new runtime dependencies. Reuses the Phase 1 `authedRequest` / `ApiError` / `unauthorizedHandler`. No table library, no data-fetching library, no global store, no URL-state sync — one feature hook + local component state. One confirm-only dialog serves all three actions. |
| Integration testing on contract boundaries | `src/withdrawals/withdrawalsApi.ts` gets integration tests against mocked `fetch` responses mirroring `admin-dashboard-api.md` Phase 4; the `200` / `422` / `404` / `0` / `5xx` branches and the `?status=`/`?page=` query construction are covered explicitly. |
| Observability | Non-2xx envelope failures and action outcomes are logged via the existing `logger` seam; payment details and amounts are excluded. |
| Versioning | N/A — no published library surface; app version stays `0.0.0`. |

**Result**: PASS (no violations; Complexity Tracking table left empty).

*Post-Phase 1 re-check*: PASS — the design adds zero runtime dependencies and no extra projects. The only shared-surface change is promoting one already-generic component (`DialogShell`) from `src/cooks/` to `src/shared/` with a re-export shim so Phase 2 imports and tests are untouched. See [research.md](./research.md) decisions R1–R9.

## Project Structure

### Documentation (this feature)

```text
specs/004-withdrawals-management/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── withdrawals-api.md      # External: GET /admin/withdrawals, POST approve|reject|mark-paid
│   └── withdrawals-ui.md       # Internal: src/shared/DialogShell, useWithdrawals / withdrawalsApi, component props, messages
├── checklists/
│   └── requirements.md  # Pre-existing spec-quality checklist
└── tasks.md             # Created later by /speckit-tasks
```

### Source Code (repository root)

```text
src/
├── api/                      # UNCHANGED — authedRequest / setTokenProvider / unauthorizedHandler reused as-is
├── auth/                     # UNCHANGED — session, RequireAdmin, unauthorized handler reused as-is
├── shared/                   # NEW feature-neutral folder
│   └── DialogShell.tsx           # MOVED verbatim from src/cooks/DialogShell.tsx (portal, backdrop,
│                                 #   role="dialog" + aria-modal, Esc to dismiss, focus trap, focus restore)
├── cooks/
│   ├── DialogShell.tsx           # REPLACED with: export { default } from '../shared/DialogShell'
│   └── …                         # everything else UNCHANGED (Phase 2 tests untouched)
├── withdrawals/
│   ├── withdrawalsApi.ts     # listWithdrawals({status?,page}, signal?) → GET /admin/withdrawals?status=&page=
│   │                         #   approveWithdrawal(id) / rejectWithdrawal(id) / markWithdrawalPaid(id) — POST, no body
│   ├── types.ts              # Withdrawal, WithdrawalStatus, WithdrawalPage, StatusFilter, RowStatus,
│   │                         #   ActionKind, ActionOutcome
│   ├── pagination.ts         # pure: totalPages(total, perPage), clampPage(page, totalPages)
│   ├── format.ts             # pure: formatAmount(n), formatDateTime(iso|null), isValidStatusFilter(v)
│   ├── useWithdrawals.ts     # hook: owns filter + page + page-data + per-row action state;
│   │                         #   load / refresh / setFilter(→page 1) / setPage / openConfirm / closeConfirm /
│   │                         #   approve / reject / markPaid; outcome classification (200 → refetch + toast;
│   │                         #   422 → invalid_transition + refetch; 404 → not_found + refetch; 0/5xx → transient)
│   ├── messages.ts           # Arabic strings (page, column headers, status labels, filter labels,
│   │                         #   confirmations, toasts, empty/error/loading, pager)
│   ├── WithdrawalsPage.tsx       # /withdrawals screen: header + refresh, StatusFilter, loading/empty/error,
│   │                             #   WithdrawalsTable, Pager, toast live-region, ConfirmDialog wiring
│   ├── StatusFilter.tsx          # segmented control / select over all|pending|approved|rejected|paid (FR-008/010/012)
│   ├── WithdrawalsTable.tsx      # <table> with a header row + one <WithdrawalRow> per item
│   ├── WithdrawalRow.tsx         # id, amount, payment details, status badge, requested date, processed date,
│   │                             #   contextual action buttons with in-flight disable (FR-017/021/025/028)
│   ├── StatusBadge.tsx           # text + shape/icon per status — never colour-only (FR-003/040)
│   ├── Pager.tsx                 # "page X of Y" + total, Prev/Next disable rules, back-to-first (FR-014/015/016)
│   └── ConfirmDialog.tsx         # confirm-only modal on src/shared/DialogShell; title/body/confirm-label per action
├── pages/                    # UNCHANGED — FinancialReports.tsx etc. are separate screens
└── App.tsx                   # EDIT: import WithdrawalsPage; add <Route path="/withdrawals" element={<WithdrawalsPage/>} />

src/components/
└── Sidebar.tsx              # EDIT: add { name: 'طلبات السحب', icon: Wallet, path: '/withdrawals' } before 'التقارير المالية'

tests/
├── helpers/
│   ├── fixtures.ts          # EDIT: add withdrawal(overrides) + withdrawalPage(items, {page,per_page,total}); reuse ok/fail
│   └── harness.tsx          # EDIT: add renderAtWithdrawals(fm, opts) alongside renderAtCooks()
├── unit/
│   ├── withdrawalsPagination.test.ts   # totalPages / clampPage: exact multiples, remainder, zero, page-beyond-range
│   ├── withdrawalsFormat.test.ts       # amount formatting, null processed date → placeholder, filter guard
│   └── withdrawalsOutcome.test.ts      # 200 / 404 / 422 / 0 / 5xx → ActionOutcome mapping (pure classifier)
├── integration/
│   ├── withdrawals-list.test.tsx       # US1 AC1–6: default pending filter, all columns, filter switch → page 1,
│   │                                   #   pager next/prev + position + total, empty per filter, loading, refresh,
│   │                                   #   page-beyond-range → empty + back-to-first, missing amount/details + null
│   │                                   #   processed date placeholders
│   ├── withdrawals-approve.test.tsx    # US2 AC1–6: Approve only on pending; confirm required/cancel; happy path
│   │                                   #   (one POST, no body, bearer) → refetch shows approved + processed date +
│   │                                   #   success toast; in-flight disables row; 422 invalid transition → message +
│   │                                   #   refetch; 404; 5xx/offline → unchanged + retry toast
│   ├── withdrawals-reject.test.tsx     # US3 AC1–6: Reject only on pending; confirm-only (no reason field); happy
│   │                                   #   path → rejected + toast; terminal row shows no actions; transient failure
│   │                                   #   leaves row unchanged
│   ├── withdrawals-mark-paid.test.tsx  # US4 AC1–6: Mark Paid only on approved; absent for pending/rejected/paid;
│   │                                   #   happy path → paid + toast; 422 not-approved → message + refetch; cancel
│   └── withdrawals-session.test.tsx    # FR-034: 401 on list or any action → Phase 1 session-loss → redirect /login
└── a11y/
    └── withdrawals-a11y.test.tsx       # axe on list/table / filter / pager / confirm dialog / empty / error;
                                        #   keyboard-only: change filter, page, complete an approve; header assoc;
                                        #   status not colour-only
```

**Structure Decision**: Keep the existing single Vite SPA. New feature code lands in `src/withdrawals/`, mirroring `src/cooks/`. The one component that is already free of feature-specific logic (`DialogShell`) moves to a new feature-neutral `src/shared/` folder so both the cook-review dialogs and the withdrawals confirm dialog share one focus-trapped, keyboard-navigable, axe-clean modal shell; `src/cooks/DialogShell.tsx` keeps a one-line re-export so Phase 2 code and its tests do not change. (Phase 3, when implemented, should also source `DialogShell` from `src/shared/` rather than introducing `src/review/`.) The Phase 1 `src/api/` transport is reused with no edits. `/withdrawals` is a new route + sidebar entry, financially adjacent to "التقارير المالية". Tests extend the existing `tests/` tree, mirroring the four user stories.

## Complexity Tracking

*No constitutional violations — table intentionally empty.*

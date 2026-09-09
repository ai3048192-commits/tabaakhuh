# Implementation Plan: Cities Management

**Branch**: `005-cities-management` | **Date**: 2026-09-07 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/005-cities-management/spec.md`

## Summary

Add a "Cities Management" screen to the Tabaakhuh admin dashboard on a new `/cities` route with its own sidebar entry. An administrator sees **every** city (active and inactive) from `GET /admin/cities` in one unpaginated table — Arabic name, English name, and an active/inactive badge that is never colour-only — with a client-side text search that filters by either name as they type. From the table they can **Add** a city (modal form, two required names, 1–255 chars, starts active), **Edit** a city's name (modal form pre-filled, one or both names, at least one required), and **toggle** a city active/inactive (row control + explicit confirmation dialog). Every mutation goes to `POST /admin/cities` / `PUT /admin/cities/{id}` / `PATCH /admin/cities/{id}/status`; on success the full list is re-fetched (never locally patched) and a success toast shows the envelope message; a `422` surfaces the field-level error (especially the duplicate-name case) inside the open dialog with the entered values kept; a `404` on edit/toggle tells the administrator and re-fetches; `0`/`5xx` leave the city untouched with a retryable toast. Concurrent edits are last-write-wins (the spec's accepted limitation) — the post-save re-fetch is the reconciliation.

Technical approach: same shape as Phases 2–4 — a feature folder under `src/cities/`, a data hook, an API wrapper, an Arabic `messages.ts`, a screen plus small presentational components, and dialogs on the shared modal shell. Three differences drive the new code: (1) the list is **one unpaginated array** the client holds whole and filters in memory (no `?page=`, no `?status=` — contrast Phase 4), so the hook owns `{ allCities, search }` and derives the visible rows; (2) there are **two form dialogs** (Add and Edit share one `CityFormDialog` with `mode`) that carry text inputs and surface server field errors, plus one confirm-only toggle dialog — contrast Phase 4's single confirm-only dialog; (3) `src/cities/` **already exists** as a read-only city *directory* (`fetchCityDirectory`, memoised once per session, consumed by cook/driver review to resolve `city_id → name`) — this feature adds the write operations next to it and, after any successful mutation, calls `__resetCityDirectory()` so other screens pick up new or renamed cities on their next mount. Reuse the Phase 1 transport seam (`authedRequest` + `setTokenProvider`) so feature code never handles the bearer token and `401`s route through the existing session-loss path (FR-035). Promote `src/review/DialogShell.tsx` to `src/shared/DialogShell.tsx` (a one-line re-export shim stays at `src/review/DialogShell.tsx`, so cook/driver dialogs and their tests do not change) because a `cities → review` import is the wrong dependency direction. No new runtime dependencies; tests use the existing Vitest + Testing Library + `vitest-axe` + `fetchMock` harness.

## Technical Context

**Language/Version**: TypeScript `~6.0.2` (`typescript` in package.json), compiled by Vite 8; `target` ES2023, `jsx: react-jsx`, `verbatimModuleSyntax: true`. `@types/react` 19.x against a React 18.x runtime — pre-existing, not touched.

**Primary Dependencies**: React 18, react-dom 18, react-router-dom 7 (routing already in place), Tailwind CSS 4, lucide-react (icons — `MapPin` for the sidebar, `Plus` for Add, `Pencil` for edit, `Search` for the filter box, `RefreshCw` for refresh). No HTTP client, state library, data-fetching library, form library, or table library — native `fetch` (via the Phase 1 `authedRequest`) + React hooks are sufficient for one list endpoint plus three mutation endpoints and a two-field form.

**Storage**: None new. The bearer token continues to live in `localStorage` under the Phase 1 keys and is read only through the `setTokenProvider` seam. The full city list, the search string, the open-dialog state, and per-row action state are in-memory only and are dropped when the administrator leaves the `/cities` route. No client cache of the list beyond the current screen instance; the memoised `fetchCityDirectory` in `citiesApi.ts` is a separate concern (used by other features) and is explicitly invalidated after every successful mutation.

**Testing**: Vitest + @testing-library/react + @testing-library/user-event + jsdom for unit/integration; `vitest-axe` for the WCAG checks (SC-010). Reuses `tests/helpers/fetchMock.ts`, `tests/helpers/harness.tsx`, `tests/helpers/fixtures.ts`, `tests/setup.ts`. `fetch` is mocked per test with envelope fixtures mirroring `admin-dashboard-api.md` Phase 5, including the `201` on create and the `422` `errors` map for a duplicate name.

**Target Platform**: Modern desktop browsers (Chromium, Firefox, Safari current). Static SPA, RTL Arabic UI (`dir="rtl"` already on `AdminLayout`).

**Project Type**: Web — single existing frontend project in `src/`. No backend work.

**Performance Goals**:
- SC-001: every city is visible within 5 s of the response arriving — met trivially by rendering one table (no pagination, no per-row async work); a city list is inherently small (tens, low hundreds).
- SC-013: with ≥30 cities, typing in the search narrows the list within 1 s and with no server request — met by an in-memory `filter` over an array held in state; no debounce needed at this size, no network.

**Constraints**:
- FR-001/FR-002/FR-003: one unpaginated list of **all** cities (active and inactive); each row shows `name_ar`, `name_en`, and an active/inactive indicator distinguishable by more than colour (text label + icon).
- FR-004/FR-005/FR-006/FR-007: loading state distinct from empty; empty list → explicit "no cities" state with Add still available; a Refresh control plus a mandatory re-fetch after every successful mutation; a failed list load with nothing shown → screen error + Retry, a failed refresh with a list shown → keep the list + toast.
- FR-042/FR-043: a labelled client-side search box filtering by `name_ar` OR `name_en` as typed, no server request; a term matching nothing → an explicit "no cities match your search" state (distinct from "no cities"); clearing restores the full list; the term never affects which cities are retrieved or mutated.
- FR-008..FR-015 (Add): modal dialog, two fields; both required, blocked pre-submit on empty/whitespace with a field message; 255-char max enforced pre-submit; on success the city shows in the list as active with a success toast; a duplicate-name `422` shows a specific "name already in use" message on the offending field and keeps the dialog open with entered values; submit disabled + progress while in flight (one request); a `0`/`5xx` adds no city, preserves the form, shows a retryable toast; Cancel/dismiss creates nothing.
- FR-016..FR-025 (Edit): modal dialog opened from the row, mirrors the Add form, pre-filled with current names; one or both names editable, unchanged names left as-is; blocked pre-submit when neither name is supplied ("at least one name required"); 255-char max pre-submit; success → new name(s) in the row + success toast; duplicate `422` → specific message on the offending field, dialog stays open with entered values; `404` → "could not be found" toast, dialog closes, list re-fetched; submit disabled + progress while in flight; `0`/`5xx` → name unchanged, no local change, retryable toast; Cancel/dismiss changes nothing.
- FR-026..FR-031 (toggle): a row control to switch active⇄inactive and **no** delete anywhere; an explicit confirmation before submit (Cancel sends nothing); success → new status in the row + success toast; that row's toggle disabled + progress while in flight (one request); `404` → "could not be found" toast + list re-fetch; `0`/`5xx` → status unchanged, no local change, retryable toast.
- FR-032/FR-033/FR-034: a success whose updated body is unreadable is still treated as applied (toast + re-fetch); never present an action as successful unless the envelope `success` is `true`; field-level `errors` from the envelope are surfaced against the matching form field, falling back to the envelope `message` when absent.
- FR-035: every request goes through `authedRequest`; a `401` triggers the Phase 1 `unauthorizedHandler` → session ends → redirect to `/login`.
- FR-036: `/cities` renders only inside `<RequireAdmin>`; a signed-in non-admin never reaches it.
- FR-037/FR-038: the standard envelope drives success/error toasts; unexpected server errors show a generic retryable message and leave the list consistent (no half-applied change shown).
- FR-039: reuse the shared layout, sidebar, `authedRequest`, `<RequireAdmin>`, and the toast pattern from earlier phases; add one sidebar entry.
- FR-040: Arabic-first RTL layout for the table, the search box, both dialogs, the confirmation prompt, and every error/empty/loading state.
- FR-041: WCAG 2.1 AA — programmatic labels on all controls/fields, full keyboard operation with a visible focus ring, every dialog traps + restores focus and is `Esc`-dismissible, `<th scope="col">` header association per column, active/inactive not by colour alone, the filtered result count (incl. the no-match state) announced to AT, and every success/error message (incl. duplicate-name and not-found) announced via a live region.
- After every successful create / edit / status change: call `__resetCityDirectory()` so cook/driver review re-fetch fresh names next mount (research R8).
- Backend base URL stays `import.meta.env.VITE_API_BASE_URL`; no new env vars.

**Scale/Scope**: ~10 new source files under `src/cities/`; edits to `src/cities/citiesApi.ts` and `src/cities/types.ts` (additive — the read-only directory API is untouched); 1 new route + 1 sidebar entry in `src/App.tsx` / `src/components/Sidebar.tsx`; `src/review/DialogShell.tsx` promoted to `src/shared/DialogShell.tsx` with a re-export shim left behind (no cook/driver test change); `tests/helpers/fixtures.ts` + `tests/helpers/harness.tsx` extended; ~9 new test files. 43 functional requirements, 13 success criteria, 4 user stories (P1 view + search, P2 add, P3 edit, P4 activate/deactivate). No change to `src/api/`, `src/auth/`, `src/cooks/`, or `src/drivers/`.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` is an unratified template — every principle and section is still a `[PLACEHOLDER]`. There are **no project-specific constitutional gates to enforce**. The plan holds itself to the general principles the template gestures at, consistent with Phases 1–4:

| Principle (template intent) | How this plan complies |
|---|---|
| Test-First | The Vitest harness already exists. Each user story's acceptance scenarios become integration tests written alongside the implementation; the pure helpers (`filterCities`, `validateNames`, the mutation-outcome classifier) get unit tests first. |
| Simplicity / YAGNI | Zero new runtime dependencies. Reuses the Phase 1 `authedRequest` / `ApiError` / `unauthorizedHandler`. No table library, no form library, no data-fetching library, no global store, no URL-state sync — one feature hook + local component state. One `CityFormDialog` serves both Add and Edit via a `mode` prop; one confirm-only dialog for the toggle. No pagination, no sorting, no status filter (spec-scoped out). |
| Integration testing on contract boundaries | `src/cities/citiesApi.ts` gets integration tests against mocked `fetch` mirroring `admin-dashboard-api.md` Phase 5 — the `200`/`201`/`422`(+`errors`)/`404`/`0`/`5xx` branches and the request shapes (`POST` body `{name_ar,name_en}`, `PUT` partial body, `PATCH` `{is_active}`) are covered explicitly. Existing `tests/unit/cityDirectory.test.ts` must stay green (the directory API is only extended, not changed). |
| Observability | Non-2xx envelope failures and mutation outcomes are logged via the existing `logger` seam (status + path only; city names are not sensitive but are still not logged, matching the seam's "paths and codes only" rule). |
| Versioning | N/A — no published library surface; app version stays `0.0.0`. |

**Result**: PASS (no violations; Complexity Tracking table left empty).

*Post-Phase 1 re-check*: PASS — the design adds zero runtime dependencies and no extra projects. The only shared-surface change is promoting one already-generic component (`DialogShell`) from `src/review/` to `src/shared/` with a re-export shim so cook/driver imports and tests are untouched. The `src/cities/` changes are additive to a module that until now was read-only. See [research.md](./research.md) decisions R1–R10.

## Project Structure

### Documentation (this feature)

```text
specs/005-cities-management/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── cities-api.md          # External: GET /admin/cities, POST /admin/cities, PUT /admin/cities/{id}, PATCH /admin/cities/{id}/status
│   └── cities-ui.md           # Internal: src/shared/DialogShell, useCitiesManagement / citiesApi, component props, messages
├── checklists/
│   └── requirements.md  # Pre-existing spec-quality checklist
└── tasks.md             # Created later by /speckit-tasks
```

### Source Code (repository root)

```text
src/
├── api/                       # UNCHANGED — authedRequest / setTokenProvider / unauthorizedHandler reused as-is
├── auth/                      # UNCHANGED — session, RequireAdmin, unauthorized handler reused as-is
├── shared/                    # NEW feature-neutral folder
│   └── DialogShell.tsx            # MOVED verbatim from src/review/DialogShell.tsx (portal, backdrop,
│                                  #   role="dialog" + aria-modal, Esc to dismiss, focus trap, focus restore)
├── review/
│   ├── DialogShell.tsx            # REPLACED with: export { default } from '../shared/DialogShell'
│   └── …                          # DocumentViewer, messages UNCHANGED (cook/driver tests untouched)
├── cities/
│   ├── citiesApi.ts           # EXTEND (additive): keep fetchCityDirectory / __resetCityDirectory;
│   │                          #   add listCities(signal?) → GET /admin/cities
│   │                          #   createCity({name_ar,name_en}) → POST /admin/cities
│   │                          #   updateCity(id, patch)         → PUT  /admin/cities/{id}
│   │                          #   setCityStatus(id, is_active)  → PATCH /admin/cities/{id}/status
│   ├── types.ts               # EXTEND: keep City; add NewCityInput, CityNamePatch, NameErrors,
│   │                          #   CityMutationOutcome, CitiesStatus, RowState, DialogState
│   ├── citySearch.ts          # NEW pure: filterCities(list, term) — trim, case-insensitive, name_ar OR name_en
│   ├── cityValidation.ts      # NEW pure: validateNames(values, mode) → NameErrors
│   │                          #   (create: both required; edit: ≥1 required; both: non-blank, ≤255)
│   ├── mutationOutcome.ts     # NEW pure: classifyMutation(err|null, fieldErrors) → CityMutationOutcome
│   ├── useCitiesManagement.ts # NEW hook: owns allCities + search + status + rowState + dialog;
│   │                          #   load / refresh / setSearch / openAdd / openEdit / closeDialog /
│   │                          #   create / update / toggleStatus; re-fetch + __resetCityDirectory on success
│   ├── messages.ts            # NEW: Arabic strings (page, columns, badges, search, dialogs, toasts, states)
│   ├── CitiesPage.tsx             # /cities screen: header + refresh, SearchBox, loading/empty/no-match/error,
│   │                              #   CitiesTable, toast live-region, CityFormDialog + StatusToggleDialog wiring
│   ├── SearchBox.tsx              # labelled text input; controlled; clear button (FR-042/043)
│   ├── CitiesTable.tsx           # <table>: header row + one <CityRow> per visible city
│   ├── CityRow.tsx               # name_ar, name_en (dir="ltr" cell), <CityStatusBadge>, Edit + toggle controls
│   ├── CityStatusBadge.tsx       # active/inactive: label + shape/icon, never colour-only (FR-003/041)
│   ├── CityFormDialog.tsx        # Add + Edit modal on src/shared/DialogShell; mode: 'add' | 'edit';
│   │                             #   two fields, live required/length validation, server field errors, busy
│   └── StatusToggleDialog.tsx    # confirm-only modal on src/shared/DialogShell; activate vs deactivate copy
├── cooks/ , drivers/          # UNCHANGED
├── pages/                     # UNCHANGED
└── App.tsx                    # EDIT: import CitiesPage; add <Route path="/cities" element={<CitiesPage/>} />

src/components/
└── Sidebar.tsx               # EDIT: add { name: 'إدارة المدن', icon: MapPin, path: '/cities' } before 'إعدادات النظام'

tests/
├── helpers/
│   ├── fixtures.ts           # EDIT: add city(overrides) + citiesResponse(cities) + createdCity/updatedCity
│   │                         #   builders; reuse the existing cityList() seed and ok()/fail()
│   └── harness.tsx           # EDIT: add renderAtCities(fm, { seedMe?, admin? }) alongside renderAtDrivers()
├── unit/
│   ├── citySearch.test.ts            # filterCities: name_ar match, name_en match, trim, case, empty term, no match
│   ├── cityValidation.test.ts        # validateNames: create both-required, edit ≥1-required, whitespace, 255 boundary
│   └── cityMutationOutcome.test.ts   # classifyMutation: 201/200 ok, 422+errors → field, 422 no-errors → form,
│   │                                 #   404 → not_found, 0/5xx → transient
│   └── cityDirectory.test.ts         # PRE-EXISTING — must stay green after citiesApi.ts is extended
├── integration/
│   ├── cities-list.test.tsx          # US1 AC1–7: all cities incl. inactive, columns, badge not colour-only,
│   │                                 #   loading vs empty, refresh, list-load error + retry, search narrows /
│   │                                 #   clears / no-match state (FR-001–007, FR-042/043, FR-036, SC-001/007/013)
│   ├── cities-add.test.tsx           # US2 AC1–7: open dialog, required + 255 pre-submit block, happy path →
│   │                                 #   POST {name_ar,name_en} → 201 → re-fetch shows active city + toast +
│   │                                 #   __resetCityDirectory; duplicate 422 → field message, dialog kept,
│   │                                 #   values preserved; in-flight disables submit (one POST); 5xx/offline →
│   │                                 #   no city added, form preserved, retry toast; cancel (FR-008–015, SC-002/003)
│   ├── cities-edit.test.tsx          # US3 AC1–9: dialog pre-filled, change one name (other untouched), "≥1 name"
│   │                                 #   pre-submit block, 255 block, happy path → PUT partial body → re-fetch +
│   │                                 #   toast; duplicate 422 → field message, dialog kept; 404 → toast + close +
│   │                                 #   re-fetch; in-flight (one PUT); 5xx/offline → unchanged + retry toast;
│   │                                 #   cancel restores focus (FR-016–025, SC-003/005)
│   ├── cities-status.test.tsx        # US4 AC1–6: toggle active→inactive with confirm, confirm cancel sends
│   │                                 #   nothing, PATCH {is_active:false} → re-fetch shows new status + toast;
│   │                                 #   reactivate; in-flight disables that row's toggle (one PATCH); 404 →
│   │                                 #   toast + re-fetch; 5xx/offline → status unchanged + retry toast;
│   │                                 #   no delete control anywhere (FR-026–031, SC-006)
│   └── cities-session.test.tsx       # FR-035/FR-036: 401 on list or any mutation → Phase 1 session-loss →
│                                     #   /login; non-admin never reaches /cities
└── a11y/
    └── cities-a11y.test.tsx          # axe on list/table / search / empty / no-match / error / CityFormDialog
                                      #   (add + edit) / StatusToggleDialog; keyboard-only: search, open+submit
                                      #   add, edit a name, toggle a city; header association; badge not colour-only
                                      #   (FR-040/041, SC-010, SC-011 RTL smoke)
```

**Structure Decision**: Keep the existing single Vite SPA. New feature code lands in `src/cities/`, next to the pre-existing read-only city directory (`citiesApi.ts` / `types.ts` / `useCityNames.ts`), which stays working — the write functions are added to the same `citiesApi.ts` and the mutation hook re-fetches with `listCities()` rather than the memoised directory. `DialogShell` moves from `src/review/` to a new feature-neutral `src/shared/` so the cities dialogs do not import "review"; `src/review/DialogShell.tsx` keeps a one-line re-export so cook-review and driver-review code and tests are untouched (this is the same shim pattern already used for `src/cooks/DialogShell.tsx`). The Phase 1 `src/api/` transport is reused with no edits. `/cities` is a new route + sidebar entry placed with the configuration screens (before "إعدادات النظام"). Tests extend the existing `tests/` tree, mirroring the four user stories.

## Complexity Tracking

*No constitutional violations — table intentionally empty.*

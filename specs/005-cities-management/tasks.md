---
description: "Task list for Cities Management"
---

# Tasks: Cities Management

**Input**: Design documents from `/specs/005-cities-management/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/)

**Depends on**: Feature `001-admin-auth-session` implemented, and the `authedRequest` / `setTokenProvider` seam in `src/api/httpClient.ts`. This feature reuses that transport, the `<RequireAdmin>` guard, the shared layout / sidebar / header, the pre-existing **read-only** `src/cities/` directory module (`fetchCityDirectory` / `useCityNames`), the shared modal shell currently at `src/review/DialogShell.tsx`, and the `tests/` harness. It does **not** depend on the queue behaviour of features `002` / `003` / `004`.

**Tests**: INCLUDED. The user stories carry explicit acceptance scenarios and measurable criteria (SC-001…SC-013), and [quickstart.md](./quickstart.md) maps automated suites to requirements. Test tasks are written before the implementation they cover and must fail first.

**Organization**: Tasks are grouped by user story. Phases 1–2 are shared; Phases 3/4/5/6 are US1/US2/US3/US4 and each is an independently testable increment.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: US1 / US2 / US3 / US4 (setup, foundational, polish carry no story label)
- Exact file paths are in every task

## Path Conventions

Single Vite SPA at repo root: source in `src/`, tests in `tests/`. Layout per [plan.md](./plan.md) "Project Structure".

⚠️ **Serialization points** (same file edited across phases — not `[P]` with each other; sequence or single-owner):

- `src/cities/citiesApi.ts` — one edit only, T012 (add the four management functions; the read-only directory code is untouched)
- `src/cities/types.ts` — one edit only, T005
- `src/review/DialogShell.tsx` — one edit only, T004 (replaced by a re-export of `src/shared/DialogShell.tsx`)
- `src/cities/messages.ts` — created T013 (all keys at once)
- `src/cities/useCitiesManagement.ts` — created T018 (US1 load/search/dialog scaffolding), extended T029 (US2 `create`), T035 (US3 `update`), T040 (US4 `toggleStatus`)
- `src/cities/CityRow.tsx` — created T021 (US1 cells + badge), extended T036 (US3 Edit button), T042 (US4 status toggle control)
- `src/cities/CitiesPage.tsx` — created T023 (US1 list/search/states), extended T031 (US2 Add button + CityFormDialog wiring), T036 (US3 Edit wiring), T042 (US4 toggle wiring)
- `src/cities/CityFormDialog.tsx` — created T030 (US2, supports both `mode: 'add' | 'edit'`); US3 only wires the `edit` mode, no further edit to this file expected
- `tests/a11y/cities-a11y.test.tsx` — created T017 (US1 surfaces), extended T028 (US2 CityFormDialog add), T034 (US3 CityFormDialog edit), T039 (US4 StatusToggleDialog)
- `src/App.tsx` — one edit only, T024 (the `/cities` route)
- `src/components/Sidebar.tsx` — one edit only, T025 (the nav entry)
- `tests/helpers/fixtures.ts` — one edit only, T002
- `tests/helpers/harness.tsx` — one edit only, T003

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Folder skeleton and test fixtures / helpers for the new endpoints. No new dependencies or env vars — `VITE_API_BASE_URL` and the Vitest / `vitest-axe` tooling from earlier features are reused.

- [X] T001 [P] Create the `src/shared/` directory with a `.gitkeep` (until `DialogShell.tsx` lands in T004); `src/cities/` already exists
- [X] T002 [P] Extend `tests/helpers/fixtures.ts` with builders producing envelope-shaped payloads from `admin-dashboard-api.md` Phase 5: `city(overrides?)` (one `City` — sequential `id`, `name_ar` `"مدينة رقم <id>"`, `name_en` `"City <id>"`, `is_active` `true`), `citiesResponse(cities)` (`ok(cities)`), `createdCity(overrides?)` (`ok(city({ is_active: true, ...overrides }), 'City created.')`), `updatedCity(overrides?)` (`ok(city(overrides), 'City updated.')`), `cityStatusChanged(overrides?)` (`ok(city(overrides), 'City status updated.')`). Reuse the existing `cityList()` seed and the `ok` / `fail` helpers (e.g. `fail('The given data was invalid.', { name_ar: ['اسم المدينة مستخدم بالفعل.'] })`)
- [X] T003 [P] Extend `tests/helpers/harness.tsx` with `renderAtCities(fm, opts?: { seedMe?: boolean; admin?: boolean })` — seeds `localStorage` with a valid token + cached profile (admin by default; `admin: false` seeds a `customer` role), calls `__resetCityDirectory()`, replies to `GET /auth/me` by default, and mounts the router at `/cities` with the real `<CitiesPage/>` inside `<RequireAdmin>`. Mirror the existing `renderAtDrivers`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The shared modal shell move, feature types, pure helpers (search, name validation, mutation-outcome classification) with their unit tests, the API wrappers, and message strings — everything all four stories build on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T004 Promote the modal shell: move `src/review/DialogShell.tsx` verbatim to `src/shared/DialogShell.tsx`, then replace `src/review/DialogShell.tsx` with exactly `export { default } from '../shared/DialogShell'`. Confirm `src/drivers/ApproveDialog.tsx` / `src/drivers/RejectDialog.tsx` still import `../review/DialogShell` and `src/cooks/DialogShell.tsx` still re-exports `../review/DialogShell` (both now chain to `src/shared/`), and that `npm run test:run` shows no cook/driver regression (research R10)
- [X] T005 [P] Extend `src/cities/types.ts` — keep `City` unchanged; add `NewCityInput`, `CityNamePatch`, `NameErrors`, `CityMutationOutcome`, `CitiesStatus` (`'loading' | 'ready' | 'error'`), `RowState` (`'idle' | 'submitting'`), and `DialogState` per [data-model.md](./data-model.md) §3–7 and [contracts/cities-ui.md](./contracts/cities-ui.md)
- [X] T006 [P] Implement `src/cities/citySearch.ts` — pure `filterCities(list: City[], term: string): City[]`: `term.trim()` empty → return `list` unchanged; otherwise keep a city when `name_ar` **or** `name_en` (both `toLowerCase()`) includes the lower-cased trimmed term; preserve input order; no side effects ([contracts/cities-ui.md](./contracts/cities-ui.md))
- [X] T007 [P] Unit test `tests/unit/citySearch.test.ts` — write first, must fail: matches on an Arabic substring; matches on an English substring; a mixed-case term matches; leading/trailing spaces in the term are ignored; an empty / whitespace term returns the full list; a term matching nothing returns `[]`; result order equals input order (FR-042 / FR-043)
- [X] T008 [P] Implement `src/cities/cityValidation.ts` — pure `validateNames(values: { name_ar: string; name_en: string }, mode: 'add' | 'edit', initial?: { name_ar: string; name_en: string }): NameErrors`: `add` → both fields required (blank-after-trim → `<field>: nameRequired`); `edit` → at least one field non-blank **and** changed from `initial`, else `form: atLeastOneName`; either mode → a non-blank field whose raw length > 255 → `<field>: nameTooLong`; a whitespace-only non-empty field → `<field>: nameRequired`; `{}` means submit allowed. Messages come from `src/cities/messages.ts` constants ([contracts/cities-ui.md](./contracts/cities-ui.md))
- [X] T009 [P] Unit test `tests/unit/cityValidation.test.ts` — write first, must fail: `add` with one name blank → that field flagged; `add` with both present → `{}`; `add` with a whitespace-only field → `nameRequired`; `edit` with neither name changed → `form`; `edit` with only `name_ar` changed → `{}`; a 255-char name → `{}`; a 256-char name → `nameTooLong` (FR-009 / FR-010 / FR-018 / FR-019)
- [X] T010 [P] Implement `src/cities/mutationOutcome.ts` — pure `classifyMutation(err: unknown | null): CityMutationOutcome`: `null` → `{ ok: true, message: '' }`; `ApiError` with `status === 422` and a non-empty `name_ar` / `name_en` in `fieldErrors` → `{ ok: false, reason: 'validation', fieldErrors: { name_ar?, name_en? }, message }`; `status === 422` otherwise → `{ ok: false, reason: 'validation', message }` (form-level); `status === 404` → `{ ok: false, reason: 'not_found' }`; `status === 0` or `>= 500` or any unexpected 4xx or a non-`ApiError` throw → `{ ok: false, reason: 'transient' }` ([data-model.md](./data-model.md) §5)
- [X] T011 [P] Unit test `tests/unit/cityMutationOutcome.test.ts` — write first, must fail: `null` → `{ ok: true }`; `ApiError(422, msg, { name_ar: ['…'] })` → `validation` with `fieldErrors.name_ar`; `ApiError(422, msg, { name_en: ['…'] })` → `validation` with `fieldErrors.name_en`; `ApiError(422, msg, null)` → `validation` form-level (no `fieldErrors`); `ApiError(422, msg, { other: ['…'] })` → form-level; `ApiError(404, …)` → `not_found`; `ApiError(0, …)`, `ApiError(500, …)`, and a plain `Error` → `transient`
- [X] T012 [P] Extend `src/cities/citiesApi.ts` (additive — do not touch `fetchCityDirectory` / `CityDirectory` / `useCityNames`) per [contracts/cities-api.md](./contracts/cities-api.md) and [contracts/cities-ui.md](./contracts/cities-ui.md): `listCities(signal?)` → `authedRequest<City[]>('/admin/cities', { signal })`; `createCity(input)` → `authedRequest<City>('/admin/cities', { method: 'POST', body: { name_ar, name_en } })`; `updateCity(id, patch)` → `authedRequest<City>('/admin/cities/' + id, { method: 'PUT', body: patch })` (caller passes only changed keys); `setCityStatus(id, is_active)` → `authedRequest<City>('/admin/cities/' + id + '/status', { method: 'PATCH', body: { is_active } })`. All four propagate `ApiError` unchanged and never handle `401`. Update the `__resetCityDirectory` doc-comment to note it is also the production invalidation point used after a mutation (depends on T005)
- [X] T013 [P] Create `src/cities/messages.ts` — all Arabic RTL keys from [contracts/cities-ui.md](./contracts/cities-ui.md) "messages" section: `pageTitle`, `subtitle(n)`, `loading`, `listError`, `retry`, `refresh`, `emptyNoCities`, `emptyNoMatch`, `searchLabel`, `searchClear`, `colNameAr`, `colNameEn`, `colStatus`, `colActions`, `statusActive`, `statusInactive`, `addCity`, `editCity`, `fieldNameAr`, `fieldNameEn`, `nameRequired`, `nameTooLong`, `atLeastOneName`, `nameDuplicateFallback`, `save`, `cancel`, `editLabel(nameAr)`, `toggleToInactiveTitle(nameAr)`, `toggleToActiveTitle(nameAr)`, `toggleToInactiveBody`, `toggleToActiveBody`, `confirmToggle`, `rowToggleToInactive(nameAr)`, `rowToggleToActive(nameAr)`, `createdToast`, `updatedToast`, `statusUpdatedToast`, `notFoundToast`, `mutationRetryToast`
- [X] T014 Regression checkpoint: run `npm run test:run` and confirm the pre-existing `tests/unit/cityDirectory.test.ts` still passes after T012 (the directory code path is unchanged) and that T007 / T009 / T011 now exist and fail pending implementation, with no cook/driver regression from T004

**Checkpoint**: `src/shared/DialogShell.tsx` in place with the review re-export shim; pure helpers, API wrappers and messages ready; `tests/unit/cityDirectory.test.ts` green.

---

## Phase 3: User Story 1 - Administrator views the list of cities (Priority: P1) 🎯 MVP

**Goal**: An administrator opens `/cities` and sees every city — active and inactive — in one unpaginated table (Arabic name, English name, a colour-independent active/inactive badge), with a client-side search box that filters by either name as they type. Distinct loading, "no cities", "no cities match your search", and screen-error states; a Refresh control; all behind the admin guard.

**Independent Test**: Sign in as admin, open `/cities` → every city loads with all three columns and no pagination; typing in the search narrows by Arabic or English name with no network request and clearing restores the list; a term matching nothing shows the distinct no-match state; an empty backend shows "no cities" with Add still available; a slow load shows a loading state; an offline first load shows a screen error + Retry; a `401` redirects to `/login`; a non-admin never reaches `/cities`.

### Tests for User Story 1 ⚠️ (write first, must fail)

- [X] T015 [P] [US1] Integration test `tests/integration/cities-list.test.tsx` with mocked `fetch` via `renderAtCities`: AC1 first load issues `GET /admin/cities` (no query string) and renders a `<table>` row per city — active **and** inactive — each showing `name_ar`, `name_en` in a `dir="ltr"` cell, and a `CityStatusBadge`; no pagination control exists (FR-001 / FR-002 / FR-003); AC2 a delayed reply shows a loading state distinct from the empty state (FR-004); AC3 `data: []` → the "no cities" empty state with the **Add City** button still present (FR-005); AC4 Refresh re-issues `GET /admin/cities` and reflects added / renamed / toggled cities, keeping the search term (FR-006); AC5 a `500` / offline first load → a screen-level error with a working Retry, while a failed Refresh with a list already shown keeps that list and shows a toast (FR-007); AC6 typing in the search box narrows the rows to those whose `name_ar` **or** `name_en` contains the term, issues **no** `fetch`, and clearing restores the full list (FR-042 / SC-013); AC7 a term matching nothing → the "no cities match your search" state, distinct from "no cities", with the term still editable (FR-043)
- [X] T016 [P] [US1] Integration test `tests/integration/cities-session.test.tsx`: a `401` response to `GET /admin/cities` invokes the inherited `unauthorizedHandler` → session cleared → redirect to `/login`, no broken view (FR-035); `renderAtCities(fm, { admin: false })` → `/cities` is not reachable for a non-admin (FR-036)
- [X] T017 [P] [US1] Accessibility test `tests/a11y/cities-a11y.test.tsx`: `vitest-axe` reports zero violations on the list/table, the `SearchBox`, the "no cities" empty state, the "no match" state, and the error state; the `<table>` exposes `<th scope="col">` for every column; each `CityStatusBadge` conveys status by text + shape/icon (assert a non-colour cue is present) (FR-003 / FR-040 / FR-041 / SC-007 / SC-010); a keyboard-only pass types into the search box and tabs through the rows with a visible focus target; the page root is `dir="rtl"` (SC-011 smoke)

### Implementation for User Story 1

- [X] T018 [US1] Implement `useCitiesManagement()` in `src/cities/useCitiesManagement.ts` per [contracts/cities-ui.md](./contracts/cities-ui.md): state `{ allCities: City[], search: string, status: CitiesStatus, rowStates: Map<number,'submitting'>, dialog: DialogState }`; on mount `load()` via `listCities()` → `allCities`, `status = 'ready'` (empty array is still `ready`), `status = 'error'` only when the load fails with nothing shown (a failed reload with a list shown keeps it); derive `cities = filterCities(allCities, search)`, `totalCount = allCities.length`, `noCities = status==='ready' && allCities.length===0`, `noMatch = status==='ready' && allCities.length>0 && cities.length===0`; `refresh()` re-runs `load()` keeping `search`; `setSearch(term)` sets the string only (no network); `openAdd()` / `openEdit(city)` / `openToggle(city)` set `dialog`; `closeDialog()` clears `dialog`, the matching `rowState`, and `serverErrors`; `rowState(id)` → `'idle' | 'submitting'`; `create` / `update` / `toggleStatus` are typed placeholders that throw `"not implemented"` (filled in US2–US4); all state dropped on unmount (FR-001 / FR-004 / FR-005 / FR-006 / FR-007 / FR-042 / FR-043) (depends on T012, T006, T005)
- [X] T019 [P] [US1] Implement `CityStatusBadge` in `src/cities/CityStatusBadge.tsx` — props `{ active: boolean }`; render `statusActive` / `statusInactive` from `messages.ts` paired with a distinct shape/icon so status is never distinguished by colour alone (FR-003 / FR-041 / SC-007) (depends on T013)
- [X] T020 [P] [US1] Implement `SearchBox` in `src/cities/SearchBox.tsx` — props `{ value, onChange, resultCount }`; a `<label htmlFor>` bound text input with a `Search` icon (lucide-react) and a clear (`searchClear`) button shown only when `value` is non-empty; no debounce; fully keyboard operable (FR-042 / FR-043 / FR-041) (depends on T013)
- [X] T021 [US1] Implement `CityRow` in `src/cities/CityRow.tsx` — props `{ city, state, onEdit, onToggle }`; render `<td>`s for `city.name_ar` (RTL cell), `city.name_en` in a `dir="ltr"` cell, `<CityStatusBadge active={city.is_active} />`, and an actions `<td>` placeholder (Edit + toggle controls are added in US3 / US4). **No delete control** anywhere (FR-002 / FR-003 / FR-026) (depends on T019)
- [X] T022 [US1] Implement `CitiesTable` in `src/cities/CitiesTable.tsx` — props `{ cities, rowState, onEdit, onToggle }`; a semantic `<table>` with a header row of `<th scope="col">` (`colNameAr`, `colNameEn`, `colStatus`, `colActions`) from `messages.ts`, then `cities.map(c => <CityRow key={c.id} city={c} state={rowState(c.id)} onEdit={onEdit} onToggle={onToggle} />)`; wrap in an `overflow-x:auto` container so the table scrolls, not the page (FR-002 / FR-040) (depends on T021)
- [X] T023 [US1] Implement `CitiesPage` in `src/cities/CitiesPage.tsx` — compose `useCitiesManagement()`; `status === 'loading'` → loader (no table); `status === 'error'` → error panel + Retry calling `refresh()` (FR-007); `noCities` → the `emptyNoCities` state with the **Add City** button still enabled (FR-005); `noMatch` → the `emptyNoMatch` state (FR-043); otherwise a header (`pageTitle` + `subtitle(totalCount)` + a Refresh control — FR-006), the `<SearchBox value={search} onChange={setSearch} resultCount={cities.length} />`, an **Add City** button, and `<CitiesTable cities={cities} rowState={rowState} onEdit={openEdit} onToggle={openToggle} />`; own a visually-hidden `role="status"` `aria-live="polite"` region plus a transient toast bubble cleared after ~6 s (pattern copied from `DriverApplicationsPage`) and a second polite live region announcing `cities.length` / the no-match state when `search` changes (FR-041); render nothing for the dialogs yet; root `dir="rtl"`, `font-['Tajawal']`, brand `#7a0d0d` (FR-001 / FR-036 / FR-040 / FR-041) (depends on T018, T019, T020, T022)
- [X] T024 [US1] In `src/App.tsx`, import `CitiesPage` from `./cities/CitiesPage` and add `<Route path="/cities" element={<CitiesPage />} />` inside the `AdminLayout` `<Routes>` (already wrapped by `<RequireAdmin>` on `/*`) (FR-001 / FR-036) (depends on T023)
- [X] T025 [US1] In `src/components/Sidebar.tsx`, add `{ name: 'إدارة المدن', icon: MapPin, path: '/cities' }` to `menuItems` immediately before `'إعدادات النظام'`, importing `MapPin` from `lucide-react` (FR-039) (depends on T023)
- [ ] T026 [US1] Run the quickstart US1 scenarios 1–7 and the "Session loss" scenario in [quickstart.md](./quickstart.md) against a Phase 5 backend and record results (depends on T024, T025)

**Checkpoint**: User Story 1 is fully functional and independently testable — this is the MVP. No Add / Edit / toggle actions yet.

---

## Phase 4: User Story 2 - Administrator adds a new city (Priority: P2)

**Goal**: From the list the administrator opens an **Add City** modal, enters an Arabic and an English name (both required, ≤255, blocked pre-submit otherwise), and on success the new active city appears in the re-fetched list with a success toast. A duplicate-name `422` shows a specific message under the offending field with the dialog kept open and values preserved; a transient failure adds nothing and keeps the form.

**Independent Test**: With the list on screen, open Add → submit with a blank field (Save disabled, zero requests) → submit > 255 chars (blocked) → submit a duplicate name (`422`, field message, dialog stays open) → submit two valid names (one `POST /admin/cities` with `{ name_ar, name_en }`, re-fetch, new active city + "City created." toast); Cancel/`Esc` sends nothing.

### Tests for User Story 2 ⚠️ (write first, must fail)

- [X] T027 [P] [US2] Integration test `tests/integration/cities-add.test.tsx` with mocked `fetch` (ordered replies on `GET /admin/cities` for the post-mutation re-fetch): the **Add City** button opens a modal with two labelled fields (FR-008); a blank `name_ar` or `name_en` → Save is `disabled` with a required message and **zero** `POST /admin/cities` (FR-009); a > 255-char entry → Save blocked with a length message before any request (FR-010); valid names → exactly one `POST /admin/cities` with the bearer header and body `{ name_ar, name_en }` (both keys), then a follow-up `GET /admin/cities`, after which the new city appears in the list as **active** and a success toast shows the envelope `message` (FR-011 / FR-033 / SC-002); a `422` with `errors.name_ar` → that message renders under the Arabic field, the dialog stays open with the entered values, and **no** re-fetch is issued (FR-012 / FR-034 / SC-003); while in flight Save is `disabled` / `aria-busy` and rapid clicks still send one `POST` (FR-013); a `500` / `fetch` reject → no city added, the form keeps its values, a retryable toast, dialog still open (FR-014); Cancel / `Esc` → **zero** `POST`, list unchanged, focus returns to the Add button (FR-015); assert `__resetCityDirectory` is invoked on the success path (spy or a subsequent `useCityNames` consumer re-fetches)
- [X] T028 [P] [US2] Extend `tests/a11y/cities-a11y.test.tsx` — `CityFormDialog` (mode `add`): `vitest-axe` clean; focus moves into the first field on open, is trapped, and returns to the triggering button on close; `Esc` / Cancel / backdrop dismiss with no request; each field error is associated with its input (`aria-invalid` + `aria-describedby`) and announced (FR-040 / FR-041) *(same file as T017 — sequence after it)*

### Implementation for User Story 2

- [X] T029 [US2] Implement `create(input: NewCityInput)` in `src/cities/useCitiesManagement.ts` — guard against re-entry while `dialog.busy`; set `dialog.busy = true`; call `createCity(input)`; on resolve → `classifyMutation(null)` → `{ ok: true, message }`, `closeDialog()`, return the outcome (the page toasts, `refresh()`es, and calls `__resetCityDirectory()`); on reject → `classifyMutation(err)`: `validation` → set `dialog.serverErrors`, keep the dialog open, `dialog.busy = false`, return; `transient` → `dialog.busy = false`, keep the dialog with its values, return; never observe `401` ([data-model.md](./data-model.md) §5) (depends on T018, T010, T012) *(same file as T018, T035, T040)*
- [X] T030 [P] [US2] Implement `CityFormDialog` in `src/cities/CityFormDialog.tsx` on `src/shared/DialogShell` — props `{ mode: 'add' | 'edit', initialValues?: { name_ar: string; name_en: string }, serverErrors: NameErrors, busy: boolean, onSubmit, onCancel }`; two labelled text inputs (`maxLength={255}`, `dir="rtl"` for Arabic, `dir="ltr"` for English) titled `addCity` / `editCity`; on every change run `validateNames(values, mode, initialValues)` and disable Save while it is non-empty, showing field messages under the inputs and any `form` message above the buttons; merge `serverErrors` into the displayed errors and clear a field's error when it is next edited; the first field auto-focuses on open; `busy` disables both buttons and marks Save `aria-busy`; `mode: 'add'` calls `onSubmit(NewCityInput)`, `mode: 'edit'` calls `onSubmit(CityNamePatch)` containing **only** the keys whose value differs from `initialValues`; `Esc` / Cancel / backdrop → `onCancel` (FR-008 / FR-009 / FR-010 / FR-012 / FR-016 / FR-017 / FR-018 / FR-019 / FR-021 / FR-040 / FR-041) (depends on T004, T008, T013)
- [X] T031 [US2] Wire Add into `src/cities/CitiesPage.tsx` — render the **Add City** button (present in the header **and** in the `emptyNoCities` state) → `openAdd()`; when `dialog.kind === 'add'` render one `<CityFormDialog mode="add" serverErrors={dialog.serverErrors} busy={dialog.busy} onSubmit={submitAdd} onCancel={closeDialog} />`; `submitAdd(input)` → `create(input).then(outcome => …)` — `ok` → success toast (envelope `message`, fallback `createdToast`) + `refresh()` + `__resetCityDirectory()`; `validation` → leave the dialog (serverErrors already set by the hook); `transient` → `mutationRetryToast` (FR-008 / FR-011 / FR-012 / FR-014 / FR-015 / FR-032 / FR-033 / FR-034) (depends on T029, T030) *(Page also touched by US1 / US3 / US4)*
- [ ] T032 [US2] Run the quickstart US2 scenarios 1–7 in [quickstart.md](./quickstart.md) and record results (depends on T031)

**Checkpoint**: User Stories 1 and 2 both work independently.

---

## Phase 5: User Story 3 - Administrator edits a city's name (Priority: P3)

**Goal**: From a city's row the administrator opens an **Edit** modal (the same `CityFormDialog`, pre-filled with the current names), changes one or both names (at least one required, ≤255, blocked pre-submit otherwise), and on success the row shows the new name(s) with the other left untouched and a success toast. A duplicate `422` shows a field message with the dialog kept open; a `404` tells the administrator and re-fetches; a transient failure changes nothing.

**Independent Test**: With the list on screen, open Edit on a row → the dialog is pre-filled → clear both fields (Save disabled, "at least one name" message, no request) → change only the Arabic name and Save (`PUT /admin/cities/{id}` body `{ name_ar }` only, re-fetch, new Arabic name + unchanged English name + "City updated." toast) → force a duplicate `422` (field message, dialog stays open) → force a `404` (toast, dialog closes, re-fetch); Cancel/`Esc` changes nothing.

### Tests for User Story 3 ⚠️ (write first, must fail)

- [X] T033 [P] [US3] Integration test `tests/integration/cities-edit.test.tsx` with mocked `fetch` (ordered replies on `GET /admin/cities`): the row **Edit** button opens a modal pre-filled with that city's `name_ar` and `name_en`, and focus moves into the dialog (FR-016); changing only `name_ar` and submitting issues exactly one `PUT /admin/cities/{id}` with body `{ name_ar }` **only** (the unchanged key omitted), then a `GET /admin/cities`, after which the row shows the new Arabic name and the **unchanged** English name and a success toast shows the envelope `message` (FR-017 / FR-020 / SC-005); clearing both fields (or leaving both unchanged) → Save `disabled` with the `atLeastOneName` message and **no** request (FR-018); a > 255-char entry → Save blocked with a length message (FR-019); a `422` with `errors.name_en` → that message renders under the English field, the dialog stays open with the entered values (FR-021 / SC-003); a `404` → the `notFoundToast`, the dialog closes, and a `GET /admin/cities` re-fetch is issued (FR-022); while in flight Save is `disabled` / `aria-busy` and rapid clicks send one `PUT` (FR-023); a `500` / `fetch` reject → the name is unchanged in the list, no local change, a retryable toast, the dialog stays open (FR-024); Cancel / `Esc` → **zero** `PUT`, the row unchanged, focus returns to the Edit button (FR-025); a concurrent-edit sequence — two `PUT`s for the same id both returning `200` with different names — ends with the list (after each re-fetch) showing the later save's name, with no error and no stuck row (SC-012); assert `__resetCityDirectory` is invoked on the success and `404` paths
- [X] T034 [P] [US3] Extend `tests/a11y/cities-a11y.test.tsx` — `CityFormDialog` (mode `edit`): `vitest-axe` clean; the dialog opens with the fields pre-filled; focus trap + restore; the form-level `atLeastOneName` message is announced when both fields are cleared *(same file as T017 / T028 — sequence after them)*

### Implementation for User Story 3

- [X] T035 [US3] Implement `update(id: number, patch: CityNamePatch)` in `src/cities/useCitiesManagement.ts` — guard against re-entry while `dialog.busy`; set `dialog.busy = true`; call `updateCity(id, patch)` (no version token — last-write-wins, research R6); on resolve → `{ ok: true, message }`, `closeDialog()`, return (the page toasts, `refresh()`es, `__resetCityDirectory()`); on reject → `classifyMutation(err)`: `validation` → set `dialog.serverErrors`, keep the dialog, `dialog.busy = false`, return; `not_found` → `closeDialog()`, return (the page toasts `notFoundToast`, `refresh()`es, `__resetCityDirectory()`); `transient` → `dialog.busy = false`, keep the dialog with its values, return ([data-model.md](./data-model.md) §5) (depends on T018, T010, T012) *(same file as T018, T029, T040)*
- [X] T036 [US3] Wire Edit into `src/cities/CityRow.tsx` (render an **Edit** button — `Pencil` icon from lucide-react, labelled `editLabel(city.name_ar)` — in the actions `<td>` → `onEdit(city)`) and `src/cities/CitiesPage.tsx` (on Edit → `openEdit(city)`; when `dialog.kind === 'edit'` render `<CityFormDialog mode="edit" initialValues={{ name_ar: dialog.city.name_ar, name_en: dialog.city.name_en }} serverErrors={dialog.serverErrors} busy={dialog.busy} onSubmit={submitEdit} onCancel={closeDialog} />`; `submitEdit(patch)` → `update(dialog.city.id, patch).then(outcome => …)` — `ok` → success toast (envelope `message`, fallback `updatedToast`) + `refresh()` + `__resetCityDirectory()`; `validation` → leave the dialog; `not_found` → `notFoundToast` + `refresh()` + `__resetCityDirectory()`; `transient` → `mutationRetryToast`) (FR-016 / FR-017 / FR-020 / FR-021 / FR-022 / FR-024 / FR-025) (depends on T035, T030) *(Row + Page also touched by US1 / US2 / US4)*
- [ ] T037 [US3] Run the quickstart US3 scenarios 1–10 in [quickstart.md](./quickstart.md) and record results (depends on T036)

**Checkpoint**: User Stories 1, 2 and 3 all work independently.

---

## Phase 6: User Story 4 - Administrator activates or deactivates a city (Priority: P4)

**Goal**: From a city's row the administrator switches it active⇄inactive through a labelled toggle that opens an explicit confirmation dialog; on confirm a `PATCH /admin/cities/{id}/status` with a boolean `is_active` is sent, the re-fetched list shows the new status with a visible row change and a success toast. Only that row's toggle is disabled while in flight; a `404` reconciles via re-fetch; a transient failure changes nothing. There is no delete anywhere.

**Independent Test**: With the list on screen, use an active city's toggle → the deactivate confirmation appears → Cancel (zero `PATCH`) → Confirm (one `PATCH /admin/cities/{id}/status` body `{ is_active: false }`, re-fetch, row now inactive + "City status updated." toast) → toggle it back (`{ is_active: true }`); force a `404` (toast + re-fetch); force `500`/offline (status unchanged, retry toast); confirm no row or dialog offers a delete.

### Tests for User Story 4 ⚠️ (write first, must fail)

- [X] T038 [P] [US4] Integration test `tests/integration/cities-status.test.tsx` with mocked `fetch` (ordered replies on `GET /admin/cities`): an active city's toggle opens a confirmation dialog with the **deactivate** copy; Cancel / `Esc` sends **zero** `PATCH` (FR-027); Confirm → exactly one `PATCH /admin/cities/{id}/status` with the bearer header and body `{ is_active: false }` (a real boolean), then a `GET /admin/cities`, after which the row shows the inactive state with a visible change and a success toast shows the envelope `message` (FR-028 / FR-033 / SC-006); an inactive city's toggle → confirm → body `{ is_active: true }` → row shows active (SC-006); while in flight **only that row's** toggle is `disabled` / `aria-busy`, exactly one `PATCH` is sent under rapid clicks, and other rows stay interactive (FR-029); a `404` → the `notFoundToast` and a `GET /admin/cities` re-fetch (FR-030); a `500` / `fetch` reject → the status is unchanged in the list, that row's toggle returns to idle, a retryable toast, and **no** re-fetch (FR-031); assert there is **no** delete / remove control in any row or dialog (FR-026); assert `__resetCityDirectory` is invoked on the success and `404` paths
- [X] T039 [P] [US4] Extend `tests/a11y/cities-a11y.test.tsx` — `StatusToggleDialog`: `vitest-axe` clean; focus moves to the Confirm button on open, is trapped, and returns to the row toggle on close; `Esc` / Cancel send nothing; the row toggle exposes an accessible name stating the current state and the action it performs (FR-027 / FR-041) *(same file as T017 / T028 / T034 — sequence after them)*

### Implementation for User Story 4

- [X] T040 [US4] Implement `toggleStatus(city: City)` in `src/cities/useCitiesManagement.ts` — guard against re-entry while `rowState(city.id) === 'submitting'`; set that row's state to `'submitting'` and `dialog.busy = true`; call `setCityStatus(city.id, !city.is_active)`; on resolve → `{ ok: true, message }`, `closeDialog()` (which also clears the row state), return (the page toasts, `refresh()`es, `__resetCityDirectory()`); on reject → `classifyMutation(err)`: `not_found` → `closeDialog()`, return (the page toasts `notFoundToast`, `refresh()`es, `__resetCityDirectory()`); `transient` → clear the row state to `'idle'`, `dialog.busy = false`, keep the dialog open for a retry, return; `validation` (defensive non-boolean) → show `message` as a `form` error in the dialog, keep it open ([data-model.md](./data-model.md) §5, §6) (depends on T018, T010, T012) *(same file as T018, T029, T035)*
- [X] T041 [P] [US4] Implement `StatusToggleDialog` in `src/cities/StatusToggleDialog.tsx` on `src/shared/DialogShell` — props `{ city: City, nextActive: boolean, busy: boolean, onConfirm, onCancel }`; confirm-only (no inputs); title = `toggleToActiveTitle(city.name_ar)` / `toggleToInactiveTitle(city.name_ar)` and body = `toggleToActiveBody` / `toggleToInactiveBody` chosen by `nextActive`; the Confirm button (`confirmToggle`) auto-focuses on open; both buttons `disabled` + `aria-busy` while `busy`; `Esc` / Cancel / backdrop → `onCancel`, nothing submitted (FR-027 / FR-040 / FR-041) (depends on T004, T013)
- [X] T042 [US4] Wire the toggle into `src/cities/CityRow.tsx` (render the active/inactive control — a `role="switch"` toggle or a labelled button — with an accessible name `rowToggleToActive(city.name_ar)` / `rowToggleToInactive(city.name_ar)` by `city.is_active`; `disabled` + progress while `state === 'submitting'`; click → `onToggle(city)`; still **no delete control**) and `src/cities/CitiesPage.tsx` (on toggle → `openToggle(city)`; when `dialog.kind === 'toggle'` render `<StatusToggleDialog city={dialog.city} nextActive={!dialog.city.is_active} busy={dialog.busy} onConfirm={submitToggle} onCancel={closeDialog} />`; `submitToggle()` → `toggleStatus(dialog.city).then(outcome => …)` — `ok` → success toast (envelope `message`, fallback `statusUpdatedToast`) + `refresh()` + `__resetCityDirectory()`; `not_found` → `notFoundToast` + `refresh()` + `__resetCityDirectory()`; `transient` → `mutationRetryToast`) (FR-026 / FR-027 / FR-028 / FR-030 / FR-031) (depends on T040, T041) *(Row + Page also touched by US1 / US2 / US3)*
- [ ] T043 [US4] Run the quickstart US4 scenarios 1–7 in [quickstart.md](./quickstart.md) and record results (depends on T042)

**Checkpoint**: All four user stories are independently functional.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Cross-story verification that does not belong to a single user story.

- [ ] T044 [P] Work through the quickstart "Accessibility — WCAG 2.1 AA and RTL" manual checklist in [quickstart.md](./quickstart.md) — keyboard-only completion of search, Add, Edit and toggle; screen-reader announcement of every success / not-found / retry message; colour-independent status; and the full RTL sign-off (table, search, both dialogs, confirmation, all state messages; English names left-to-right in their cell) (FR-040 / FR-041 / SC-010 / SC-011)
- [X] T045 [P] Verify observability and config: mutation failures are logged through the existing `logger` seam with status + path only (no city payloads); no new environment variables are introduced and `import.meta.env.VITE_API_BASE_URL` is the only base-URL source (plan "Constraints")
- [X] T046 [P] Full regression: run `npm run test:run` and `npm run build` — all unit / integration / a11y suites green, `tests/unit/cityDirectory.test.ts` still passes, **no** cook / driver test file changed, `tsc` + `vite build` clean
- [X] T047 Final traceability review against [spec.md](./spec.md): confirm every FR-001…FR-043 and SC-001…SC-013 is exercised by a task above, and tick the "Definition of done for this feature" bullets in [quickstart.md](./quickstart.md)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies — start immediately.
- **Foundational (Phase 2)**: depends on Setup. **Blocks all user stories.** T005 → T012; T006/T008/T010 → their tests T007/T009/T011; T004 and T013 independent.
- **User Story 1 (Phase 3)**: depends on Foundational. No dependency on US2–US4. **This is the MVP.**
- **User Story 2 (Phase 4)**: depends on Foundational **and** US1 (extends `useCitiesManagement`, `CitiesPage`; needs the list on screen to open Add from).
- **User Story 3 (Phase 5)**: depends on Foundational, US1, and the `CityFormDialog` created in US2 (T030). Independently testable once those are in.
- **User Story 4 (Phase 6)**: depends on Foundational and US1. Independent of US2/US3 in behaviour but shares `useCitiesManagement`, `CityRow`, `CitiesPage`.
- **Polish (Phase 7)**: depends on every story phase that is being shipped.

### User Story Dependencies

- **US1 (P1)**: Foundational only.
- **US2 (P2)**: Foundational + US1.
- **US3 (P3)**: Foundational + US1 + `CityFormDialog` (T030, authored under US2).
- **US4 (P4)**: Foundational + US1.

### Within Each User Story

- Tests (the `⚠️ write first, must fail` tasks) before implementation.
- Hook (`useCitiesManagement`) mutation method before the Page/Row wiring that calls it.
- Presentational components (`CityStatusBadge`, `SearchBox`, `CityFormDialog`, `StatusToggleDialog`) can be built in parallel with the hook, then composed.
- The manual quickstart task last in each story.

### Parallel Opportunities

- **Setup**: T001, T002, T003 all `[P]`.
- **Foundational**: T004, T005, T013 in parallel; then T006+T007, T008+T009, T010+T011, T012 all `[P]` with each other (different files). T014 after them.
- **US1 tests**: T015, T016, T017 in parallel.
- **US1 impl**: T019, T020 in parallel with T018; T021→T022→T023 sequential (component chain), then T024, T025 in parallel.
- **US2**: T027, T028 in parallel; T030 `[P]` with T029; T031 after both.
- **US3**: T033, T034 in parallel; T035 then T036.
- **US4**: T038, T039 in parallel; T041 `[P]` with T040; T042 after both.
- **Polish**: T044, T045, T046 in parallel; T047 last.
- **Cross-story**: once Foundational is done, one developer can take US1 while the `CityFormDialog` (T030) and `StatusToggleDialog` (T041) are built in parallel by another, since they only depend on T004/T008/T013.

---

## Parallel Example: Foundational pure helpers

```bash
# After T005 (types) lands, these three impl+test pairs are independent files:
Task: "Implement src/cities/citySearch.ts (filterCities)"
Task: "Unit test tests/unit/citySearch.test.ts (write first, must fail)"
Task: "Implement src/cities/cityValidation.ts (validateNames)"
Task: "Unit test tests/unit/cityValidation.test.ts (write first, must fail)"
Task: "Implement src/cities/mutationOutcome.ts (classifyMutation)"
Task: "Unit test tests/unit/cityMutationOutcome.test.ts (write first, must fail)"
# In parallel with all of the above:
Task: "Promote src/review/DialogShell.tsx to src/shared/DialogShell.tsx with a re-export shim"
Task: "Create src/cities/messages.ts with all Arabic RTL keys"
```

## Parallel Example: User Story 1 tests

```bash
Task: "Integration test tests/integration/cities-list.test.tsx"
Task: "Integration test tests/integration/cities-session.test.tsx"
Task: "Accessibility test tests/a11y/cities-a11y.test.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories).
3. Complete Phase 3: User Story 1 — the cities list with search, all states, the route, and the sidebar entry.
4. **STOP and VALIDATE**: run `tests/integration/cities-list.test.tsx`, `cities-session.test.tsx`, `cities-a11y.test.tsx`, and the quickstart US1 scenarios. This is a shippable read-only Cities screen.

### Incremental Delivery

1. Setup + Foundational → foundation ready.
2. US1 → test independently → demo (MVP: view + search).
3. US2 → test independently → demo (add a city).
4. US3 → test independently → demo (rename a city).
5. US4 → test independently → demo (activate / deactivate).
6. Phase 7 polish → full a11y + RTL sign-off, regression, traceability.

### Parallel Team Strategy

1. Whole team completes Setup + Foundational.
2. Then: Developer A on US1; Developer B builds `CityFormDialog` (T030) + `StatusToggleDialog` (T041) and the pure-helper tests; once US1's `useCitiesManagement` + `CitiesPage` exist, US2/US3/US4 wiring can be split across developers, coordinating on the shared `useCitiesManagement.ts` / `CitiesPage.tsx` / `CityRow.tsx` edits (serialize per the Serialization Points list).

---

## Notes

- `[P]` = different files, no dependency on an incomplete task.
- `[Story]` label maps a task to its user story for traceability; Setup / Foundational / Polish carry none.
- Every mutation path (create / edit / toggle) ends with `refresh()` **and** `__resetCityDirectory()` on success or `404` — never a local list patch (FR-006 / FR-032; research R8).
- Concurrent edits are last-write-wins by design — no version token, no conflict UI (clarify Q2 / research R6 / SC-012).
- `fetchMock` keys for this feature carry **no** query string; assert method + path + body exactly.
- Verify each `⚠️` test fails before implementing the code it covers.
- Commit after each task or logical group; stop at any checkpoint to validate a story independently.
- Do not edit any `src/cooks/**` or `src/drivers/**` file or their tests; the only shared-surface change is T004 (`DialogShell` move + shim).

# Phase 0 Research: Cities Management

Feature: `005-cities-management` · Date: 2026-09-07

All Technical Context unknowns are resolved below. No open `NEEDS CLARIFICATION` remain — `/speckit-clarify` closed the three real ambiguities (edit = modal dialog mirroring Add; concurrent edits = last-write-wins; a client-side name search is in scope, sorting and a status filter are not) and the spec's Assumptions section fixed the rest (unpaginated list held whole, new city starts active, no client-side duplicate pre-check, re-fetch after each success, no delete/bulk). This document records the design decisions that follow.

---

## R1. Authenticated request seam (FR-035, all endpoints)

**Decision**: Reuse the Phase 1 seam in `src/api/httpClient.ts` **unchanged**:

- `authedRequest<T>(path, opts)` reads the ambient token; if `null`, throws `ApiError(0, "No active session")` without a network call; otherwise delegates to `apiRequest<T>` with `Authorization: Bearer <token>`.
- `AuthProvider` already calls `setTokenProvider(readToken)` and `setUnauthorizedHandler(...)` on mount. All Phase 5 API functions call `authedRequest`, never `apiRequest` directly.

**Rationale**: Feature code never sees or stores the bearer token. `401` handling is centralised — `apiRequest` calls `unauthorizedHandler` on a token-bearing `401`, which `AuthContext` wires to `clearSession()` + `SESSION_LOST` → `<RequireAdmin>` redirects to `/login`. Phase 5 gets FR-035 for free with no per-call code.

**Alternatives considered**:
- *Expose `token` from `useAuth()`* — rejected: forces every call site to thread the token and widens the misuse surface.
- *A cities-specific transport* — rejected: the existing wrapper already does envelope parsing, `ApiError` normalisation, and `401` routing. The existing `fetchCityDirectory` in `citiesApi.ts` already uses `authedRequest`; the new functions follow it.

---

## R2. Extending `src/cities/` without breaking the read-only directory (FR-001, cross-feature)

**Context**: `src/cities/` already exists and is **read-only**: `fetchCityDirectory()` does `authedRequest<City[]>('/admin/cities')` once per browser session, memoises the `Map<id,{name_ar,name_en}>`, and `useCityNames()` consumes it to turn a cook/driver `city_id` into a display name. Cook-review and driver-review depend on it. `__resetCityDirectory()` already exists as a test-only memo reset.

**Decision**:
- Add the management functions to the **same** `citiesApi.ts`, additive only: `listCities(signal?)`, `createCity(input)`, `updateCity(id, patch)`, `setCityStatus(id, is_active)`. `fetchCityDirectory` / `useCityNames` / `City` are not touched.
- The management hook uses `listCities()` — a **fresh** `GET /admin/cities` on every mount and refresh — not the memo. Management needs live data; the memo is for incidental name resolution elsewhere.
- Promote `__resetCityDirectory()` from "test-only" to a real invalidation hook and call it from `useCitiesManagement` after **every** successful create / edit / status change (R8), so the next cook/driver screen open re-fetches a directory that includes the new or renamed city.

**Rationale**: One module for one backend resource. The directory memo and the management list are different lifetimes (session-long vs screen-long); keeping them as separate functions over one endpoint avoids a shared cache that would be wrong for one of the two callers. The existing `tests/unit/cityDirectory.test.ts` stays green because the directory code path is unchanged.

**Alternatives considered**:
- *A new `src/citiesAdmin/` folder* — rejected: splits one resource across two folders; the directory and the admin screen legitimately share `City` and the endpoint path.
- *Make the management hook reuse the memoised directory* — rejected: it would show stale data after another admin's change and would need bespoke invalidation on every refresh anyway.
- *Leave the directory stale after mutations* — rejected: a cook in a city added today would render as a raw id on the review screen until the next full reload; a one-line `__resetCityDirectory()` after a confirmed mutation removes that gap.

---

## R3. List load, in-memory search, and refresh (FR-001..FR-007, FR-042, FR-043)

**Decision**: `useCitiesManagement()` owns `allCities: City[]`, `search: string`, and a screen `status`:

- `load()` calls `listCities()` and stores the array verbatim in `allCities` (no client sort — the backend order is used as-is; sorting is spec-scoped out).
- `visibleCities = filterCities(allCities, search)` is derived on every render (pure, `src/cities/citySearch.ts`): trims the term, lower-cases both sides, keeps a city when `name_ar` **or** `name_en` contains it. An empty/whitespace term returns the list unchanged.
- `setSearch(next)` just sets the string — no network, no debounce (a city list is small; `filterCities` over ≤ a few hundred items is sub-millisecond).
- Screen `status`: `loading` on the first load with nothing shown; `ready` once an array is in hand; `error` only when a load fails **and** nothing is currently shown. A failed refresh with a list already shown keeps the list and shows a transient toast (mirrors `useDriverApplications`).
- Empty-state resolution in the page:
  - `status === 'ready'` and `allCities.length === 0` → **"no cities"** empty state, Add still enabled (FR-005).
  - `allCities.length > 0` and `visibleCities.length === 0` → **"no cities match your search"** state, distinct copy, search term still editable (FR-043).
  - otherwise → the table of `visibleCities`.
- `refresh()` re-runs `load()` for the current screen; the search term is preserved across a refresh.

**Rationale**: The endpoint returns the whole list unpaginated (contrast Phase 4's `?page=`), so holding it in memory and filtering client-side is both what the spec asks for and the simplest correct model. Deriving `visibleCities` (rather than storing it) keeps the search always consistent with the latest `allCities` after a mutation re-fetch.

**Alternatives considered**:
- *Debounce `setSearch`* — rejected: no network call to throttle and the list is tiny; debounce would only add latency to keystrokes.
- *Server-side search (`?q=`)* — rejected: not in the Phase 5 API, and the client already holds every city.
- *Store `visibleCities` in state and recompute in an effect* — rejected: a derived value is simpler and can't desynchronise from `allCities`.
- *Also offer a status (active/inactive) filter* — rejected: `/speckit-clarify` explicitly scoped it out for this version.

---

## R4. One form dialog for Add and Edit (FR-008, FR-016, clarify Q1)

**Decision**: A single `CityFormDialog` on `src/shared/DialogShell`, prop `mode: 'add' | 'edit'`:

- Fields: `name_ar` and `name_en`, each a labelled text input with `maxLength={255}` and `dir` appropriate to the field (`rtl` for Arabic, `ltr` for English).
- `mode: 'add'` starts both fields empty; `mode: 'edit'` starts them pre-filled from the row (`initialValues`).
- Live client validation via `validateNames(values, mode)` (`src/cities/cityValidation.ts`, pure):
  - both modes: a field that is non-empty must be ≤ 255 chars after no trimming (the raw length) and must not be whitespace-only.
  - `add`: **both** `name_ar` and `name_en` are required (non-blank) — submit disabled otherwise (FR-009).
  - `edit`: **at least one** of the two must be non-blank — submit disabled otherwise, with a form-level "at least one name required" message (FR-018). A field left exactly equal to its `initialValue` is "unchanged", not "missing".
- Server field errors: the parent passes `serverErrors?: NameErrors` (from a `422` `errors` map); the dialog renders them under the matching field and keeps them until that field is edited. The dialog stays mounted with the entered values on a `422` or a transient failure (FR-012 / FR-014 / FR-021 / FR-024).
- `busy` disables both buttons and the submit shows progress (`aria-busy`); exactly one request per confirmed submit (FR-013 / FR-023).
- Confirm button is **not** auto-focused (unlike the confirm-only dialogs) — focus goes to the first field; `DialogShell` handles trap + restore + `Esc`.
- On success the parent closes the dialog; on `404` (edit) the parent closes the dialog and toasts + re-fetches (FR-022).

**Rationale**: Clarify Q1 chose "Edit = a modal mirroring the Add form". Making that literally one component with a `mode` prop removes any drift between the two and gives both the same validation, the same server-error surface, and the same a11y behaviour. Edit's "≥ 1 name" vs Add's "both names" is the only branch.

**Alternatives considered**:
- *Two separate dialogs* — rejected: identical structure and validation but for one rule; drift risk.
- *Inline row editing for Edit* — rejected by clarify Q1 (extra row-state machine, different focus model, harder a11y).
- *A form library (react-hook-form etc.)* — rejected: two fields, three rules; `useState` + one pure `validateNames` is smaller and dependency-free.

---

## R5. Mutation outcome handling (FR-011..FR-014, FR-020..FR-024, FR-028..FR-034)

**Decision**: `create` / `update` / `toggleStatus` in the hook share one `runMutation(kind, call)`:

1. Set the relevant busy flag — `dialog.busy = true` for create/edit, `rowState[id] = 'submitting'` for a toggle (FR-013 / FR-023 / FR-029).
2. Call the endpoint (`createCity` `POST {name_ar,name_en}` / `updateCity` `PUT` partial body / `setCityStatus` `PATCH {is_active}`).
3. Classify the result with `classifyMutation(err | null, ...)` (`src/cities/mutationOutcome.ts`, pure) into `CityMutationOutcome`:
   - **`201` / `200` success** → `{ ok: true, message }`. Even if the body is unreadable, still `ok` (FR-032). Parent: close any dialog, success toast (envelope `message`), `refresh()` the list, `__resetCityDirectory()` (R8).
   - **`ApiError.status === 422` with a non-empty `errors` map** → `{ ok: false, reason: 'validation', fieldErrors, message }`. `fieldErrors` keeps only the `name_ar` / `name_en` keys the map provides (the duplicate-name case names one or both). Parent: keep the dialog open, values preserved, render the field error(s) (FR-012 / FR-021). No re-fetch.
   - **`ApiError.status === 422` with no usable `errors` map** → `{ ok: false, reason: 'validation', message }` shown as a **form-level** error in the dialog (covers a server-side "at least one name" or a non-boolean `is_active` that the client didn't pre-block). No re-fetch.
   - **`ApiError.status === 404`** → `{ ok: false, reason: 'not_found' }`. Parent: close the dialog, fixed "could not be found" toast, `refresh()`, `__resetCityDirectory()` (FR-022 / FR-030).
   - **`ApiError.status === 0` (network) or `>= 500`** → `{ ok: false, reason: 'transient' }`. Parent: **no** change — dialog stays open with values / row toggle returns to `idle`; retryable "please try again" toast; **no** re-fetch (FR-014 / FR-024 / FR-031).
   - **`401`** → never reaches here; the shared `unauthorizedHandler` inside `apiRequest` handles it.
4. Clear the busy flag.

`update` and `toggleStatus` discard the updated `City` the `200` returns and rely on the `refresh()` (FR-032, and consistent with Phase 4). `create` likewise: the `201` body is not spliced in locally — the re-fetch shows the new (active) city.

**Rationale**: `422` means "your input is wrong, fix it here" → keep the dialog; `404` means "the world moved" → close and reconcile; `0`/`5xx` are transient → touch nothing. Re-fetch-after-success (not local patch) is FR-006/FR-032 and also keeps the list correct when another admin changed something in parallel (the last-write-wins reconciliation from clarify Q2).

**Alternatives considered**:
- *Local list patch on success* — rejected: violates FR-006/FR-032 and would hide a concurrent change.
- *Optimistic status toggle* — rejected: a `500`/network failure would need a rollback; the list is tiny so the re-fetch flash is negligible and certainty-first is simpler.
- *Retry `404` automatically* — rejected: the city is gone; telling the administrator and re-fetching is the spec behaviour.

---

## R6. Concurrent edits — last-write-wins, no detection (clarify Q2, FR spec Edge Cases, SC-012)

**Decision**: The client implements **no** optimistic-concurrency control. `updateCity` sends the `PUT` with whatever the dialog holds; a `200` is a success. Two admins editing the same city in overlapping sessions → the later `PUT` wins; each admin's post-save `refresh()` shows the current server state. No version token is sent (the API has none), no "changed since you opened this" check, no conflict UI.

**Rationale**: Clarify Q2 chose Option A explicitly, and the backend offers no ETag/version to build detection on. The mandatory re-fetch after every successful mutation is the reconciliation mechanism; SC-012 asserts both saves complete without error and the refreshed list shows the last write.

**Alternatives considered** (both rejected by clarify Q2): a best-effort stale check before save; treating concurrency as fully out of scope (no documented behaviour).

---

## R7. Status toggle + confirmation dialog (FR-026, FR-027, FR-041)

**Decision**:
- `CityRow` renders the active/inactive control as a labelled toggle/switch (`role="switch"` or a button pair) — **not** a raw checkbox — with the current state in its accessible name. There is **no** delete control anywhere in the feature (FR-026).
- Activating the control opens `StatusToggleDialog` (confirm-only, on `src/shared/DialogShell`): copy differs for activate ("سيتم تفعيل مدينة …") vs deactivate ("سيتم تعطيل مدينة … ولن تظهر للعملاء"); Confirm + Cancel only; Confirm auto-focuses; `Esc`/Cancel/backdrop send nothing (FR-027).
- On Confirm → `toggleStatus(id, nextActive)` → `PATCH /admin/cities/{id}/status` body `{ is_active: <boolean> }`. The client only ever sends a real boolean, so the `422`-non-boolean case is unreachable from the UI (handled defensively as a form-level error if the server returns it).
- While the request is in flight, only **that row's** toggle is disabled with progress (FR-029); other rows stay interactive.

**Rationale**: Deactivating a city is consequential (it pulls a market), so the spec requires an explicit confirmation even though the backend takes only `{is_active}`. A confirm-only dialog on the shared shell matches Phase 4's pattern and is already axe-clean.

**Alternatives considered**:
- *Toggle with no confirmation* — rejected by FR-027.
- *`window.confirm()`* — rejected: unstyleable, not WCAG-auditable, wrong language/RTL.
- *A single dialog shared with `CityFormDialog`* — rejected: the form dialog carries inputs and different validation; a 30-line confirm-only component is clearer.

---

## R8. Directory invalidation after a mutation (cross-feature correctness)

**Decision**: `useCitiesManagement` imports `__resetCityDirectory` from `citiesApi.ts` and calls it inside the success and `404` branches of `runMutation`, immediately before/after `refresh()`. Rename `__resetCityDirectory`'s doc-comment from "test-only" to note it is also the production invalidation point; keep the name (it is already imported by `tests/helpers/harness.tsx`).

**Rationale**: `fetchCityDirectory` memoises for the whole session. Without invalidation, a city added or renamed on `/cities` would not be reflected on the cook-review or driver-review screens until a full page reload. One call per confirmed mutation closes that gap with no API of its own.

**Alternatives considered**:
- *An event bus / context for cross-feature cache busting* — rejected: over-engineered for one memo and one call site.
- *Give the directory a TTL* — rejected: still stale within the TTL right after a change; explicit invalidation is precise.
- *Do nothing* — rejected: a visible correctness gap for other features (raw `city_id` shown instead of a name).

---

## R9. Routing, sidebar, and the guard (FR-036, FR-039)

**Decision**: In `src/App.tsx` `AdminLayout`, import `CitiesPage` and add `<Route path="/cities" element={<CitiesPage />} />` inside the existing `<Routes>` (already wrapped by `<RequireAdmin>` on `/*`). In `src/components/Sidebar.tsx` add `{ name: 'إدارة المدن', icon: MapPin, path: '/cities' }` immediately **before** `'إعدادات النظام'` (cities is configuration, grouped with settings). No new guard — `<RequireAdmin>` already gates the whole admin shell, so a signed-in non-admin never reaches `/cities` (FR-036).

**Rationale**: The route, layout, guard, header, and sidebar all exist from Phase 1; this feature adds one page body and one nav entry. `MapPin` is a stable lucide-react icon and reads as "places/cities".

**Alternatives considered**:
- *Nest under `/settings/cities`* — rejected: cities are their own managed list, not a settings sub-panel; `admin-dashboard-api.md` gives them their own Phase.
- *`Building2` / `Map` icon* — acceptable substitutes; `MapPin` chosen for clarity at 20px.

---

## R10. Shared modal shell — promote `src/review/DialogShell.tsx` → `src/shared/` (FR-041)

**Decision**: Move `src/review/DialogShell.tsx` verbatim to `src/shared/DialogShell.tsx` and replace `src/review/DialogShell.tsx` with `export { default } from '../shared/DialogShell'`. The cities dialogs import from `../shared/DialogShell`. `src/cooks/DialogShell.tsx` (already a re-export of `../review/DialogShell`) and `src/drivers/*` (import `../review/DialogShell`) keep working through the shim; no cook/driver test changes.

**Rationale**: `DialogShell` is already feature-neutral (portal, backdrop, `role="dialog"` + `aria-modal`, `Esc`, focus trap, focus restore) and axe-clean from Phases 2–3. A `cities → review` import would be the wrong dependency direction; `src/shared/` is where cross-feature UI belongs. This is the exact shim pattern the codebase already used for `src/cooks/DialogShell.tsx`.

**Alternatives considered**:
- *Import `../review/DialogShell` directly from `src/cities/`* — rejected: couples an unrelated feature to "review".
- *Copy `DialogShell` into `src/cities/`* — rejected: a third copy of a focus-trap to keep in sync.
- *Leave it and defer the move* — rejected: the move is two files with zero behaviour change and unblocks a clean import now.

---

## R11. Toasts and the live region (FR-037, FR-040, FR-041)

**Decision**: Replicate the Phase 3 `DriverApplicationsPage` toast pattern inline in `CitiesPage`: a visually-hidden `role="status"` `aria-live="polite"` region always in the DOM, plus a transient styled bubble cleared after ~6 s. Success and `validation` (form-level) outcomes use the envelope `message`; `not_found` and `transient` use fixed Arabic strings from `messages.ts`. Separately, a second polite live region announces the filtered result count / no-match state when the search term changes (FR-041).

**Rationale**: Matches Phases 2–3 exactly, so announcements behave identically. Field-level `422` errors are shown **in the dialog** (not as a toast) so they sit next to the input the administrator must fix.

**Alternatives considered**:
- *Extract a shared `useToast` into `src/shared/`* — deferred: it would require editing the Phase 2/3 screens to adopt it; the ~15-line pattern is duplicated once more for now, with consolidation left as a later cross-feature cleanup.
- *A toast library* — rejected: one dependency for one bubble.

---

## R12. Testing & accessibility tooling (SC-010, all ACs)

**Decision**: Reuse the Phase 1–3 harness unchanged — `tests/helpers/fetchMock.ts` (`installFetchMock().reply("GET /admin/cities", …)` with ordered replies for the post-mutation re-fetch), `tests/helpers/harness.tsx`, `tests/setup.ts`. Extend `tests/helpers/fixtures.ts` with `city(overrides)`, `citiesResponse(cities)`, `createdCity(overrides)`, `updatedCity(overrides)` producing envelope-shaped payloads from `admin-dashboard-api.md` Phase 5 (including `fail('The given data was invalid.', { name_ar: ['اسم المدينة مستخدم بالفعل'] })` for the duplicate case). Add `renderAtCities(fm, { seedMe?, admin? })` to `harness.tsx` mirroring `renderAtDrivers`. New specs per the Project Structure tree. `vitest-axe` runs on each visual state: the list/table, the search box, the empty state, the no-match state, the error state, `CityFormDialog` in `add` and `edit` mode, and `StatusToggleDialog`. Keyboard-only flows (`user-event`) cover typing in the search, opening + submitting Add, editing a name, and toggling a city. The pre-existing `tests/unit/cityDirectory.test.ts` is run to confirm the additive `citiesApi.ts` change did not regress the directory.

> `fetchMock` keys are `"<METHOD> <path>"`; Phase 5 paths carry **no query string** (`GET /admin/cities`, `POST /admin/cities`, `PUT /admin/cities/12`, `PATCH /admin/cities/12/status`), so tests assert method + path + body exactly. `jsdom` cannot evaluate colour contrast or true focus visibility — those parts of SC-010 stay in the manual checklist in `quickstart.md`.

**Rationale**: The tooling and fetch-mock already exist and mirror the same envelope. Automated axe gives measurable AA coverage; residual manual checks (contrast, true focus visibility, RTL rendering for SC-011) are the same short list Phases 1–3 used and are scripted in `quickstart.md`.

**Alternatives considered**:
- *MSW* — rejected: the per-test `fetchMock` already handles ordered replies.
- *Playwright e2e* — deferred: integration tests with mocked `fetch` cover every acceptance scenario.

---

## Resolved Technical Context summary

| Field | Value |
|---|---|
| Auth to API | Reuse `authedRequest` + `setTokenProvider` (already wired in `AuthProvider`); `401` → existing `unauthorizedHandler` → `/login` |
| List load | `useCitiesManagement()` — fresh `GET /admin/cities` on mount + `refresh()` + after every successful mutation; array held whole in `allCities` |
| Search | client-side only; `filterCities(allCities, term)` over `name_ar` OR `name_en`, trimmed + case-insensitive; no network, no debounce; empty term → full list |
| Empty states | `allCities` empty → "no cities" (+ Add); `allCities` non-empty & `visibleCities` empty → "no cities match your search" (distinct) |
| Add | `CityFormDialog` `mode:'add'`; both names required + ≤255 pre-submit; `POST /admin/cities {name_ar,name_en}` → `201` active city |
| Edit | same `CityFormDialog` `mode:'edit'`, pre-filled; ≥1 name required + ≤255 pre-submit; `PUT /admin/cities/{id}` partial body |
| Toggle | row switch + `StatusToggleDialog` (confirm-only); `PATCH /admin/cities/{id}/status {is_active}`; per-row in-flight disable |
| Mutation outcomes | 201/200 → toast(msg) + re-fetch + `__resetCityDirectory()`; 422+errors → field error in dialog, dialog kept; 422 no-errors → form-level error; 404 → toast + close + re-fetch; 0/5xx → no change + retryable toast |
| Concurrency | last-write-wins; no version token, no detection, no conflict UI (clarify Q2); re-fetch is the reconciliation |
| Directory memo | `useCityNames` / `fetchCityDirectory` untouched; `__resetCityDirectory()` called after each successful mutation so other screens re-fetch |
| Delete | none — not offered anywhere |
| Dialog shell | `src/review/DialogShell.tsx` promoted to `src/shared/DialogShell.tsx`; one-line re-export shim left at `src/review/`; no cook/driver test change |
| Routing | `App.tsx` adds `/cities` → `<CitiesPage>`; `RequireAdmin` already gates it; Sidebar gains "إدارة المدن" before "إعدادات النظام" |
| RTL / a11y | `dir="rtl"`, Tajawal font; `<th scope="col">` per column; badge = label + icon; dialogs trap/restore focus; two polite live regions (toasts, filtered count) |
| Testing | Phase 1–3 Vitest + Testing Library + `vitest-axe` + `fetchMock`; extend `fixtures.ts` + `harness.tsx`; 3 unit + 5 integration + 1 a11y spec; re-run `cityDirectory.test.ts` |
| Config | no new env; `VITE_API_BASE_URL` reused |

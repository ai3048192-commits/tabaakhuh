---
description: "Task list for Platform Settings"
---

# Tasks: Platform Settings

**Input**: Design documents from `/specs/006-platform-settings/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/)

**Depends on**: Feature `001-admin-auth-session` implemented, and the `authedRequest` / `setTokenProvider` seam in `src/api/httpClient.ts`. This feature reuses that transport, the `<RequireAdmin>` guard, the shared layout / sidebar / header, and the `tests/` harness. It does **not** depend on features `002` / `003` / `004` / `005`; the only shared-transport change (widening `HttpOptions.method` to include `'PUT'`) is a superset merge if `005` lands first.

**Tests**: INCLUDED. The two user stories carry explicit acceptance scenarios and measurable criteria (SC-001…SC-009), and [quickstart.md](./quickstart.md) maps automated suites to requirements. Test tasks are written before the implementation they cover and must fail first.

**Organization**: Tasks are grouped by user story. Phases 1–2 are shared; Phase 3 is US1 (view) and Phase 4 is US2 (update); each is an independently testable increment.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: US1 / US2 (setup, foundational, polish carry no story label)
- Exact file paths are in every task

## Path Conventions

Single Vite SPA at repo root: source in `src/`, tests in `tests/`. New feature code in `src/settings/`. Layout per [plan.md](./plan.md) "Project Structure".

⚠️ **Serialization points** (same file touched across phases — not `[P]` with each other; sequence or single-owner):

- `src/api/httpClient.ts` — one edit only, T004 (`HttpOptions.method` union gains `'PUT'`; no-op if feature `005` already widened it)
- `src/settings/types.ts` — created once, T005 (all types at once)
- `src/settings/feeValidation.ts` — created once, T006 (`validateFeeInput` + `formatFee`)
- `src/settings/mutationOutcome.ts` — created once, T008
- `src/settings/settingsApi.ts` — created once, T010
- `src/settings/messages.ts` — created once, T011 (all keys at once)
- `src/settings/usePlatformSettings.ts` — created T016 (US1 load/state; `save` is a placeholder), extended T023 (US2 real `save`)
- `src/settings/DeliveryFeeForm.tsx` — created T017 (US1 display + field + disabled Save), extended T024 (US2 Save wired, `aria-busy`, label swap)
- `src/settings/SettingsPage.tsx` — created T018 (US1 states + form + toast scaffold), extended T024 (US2 save-outcome → toast mapping)
- `src/App.tsx` — one edit only, T019 (repoint `/settings` route)
- `src/pages/Settings.tsx` — deleted once, T019
- `src/components/Sidebar.tsx` — **not edited** (the "إعدادات النظام" → `/settings` entry already exists)
- `tests/a11y/settings-a11y.test.tsx` — created T015 (US1 surfaces), extended T022 (US2 field-error + saving state)
- `tests/helpers/fixtures.ts` — one edit only, T002
- `tests/helpers/harness.tsx` — one edit only, T003

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Folder skeleton and test fixtures / helpers for the two endpoints. No new dependencies or env vars — `VITE_API_BASE_URL` and the Vitest / `vitest-axe` tooling from earlier features are reused.

- [X] T001 [P] Create the `src/settings/` directory with a `.gitkeep` (removed once `types.ts` lands in T005)
- [X] T002 [P] Extend `tests/helpers/fixtures.ts` with builders producing envelope-shaped payloads from `admin-dashboard-api.md` Phase 6: `settings(fee = 25)` → `{ delivery_fee: fee }` (a `PlatformSettings`); `settingsResponse(fee = 25)` → `ok({ delivery_fee: fee })` (message `'OK'`); `updatedSettings(fee = 30)` → `ok({ delivery_fee: fee }, 'Delivery fee updated.')`. Reuse the existing `ok` / `fail` helpers — e.g. `fail('The given data was invalid.', { delivery_fee: ['يجب أن تكون القيمة صفراً أو أكثر.'] })` for the `422`
- [X] T003 [P] Extend `tests/helpers/harness.tsx` with `renderAtSettings(fm, opts?: { seedMe?: boolean; admin?: boolean })` — seeds `localStorage` with a valid token + cached profile (admin by default; `admin: false` seeds a `customer` role), replies to `GET /auth/me` by default, and mounts the router at `/settings` with the real `<SettingsPage/>` inside `<RequireAdmin>` plus a `/login` stub route. Mirror the existing `renderAtDrivers`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The transport `method` widening, feature types, the two pure helpers (fee validation + formatting, mutation-outcome classification) with their unit tests, the API wrappers, and the message strings — everything both stories build on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T004 [P] In `src/api/httpClient.ts`, widen `HttpOptions.method` from `'GET' | 'POST'` to `'GET' | 'POST' | 'PUT'` — additive only; `apiRequest` already forwards `method` to `fetch`. Do **not** add `'PATCH'` (not used by this feature). If feature `005` has already widened this union to a superset, make no edit. Confirm `tests/unit/authedRequest.test.ts` and `tests/unit/envelope.test.ts` still pass ([contracts/settings-ui.md](./contracts/settings-ui.md), research R2)
- [X] T005 [P] Create `src/settings/types.ts` per [data-model.md](./data-model.md) and [contracts/settings-ui.md](./contracts/settings-ui.md): `PlatformSettings` (`{ delivery_fee: number }`), `FeeError` (`'required' | 'not_a_number' | 'negative' | 'too_many_decimals' | null`), `FeeValidation` (`{ value: number | null; error: FeeError }`), `SettingsMutationOutcome` (the 3-variant union), `SettingsStatus` (`'loading' | 'ready' | 'error'`)
- [X] T006 [P] Implement `src/settings/feeValidation.ts` — pure `validateFeeInput(raw: string): FeeValidation` with rule order `required` → `not_a_number` → `negative` → `too_many_decimals` → ok: trim `raw`; `''` → `{ value: null, error: 'required' }`; not matching `/^-?\d+(\.\d+)?$/` (rejects `abc`, `1.2.3`, `1e3`, `1.`, `.5`, bare `-`) → `{ value: null, error: 'not_a_number' }`; parses `< 0` → `{ value: <n>, error: 'negative' }`; `> 2` fractional digits → `{ value: <n>, error: 'too_many_decimals' }`; otherwise `{ value: Number(raw), error: null }` (accepts `'0'`, `'0.00'`, arbitrarily large integers — **no** upper bound). Also export `formatFee(n: number): string` → `n.toFixed(2)` (Western digits; the caller appends the unit). No side effects, no message text ([data-model.md §3](./data-model.md), [contracts/settings-ui.md](./contracts/settings-ui.md)) (depends on T005)
- [X] T007 [P] Unit test `tests/unit/feeValidation.test.ts` — write first, must fail: `''` → `required`; `'abc'` / `'1.2.3'` / `'1e3'` / `'1.'` / `'.5'` → `not_a_number`; `'-5'` → `negative`; `'10.005'` → `too_many_decimals`; `'0'`, `'0.00'`, `'10'`, `'10.5'`, `'10.50'`, `'  10.5  '` (trimmed), `'1000000'` → `error: null` with the right `value`; `formatFee(25)` → `'25.00'`, `formatFee(30.5)` → `'30.50'`, `formatFee(0)` → `'0.00'` (FR-008 / FR-009 / FR-010 / FR-011, SC-004)
- [X] T008 [P] Implement `src/settings/mutationOutcome.ts` — pure `classifySettingsMutation(err: unknown | null): SettingsMutationOutcome`: `null` → `{ ok: true, message: '' }`; `ApiError` with `status === 422` → `{ ok: false, reason: 'validation', message: err.fieldErrors?.delivery_fee?.[0] ?? err.message }`; `ApiError` with `status === 0` or `>= 500` or any other unexpected status → `{ ok: false, reason: 'transient' }`; a non-`ApiError` throw → `{ ok: false, reason: 'transient' }`. **No** `not_found` / `404` branch — `/admin/settings` is a singleton ([data-model.md §4](./data-model.md)) (depends on T005)
- [X] T009 [P] Unit test `tests/unit/settingsMutationOutcome.test.ts` — write first, must fail: `null` → `{ ok: true }`; `ApiError(422, msg, { delivery_fee: ['x'] })` → `validation` with `message === 'x'`; `ApiError(422, msg, null)` → `validation` with `message === msg`; `ApiError(0, …)`, `ApiError(500, …)`, `ApiError(418, …)`, and a plain `Error` → `transient` ([data-model.md §4](./data-model.md))
- [X] T010 [P] Create `src/settings/settingsApi.ts` per [contracts/settings-api.md](./contracts/settings-api.md): `getSettings(signal?)` → `authedRequest<PlatformSettings>('/admin/settings', { signal })`; `updateSettings(delivery_fee: number)` → `authedRequest<PlatformSettings>('/admin/settings', { method: 'PUT', body: { delivery_fee } })` (a JS number, never a string). Both propagate `ApiError` unchanged and never handle `401`. No memo, no cache (depends on T004, T005)
- [X] T011 [P] Create `src/settings/messages.ts` — all Arabic RTL keys from [contracts/settings-ui.md](./contracts/settings-ui.md) "messages" section: `pageTitle`, `subtitle`, `loading`, `loadError`, `retry`, `currentFeeLabel`, `feeFieldLabel`, `feeUnit` (`'ج.م'`), `feeHint`, `feeRequired`, `feeNotNumber`, `feeNegative`, `feeTooManyDecimals`, `save`, `saving`, `updatedToast`, `saveRetryToast`. Add a `feeErrorText(error: Exclude<FeeError, null>): string` mapper from the `FeeError` tag to the matching message
- [X] T012 Regression checkpoint: run `npm run test:run` and confirm `tests/unit/authedRequest.test.ts` and `tests/unit/envelope.test.ts` still pass after T004, and that T007 / T009 now exist and fail pending implementation

**Checkpoint**: transport accepts `PUT`; pure helpers, API wrappers, types and messages ready; existing transport tests green.

---

## Phase 3: User Story 1 - Administrator views the current delivery fee (Priority: P1) 🎯 MVP

**Goal**: An administrator opens `/settings` and sees the platform's current delivery fee as an Egyptian-pound amount. A loading state shows while it is retrieved (no Save yet); a failed load shows a retryable error panel with **no** editable value; Retry recovers. The screen sits behind the admin guard and routes a `401` to `/login`. The delivery-fee field renders pre-filled once loaded, but Save is inert until US2.

**Independent Test**: Sign in as admin, open `/settings` → one `GET /admin/settings`, the current fee shown as "NN.NN ج.م"; a delayed reply shows a loading state with no form; a `500` / offline first load shows the error panel + Retry with no editable value, and Retry (after going online) loads the fee and shows the form; a `401` on the load redirects to `/login`; a non-admin never reaches `/settings`.

### Tests for User Story 1 ⚠️ (write first, must fail)

- [X] T013 [P] [US1] Integration test `tests/integration/settings-view.test.tsx` with mocked `fetch` via `renderAtSettings` (ordered replies on `GET /admin/settings` for the Retry path): AC1 first mount issues exactly one `GET /admin/settings` (no query string, `Bearer` header) and renders the current delivery fee as an EGP amount matching `data.delivery_fee` (e.g. `25` → text contains `25.00` and `ج.م`) (FR-001 / FR-002); AC2 a delayed reply shows a loading state and **no** Save control while pending (FR-003); AC3 a `500` (and a `fetch` reject) first load → an error panel with the `loadError` text and a **Retry** button, and **no** editable fee value shown (FR-004); AC4 clicking Retry issues a second `GET /admin/settings` and, on success, shows the fee and renders the form with the field pre-filled (FR-005); FR-022 `renderAtSettings(fm, { admin: false })` → `/settings` is not reachable for a non-admin
- [X] T014 [P] [US1] Integration test `tests/integration/settings-session.test.tsx`: a `401` response to `GET /admin/settings` invokes the inherited `unauthorizedHandler` → session cleared → redirect to `/login`, no broken view (FR-021)
- [X] T015 [P] [US1] Accessibility test `tests/a11y/settings-a11y.test.tsx`: `vitest-axe` reports zero violations on the loading state, the error+Retry panel, and the ready form in its pristine state; the fee field has a programmatic `<label htmlFor>` and its unit is exposed to assistive tech (via `aria-describedby` to a node naming "ج.م" / Egyptian pounds, not the visual suffix alone); a keyboard-only pass reaches the field and the (disabled) Save button with a visible focus target; the page root is `dir="rtl"` and the numeric value sits in a `dir="ltr"` span (FR-026 / FR-027 / SC-008 / SC-009 smoke)

### Implementation for User Story 1

- [X] T016 [US1] Implement `usePlatformSettings()` in `src/settings/usePlatformSettings.ts` per [contracts/settings-ui.md](./contracts/settings-ui.md) and [data-model.md §6](./data-model.md): state `{ savedFee: number | null, draft: string, saving: boolean, status: SettingsStatus }`; on mount `load()` via `getSettings()` → `savedFee = data.delivery_fee`, `draft = formatFee(savedFee)`, `status = 'ready'`; on failure `status = 'error'` (no "value already shown" nuance — any load failure is the error state); `reload()` re-runs `load()`; `setDraft(raw)` sets the string only (no network); derive `validation = validateFeeInput(draft)`, `fieldError = validation.error ? feeErrorText(validation.error) : null`, `dirty = validation.value !== null && validation.error === null && validation.value !== savedFee`, `canSave = dirty && !saving`; export `save()` as a placeholder that throws `"not implemented"` (filled in US2); all state dropped on unmount (FR-003 / FR-004 / FR-005 / FR-006 / FR-007 / FR-016 / FR-017) (depends on T006, T008, T010, T005)
- [X] T017 [US1] Implement `DeliveryFeeForm` in `src/settings/DeliveryFeeForm.tsx` per [contracts/settings-ui.md](./contracts/settings-ui.md) — props `{ savedFee: number, draft: string, fieldError: string | null, canSave: boolean, saving: boolean, onDraftChange: (raw: string) => void, onSave: () => void }`; a read-only line `currentFeeLabel` + `formatFee(savedFee)` + `feeUnit` in a `dir="ltr"` span; a `<form onSubmit>` with a labelled field (`<label htmlFor>` = `feeFieldLabel`, `type="text"`, `inputMode="decimal"`, `dir="ltr"`, trailing `feeUnit` text with `aria-describedby` pointing at a hint node = `feeHint` and, when present, the error node); the error node (`role`-appropriate, `aria-live="polite"`) shown under the input when `fieldError`, with `aria-invalid="true"` on the input; a **Save** button = `save` label, `disabled={!canSave}`, `aria-busy={saving}` (label swap to `saving` handled in US2 — for now it just reflects `canSave`); `onSubmit` / button click → `onSave()` (FR-002 / FR-006 / FR-007 / FR-026 / FR-027) (depends on T011, T006)
- [X] T018 [US1] Implement `SettingsPage` in `src/settings/SettingsPage.tsx` — compose `usePlatformSettings()`; `status === 'loading'` → a loader (no form); `status === 'error'` → an error panel with `loadError` + a **Retry** button calling `reload()` and **no** editable value (FR-004); `status === 'ready'` → a header (`pageTitle` + `subtitle`) and `<DeliveryFeeForm savedFee={savedFee!} draft={draft} fieldError={fieldError} canSave={canSave} saving={saving} onDraftChange={setDraft} onSave={save} />`; own a visually-hidden `role="status"` `aria-live="polite"` region plus a transient toast bubble cleared after ~6 s (pattern copied from `DriverApplicationsPage`) — no toast is emitted yet (US2 wires the save-outcome mapping); root `dir="rtl"`, `font-['Tajawal']`, brand `#7a0d0d` (FR-001 / FR-003 / FR-004 / FR-005 / FR-022 / FR-026) (depends on T016, T017)
- [X] T019 [US1] In `src/App.tsx`, replace `import Settings from './pages/Settings'` with `import SettingsPage from './settings/SettingsPage'` and change the `/settings` `<Route>` element from `<Settings />` to `<SettingsPage />` (still inside `AdminLayout`'s `<Routes>`, already wrapped by `<RequireAdmin>` on `/*`); then delete `src/pages/Settings.tsx`. Do **not** touch `src/components/Sidebar.tsx` — the "إعدادات النظام" → `/settings` entry already exists (FR-022 / FR-025, research R3) (depends on T018)
- [ ] T020 [US1] Run the quickstart US1 scenarios 1–4 and the "Session loss" scenario in [quickstart.md](./quickstart.md) against a Phase 6 backend and record results (depends on T019)

**Checkpoint**: User Story 1 is fully functional and independently testable — this is the MVP. The fee is viewable; Save does nothing yet.

---

## Phase 4: User Story 2 - Administrator updates the delivery fee (Priority: P2)

**Goal**: The administrator changes the delivery-fee field; Save enables only when the entered value parses to a number that differs from the saved fee and passes validation (no negative, no non-numeric/empty, ≤ 2 decimal places, `0` allowed, no maximum). Save submits `PUT /admin/settings` directly (no confirmation dialog). On `200` the displayed fee updates and a success toast shows the envelope message. A `422` shows the response's message under the field with the saved fee untouched and the entered value kept. A `0`/`5xx` changes nothing with a retryable toast. Reverting the field to the saved value re-disables Save and clears the error. Navigating away discards an unsaved change silently.

**Independent Test**: On `/settings` with the fee loaded — Save is disabled while unchanged; typing a different valid amount enables it; entering `-5` / empty / `abc` / `30.005` each blocks Save with a field message and sends **zero** `PUT`; entering `0` and Saving sends `{ delivery_fee: 0 }`; a valid change → exactly one `PUT /admin/settings` body `{ delivery_fee: <number> }` → the displayed fee updates + "Delivery fee updated." toast; a `422` → message under the field, displayed fee unchanged, value preserved; rapid clicks during the request still send one `PUT` (Save disabled + `aria-busy`); `500`/offline → unchanged + retry toast; typing the original value back disables Save and clears the error.

### Tests for User Story 2 ⚠️ (write first, must fail)

- [X] T021 [P] [US2] Integration test `tests/integration/settings-update.test.tsx` with mocked `fetch` via `renderAtSettings` (ordered replies on `GET /admin/settings` for the load and the post-save resync; a reply on `PUT /admin/settings`): AC1 on load, without touching the field, **Save** is `disabled` (FR-007); AC2 changing the value to a different valid amount enables Save (FR-007); AC4 `-5` → attempting Save is blocked, a field message (`feeNegative`) shows, and **zero** `PUT /admin/settings` are sent (FR-008); AC5 clearing the field → `feeRequired`, no request; `abc` / `1.2.3` → `feeNotNumber`, no request (FR-009); a `30.005` entry → `feeTooManyDecimals`, no request, **no** rounding (FR-010, Clarifications); `0` → Save enabled → exactly one `PUT` with body `{ delivery_fee: 0 }` (FR-011); AC3 a valid new amount → exactly one `PUT /admin/settings` with the `Bearer` header and body `{ delivery_fee: <number> }` (a JS number, asserted via `toEqual`), then on `200` the displayed current fee updates to the new value and a success toast shows the envelope `message` ("Delivery fee updated."), with **no** confirmation dialog rendered before the request (FR-012 / FR-019 / SC-002); AC6 a `422` with `errors.delivery_fee` → that message renders under the field, the displayed current fee is unchanged, the entered value stays in the field, and **no** toast (FR-014 / FR-020 / SC-005); AC7 while the `PUT` is in flight Save is `disabled` / `aria-busy` and its label is `saving`; rapid clicks send exactly one `PUT` (FR-013 / SC-006); AC8 a `500` (and a `fetch` reject) → the displayed fee is unchanged, the entered value preserved, a retryable `saveRetryToast` (FR-015 / FR-024); AC9 typing the saved value back (`'25'`, `'25.0'`, `'  25.00  '`) → Save `disabled` again and the field error cleared (FR-016); FR-018 a `200` whose body is unreadable (non-JSON) → the change is still treated as applied (success toast, displayed fee = the value sent) and a follow-up `GET /admin/settings` is issued
- [X] T022 [P] [US2] Extend `tests/a11y/settings-a11y.test.tsx` — `vitest-axe` clean on the form showing a field error and on the saving state; the field error is programmatically associated with the input (`aria-invalid` + `aria-describedby`) and announced when it appears; the Save button exposes `aria-busy` while saving and its label change to `saving` is announced; a keyboard-only pass types a new value, tabs to Save, and activates it (FR-027 / SC-008) *(same file as T015 — sequence after it)*

### Implementation for User Story 2

- [X] T023 [US2] Implement `save()` in `src/settings/usePlatformSettings.ts` per [data-model.md §4/§6](./data-model.md) and research R7: run `validateFeeInput(draft)` first — if `error !== null`, set `fieldError` from `feeErrorText`, send **no** request, return `{ ok: false, reason: 'validation', message }`; otherwise set `saving = true`, call `updateSettings(validation.value)`, pass the result to `classifySettingsMutation`: on `{ ok: true }` → `savedFee = validation.value`, `draft = formatFee(validation.value)`, clear `fieldError`, fire a background `getSettings()` resync whose failure is swallowed (FR-018), return the outcome with the resolved envelope `message`; on `{ reason: 'validation', message }` → set `fieldError = message`, leave `savedFee` and `draft` untouched, return; on `{ reason: 'transient' }` → change nothing, return; always clear `saving` in a `finally`. A `401` is never observed here (FR-012 / FR-013 / FR-014 / FR-015 / FR-018 / FR-019 / FR-020 / FR-024) (depends on T016, T008, T010) *(same file as T016)*
- [X] T024 [US2] Wire Save through `src/settings/DeliveryFeeForm.tsx` (Save button label swaps to `messages.saving` while `saving`; `aria-busy={saving}`; the `<form onSubmit>` prevents default and calls `onSave`; Save stays `disabled` while `saving` even if `canSave` briefly re-computes) and `src/settings/SettingsPage.tsx` (`onSave` handler → `save().then(outcome => …)`: `outcome.ok` → success toast using `outcome.message || messages.updatedToast`; `outcome.reason === 'transient'` → `messages.saveRetryToast`; `outcome.reason === 'validation'` → **no** toast (the message is under the field, set by the hook)) (FR-012 / FR-013 / FR-014 / FR-015 / FR-019 / FR-023 / FR-024) (depends on T023) *(same files as T017 / T018)*
- [ ] T025 [US2] Run the quickstart US2 scenarios 1–13 in [quickstart.md](./quickstart.md) and record results (depends on T024)

**Checkpoint**: User Stories 1 and 2 both work independently — the delivery fee can be viewed and changed.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Cross-story verification that does not belong to a single user story.

- [ ] T026 [P] Work through the quickstart "Accessibility — WCAG 2.1 AA and RTL" manual checklist in [quickstart.md](./quickstart.md) — keyboard-only completion of changing and saving the fee; screen-reader announcement of the success, validation, and retry messages; the field label + unit announced; and the full RTL sign-off (heading, current-fee line, field + label + unit, Save button, error text, loading and error states; the number + unit left-to-right in their span) (FR-026 / FR-027 / SC-008 / SC-009)
- [X] T027 [P] Verify observability and config: `PUT` / `GET` failures are logged through the existing `logger` seam inside `apiRequest` with status + path only (the fee value is never logged); no new environment variables are introduced and `import.meta.env.VITE_API_BASE_URL` remains the only base-URL source (plan "Constraints")
- [X] T028 [P] Full regression: run `npm run test:run` and `npm run build` — all unit / integration / a11y suites green, `tests/unit/authedRequest.test.ts` and `tests/unit/envelope.test.ts` still pass, **no** `src/cooks/**` / `src/drivers/**` / `src/cities/**` / `src/review/**` file or their tests changed, `tsc` + `vite build` clean, and `src/pages/Settings.tsx` is gone with no dangling import
- [X] T029 Final traceability review against [spec.md](./spec.md): confirm every FR-001…FR-027 and SC-001…SC-009 is exercised by a task above, and tick the "Definition of done for this feature" bullets in [quickstart.md](./quickstart.md)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies — start immediately.
- **Foundational (Phase 2)**: depends on Setup. **Blocks both user stories.** T005 → T006 / T008 / T010; T006 → T007; T008 → T009; T004 → T010; T011 independent. T012 after T004 / T007 / T009.
- **User Story 1 (Phase 3)**: depends on Foundational. No dependency on US2. **This is the MVP.**
- **User Story 2 (Phase 4)**: depends on Foundational **and** US1 (extends `usePlatformSettings`, `DeliveryFeeForm`, `SettingsPage`; needs the loaded fee on screen to change).
- **Polish (Phase 5)**: depends on every story phase being shipped.

### User Story Dependencies

- **US1 (P1)**: Foundational only.
- **US2 (P2)**: Foundational + US1.

### Within Each User Story

- Tests (the `⚠️ write first, must fail` tasks) before implementation.
- Hook (`usePlatformSettings`) state/method before the Page/Form wiring that calls it.
- `DeliveryFeeForm` can be built alongside the hook, then composed by `SettingsPage`.
- The manual quickstart task last in each story.

### Parallel Opportunities

- **Setup**: T001, T002, T003 all `[P]`.
- **Foundational**: T004, T005, T011 in parallel; then T006+T007, T008+T009, T010 all `[P]` with each other (different files). T012 after them.
- **US1 tests**: T013, T014, T015 in parallel.
- **US1 impl**: T017 `[P]` with T016; T018 after both; then T019; T020 last.
- **US2**: T021, T022 in parallel; T023 then T024 (serialized on the shared hook / page / form files); T025 last.
- **Polish**: T026, T027, T028 in parallel; T029 last.

---

## Parallel Example: Foundational pure helpers

```bash
# After T005 (types) lands, these are independent files:
Task: "Implement src/settings/feeValidation.ts (validateFeeInput + formatFee)"
Task: "Unit test tests/unit/feeValidation.test.ts (write first, must fail)"
Task: "Implement src/settings/mutationOutcome.ts (classifySettingsMutation)"
Task: "Unit test tests/unit/settingsMutationOutcome.test.ts (write first, must fail)"
Task: "Create src/settings/settingsApi.ts (getSettings + updateSettings)"
# In parallel with all of the above:
Task: "Widen HttpOptions.method in src/api/httpClient.ts to include 'PUT'"
Task: "Create src/settings/messages.ts with all Arabic RTL keys"
```

## Parallel Example: User Story 1 tests

```bash
Task: "Integration test tests/integration/settings-view.test.tsx"
Task: "Integration test tests/integration/settings-session.test.tsx"
Task: "Accessibility test tests/a11y/settings-a11y.test.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational (CRITICAL — blocks both stories).
3. Complete Phase 3: User Story 1 — view the current fee, all load states, the route repoint, the placeholder deletion.
4. **STOP and VALIDATE**: run `tests/integration/settings-view.test.tsx`, `settings-session.test.tsx`, `tests/a11y/settings-a11y.test.tsx`, and the quickstart US1 scenarios. This is a shippable read-only Settings screen replacing the mock.

### Incremental Delivery

1. Setup + Foundational → foundation ready.
2. US1 → test independently → demo (view the fee).
3. US2 → test independently → demo (change the fee).
4. Phase 5 polish → full a11y + RTL sign-off, regression, traceability.

### Parallel Team Strategy

1. Whole team completes Setup + Foundational.
2. Then: Developer A on US1 (`usePlatformSettings` load + `SettingsPage` + `DeliveryFeeForm` + route repoint); Developer B writes the US1 test files and the Foundational pure-helper tests. US2 must wait for US1's hook/page/form to exist, then A or B extends them (serialize on `usePlatformSettings.ts` / `SettingsPage.tsx` / `DeliveryFeeForm.tsx` per the Serialization Points list).

---

## Notes

- `[P]` = different files, no dependency on an incomplete task.
- `[Story]` label maps a task to its user story for traceability; Setup / Foundational / Polish carry none.
- Save submits `PUT /admin/settings` **directly** — no confirmation dialog, no "click again to confirm", no modal (Clarifications 2026-09-07 / research R8). `DialogShell` / `src/shared/` are not involved.
- A pre-submit-invalid Save (empty / non-numeric / negative / `> 2` decimals) sends **zero** requests; a confirmed Save sends **exactly one** `PUT`.
- The `PUT` body value is a JS number (`{ delivery_fee: 30 }`), never a string.
- Unsaved changes are discarded on unmount (FR-017) — no navigation blocker, no persistence. Do not lift `draft` into a context or `localStorage`.
- There is **no `404`** outcome — `/admin/settings` is a singleton.
- `fetchMock` keys for this feature carry **no** query string; assert method + path + body exactly. The Retry-after-failed-load and the unreadable-body resync use **ordered replies** on the `GET /admin/settings` key.
- Verify each `⚠️` test fails before implementing the code it covers.
- Commit after each task or logical group; stop at the US1 checkpoint to validate the MVP independently.
- The only shared-surface change is T004 (`HttpOptions.method` union). Do not edit `src/components/Sidebar.tsx` or any `src/cooks/**` / `src/drivers/**` / `src/cities/**` / `src/review/**` file.

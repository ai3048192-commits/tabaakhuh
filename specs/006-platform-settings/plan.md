# Implementation Plan: Platform Settings

**Branch**: `006-platform-settings` | **Date**: 2026-09-07 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/006-platform-settings/spec.md`

## Summary

Replace the placeholder `src/pages/Settings.tsx` mock with a real **Platform Settings** screen on the existing `/settings` route and its existing sidebar entry. The screen loads the platform's single setting — the delivery fee — from `GET /admin/settings` (`data = { delivery_fee: number }`), showing a loading state and, on a failed load, a screen error with Retry. A one-field form (Egyptian-pound amount, `dir="ltr"` numeric input) pre-fills with the saved fee. **Save is disabled** until the entered value parses to a number that differs from the saved fee and passes client validation: no negative, no non-numeric/empty, at most two decimal places, zero allowed, no upper bound. On Save the screen sends `PUT /admin/settings` body `{ delivery_fee: <number> }` **directly — no confirmation dialog** (Clarifications 2026-09-07); on `200` it adopts the returned value as the new saved fee, updates the displayed amount, and shows a success toast using the envelope `message` ("Delivery fee updated."). A `422` renders the response's field message under the input, leaves the saved fee untouched, and preserves the entered value. A `0`/`5xx` leaves everything unchanged with a retryable toast. Navigating away with a changed-but-unsaved value discards it silently (the screen is unmounted; no navigation-block prompt). A `401` on either call routes through the Phase 1 session-loss path.

Technical approach: same shape as Phases 2–5 — a feature folder under `src/settings/` with a data hook, an API wrapper, two pure helpers, an Arabic `messages.ts`, and a screen with a small form. It is **simpler** than Phase 5: one GET + one PUT, **no list**, **no modal/dialog** (so `DialogShell` is not involved), no per-row state, no directory-invalidation concern. Three concrete pieces of work: (1) extend the Phase 1 transport type — `HttpOptions.method` in `src/api/httpClient.ts` is currently `'GET' | 'POST'` and must also allow `'PUT'` (a one-token union widening; `apiRequest` already forwards `method` to `fetch` and `fetchMock` already records any method, so this is the only code change to the shared transport — and a no-op merge if Phase 5 lands first and already widened it); (2) delete the `src/pages/Settings.tsx` placeholder and repoint the `/settings` route in `src/App.tsx` to the new `SettingsPage` (the sidebar entry "إعدادات النظام" → `/settings` **already exists** — unlike Phases 2–5 no `Sidebar.tsx` change is needed); (3) build the screen. Reuse the Phase 1 transport seam (`authedRequest` + `setTokenProvider`) so feature code never handles the bearer token and `401`s route through the existing `unauthorizedHandler`. Reuse the Phase 3 inline toast + `aria-live` pattern verbatim. No new runtime dependencies; tests use the existing Vitest + Testing Library + `vitest-axe` + `fetchMock` harness.

## Technical Context

**Language/Version**: TypeScript `~6.0.2` (`typescript` in package.json), compiled by Vite 8; `target` ES2023, `jsx: react-jsx`, `verbatimModuleSyntax: true`. `@types/react` 19.x against a React 18.x runtime — pre-existing, not touched.

**Primary Dependencies**: React 18, react-dom 18, react-router-dom 7 (routing already in place), Tailwind CSS 4, lucide-react (icons — the sidebar already uses `Settings`; the screen uses `RefreshCw` for Retry and optionally `Wallet`/`Save` for the form). No HTTP client, state library, data-fetching library, or form library — native `fetch` (via the Phase 1 `authedRequest`) + React hooks are sufficient for one GET and one PUT of a single field.

**Storage**: None new. The bearer token continues to live in `localStorage` under the Phase 1 keys and is read only through the `setTokenProvider` seam. The saved fee, the draft input string, the field error, and the saving flag are in-memory only and are dropped when the administrator leaves the `/settings` route — which is exactly how "unsaved changes discarded on navigation" (FR-017) is satisfied, with no `beforeunload` / router blocker.

**Testing**: Vitest + @testing-library/react + @testing-library/user-event + jsdom for unit/integration; `vitest-axe` for the WCAG checks (SC-008). Reuses `tests/helpers/fetchMock.ts`, `tests/helpers/harness.tsx`, `tests/helpers/fixtures.ts`, `tests/setup.ts`. `fetch` is mocked per test with envelope fixtures mirroring `admin-dashboard-api.md` Phase 6, including the `422` `errors` map keyed `delivery_fee` and ordered replies on `GET /admin/settings` for the retry-after-failed-load path.

**Target Platform**: Modern desktop browsers (Chromium, Firefox, Safari current). Static SPA, RTL Arabic UI (`dir="rtl"` already on `AdminLayout`); the numeric input cell is `dir="ltr"`.

**Project Type**: Web — single existing frontend project in `src/`. No backend work.

**Performance Goals**:
- SC-001: the current fee is visible within 5 s of the response arriving — met trivially by rendering one number (no list, no per-row async work).
- SC-003: the Save enabled/disabled state tracks the field on every keystroke — a pure `validateFeeInput` call + a numeric equality check per render; sub-millisecond.

**Constraints**:
- FR-001/FR-002: a Settings area reachable only within an administrator session that displays the current delivery fee as an Egyptian-pound amount, using the value from the platform.
- FR-003/FR-004/FR-005: a loading state while `GET /admin/settings` is in flight (Save unavailable); on a failed load, a retryable "something went wrong" screen state with **no** editable value shown as current; a Retry control that re-issues the GET and, on success, shows the fee and enables the form.
- FR-006/FR-007: one delivery-fee field pre-filled with the current fee; Save disabled while the entered value equals the saved fee, enabled only when it differs **and** is valid.
- FR-008/FR-009: a negative value is rejected in the screen with a field-level message and **no** request; an empty or non-numeric value is rejected the same way ("a valid amount is required").
- FR-010: a value with more than two decimal places is rejected on Save with a field-level message ("use at most two decimal places") — **no silent rounding**, no request sent (Clarifications 2026-09-07).
- FR-011: zero is a valid fee.
- FR-012: on a valid, changed submission the screen sends `PUT /admin/settings` **directly** (no confirmation dialog / no "click again to confirm"); on success it updates the displayed fee to the saved value and shows a success toast from the envelope `message`.
- FR-013: while a save is in flight, Save is disabled and shows a "saving" state (`aria-busy`); exactly one `PUT` per confirmed save.
- FR-014: a `422` shows the response's field message against the delivery-fee field, leaves the displayed current fee unchanged, and preserves the entered value.
- FR-015: a `0`/`5xx` leaves the displayed fee unchanged, records nothing locally, and shows a retryable "please try again" toast with the entered value preserved.
- FR-016: resetting the field back to the saved fee disables Save again and clears any field-level error.
- FR-017: an unsaved edit is never applied; navigating away from `/settings` with a changed-but-unsaved value discards it silently (no prompt) — satisfied by component unmount; re-opening shows the saved fee.
- FR-018/FR-019/FR-020: a `200` whose body is unreadable is still treated as applied (toast + treat as saved; re-issue `GET /admin/settings` to resync); never show success unless the envelope `success` is `true`; surface the field-level `errors` message, falling back to the envelope `message` when absent.
- FR-021: every request goes through `authedRequest`; a `401` triggers the Phase 1 `unauthorizedHandler` → session ends → redirect to `/login`.
- FR-022: `/settings` renders only inside `<RequireAdmin>`; a signed-in non-admin never reaches it.
- FR-023/FR-024: the standard envelope drives success/error toasts; unexpected server errors show a generic retryable message and leave the displayed fee consistent (no half-applied change).
- FR-025: reuse the shared layout, sidebar, `authedRequest`, `<RequireAdmin>`, and the toast pattern from earlier phases; the sidebar entry already exists (repointed screen, same route).
- FR-026: Arabic-first RTL layout for the field, its label, the Save action, the success confirmation, and all error/loading states; the amount and currency ("ج.م") follow the dashboard's number conventions (Western digits, as the existing inputs use).
- FR-027: WCAG 2.1 AA — the field has a programmatic label and its unit is announced; full keyboard operation with a visible focus ring; field validation errors are `aria-describedby`/`aria-invalid`-associated and announced; success and error messages are announced via an `aria-live` region.
- Backend base URL stays `import.meta.env.VITE_API_BASE_URL`; no new env vars.

**Scale/Scope**: ~6 new source files under `src/settings/`; one shared-transport type widening in `src/api/httpClient.ts` (`method` union); delete `src/pages/Settings.tsx`; 1 route repoint in `src/App.tsx` (no `Sidebar.tsx` change); `tests/helpers/fixtures.ts` + `tests/helpers/harness.tsx` extended; ~6 new test files. 27 functional requirements, 9 success criteria, 2 user stories (P1 view, P2 update). No change to `src/api/` beyond the `method` type, and none to `src/auth/`, `src/cities/`, `src/cooks/`, `src/drivers/`, `src/review/`.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` is an unratified template — every principle and section is still a `[PLACEHOLDER]`. There are **no project-specific constitutional gates to enforce**. The plan holds itself to the general principles the template gestures at, consistent with Phases 1–5:

| Principle (template intent) | How this plan complies |
|---|---|
| Test-First | The Vitest harness already exists. Each user story's acceptance scenarios become integration tests written alongside the implementation; the pure helpers (`validateFeeInput`, `classifySettingsMutation`) get unit tests first. |
| Simplicity / YAGNI | Zero new runtime dependencies. Reuses the Phase 1 `authedRequest` / `ApiError` / `unauthorizedHandler`. No form library, no data-fetching library, no global store, no modal/dialog (Clarifications 2026-09-07 removed the confirm step), no router navigation blocker (unmount discards the draft — FR-017). One feature hook + local component state. The single shared-surface change is a one-token widening of an existing method union. |
| Integration testing on contract boundaries | `src/settings/settingsApi.ts` gets integration tests against mocked `fetch` mirroring `admin-dashboard-api.md` Phase 6 — the `200` / `422`(+`errors`) / `0` / `5xx` branches and the request shapes (`GET /admin/settings` no body, `PUT /admin/settings` body `{ delivery_fee: <number> }`) covered explicitly. Existing transport tests (`tests/unit/authedRequest.test.ts`, `tests/unit/envelope.test.ts`) must stay green after the `method` type widening. |
| Observability | Non-2xx envelope failures are logged via the existing `logger` seam inside `apiRequest` (status + path only; the fee value is not logged). |
| Versioning | N/A — no published library surface; app version stays `0.0.0`. |

**Result**: PASS (no violations; Complexity Tracking table left empty).

*Post-Phase 1 re-check*: PASS — the design adds zero runtime dependencies and no extra projects. The only shared-surface change is widening `HttpOptions.method` to include `'PUT'` in `src/api/httpClient.ts` (additive; existing callers pass `'GET'`/`'POST'` unchanged). The `src/pages/Settings.tsx` deletion removes dead placeholder code, not a real feature. See [research.md](./research.md) decisions R1–R10.

## Project Structure

### Documentation (this feature)

```text
specs/006-platform-settings/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── settings-api.md        # External: GET /admin/settings, PUT /admin/settings
│   └── settings-ui.md         # Internal: settingsApi / usePlatformSettings, component props, messages
├── checklists/
│   └── requirements.md  # Pre-existing spec-quality checklist
└── tasks.md             # Created later by /speckit-tasks
```

### Source Code (repository root)

```text
src/
├── api/
│   ├── httpClient.ts          # EDIT (one line): HttpOptions.method union 'GET' | 'POST' → 'GET' | 'POST' | 'PUT'
│   │                          #   (no-op merge if Phase 5 already widened it to include 'PUT' | 'PATCH')
│   ├── envelope.ts            # UNCHANGED — ApiEnvelope / ApiError / parseEnvelope reused as-is
│   └── logger.ts              # UNCHANGED
├── auth/                      # UNCHANGED — session, RequireAdmin, unauthorized handler reused as-is
├── settings/                  # NEW feature folder
│   ├── settingsApi.ts         # NEW: getSettings(signal?) → GET /admin/settings → PlatformSettings
│   │                          #      updateSettings(delivery_fee) → PUT /admin/settings → PlatformSettings
│   ├── types.ts               # NEW: PlatformSettings, FeeValidation, SettingsMutationOutcome,
│   │                          #      SettingsStatus
│   ├── feeValidation.ts       # NEW pure: validateFeeInput(raw) → { value: number | null; error: FeeError }
│   │                          #      (required | not_a_number | negative | too_many_decimals | null)
│   ├── mutationOutcome.ts     # NEW pure: classifySettingsMutation(err | null) → SettingsMutationOutcome
│   ├── usePlatformSettings.ts # NEW hook: owns savedFee + draft + fieldError + status + saving;
│   │                          #      load / reload / setDraft / save; derives dirty + canSave
│   ├── messages.ts            # NEW: Arabic strings (page title, label, unit, hints, errors, toasts, states)
│   └── SettingsPage.tsx       # NEW: /settings screen — header, loading / error+Retry, DeliveryFeeForm,
│   │                          #      toast live-region; maps SettingsMutationOutcome → toast text
│   └── DeliveryFeeForm.tsx    # NEW: labelled numeric field (dir="ltr", inputMode="decimal"), unit suffix,
│                              #      live validation message, Save button (disabled unless canSave; aria-busy)
├── pages/
│   └── Settings.tsx           # DELETE — placeholder mock (fake city chips / uploads); replaced by src/settings/SettingsPage
├── cooks/ , drivers/ , cities/ , review/   # UNCHANGED
└── App.tsx                    # EDIT: import SettingsPage from './settings/SettingsPage'; the /settings
                               #   <Route> element changes from <Settings/> to <SettingsPage/>; drop the old import

src/components/
└── Sidebar.tsx               # UNCHANGED — "إعدادات النظام" → /settings entry already exists (Settings icon)

tests/
├── helpers/
│   ├── fixtures.ts           # EDIT: add settings(fee?) → PlatformSettings, settingsResponse(fee) → ok({delivery_fee}),
│   │                         #   updatedSettings(fee) → ok({delivery_fee}, 'Delivery fee updated.');
│   │                         #   reuse ok()/fail() (e.g. fail('The given data was invalid.',
│   │                         #   { delivery_fee: ['يجب أن تكون القيمة صفراً أو أكثر.'] }))
│   └── harness.tsx           # EDIT: add renderAtSettings(fm, { seedMe?, admin? }) alongside renderAtDrivers()
├── unit/
│   ├── feeValidation.test.ts          # validateFeeInput: empty → required, "abc"/"1.2.3" → not_a_number,
│   │                                  #   "-5" → negative, "10.005" → too_many_decimals, "0" ok, "10" ok,
│   │                                  #   "10.5" ok, "10.50" ok, "  10.5  " trimmed ok, "1e3" → not_a_number
│   ├── settingsMutationOutcome.test.ts # classifySettingsMutation: null → ok; 422+errors.delivery_fee → validation
│   │                                  #   (field msg); 422 bare → validation (form msg); 0 → transient;
│   │                                  #   500 → transient; unexpected 4xx → transient; non-ApiError → transient
│   ├── authedRequest.test.ts          # PRE-EXISTING — must stay green after the method-type widening
│   └── envelope.test.ts               # PRE-EXISTING — must stay green
├── integration/
│   ├── settings-view.test.tsx         # US1 AC1–4: fee shown as EGP amount from data; loading state (Save
│   │                                  #   absent); failed load → screen error + Retry (no editable value);
│   │                                  #   Retry → ordered 2nd GET reply → fee shown + form enabled
│   │                                  #   (FR-001–005, FR-022, SC-001/007)
│   ├── settings-update.test.tsx       # US2 AC1–9: Save disabled when unchanged; enabled on valid change;
│   │                                  #   negative / empty / non-numeric / >2dp blocked pre-submit with field
│   │                                  #   msg + NO request; happy path → one PUT { delivery_fee:<number> } →
│   │                                  #   displayed fee updates + success toast (envelope message); 422 →
│   │                                  #   field msg under input, saved fee unchanged, value preserved; in-flight
│   │                                  #   disables Save (one PUT); 0/5xx → unchanged + retry toast + value kept;
│   │                                  #   revert-to-saved re-disables Save + clears error
│   │                                  #   (FR-006–016, FR-018–020, FR-023/024, SC-002/003/004/005/006)
│   └── settings-session.test.tsx      # FR-021/FR-022: 401 on GET or PUT → Phase 1 session-loss → /login;
│                                      #   non-admin never reaches /settings
└── a11y/
    └── settings-a11y.test.tsx         # axe on: loading, error+Retry, the form (pristine), the form with a
                                       #   field error, the saving state. Keyboard-only: focus the field, type a
                                       #   value, Tab to Save, activate Save. Label + unit announced; error
                                       #   aria-describedby/aria-invalid; toast in an aria-live region.
                                       #   RTL smoke (SC-009). (FR-026/027, SC-008)
```

**Structure Decision**: Keep the existing single Vite SPA. New feature code lands in a new `src/settings/` folder mirroring the `src/cities/` / `src/drivers/` layout (api wrapper + pure helpers + hook + messages + screen + one form component). The `/settings` route and its sidebar entry already exist from the initial scaffold pointing at a placeholder `src/pages/Settings.tsx`; this feature deletes that placeholder and repoints the route at `src/settings/SettingsPage`, so **no `Sidebar.tsx` edit is required** (contrast Phases 2–5). The Phase 1 `src/api/` transport is reused; its `HttpOptions.method` union gains `'PUT'` (the smallest possible change — `apiRequest` already passes `method` straight to `fetch`, and `tests/helpers/fetchMock.ts` already records an arbitrary method string). No modal shell is used — the Clarifications removed the confirmation step, so the screen is a plain form. Tests extend the existing `tests/` tree, mirroring the two user stories.

## Complexity Tracking

*No constitutional violations — table intentionally empty.*

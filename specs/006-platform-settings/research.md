# Phase 0 Research: Platform Settings

Feature: `006-platform-settings` · Date: 2026-09-07

All Technical Context unknowns are resolved below. No open `NEEDS CLARIFICATION` remain — `/speckit-clarify` closed the three real ambiguities (no confirmation dialog on Save; over-precise decimal input is rejected on Save, not rounded; unsaved changes are discarded silently on navigation) and the spec's Assumptions section fixed the rest (settings is a single platform-wide record read+replaced, only `delivery_fee` in scope, no upper bound, adopt the PUT response value as the new "current"). This document records the design decisions that follow.

---

## R1. Authenticated request seam (FR-021, both endpoints)

**Decision**: Reuse the Phase 1 seam in `src/api/httpClient.ts`:

- `authedRequest<T>(path, opts)` reads the ambient token; if `null`, throws `ApiError(0, "No active session")` without a network call; otherwise delegates to `apiRequest<T>` with `Authorization: Bearer <token>`.
- `AuthProvider` already calls `setTokenProvider(readToken)` and `setUnauthorizedHandler(...)` on mount. Both Phase 6 API functions call `authedRequest`, never `apiRequest` directly.

**Rationale**: Feature code never sees or stores the bearer token. `401` handling is centralised — `apiRequest` calls `unauthorizedHandler` on a token-bearing `401`, which `AuthContext` wires to `clearSession()` + `SESSION_LOST` → `<RequireAdmin>` redirects to `/login`. Phase 6 gets FR-021 for free with no per-call code, exactly as Phases 2–5.

**Alternatives considered**:
- *Expose `token` from `useAuth()`* — rejected: forces every call site to thread the token and widens the misuse surface.
- *A settings-specific transport* — rejected: the existing wrapper already does envelope parsing, `ApiError` normalisation, and `401` routing.

---

## R2. Widening `HttpOptions.method` for `PUT` (transport, cross-feature)

**Context**: `src/api/httpClient.ts` today types `HttpOptions.method` as `'GET' | 'POST'`. Phase 6 needs `PUT /admin/settings`. `apiRequest` passes `method` straight to `fetch` (no switch), and `tests/helpers/fetchMock.ts` reads `(init.method ?? 'GET').toUpperCase()` — neither has a hard-coded allow-list.

**Decision**: Widen the union to `'GET' | 'POST' | 'PUT'` — a single-token change. Do **not** add `'PATCH'` in this feature (Phase 6 has no PATCH); if Phase 5 (Cities) lands first it will have widened the same union to include `'PUT' | 'PATCH'`, in which case this change is already present and Phase 6 makes no transport edit at all. The merge is trivial either way (both are additive widenings of the same literal union).

**Rationale**: Smallest possible change to a shared file; no behavioural change; existing `'GET'`/`'POST'` callers and the transport unit tests are unaffected.

**Alternatives considered**:
- *Cast `method` at the call site* (`method: 'PUT' as 'POST'`) — rejected: a lie in the types that hides the real contract and would confuse the next reader.
- *A dedicated `putJson` helper* — rejected: `apiRequest` already handles method + body + envelope; a second helper is redundant.
- *Broaden to `string`* — rejected: loses the compile-time guard that catches a typo'd verb.

---

## R3. Route, sidebar, and replacing the placeholder (FR-022, FR-025)

**Context**: `src/App.tsx` `AdminLayout` already has `<Route path="/settings" element={<Settings />} />` where `Settings` is `src/pages/Settings.tsx` — a static mock (hard-coded city chips, fake logo uploads, decorative cards) with no API calls. `src/components/Sidebar.tsx` already has `{ name: 'إعدادات النظام', icon: Settings, path: '/settings' }`. The whole admin shell is wrapped in `<RequireAdmin>` on `/*`.

**Decision**:
- Add `src/settings/SettingsPage.tsx` and change the `/settings` route element from `<Settings />` to `<SettingsPage />`; update the import in `src/App.tsx`.
- **Delete** `src/pages/Settings.tsx` — it is dead placeholder code once the route is repointed, and keeping it invites confusion with the real feature. (Its "cities" mock is superseded by Phase 5; its store-profile / financial / notification mocks are not in scope for any current Phase and are not preserved.)
- **No `Sidebar.tsx` change** — the entry already exists and already points at `/settings`. Optionally align its label to "الإعدادات" to match the spec's wording, but "إعدادات النظام" is acceptable and left as-is to minimise churn (recorded in the spec Assumptions / here as a no-op).
- **No new guard** — `<RequireAdmin>` already gates the shell, so a signed-in non-admin never reaches `/settings` (FR-022).

**Rationale**: The route, layout, guard, header, and sidebar all exist from the scaffold; this feature swaps one route element and removes a mock. Reusing the existing `/settings` path keeps the sidebar stable and matches the user's request ("the Settings sidebar entry opens this screen").

**Alternatives considered**:
- *Keep `src/pages/Settings.tsx` and add a second `/platform-settings` route* — rejected: two "settings" destinations, one of them fake.
- *Leave the placeholder file in the tree "for reference"* — rejected: an unreferenced mock rots; git history preserves it.
- *Rename the sidebar label now* — deferred: cosmetic, not required by any FR; can be a one-line follow-up.

---

## R4. Draft input model — raw string + pure validator (FR-006..FR-011, FR-016)

**Decision**: `usePlatformSettings()` keeps the field as a **raw string** `draft`, not a number, plus `savedFee: number | null`. A pure `validateFeeInput(raw)` (`src/settings/feeValidation.ts`) returns `{ value: number | null; error: FeeError }` where `FeeError` is `'required' | 'not_a_number' | 'negative' | 'too_many_decimals' | null`:

| Input (after `.trim()`) | Result |
|---|---|
| `''` | `{ value: null, error: 'required' }` |
| not matching `/^\d+(\.\d+)?$/` (covers `abc`, `1.2.3`, `1e3`, `-` alone, `.5` → decide: reject; `1.` → reject) | `{ value: null, error: 'not_a_number' }` |
| matches, but a leading `-` was present / parses `< 0` | `{ value: <n>, error: 'negative' }` |
| matches, but `> 2` digits after the `.` | `{ value: <n>, error: 'too_many_decimals' }` |
| otherwise | `{ value: Number(raw), error: null }` — includes `'0'`, `'0.00'`, arbitrarily large integers (no max) |

`dirty = v.value !== null && v.error === null && v.value !== savedFee`. `canSave = dirty && !saving`. Reverting `draft` to a string that parses to `savedFee` makes `dirty` false → Save disabled and the field error clears (FR-016). Formatting-only differences (`"25"` vs `"25.0"` vs `" 25 "`) all parse to the same number, so they are **not** dirty (spec Edge Case).

**Rationale**: Numeric currency input is easiest to reason about as "what the user literally typed" + "what that means". A pure validator gives one place for all four rules, is unit-testable in isolation (SC-004), and matches the `validateNames` pattern Phase 5 uses. Comparing parsed numbers (not strings) for `dirty` is what makes the "no-op formatting change" edge case fall out for free.

**Alternatives considered**:
- *Store a `number | null` and use `<input type="number">` valueAsNumber* — rejected: `type="number"` swallows the exact keystrokes, makes ">2 decimal places" and "non-numeric" hard to detect deterministically across browsers, and localises the decimal separator unpredictably. Use `type="text"` + `inputMode="decimal"` and validate ourselves.
- *A form library* — rejected: one field, four rules; `useState` + one pure function is smaller and dependency-free.
- *Round `10.005` to `10.01` silently* — rejected by Clarifications 2026-09-07 (reject on Save instead).
- *Enforce an upper bound* — rejected: no FR and no backend rule beyond `min:0`; if the server rejects a huge value its `422` message is shown (FR-014).

---

## R5. Display / formatting of the fee (FR-002, FR-026)

**Decision**: Display the saved fee as `formatFee(savedFee)` — the number with up to two decimals and a trailing unit, e.g. `25.00 ج.م` (Egyptian pound abbreviation), using **Western Arabic digits** (`0-9`) to match every existing numeric input in the dashboard (`src/pages/Settings.tsx`, the financial screens). The pre-filled `draft` on load is the plain number string (`String(savedFee)` or `savedFee.toFixed(2)` — pick `toFixed(2)` for a stable, currency-shaped initial value; both parse equal so `dirty` starts false). No thousands separators in the editable field; the read-only display line may use `toLocaleString('en')` grouping. The whole screen is `dir="rtl"`; the numeric input and the display amount sit in `dir="ltr"` spans so the number and unit read naturally.

**Rationale**: The spec defers to "the dashboard's existing number and currency conventions" — which, in the current code, means bare Western digits with an Arabic label. Keeping the editable field free of grouping/locale formatting avoids a parse/format round-trip fighting the user's keystrokes.

**Alternatives considered**:
- *`Intl.NumberFormat('ar-EG', { style: 'currency', currency: 'EGP' })`* — produces Arabic-Indic digits and `ج.م.‏` with bidi marks; inconsistent with the rest of the app and awkward inside an editable field. Rejected for now; could be revisited as an app-wide currency-format decision.
- *No unit suffix* — rejected: FR-002/FR-026 call for an Egyptian-pound amount, and the bare number is ambiguous.

---

## R6. Load, retry, and screen status (FR-003..FR-005, FR-018)

**Decision**: `usePlatformSettings().status: 'loading' | 'ready' | 'error'`:

- `load()` calls `getSettings()` → on success sets `savedFee`, `draft = savedFee.toFixed(2)`, `status = 'ready'`; on failure sets `status = 'error'` (there is never a "list already shown" case — a single value — so a failed load is always the screen error state, unlike Phase 5's refresh nuance).
- `status === 'loading'` → a loading indicator; the form (and Save) are not rendered (FR-003).
- `status === 'error'` → a retryable "something went wrong, please try again" panel with a **Retry** button; **no** editable value is shown (FR-004). Retry calls `load()` again; tests drive this with an ordered second reply on `GET /admin/settings`.
- After a successful save whose `200` body is unreadable (FR-018), the hook treats the attempted value as saved (`savedFee = attemptedValue`), shows the success toast, and additionally re-issues `getSettings()` in the background to resync; if that resync fails it is swallowed (the optimistic value stands until the next visit).

**Rationale**: One value, one endpoint — the state machine is smaller than Phase 5's. The only subtlety is FR-018's "success but body unreadable": adopt the value we sent (we know it) and reconcile opportunistically.

**Alternatives considered**:
- *Show the last-known fee behind the error panel* — rejected by FR-004 ("MUST NOT present any editable value as the current fee" on a failed load). On the very first load there is no last-known value anyway.
- *Auto-retry on load failure* — rejected: the administrator decides when to retry; an automatic loop can hammer a downed backend.

---

## R7. Save flow and mutation-outcome classification (FR-012..FR-015, FR-018..FR-020, FR-023/024)

**Decision**: `usePlatformSettings().save()`:

1. Run `validateFeeInput(draft)`. If `error !== null`, set `fieldError` to the mapped message and **return** `{ ok: false, reason: 'validation', message }` **without a request** (FR-008/FR-009/FR-010).
2. `saving = true` (FR-013). Call `updateSettings(value)` → `PUT /admin/settings` body `{ delivery_fee: value }`.
3. Classify with `classifySettingsMutation(err | null)` (`src/settings/mutationOutcome.ts`, pure) into `SettingsMutationOutcome`:
   - **`200` success** (body may be unreadable) → `{ ok: true, message }`. Hook: `savedFee = value`; `draft = value.toFixed(2)`; clear `fieldError`; opportunistic `getSettings()` resync (R6). Page: success toast (envelope `message`, fallback `messages.updatedToast`).
   - **`ApiError.status === 422` with `fieldErrors.delivery_fee` non-empty** → `{ ok: false, reason: 'validation', message: fieldErrors.delivery_fee[0] }`. Hook: set `fieldError`; `savedFee` untouched; `draft` untouched (value preserved). Page: **no** toast (the message is under the field) (FR-014/FR-020).
   - **`ApiError.status === 422` with no usable map** → `{ ok: false, reason: 'validation', message: err.message }` shown under the field as a fallback (FR-020).
   - **`ApiError.status === 0` or `>= 500`** → `{ ok: false, reason: 'transient' }`. Hook: nothing changes; `draft`/`savedFee` untouched. Page: retryable toast (`messages.saveRetryToast`) (FR-015/FR-024).
   - **any other unexpected status / non-`ApiError`** → `transient`.
   - **`401`** → never reaches here; handled by the shared `unauthorizedHandler`.
4. `saving = false`.

There is **no `404`** branch — `/admin/settings` is a singleton, it cannot "not exist".

**Rationale**: Mirrors Phase 5's `classifyMutation` minus the `not_found` case. `422` = "fix it here" → message under the field, value kept; `0`/`5xx` = transient → touch nothing, retryable toast. The pre-request client validation and the server `422` share the same `fieldError` surface so the field only ever shows one message.

**Alternatives considered**:
- *Optimistically update the displayed fee before the `200`* — rejected: a `422`/`5xx` would need a rollback; the save is a single fast call, so certainty-first (update only on success) is simpler and matches Phase 4/5.
- *Toast the `422` message instead of showing it under the field* — rejected by FR-014/FR-020 (field-level surface) and the spec UI requirement ("show the error under the field").

---

## R8. No confirmation dialog, no navigation blocker (Clarifications 2026-09-07, FR-012, FR-017)

**Decision**: Save submits directly on click — no modal, no "click again to confirm" intermediate state. `DialogShell` / `src/shared/` are **not** involved in this feature. Navigating away from `/settings` with a dirty `draft` simply unmounts `SettingsPage`; its state (`draft`, `fieldError`, …) is dropped and the next mount re-loads `savedFee` from the server (FR-017). No `useBlocker` / `beforeunload` handler is added.

**Rationale**: Clarifications 2026-09-07 Q1 chose "no confirmation dialog" (the fee is a single easily-reversible number and Save is already disabled-until-changed); Q3 chose "silently discard on navigation". Both make the screen a plain form. Unmount-drops-state is the natural React behaviour, so FR-017 needs *no* code — the risk to avoid is *accidentally* persisting the draft (e.g. lifting it into a context or `localStorage`), which the design deliberately does not do.

**Alternatives considered** (all rejected by Clarifications): a confirm dialog showing old → new; an inline two-step Save; a "you have unsaved changes" navigation prompt.

---

## R9. Toasts and the live region (FR-019, FR-023, FR-026, FR-027)

**Decision**: Replicate the Phase 3 `DriverApplicationsPage` toast pattern inline in `SettingsPage`: a visually-hidden `role="status"` `aria-live="polite"` region always in the DOM, plus a transient styled bubble cleared after ~6 s. The **success** outcome uses the envelope `message` ("Delivery fee updated."), falling back to `messages.updatedToast`. The **transient** outcome uses `messages.saveRetryToast`. The **validation** outcome does **not** toast — its message renders under the field (`aria-describedby` on the input, `aria-invalid="true"`, and the error node is in a polite live region so a screen reader announces it on change).

**Rationale**: Matches Phases 2–5 exactly, so announcements behave identically and axe stays clean. Field errors live next to the input the administrator must fix.

**Alternatives considered**:
- *Extract a shared `useToast` into `src/shared/`* — deferred (same call as Phase 5): the ~15-line pattern is duplicated once more; consolidation across Phases 2–6 is a later cross-feature cleanup.
- *A toast library* — rejected: one dependency for one bubble.

---

## R10. Testing & accessibility tooling (SC-008, all ACs)

**Decision**: Reuse the Phase 1–5 harness unchanged — `tests/helpers/fetchMock.ts` (`installFetchMock().reply("GET /admin/settings", …)` with ordered replies for the retry-after-failed-load and the post-save resync; `.reply("PUT /admin/settings", …)`), `tests/helpers/harness.tsx`, `tests/setup.ts`. Extend `tests/helpers/fixtures.ts` with `settings(fee = 25)`, `settingsResponse(fee)` → `ok({ delivery_fee: fee })`, `updatedSettings(fee)` → `ok({ delivery_fee: fee }, 'Delivery fee updated.')`, and reuse `fail('The given data was invalid.', { delivery_fee: ['يجب أن تكون القيمة صفراً أو أكثر.'] })` for the `422`. Add `renderAtSettings(fm, { seedMe?, admin? })` to `harness.tsx` mirroring `renderAtDrivers` (seed token + profile, optional `GET /auth/me`, render the real `SettingsPage` at `/settings` inside `<RequireAdmin>` in a `MemoryRouter`). New specs per the Project Structure tree. `vitest-axe` runs on each visual state: loading, error+Retry, the pristine form, the form with a field error, and the saving state. Keyboard-only flows (`user-event`) cover focusing the field, typing a value, tabbing to Save, and activating it. The pre-existing `tests/unit/authedRequest.test.ts` and `tests/unit/envelope.test.ts` are run to confirm the `method`-type widening did not regress the transport.

> `fetchMock` keys are `"<METHOD> <path>"`; Phase 6 paths carry **no query string** (`GET /admin/settings`, `PUT /admin/settings`), so tests assert method + path + body exactly: `PUT` body is `{ delivery_fee: <number> }` (a JS number, e.g. `30`, not `"30"`). `jsdom` cannot evaluate colour contrast or true focus visibility or real RTL glyph layout — those parts of SC-008/SC-009 stay in the manual checklist in `quickstart.md`.

**Rationale**: The tooling and fetch-mock already exist and mirror the same envelope. Automated axe gives measurable AA coverage; residual manual checks (contrast, true focus visibility, RTL rendering for SC-009) are the same short list Phases 1–5 used and are scripted in `quickstart.md`.

**Alternatives considered**:
- *MSW* — rejected: the per-test `fetchMock` already handles ordered replies.
- *Playwright e2e* — deferred: integration tests with mocked `fetch` cover every acceptance scenario.

---

## Resolved Technical Context summary

| Field | Value |
|---|---|
| Auth to API | Reuse `authedRequest` + `setTokenProvider` (already wired in `AuthProvider`); `401` → existing `unauthorizedHandler` → `/login` |
| Transport change | `src/api/httpClient.ts`: `HttpOptions.method` `'GET' \| 'POST'` → `'GET' \| 'POST' \| 'PUT'` (no-op merge if Phase 5 already widened it) |
| Route / sidebar | `src/App.tsx` `/settings` element → `<SettingsPage/>`; delete `src/pages/Settings.tsx`; **no `Sidebar.tsx` change** (entry already exists) |
| Load | `usePlatformSettings()` — `GET /admin/settings` on mount; `status: loading \| ready \| error`; failed load → screen error + Retry, no value shown |
| Input model | raw string `draft` + `savedFee: number \| null`; pure `validateFeeInput(raw)` → `{ value, error }` (`required \| not_a_number \| negative \| too_many_decimals \| null`); `dirty` compares parsed numbers |
| Rules | reject negative, empty, non-numeric, `>2` decimal places — all pre-submit, no request; `0` allowed; **no** upper bound |
| Display | `formatFee(fee)` → `NN.NN ج.م`, Western digits; editable field is `type="text"` `inputMode="decimal"`, `dir="ltr"`, no grouping |
| Save | direct on click (no dialog); `PUT /admin/settings { delivery_fee: <number> }`; disabled unless `dirty && valid && !saving`; `aria-busy` while saving; exactly one PUT |
| Mutation outcomes | 200 → adopt sent value + success toast (envelope msg) + opportunistic GET resync; 422+errors.delivery_fee → field msg, saved fee & value kept, no toast; 422 bare → field msg fallback; 0/5xx → no change + retryable toast; **no 404** (singleton) |
| Unsaved changes | discarded on unmount; no navigation blocker, no persistence (FR-017) |
| a11y / RTL | `dir="rtl"` screen, `dir="ltr"` number spans; field `<label htmlFor>` + unit announced; error `aria-describedby`/`aria-invalid` in a polite live region; toast in `role="status"` `aria-live="polite"` |
| Testing | Phase 1–5 Vitest + Testing Library + `vitest-axe` + `fetchMock`; extend `fixtures.ts` + `harness.tsx`; 2 unit + 3 integration + 1 a11y spec; re-run `authedRequest.test.ts` + `envelope.test.ts` |
| Config | no new env; `VITE_API_BASE_URL` reused |

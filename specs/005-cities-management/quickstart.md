# Quickstart & Validation: Cities Management

Feature: `005-cities-management` · Date: 2026-09-07

How to run the dashboard against the cities backend and verify every acceptance scenario from [spec.md](./spec.md). Design details live in [plan.md](./plan.md), [research.md](./research.md), [data-model.md](./data-model.md), and [contracts/](./contracts/).

---

## Prerequisites

- Node ≥ 20; `npm install` completed.
- Phase 1 (`001-admin-auth-session`) implemented and working — this feature reuses its session, transport (`authedRequest` / `setTokenProvider`), and route guard.
- A reachable backend implementing `admin-dashboard-api.md` **Phase 5**: `GET /admin/cities`, `POST /admin/cities`, `PUT /admin/cities/{id}`, `PATCH /admin/cities/{id}/status`.
- Seed data: at least **6** cities — a mix of active and inactive, at least one pair sharing a common substring in both `name_ar` and `name_en` (to exercise search), and, for SC-013, a dataset that can be grown to **≥ 30** cities.
- An `admin` test account (from Phase 1).

## Setup

```bash
cp .env.example .env
# VITE_API_BASE_URL=https://<your-host>/api/v1   (same var as Phase 1)
npm install
npm run dev            # http://localhost:5173  → sign in, open /cities (sidebar: "إدارة المدن")
```

## Automated checks

```bash
npm run test           # Vitest watch (unit + integration + a11y)
npm run test:run       # single pass, for CI
npm run build          # tsc + vite build must pass
```

| Suite | File | Covers |
|---|---|---|
| Search filter | `tests/unit/citySearch.test.ts` | `filterCities` — `name_ar` / `name_en` match, trim, case, empty term, no match (FR-042/043) |
| Name validation | `tests/unit/cityValidation.test.ts` | `validateNames` — add both-required, edit ≥1-required, whitespace, 255 boundary (FR-009/010/018/019) |
| Mutation outcome | `tests/unit/cityMutationOutcome.test.ts` | `classifyMutation` — 201/200 ok, 422+errors → field, 422 bare → form, 404 → not_found, 0/5xx → transient (data-model §5) |
| City directory (regression) | `tests/unit/cityDirectory.test.ts` | **pre-existing** — must stay green after `citiesApi.ts` is extended |
| List / search | `tests/integration/cities-list.test.tsx` | US1 AC1–7, FR-001–007, FR-036, FR-042/043, SC-001/007/013 |
| Add | `tests/integration/cities-add.test.tsx` | US2 AC1–7, FR-008–015, FR-032–034, SC-002/003 |
| Edit | `tests/integration/cities-edit.test.tsx` | US3 AC1–9, FR-016–025, SC-003/005/012 |
| Status toggle | `tests/integration/cities-status.test.tsx` | US4 AC1–6, FR-026–031, SC-006 |
| Session / access | `tests/integration/cities-session.test.tsx` | FR-035 (401 → `/login`), FR-036 (non-admin never reaches `/cities`) |
| Cities a11y (axe) | `tests/a11y/cities-a11y.test.tsx` | FR-040/041, SC-010 (automated portion), SC-011 (RTL smoke) |

> `fetchMock` keys are `"<METHOD> <path>"` with **no query string** for this feature. Tests assert `GET /admin/cities`, `POST /admin/cities` with body `{ name_ar, name_en }`, `PUT /admin/cities/{id}` with **only the changed** name key(s), and `PATCH /admin/cities/{id}/status` with `{ is_active: <boolean> }`. Post-mutation re-fetch is exercised with **ordered replies** on the `GET /admin/cities` key.
> jsdom cannot evaluate colour contrast, true focus visibility, or real RTL glyph layout — those parts of SC-010/SC-011 stay in the manual checklist below.

---

## Manual validation scenarios

Run against `npm run dev`, signed in as `admin`, on `/cities`. Use the Network tab to inspect requests and bodies.

### US1 — View the list, search (P1)

1. **All cities incl. inactive (AC1, FR-001/002/003)** — open `/cities`. → One table lists every city, active **and** inactive. Each row shows the Arabic name, the English name, and a status indicator that is distinguishable without colour (label + icon/shape). No pagination controls.
2. **Loading vs empty (AC2/AC3, FR-004/005)** — throttle the network and reload. → A loading state shows first, distinct from the empty state. Against an empty backend, an explicit "لا توجد مدن بعد." message shows with the **Add City** button still available.
3. **Refresh (AC4, FR-006)** — have a colleague (or curl) add/rename/toggle a city, then click Refresh. → The list reloads and reflects the change; the search term is kept.
4. **List load error (AC-, FR-007)** — set Network to Offline and reload `/cities`. → A screen-level error with a Retry button; Retry after going online loads the list. If a list was already shown, a failed Refresh keeps it and shows a toast instead.
5. **Search narrows (AC6, FR-042, SC-013)** — type part of a city name. → The list narrows to rows whose Arabic **or** English name contains the term, with **no** network request (Network tab shows nothing). Clearing the box restores the full list.
6. **No match (AC7, FR-043)** — type a string no city matches. → An explicit "لا توجد مدن مطابقة لبحثك." state (different from the empty-list state); the search term stays editable.
7. **Non-admin (FR-036)** — sign in as a non-admin (or drop the role). → `/cities` is not reachable; the admin shell redirects as for every other admin route.

### US2 — Add a city (P2)

1. **Open + required (AC2, FR-008/009)** — click **Add City**. → A modal with two labelled fields (Arabic name, English name). Leave one empty → Save is disabled with a "required" message; **no** request is sent.
2. **Length limit (AC3, FR-010)** — paste > 255 chars into a field. → Save blocked with a length message before any request.
3. **Happy path (AC1, FR-011, SC-002)** — enter valid Arabic + English names → Save. → One `POST /admin/cities` with body `{ name_ar, name_en }` and the bearer header; a follow-up `GET /admin/cities` re-fetch; the new city appears in the list as **active**; a success toast shows the server message ("City created."). Open a cook/driver review screen that references the new city → its name resolves (directory was invalidated).
4. **Duplicate name (AC4, FR-012, SC-003)** — add a city whose Arabic or English name matches an existing one. → `422`; a specific "name already in use" message appears **under the offending field**; the dialog stays open with the entered values.
5. **In-flight lock (AC5, FR-013)** — throttle the network, Save, then hammer the button. → Save is disabled with progress; exactly one `POST` goes out.
6. **Transient failure (AC6, FR-014)** — go Offline, Save. → No city added; the form keeps its values; a retryable "تعذّر إتمام العملية…" toast; the dialog stays open.
7. **Cancel (AC7, FR-015)** — open Add, then Cancel / `Esc`. → No `POST`; the list is unchanged; focus returns to the Add button.

### US3 — Edit a city's name (P3)

1. **Dialog pre-filled (AC1, FR-016)** — click Edit on a row. → A modal (same shape as Add) opens pre-filled with that city's Arabic and English names; focus moves into the dialog.
2. **Change one name only (AC2, FR-017, SC-005)** — change only the Arabic name → Save. → `PUT /admin/cities/{id}` body is `{ name_ar }` **only**; the re-fetch shows the new Arabic name and the **unchanged** English name; success toast "City updated.".
3. **At least one name (AC3, FR-018)** — clear both fields (or leave both unchanged) → Save is disabled with "أدخل الاسم بالعربية أو بالإنجليزية على الأقل."; no request sent.
4. **Length limit (AC4, FR-019)** — > 255 in either field → Save blocked with a length message.
5. **Duplicate name (AC5, FR-021, SC-003)** — rename to a value another city already uses. → `422`; specific message under the offending field; dialog stays open with the entered values.
6. **City gone (AC6, FR-022)** — delete the city server-side, then Save. → `404`; "تعذّر العثور على المدينة." toast; the dialog closes; the list re-fetches.
7. **In-flight lock (AC7, FR-023)** — throttle, Save, hammer the button → one `PUT`; Save disabled with progress.
8. **Transient failure (AC8, FR-024)** — go Offline, Save. → Name unchanged in the list; no local change; retryable toast; dialog stays open.
9. **Cancel (AC9, FR-025)** — open Edit, then Cancel / `Esc`. → No `PUT`; the row is unchanged; focus returns to the Edit button.
10. **Concurrent edit (SC-012)** — open Edit for a city in two tabs; save a different name in each. → Both saves return `200`; after each save's re-fetch the list shows the name from the **later** save; no error, no stuck row.

### US4 — Activate / deactivate a city (P4)

1. **Toggle with confirm (AC1, FR-027)** — on an active city, use the toggle. → A confirmation dialog ("تعطيل مدينة …؟"); Confirm → one `PATCH /admin/cities/{id}/status` body `{ is_active: false }`; the re-fetch shows the row as inactive with a visibly changed appearance; success toast "City status updated.".
2. **Reactivate (AC2)** — toggle an inactive city → confirm → `{ is_active: true }` → row shows active again.
3. **Cancel confirm (AC3, FR-027)** — open the toggle confirmation, then Cancel / `Esc`. → No `PATCH`; the status is unchanged.
4. **In-flight lock (AC4, FR-029)** — throttle, confirm a toggle, hammer that row's control. → Only **that row's** toggle is disabled with progress; exactly one `PATCH`; other rows stay interactive.
5. **City gone (AC5, FR-030)** — delete the city server-side, then confirm a toggle. → `404`; not-found toast; the list re-fetches.
6. **Transient failure (AC6, FR-031)** — go Offline, confirm. → Status unchanged in the list; no local change; retryable toast; no re-fetch.
7. **No delete anywhere (FR-026)** — inspect every row and dialog. → There is no delete/remove control for a city, only activate/deactivate.

### Session loss (FR-035)

1. On `/cities`, revoke the token server-side (or corrupt the stored token in DevTools), then trigger any call (Refresh, or any mutation). → `401` → the Phase 1 handler clears the session and redirects to `/login`; no broken view.

### Accessibility — WCAG 2.1 AA (FR-040/041, SC-010) and RTL (FR-040, SC-011)

Automated: `tests/a11y/cities-a11y.test.tsx` must report **zero** axe violations on the list/table, the search box, the empty state, the no-match state, the error state, `CityFormDialog` (add and edit), and `StatusToggleDialog`.

Manual sign-off (keyboard only + a screen reader — VoiceOver / NVDA):

- [ ] Tab reaches the search box, each row's Edit button and status toggle, and the Add button in a sensible order; visible focus ring throughout.
- [ ] The search box has a programmatic label; the current result count / no-match state is announced when the term changes.
- [ ] The table exposes column headers programmatically; each data cell is associated with its header.
- [ ] Active vs inactive is distinguishable without colour (badge text + icon/shape) — verify in greyscale.
- [ ] `CityFormDialog`: focus moves into the first field on open, is trapped, and returns to the triggering button on close; `Esc` cancels with no request; field errors are associated with their inputs (`aria-describedby` / `aria-invalid`) and announced.
- [ ] `StatusToggleDialog`: focus moves to Confirm, is trapped, returns on close; `Esc`/Cancel send nothing.
- [ ] Success / not-found / retry messages are announced via the `aria-live` region without moving the pointer.
- [ ] Colour contrast of buttons, badges, toast text, and the placeholder meets AA (brand red `#7a0d0d`, status colours against their backgrounds).
- [ ] RTL: the whole screen — table, search box, both dialogs, confirmation, all state messages — lays out right-to-left with nothing clipped, mis-mirrored, or overlapping; English names read left-to-right within their cell.

---

## Definition of done for this feature

- All Vitest suites green; `npm run test:run` and `npm run build` clean; the pre-existing `tests/unit/cityDirectory.test.ts` still passes.
- Every manual scenario above passes against a real Phase 5 backend.
- The a11y manual checklist is fully ticked and `vitest-axe` shows zero violations.
- `/cities` renders `CitiesPage` inside `<RequireAdmin>`; the sidebar has an "إدارة المدن" entry.
- `src/review/DialogShell.tsx` is a one-line re-export of `src/shared/DialogShell.tsx`; no cook/driver test changed.
- No feature module reads the bearer token directly; every call goes through `authedRequest`.
- Create sends `POST { name_ar, name_en }`; edit sends `PUT` with only the changed name key(s); toggle sends `PATCH { is_active: <boolean> }`; the list call carries no query string.
- Every successful create / edit / status change re-fetches the list and calls `__resetCityDirectory()`; there is no delete control anywhere.

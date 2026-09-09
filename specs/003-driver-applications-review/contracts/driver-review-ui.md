# Contract: Driver Review UI module (internal surface)

Feature: `003-driver-applications-review`. Defines the internal seams other code (and tests) depend on: the shared `src/review/` primitives promoted out of `src/cooks/`, the feature hook, the API wrappers, and the component props. Names are indicative; behaviour is the contract. The Phase 1 `authedRequest` / `setTokenProvider` seam and the Phase 2 `src/cities/` module are consumed **unchanged** — see `specs/002-cook-applications-review/contracts/cook-review-ui.md` for their contracts.

---

## 0. `src/review/` — components promoted from `src/cooks/` (R9)

```ts
// src/review/DialogShell.tsx — MOVED verbatim from src/cooks/DialogShell.tsx
export default function DialogShell(props: {
  label: string
  onDismiss: () => void
  children: React.ReactNode
}): JSX.Element
// Portal to <body>, backdrop, role="dialog" + aria-modal, Esc to dismiss,
// focus trap, focus restore to the pre-open element. No feature-specific logic.

// src/review/messages.ts — NEW
export const reviewMessages: {
  viewerClose: string
  viewerPrev: string
  viewerNext: string
  viewerZoomIn: string
  viewerZoomOut: string
  viewerZoomReset: string
  docUnavailable: string
  openInNewTab: string
  docContract: string   // used only by the cook feature's contract branch
}

// src/review/DocumentViewer.tsx — MOVED from src/cooks/DocumentViewer.tsx
export interface DocumentViewerProps {
  docs: DocumentRef[]                 // shared DocumentRef (kind union covers both features)
  index: number
  onIndexChange: (next: number) => void
  onClose: () => void
  strings?: Partial<typeof reviewMessages>   // optional per-feature override; neither feature needs it
}
export default function DocumentViewer(props: DocumentViewerProps): JSX.Element
```

Rules:
- `DocumentViewer` chrome strings default to `reviewMessages`; `strings` shallow-merges over the default.
- Image doc → `<img referrerPolicy="no-referrer" alt={label}>`, CSS-transform zoom 1×–4× (buttons + `+`/`-`/`0`), pan when zoomed.
- `kind === 'contract'` → `<iframe>` + new-tab fallback link. **Unused by the driver feature** (drivers pass only image kinds) but retained for cooks.
- `url === null` → "document unavailable" panel (FR-005).
- Keyboard: `Esc` → `onClose`; `ArrowLeft`/`ArrowRight` → `onIndexChange` (RTL-aware, `ArrowLeft` = visual next); focus trapped while open; focus returns to the invoking tile on close.
- Holds no copy of any document; nothing persisted (FR-031, SC-008).

`src/cooks/DialogShell.tsx` and `src/cooks/DocumentViewer.tsx` become:

```ts
export { default } from '../review/DialogShell'      // src/cooks/DialogShell.tsx
export { default } from '../review/DocumentViewer'   // src/cooks/DocumentViewer.tsx
```

`src/cooks/messages.ts` keeps cook-specific keys; the moved viewer-chrome keys are re-exported from `reviewMessages` (or the two internal `src/cooks` call sites are repointed to `reviewMessages`). No change to any Phase 2 test.

---

## 1. `src/drivers/types.ts`

```ts
export interface DriverApplication {
  id: number
  name?: string | null          // applicant name; not in the current API payload — UI falls back to the `#id` label
  vehicle_type: string
  vehicle_model: string
  vehicle_year: number
  vehicle_color: string
  vehicle_plate_no: string
  vehicle_plate_letters: string
  national_id_front_url: string | null
  national_id_back_url: string | null
  license_url: string | null
  city_id: number
  birth_date: string            // YYYY-MM-DD
  is_available: boolean
  submitted_at: string          // ISO 8601 — primary sort key (FR-010)
  approval_status: 'pending' | 'approved' | 'rejected'
  rejection_reason: string | null
  rating_avg: number
  rating_count: number
}

export type DriverDocumentKind = 'id_front' | 'id_back' | 'license'

// Reuses the shared DocumentRef shape; driver docs are always image kinds.
export interface DocumentRef {
  kind: DriverDocumentKind | 'avatar' | 'banner' | 'contract'  // shared union
  url: string | null
  label: string
}

export type DecisionOutcome =
  | { ok: true; message: string }
  | { ok: false; reason: 'not_pending'; message: string }
  | { ok: false; reason: 'not_found' }
  | { ok: false; reason: 'transient' }
  | { ok: false; reason: 'validation'; message: string }

export type CardStatus = 'idle' | 'confirming' | 'submitting' | 'error'
```

---

## 2. `src/drivers/driversApi.ts`

```ts
export function listPendingDrivers(signal?: AbortSignal): Promise<DriverApplication[]>
// GET /admin/drivers/pending → data is already a flat DriverApplication[]; no mapping, no sort here

export function approveDriver(id: number): Promise<DriverApplication>
// POST /admin/drivers/{id}/approve, no body → data (updated driver)

export function rejectDriver(id: number, reason: string): Promise<DriverApplication>
// POST /admin/drivers/{id}/reject, body { reason } → data (updated driver)
```

All three call `authedRequest`. They **propagate** `ApiError` unchanged; outcome classification (200/404/422/5xx → `DecisionOutcome`) happens in the hook, not here.

---

## 3. `src/drivers/sortQueue.ts`

```ts
export function sortQueue(entries: DriverApplication[]): DriverApplication[]
```

- Pure; returns a new array, does not mutate the input.
- Comparator key: `[entry.submitted_at, entry.id]` — `submitted_at` as string (ISO 8601 lexicographic == chronological), `id` numeric tie-break.
- Total order ⇒ stable and identical across calls with equal input (FR-010, SC-010).

**Unit tests**: earlier `submitted_at` first; equal `submitted_at` → lower `id` first; idempotent on its own output; empty array → empty array.

---

## 4. `src/drivers/useDriverApplications.ts`

```ts
interface UseDriverApplications {
  status: 'loading' | 'ready' | 'error'   // initial queue fetch (FR-008 / FR-032)
  entries: DriverApplication[]            // sorted (FR-010)
  count: number                           // entries.length (FR-006)
  cardState: (id: number) => CardStatus
  confirming: { id: number; kind: 'approve' | 'reject' } | null
  refresh: () => void                     // re-fetch + re-sort, keep scroll (FR-009)
  openConfirm: (id: number, kind: 'approve' | 'reject') => void
  closeConfirm: (id: number) => void
  approve: (id: number) => Promise<DecisionOutcome>
  reject: (id: number, reason: string) => Promise<DecisionOutcome>
}
export function useDriverApplications(): UseDriverApplications
```

Behaviour (mirrors `useCookApplications`):
- Mount → `status='loading'`, `listPendingDrivers()` → `sortQueue` → `status='ready'`; a failed **initial** load → `status='error'` (retry via `refresh()`); a failed **refresh** keeps the list already shown (FR-032).
- `approve`/`reject`:
  - set `cardState(id)='submitting'` (FR-015 / FR-021);
  - call the api wrapper; classify:
    - 200 → delete entry + key; return `{ ok:true, message }` (FR-014 / FR-019); unreadable body + 200 still counts (FR-026);
    - `ApiError.status===404` → delete entry; `refresh()`; return `{ ok:false, reason:'not_found' }` (FR-024);
    - `ApiError.status===422` with `errors.reason` → keep entry + dialog; return `{ ok:false, reason:'validation', message }` (FR-027);
    - `ApiError.status===422` otherwise → delete entry; `refresh()`; return `{ ok:false, reason:'not_pending', message: err.message }` (FR-023);
    - `ApiError.status===0 || >=500` → keep entry; `cardState(id)='error'`; return `{ ok:false, reason:'transient' }` (FR-025);
  - never observes `401` (handled upstream, FR-028).
- `approve` sends **no** body; `reject` sends `{ reason }` and assumes the caller pre-validated (the dialog does).
- Deleting an entry also deletes its `cardState` key; unmount drops all state (FR-031, SC-008).

Optionally the 200/404/422/5xx → `DecisionOutcome` mapping is extracted as a pure `classifyOutcome(err | null): DecisionOutcome` for direct unit testing (`tests/unit/driverOutcome.test.ts`).

---

## 5. Components

### `DriverApplicationsPage` (`/drivers` route element)

- No props. Composes `useDriverApplications()` + `useCityNames()`.
- `status==='loading'` → skeleton/loader, no cards (FR-008).
- `status==='error'` → error panel + Retry (calls `refresh()`) (FR-032).
- `status==='ready' && count===0` → empty state "no applications awaiting review" (FR-007).
- `status==='ready' && count>0` → header with the count (FR-006), a Refresh control (FR-009), then `entries.map(e => <DriverApplicationRow key={e.id} …/>)` — plain vertical list, no virtualization (FR-011).
- Owns `reviewing: number | null` (the id whose review screen is open). Clears it when that id leaves `entries` (decided or dropped by a refresh). Renders `<DriverReviewOverlay>` for the matching entry.
- Owns the toast region (`aria-live`) and renders the active `ApproveDialog` / `RejectDialog` / `DocumentViewer` as portals (these layer **above** the review overlay).
- Maps each `DecisionOutcome` to a toast: `ok` → success (`message`); `not_pending` → info (`message`); `not_found` → info ("could not be found"); `transient` → retryable ("please try again"); `validation` → surfaced on the reason field, dialog stays open.

### `DriverApplicationRow`

```ts
interface DriverApplicationRowProps {
  entry: DriverApplication
  cityName: string                      // from useCityNames().resolve(entry.city_id)
  onOpen: () => void                    // → page sets `reviewing = entry.id`
}
```

- One `<article>` per application: an `<h3>` name heading (`entry.name` when present, else the `طلب السائق رقم {id}` label), the `is_available` badge, the identity/vehicle facts (`vehicle_*`, `cityName`, formatted `birth_date` / `submitted_at`, `rating_avg` + `rating_count`; missing/empty → `—`, FR-003b; `birth_date` display-only, FR-003c), and a trailing **eye** button (`aria-label` = "مراجعة الطلب") that calls `onOpen`.
- No approve / reject / document tiles on the row — those live only on the review screen.

### `DriverReviewOverlay` (the review screen)

```ts
interface DriverReviewOverlayProps {
  entry: DriverApplication
  cityName: string
  busy: boolean                         // cardState(id) === 'submitting'
  onView: (docs: DocumentRef[], index: number) => void
  onApprove: () => void                 // opens ApproveDialog
  onReject: () => void                  // opens RejectDialog
  onClose: () => void                   // page clears `reviewing`
}
```

- Full-screen portal to `<body>`, `role="dialog"` + `aria-modal`, `aria-label` = "مراجعة طلب السائق", `Esc` → `onClose`, focus moved to the close button on open and restored on unmount.
- Body: the same identity/vehicle facts as the row, plus document tiles for `id_front`, `id_back`, `license` (thumbnail `loading="lazy"`; `null` or load error → "unavailable" tile, FR-005); clicking a tile calls `onView(documents(entry), indexOfTile)` where `documents(entry)` = `[{id_front}, {id_back}, {license}]`.
- Footer: Approve + Reject buttons; `busy` → both `disabled` + `aria-busy` (FR-015 / FR-021).

### `ApproveDialog`

```ts
interface ApproveDialogProps {
  driverLabel: string   // e.g. "طلب السائق #7" — used in the title + success toast context
  busy: boolean
  onConfirm: () => void  // → useDriverApplications().approve(id)
  onCancel: () => void
}
```

- Built on `src/review/DialogShell`. Focus-trapped `role="dialog"`; `Esc` / Cancel → `onCancel`, **no** request (FR-013).
- Confirm disabled while `busy`; result announced via the page's `aria-live` region.

### `RejectDialog`

```ts
interface RejectDialogProps {
  driverLabel: string
  busy: boolean
  fieldError?: string    // set when the hook returns { reason: 'validation' } (FR-027)
  onSubmit: (reason: string) => void   // → useDriverApplications().reject(id, reason)
  onCancel: () => void
}
```

- Built on `src/review/DialogShell`. `<textarea maxLength={1000}>` + live `count / 1000` (via `aria-describedby`).
- Submit disabled unless `reason.trim().length >= 1` (FR-017) and `reason.length <= 1000` (FR-018).
- Local `reason` state is **not** cleared on a failed submit (`busy` returns to false, dialog stays) — text preserved (FR-020). On success the parent unmounts the dialog with the card. Cancel / `Esc` / backdrop → unmount, no request (FR-022).

---

## 6. `src/drivers/messages.ts` (Arabic, indicative keys)

| Key | Use |
|---|---|
| `pageTitle` | `طلبات السائقين` header + sidebar entry |
| `awaitingCount(n)` | FR-006 header count |
| `loading` / `queueError` / `retry` / `refresh` | FR-008 loading, FR-032 error + retry, FR-009 refresh |
| `empty` | FR-007 empty state |
| `docUnavailable` | FR-005 tile + viewer (or reuse `reviewMessages.docUnavailable`) |
| `docIdFront` / `docIdBack` / `docLicense` | document tile + viewer labels / `alt` text |
| `fieldVehicle` / `fieldPlate` / `fieldCity` / `fieldBirthDate` / `fieldSubmittedAt` | card field labels |
| `available` / `unavailable` | `is_available` display |
| `rating(avg, count)` | rating summary |
| `approve` / `reject` | card action buttons |
| `approveTitle(label)` / `approveBody` / `confirmApprove` / `cancel` | `ApproveDialog` |
| `rejectTitle(label)` / `rejectReasonLabel` / `rejectReasonRequired` / `rejectCounter(n)` / `confirmReject` | `RejectDialog` (FR-016–FR-018) |
| `approvedToast` / `rejectedToast` | FR-014 / FR-019 (default; overridden by envelope `message` when present) |
| `noLongerPendingToast` | FR-023 (overridden by envelope `message` when present) |
| `notFoundToast` | FR-024 |
| `decisionRetryToast` | FR-025 |

---

## Traceability

| Requirement | Surface |
|---|---|
| FR-001 | `DriverApplicationsPage` under `<RequireAdmin>` (App.tsx new `/drivers` route) |
| FR-002 | `listPendingDrivers` returns as-is; tests assert only pending appear |
| FR-003 / FR-003a | `DriverApplicationCard` fields; `useCityNames().resolve` |
| FR-003b | per-field `—` placeholder in `DriverApplicationCard` |
| FR-003c | `birth_date` formatted for display only; no age code anywhere |
| FR-004 / FR-004a | shared `src/review/DocumentViewer` (overlay, zoom, keyboard nav) |
| FR-005 | `DocumentRef.url === null` / load error → "unavailable" (card + viewer) |
| FR-006 / FR-007 / FR-008 | `useDriverApplications.count` / `status`; page empty + loading states |
| FR-009 | `useDriverApplications.refresh` (scroll preserved) |
| FR-010 / FR-011 | `sortQueue`; page `.map()` with no virtualization |
| FR-012 / FR-013 | `ApproveDialog` (confirm-only, cancel = no request) |
| FR-014 / FR-019 / FR-026 | `useDriverApplications.approve` / `reject` 200 branch |
| FR-015 / FR-021 | `cardState === 'submitting'` disables both controls + modal submit |
| FR-016 / FR-017 / FR-018 / FR-020 / FR-022 | `RejectDialog` validation, text retention, dismiss = no request |
| FR-023 / FR-024 | hook 422 / 404 branches → remove + `refresh()` |
| FR-025 / FR-032 | hook transient branch; page error state |
| FR-027 | hook `validation` branch → `RejectDialog.fieldError` |
| FR-028 | `authedRequest` → `apiRequest` → Phase 1 `unauthorizedHandler` |
| FR-029 | `/drivers` route sits under `<RequireAdmin>` |
| FR-030 | envelope handled by `apiRequest`; page maps `DecisionOutcome` → toast text |
| FR-031 / SC-008 | shared `DocumentViewer` holds no copy; state dropped on unmount; URLs not logged |
| FR-033 | `Sidebar.tsx` new `طلبات السائقين` entry; reuse of `AdminLayout` / `authedRequest` / toast region |
| FR-034 / SC-009 | focus traps, labels, `aria-live`, keyboard nav in viewer + dialogs; `vitest-axe` |

# Contract: Cook Review UI module (internal surface)

Feature: `002-cook-applications-review`. Defines the internal seams other code (and tests) depend on: the shared `authedRequest` addition to the Phase 1 transport, the two feature hooks, the API wrappers, and the component props. Names are indicative; behaviour is the contract.

---

## 0. `src/api/httpClient.ts` — additive changes (Phase 1 file)

```ts
// NEW — register an ambient bearer-token getter (symmetric with setUnauthorizedHandler)
export function setTokenProvider(fn: (() => string | null) | null): void

// NEW — like apiRequest, but injects the ambient token; no network call when absent
export async function authedRequest<T>(
  path: string,
  opts?: { method?: 'GET' | 'POST'; body?: unknown; signal?: AbortSignal },
): Promise<T>
```

Rules:
- `authedRequest` reads `tokenProvider?.()`. If it returns `null`/empty → throw `ApiError(0, 'No active session')` **without** calling `fetch`.
- Otherwise delegate to `apiRequest<T>(path, { ...opts, token })`; all existing behaviour (envelope parse, `ApiError`, `401 → unauthorizedHandler`) is unchanged and thereby inherited (FR-026).
- `httpClient.ts` does **not** import from `src/auth/` — the getter is injected.
- `apiRequest`, `setUnauthorizedHandler`, `envelope.ts`, `logger.ts`: untouched.

`src/auth/AuthContext.tsx` — one addition inside the existing `setUnauthorizedHandler` effect (or its own effect):

```ts
useEffect(() => {
  setTokenProvider(readToken)
  return () => setTokenProvider(null)
}, [])
```

---

## 1. `src/cooks/types.ts`

```ts
export interface CookApplication {
  id: number
  store_name: string
  name?: string | null          // cook's personal name; not in the current API payload — UI falls back to store_name
  bio: string
  avatar_url: string | null
  national_id_front_url: string | null
  national_id_back_url: string | null
  banner_url: string | null
  city_id: number
  area: string
  address_text: string
  lat: number
  lng: number
  delivery_radius_km: number
  is_open: boolean
  approval_status: 'pending' | 'approved' | 'rejected'
  rejection_reason: string | null
  rating_avg: number
  rating_count: number
}

export interface SignedContract {
  template_version: string
  signed_file_url: string
  signed_at: string // ISO 8601
}

export interface PendingCookEntry {
  profile: CookApplication
  contract: SignedContract | null
}

export type DocumentKind = 'id_front' | 'id_back' | 'avatar' | 'banner' | 'contract'
export interface DocumentRef {
  kind: DocumentKind
  url: string | null
  label: string // localized, for alt text + viewer heading
}

export type DecisionOutcome =
  | { ok: true; storeName: string }
  | { ok: false; reason: 'not_pending'; message: string }
  | { ok: false; reason: 'not_found' }
  | { ok: false; reason: 'transient' }
```

---

## 2. `src/cooks/cooksApi.ts`

```ts
export function listPendingCooks(signal?: AbortSignal): Promise<PendingCookEntry[]>
// GET /admin/cooks/pending → maps raw {cook_profile, contract} → PendingCookEntry (no sort here)

export function approveCook(id: number): Promise<CookApplication>
// POST /admin/cooks/{id}/approve, no body → data (updated profile)

export function rejectCook(id: number, reason: string): Promise<CookApplication>
// POST /admin/cooks/{id}/reject, body { reason } → data (updated profile)
```

All three call `authedRequest`. They **propagate** `ApiError` unchanged; outcome classification (200/404/422/5xx → `DecisionOutcome`) happens in the hook, not here.

---

## 3. `src/cooks/sortQueue.ts`

```ts
export function sortQueue(entries: PendingCookEntry[]): PendingCookEntry[]
```

- Pure; returns a new array, does not mutate the input.
- Comparator key: `[entry.contract ? 0 : 1, entry.contract?.signed_at ?? '', entry.profile.id]`, compared field by field (`signed_at` as string; `id` numeric).
- Total order ⇒ stable and identical across calls with equal input (FR-011).

**Unit tests**: signed-before-unsigned; earlier `signed_at` first; equal `signed_at` → lower `id` first; all-unsigned → ascending `id`; idempotent on its own output.

---

## 4. `src/cooks/useCookApplications.ts`

```ts
interface UseCookApplications {
  status: 'loading' | 'ready' | 'error'   // initial queue fetch (FR-029)
  entries: PendingCookEntry[]             // sorted (FR-011)
  count: number                           // entries.length (FR-008)
  cardState: (id: number) => 'idle' | 'confirming' | 'submitting' | 'error'
  refresh: () => void                     // re-fetch + re-sort, keep scroll (FR-010)
  openConfirm: (id: number, kind: 'approve' | 'reject') => void
  closeConfirm: (id: number) => void
  approve: (id: number) => Promise<DecisionOutcome>
  reject: (id: number, reason: string) => Promise<DecisionOutcome>
}
export function useCookApplications(): UseCookApplications
```

Behaviour:
- Mount → `status='loading'`, `listPendingCooks()` → `sortQueue` → `status='ready'`; failure → `status='error'` (retry via `refresh()`).
- `approve`/`reject`:
  - set `cardState(id)='submitting'` (FR-015 / FR-021);
  - call the api wrapper; classify:
    - 200 → delete entry + key; return `{ ok:true, storeName }` (FR-014 / FR-019);
    - `ApiError.status===404` → delete entry; `refresh()`; return `{ ok:false, reason:'not_found' }` (FR-023);
    - `ApiError.status===422` → delete entry; `refresh()`; return `{ ok:false, reason:'not_pending', message: err.message }` (FR-022);
    - `ApiError.status===0 || >=500` → keep entry; `cardState(id)='error'`; return `{ ok:false, reason:'transient' }` (FR-024);
  - never observes `401` (handled upstream).
- `approve` sends **no** body; `reject` sends `{ reason }` and assumes the caller pre-validated (dialog does).
- Deleting an entry also deletes its `cardState` key; unmount drops all state (FR-028, SC-007).

---

## 5. `src/cities/` surface

```ts
// citiesApi.ts
export function fetchCityDirectory(): Promise<Map<number, { name_ar: string; name_en: string }>>
// GET /admin/cities via authedRequest; module-level memoised promise (one call per session)

// useCityNames.ts
interface UseCityNames {
  resolve: (cityId: number) => string   // name_ar, or String(cityId) on miss / failure (FR-003a)
  ready: boolean                         // directory loaded
  failed: boolean                        // fetch rejected → resolve returns raw ids for all
}
export function useCityNames(): UseCityNames
```

- Loads in parallel with the queue; the queue never awaits it.
- Inactive cities are kept in the map (not filtered) so a deactivated city still resolves.

---

## 6. Components

### `CookApplicationsPage` (`/cooks` route element)

- No props. Composes `useCookApplications()` + `useCityNames()`.
- `status==='loading'` → skeleton/loader (no cards).
- `status==='error'` → error panel + Retry (calls `refresh()`) (FR-029).
- `status==='ready' && count===0` → empty state "no applications awaiting review" (FR-009).
- `status==='ready' && count>0` → header with the count (FR-008), a Refresh control (FR-010), then `entries.map(e => <CookApplicationRow key={e.profile.id} …/>)` — plain vertical list, no virtualization (FR-011a).
- Owns `reviewing: number | null` (the profile id whose review screen is open). Clears it when that id leaves `entries`. Renders `<CookReviewOverlay>` for the matching entry.
- Owns the toast region (`aria-live`) and renders the active `ApproveDialog` / `RejectDialog` / `DocumentViewer` as portals (these layer **above** the review overlay).

### `CookApplicationRow`

```ts
interface CookApplicationRowProps {
  entry: PendingCookEntry
  cityName: string                       // from useCityNames().resolve(entry.profile.city_id)
  onOpen: () => void                     // → page sets `reviewing = entry.profile.id`
}
```

- One `<article>` per application: an `<h3>` name heading (`profile.name` when present, else `store_name`), the `is_open` badge, the submitted facts (`cityName`, `area`, `address_text`, `delivery_radius_km`, `rating_avg` + `rating_count`, `bio`), and a trailing **eye** button (`aria-label` = "مراجعة الطلب") that calls `onOpen`.
- No approve / reject / document tiles / contract block on the row — those live only on the review screen.

### `CookReviewOverlay` (the review screen)

```ts
interface CookReviewOverlayProps {
  entry: PendingCookEntry
  cityName: string
  busy: boolean                          // cardState(profile.id) === 'submitting'
  onView: (docs: DocumentRef[], index: number) => void
  onApprove: () => void                  // opens ApproveDialog
  onReject: () => void                   // opens RejectDialog
  onClose: () => void                    // page clears `reviewing`
}
```

- Full-screen portal to `<body>`, `role="dialog"` + `aria-modal`, `aria-label` = "مراجعة طلب الطاهية", `Esc` → `onClose`, focus moved to the close button on open and restored on unmount.
- Body: the same submitted facts as the row, plus document tiles for `id_front`, `id_back`, `avatar`, `banner` (thumbnail `loading="lazy"`; `null` or load error → "unavailable" tile, FR-005); clicking a tile calls `onView(documents(entry), indexOfTile)`.
- Contract block: `template_version` + formatted `signed_at` + "open contract" (→ `onView` with the contract ref) when `entry.contract`; else "no contract signed yet" (FR-007).
- Footer: Approve + Reject buttons; `busy` → both `disabled` + `aria-busy` (FR-015 / FR-021).

### `DocumentViewer`

```ts
interface DocumentViewerProps {
  docs: DocumentRef[]
  index: number
  onIndexChange: (next: number) => void
  onClose: () => void
}
```

- Portal overlay, `role="dialog"` `aria-modal="true"`, labelled by the current doc's `label`.
- Image doc → `<img referrerPolicy="no-referrer" alt={label}>` in a zoom/pan area; zoom 1×–4× via buttons and `+` / `-` / `0`; pan via drag or arrows when zoomed.
- `kind==='contract'` → `<iframe title="signed contract" src={url}>`; on load failure/timeout show an "open in new tab" link (documented fallback).
- `url===null` → "document unavailable" panel (FR-005).
- Keyboard: `Esc` → `onClose`; `ArrowLeft`/`ArrowRight` → `onIndexChange` (RTL-aware); focus trapped while open; on close, focus returns to the invoking tile.
- Holds no copy of any document; nothing persisted (FR-028, SC-007).

### `ApproveDialog`

```ts
interface ApproveDialogProps {
  storeName: string
  busy: boolean
  onConfirm: () => void   // → useCookApplications().approve(id)
  onCancel: () => void
}
```

- Focus-trapped `role="dialog"`; `Esc` / Cancel → `onCancel`, **no** request (FR-013).
- Confirm disabled while `busy`; result announced via the page's `aria-live` region.

### `RejectDialog`

```ts
interface RejectDialogProps {
  storeName: string
  busy: boolean
  onSubmit: (reason: string) => void   // → useCookApplications().reject(id, reason)
  onCancel: () => void
}
```

- `<textarea maxLength={1000}>` + live `count / 1000` (via `aria-describedby`).
- Submit disabled unless `reason.trim().length >= 1` (FR-017) and `reason.length <= 1000` (FR-018).
- Local `reason` state is **not** cleared on a failed submit (`busy` returns to false, dialog stays) — text preserved (FR-020). On success the parent unmounts the dialog with the card.

---

## 7. `src/cooks/messages.ts` (Arabic, indicative keys)

| Key | Use |
|---|---|
| `queueEmpty` | FR-009 empty state |
| `queueError` / `retry` | FR-029 screen error + retry button |
| `awaitingCount(n)` | FR-008 header count |
| `noContractSigned` | FR-007 |
| `docUnavailable` | FR-005 tile + viewer |
| `approveConfirmTitle(store)` / `approveConfirmBody` | `ApproveDialog` |
| `rejectReasonLabel` / `rejectReasonRequired` / `rejectCounter(n)` | `RejectDialog` (FR-017 / FR-018) |
| `approvedToast(store)` / `rejectedToast(store)` | FR-014 / FR-019 |
| `noLongerPendingToast` | FR-022 (overridden by envelope `message` when present) |
| `notFoundToast` | FR-023 |
| `decisionRetryToast` | FR-024 |

---

## Traceability

| Requirement | Surface |
|---|---|
| FR-001 | `CookApplicationsPage` under `<RequireAdmin>` (App.tsx route swap) |
| FR-002 | `listPendingCooks` maps as-is; tests assert only pending appear |
| FR-003 / FR-003a | `CookApplicationCard` fields; `useCityNames().resolve` |
| FR-004 / FR-004a | `DocumentViewer` (overlay, zoom, keyboard nav) |
| FR-005 | `DocumentRef.url === null` / load error → "unavailable" (card + viewer) |
| FR-006 / FR-007 | `CookApplicationCard` contract block |
| FR-008 / FR-009 | `useCookApplications.count`; page empty state |
| FR-010 | `useCookApplications.refresh` (scroll preserved) |
| FR-011 / FR-011a | `sortQueue`; page `.map()` with no virtualization |
| FR-012 / FR-013 | `ApproveDialog` (confirm-only, cancel = no request) |
| FR-014 / FR-019 / FR-025 | `useCookApplications.approve` / `reject` 200 branch |
| FR-015 / FR-021 | `cardState === 'submitting'` disables both controls |
| FR-016 / FR-017 / FR-018 / FR-020 | `RejectDialog` validation + text retention |
| FR-022 / FR-023 | hook 422 / 404 branches → remove + `refresh()` |
| FR-024 / FR-029 | hook transient branch; page error state |
| FR-026 | `authedRequest` → `apiRequest` → Phase 1 `unauthorizedHandler` |
| FR-027 | envelope handled by `apiRequest`; `RejectDialog` surfaces `errors.reason` if it ever 422s |
| FR-028 / SC-007 | `DocumentViewer` holds no copy; state dropped on unmount; URLs not logged |
| FR-030 / SC-008 | focus traps, labels, `aria-live`, keyboard nav in viewer + dialogs; `vitest-axe` |

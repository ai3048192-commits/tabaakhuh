# Tabaakhuh Admin Dashboard

React + TypeScript + Vite admin dashboard for the Tabaakhuh platform.

## Setup

```bash
cp .env.example .env      # then set VITE_API_BASE_URL to your backend, e.g. https://<host>/api/v1
npm install
npm run dev               # http://localhost:5173
```

`VITE_API_BASE_URL` is the base URL of the backend described in `admin-dashboard-api.md`. `.env` is git-ignored; `.env.example` is the committed template.

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Vite dev server |
| `npm run build` | Production build |
| `npm run test` | Vitest (watch) — unit, integration, and accessibility suites |
| `npm run test:run` | Vitest single pass (CI) |

## Authentication & session (`src/auth`, `src/api`)

Admin sign-in / session handling lives in two folders:

- **`src/api/`** — `envelope.ts` (the standard `{success,data,message,errors}` envelope + `ApiError`), `httpClient.ts` (single `fetch` wrapper: base URL, bearer header, `401` hook), `logger.ts` (dev-only; never receives bodies or tokens).
- **`src/auth/`** — `AuthContext.tsx` (`<AuthProvider>` + `useAuth()`; a `checking → authenticated | unauthenticated` state machine in `authMachine.ts`), `authApi.ts` (`login` / `fetchMe` / `logout`), `authStorage.ts` (`localStorage` token + profile, cross-tab `storage` events), `RequireAdmin.tsx` (route guard), `messages.ts` (Arabic strings).

The bearer token is persisted in `localStorage` so the session survives a reload and a browser restart; it is discarded only on a definitive `401`, sign-out, or a non-admin role. See `specs/001-admin-auth-session/` for the full spec, plan, and validation guide.

## Cook applications review (`src/cooks`, `src/cities`)

The `/cooks` route (`CookApplicationsPage`) is the pending cook-application review screen. An administrator sees every cook whose `approval_status` is `pending`, inspects the four verification images and the signed contract in an in-dashboard zoomable overlay (`DocumentViewer` — the raw file URL is never opened as a page and nothing is copied to storage), and approves (explicit confirm) or rejects (mandatory 1–1000 char reason) each one.

- **`src/api/httpClient.ts`** — adds `setTokenProvider(fn)` + `authedRequest<T>()`: the ambient bearer-token seam. `<AuthProvider>` registers `readToken`, so feature code never threads the token and a `401` on any admin call routes through the existing session-loss handler.
- **`src/cooks/`** — `cooksApi.ts` (`listPendingCooks` / `approveCook` / `rejectCook`), `sortQueue.ts` (oldest-first: contract `signed_at`, then cook id), `useCookApplications.ts` (load / refresh / per-card decision state / outcome classification), `CookApplicationsPage.tsx`, `CookApplicationCard.tsx`, `DocumentViewer.tsx`, `ApproveDialog.tsx`, `RejectDialog.tsx`, `messages.ts`.
- **`src/cities/`** — `citiesApi.ts` fetches `GET /admin/cities` once per session (memoised) and `useCityNames()` resolves a cook's `city_id` to a display name, falling back to the raw id if the list or the entry is unavailable.

Decision outcomes: `200` → the card is removed locally with a success toast; `422`/`404` → removed plus a background refetch to reconcile; network / `5xx` → the card stays with a retryable toast (a rejection keeps its typed reason). See `specs/002-cook-applications-review/` for the full spec, plan, and validation guide.

## Driver applications review (`src/drivers`, `src/review`)

The `/drivers` route (`DriverApplicationsPage`, its own sidebar entry **طلبات السائقين**) is the pending driver-application review screen — a near-clone of cook review with a simpler shape: `GET /admin/drivers/pending` returns a flat array (no nested contract), the three verification images (national ID front/back, driving licence) are all images, and the payload carries a real `submitted_at` timestamp so the queue is a straight oldest-first sort.

- **`src/drivers/`** — `driversApi.ts` (`listPendingDrivers` / `approveDriver` / `rejectDriver` via `authedRequest`), `sortQueue.ts` (`submitted_at` ascending, tie-break by `id`), `useDriverApplications.ts` (load / refresh / per-card decision state / outcome classification incl. the `422 errors.reason` → keep-dialog-open branch), `DriverApplicationsPage.tsx`, `DriverApplicationCard.tsx` (identity + vehicle fields, `—` for any missing field, birth date shown as a date only — no age logic), `ApproveDialog.tsx`, `RejectDialog.tsx`, `messages.ts`.
- **`src/review/`** — `DialogShell.tsx` and `DocumentViewer.tsx` were promoted here from `src/cooks/` so both review features share one focus-trapped, keyboard-navigable, axe-clean overlay; `messages.ts` holds the shared viewer-chrome strings. `src/cooks/DialogShell.tsx` / `DocumentViewer.tsx` are now one-line re-exports, so Phase 2 code and tests are unchanged.
- **`src/cities/`** is reused verbatim — `useCityNames()` resolves a driver's `city_id` the same way, with the same raw-id fallback; the `GET /admin/cities` memo is shared across both screens.

Decision outcomes match cook review. See `specs/003-driver-applications-review/` for the full spec, plan, and validation guide.

---

## Vite template notes

This project was scaffolded from the React + TypeScript + Vite template with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

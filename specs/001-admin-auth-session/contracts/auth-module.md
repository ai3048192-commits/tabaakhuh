# Contract: Internal Auth Module (`src/auth`, `src/api`)

Feature: `001-admin-auth-session`. This is the client-side surface the rest of the dashboard depends on. Types are illustrative TypeScript; exact signatures may be refined during implementation as long as the observable behaviour and the acceptance scenarios hold.

---

## `src/api/envelope.ts`

```ts
export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message: string;
  errors: Record<string, string[]> | null;
}

export class ApiError extends Error {
  status: number;                              // HTTP status, or 0 for network/parse failure
  fieldErrors: Record<string, string[]> | null;
  constructor(status: number, message: string, fieldErrors?: Record<string, string[]> | null);
}

export function parseEnvelope<T>(res: Response): Promise<T>; // throws ApiError on !ok or success===false
```

**Guarantees**
- Always resolves with `data` (typed `T`) on `res.ok && success === true`.
- Throws `ApiError` otherwise, with `status` set and `fieldErrors` = `errors` (or `null`).
- Non-JSON body ⇒ `ApiError(0, <generic connection message>)`.

---

## `src/api/httpClient.ts`

```ts
interface HttpOptions {
  method?: "GET" | "POST";
  body?: unknown;
  token?: string | null;                       // adds Authorization: Bearer <token>
  signal?: AbortSignal;
}

export function apiRequest<T>(path: string, opts?: HttpOptions): Promise<T>;

export function setUnauthorizedHandler(fn: () => void): void; // called once per 401 from an authed request
```

**Guarantees**
- Prepends `VITE_API_BASE_URL`; sets `Accept` + `Content-Type: application/json`.
- Serialises `body` with `JSON.stringify` when present.
- Delegates response handling to `parseEnvelope`.
- `fetch` rejection (offline, DNS, CORS) ⇒ `ApiError(0, <generic connection message>)`.
- On `ApiError.status === 401` for a request that carried a token, invokes the registered unauthorized handler exactly once before re-throwing.
- Never logs `body` for the login path (password safety, FR-025).

---

## `src/auth/authStorage.ts`

```ts
export const STORAGE_KEYS = {
  token: "tbk.admin.auth.token",
  profile: "tbk.admin.auth.profile",
} as const;

export function readToken(): string | null;
export function readProfile(): AccountProfile | null;      // null if absent or JSON invalid
export function writeSession(token: string, profile: AccountProfile): void;  // writes both keys
export function clearSession(): void;                       // removes both keys
export function subscribeExternalChange(cb: (nextToken: string | null) => void): () => void;
// wraps window "storage" event, filters to STORAGE_KEYS.token, returns an unsubscribe fn
```

**Guarantees**
- `writeSession` / `clearSession` always touch both keys together.
- `subscribeExternalChange` fires only for cross-tab changes to the token key (the `storage` event does not fire in the tab that made the change) — this is the FR-026 mechanism.
- All reads are defensive: a corrupt `profile` JSON yields `null`, never throws.

---

## `src/auth/authApi.ts`

```ts
export function login(identifier: string, password: string):
  Promise<{ account: AccountProfile; token: string }>;      // throws ApiError

export function fetchMe(token: string): Promise<AccountProfile>; // throws ApiError

export function logout(token: string, deviceToken?: string): Promise<void>;
// resolves even on failure — swallows ApiError (best-effort per FR-020/FR-005)
```

`login` and `fetchMe` propagate `ApiError` so the provider can branch on `status` (401/422/429/500/0) and on `account.role`.

---

## `src/auth/AuthContext.tsx`

```ts
type AuthStatus = "checking" | "authenticated" | "unauthenticated";

interface AuthContextValue {
  status: AuthStatus;
  account: AccountProfile | null;
  notice: "not_permitted" | null;
  signIn(identifier: string, password: string): Promise<SignInResult>;
  signOut(): Promise<void>;
  clearNotice(): void;
}

type SignInResult =
  | { ok: true }
  | { ok: false; reason: "bad_credentials" | "rate_limited" | "not_permitted" | "server_error" | "network_error" };

export function AuthProvider(props: { children: React.ReactNode }): JSX.Element;
export function useAuth(): AuthContextValue;
```

**Behaviour guarantees**
- On mount: if `readToken()` is null ⇒ initial `status = "unauthenticated"`, **no** network call (FR-013). Else ⇒ `status = "checking"`, calls `fetchMe`; resolves to `authenticated` (role admin) / `unauthenticated` (+`notice` if role wrong / silent if 401 / silent if network) per the state table in `data-model.md`.
- Registers `setUnauthorizedHandler` ⇒ any 401 from an authed request while `authenticated` transitions to `unauthenticated` and clears storage (FR-016).
- Subscribes via `subscribeExternalChange`: token removed elsewhere ⇒ `unauthenticated` (FR-026); token replaced with a different value ⇒ re-enter `checking` with the new token.
- `signIn`: dispatches busy state (caller disables submit), calls `login`, applies role gate + non-admin best-effort `logout` (FR-005), returns a discriminated `SignInResult` the form maps to a message. Never keeps `password` after the call.
- `signOut`: `clearSession()` + dispatch `unauthenticated` **first**, then best-effort `logout(token)`; always resolves (FR-019–021, SC-004).
- While `status === "checking"` the provider renders its children normally — it is `RequireAdmin` that gates content; but `useAuth` consumers must treat `checking` as "not yet known".

---

## `src/auth/RequireAdmin.tsx`

```ts
export function RequireAdmin(props: { children: React.ReactNode }): JSX.Element;
```

- `status === "checking"` ⇒ renders `<FullScreenLoader/>` (neutral, no branding of authenticated area, no login form) — FR-017, SC-008.
- `status === "unauthenticated"` ⇒ `<Navigate to="/login" replace />`.
- `status === "authenticated"` ⇒ renders `children`.

Used in `App.tsx` around the `"/*"` (`AdminLayout`) route. The `"/login"` route separately redirects to `/dashboard` when `status === "authenticated"`.

---

## Consumer edits

| File | Change |
|---|---|
| `src/App.tsx` | Wrap routes in `<AuthProvider>`; wrap `<AdminLayout/>` route element in `<RequireAdmin>`; on `/login`, redirect to `/dashboard` when authenticated. |
| `src/pages/Login.tsx` | Rewrite: associated labels, `role="alert"` error region, `aria-invalid`/`aria-describedby`, `aria-busy`, focus management; calls `useAuth().signIn`; maps `SignInResult.reason` → message from `src/auth/messages.ts`; removes "remember me" + "forgot password". |
| `src/components/Header.tsx` | Replace hardcoded `"أحمد إسماعيل" / "مدير النظام"` with `useAuth().account` (`displayName`, localized role label, `avatar_url` with icon fallback). |
| `src/components/Sidebar.tsx` | Replace the `<Link to="/">` logout with a `<button>` that calls `useAuth().signOut()`; keep styling. |

---

## Messages (`src/auth/messages.ts`, Arabic, RTL — final copy TBD per spec Assumptions)

| Key | Trigger | Example text (placeholder) |
|---|---|---|
| `credentialError` | 401 / 422 bad credentials | «بيانات الدخول غير صحيحة.» |
| `rateLimited` | 429 | «حاولت كتير. استنى شوية وجرّب تاني.» |
| `notPermitted` | role != admin | «هذا الحساب غير مسموح له باستخدام لوحة التحكم.» |
| `serverError` | 500 | «حصل خطأ. حاول تاني.» |
| `networkError` | fetch failure | «مشكلة في الاتصال. حاول تاني.» |
| `identifierRequired` / `passwordRequired` | empty field | «اكتب البريد أو رقم الهاتف.» / «اكتب كلمة المرور.» |

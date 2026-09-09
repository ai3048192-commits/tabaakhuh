# Feature Specification: Admin Authentication & Session

**Feature Branch**: `001-admin-auth-session`

**Created**: 2026-09-06

**Status**: Draft

**Input**: User description: "Phase 1 — Admin Authentication & Session (from admin-dashboard-api.md). Goal: let an administrator sign in to the admin dashboard, retrieve the current account so the session can be rebuilt when the dashboard is reopened, and sign out. Endpoints are shared (not under /admin): POST /auth/login (public, throttled by login + login-ip; returns the user object and a bearer token; dashboard must verify data.user.role === 'admin' and reject anything else), GET /auth/me (authenticated; returns the current user), POST /auth/logout (authenticated; optional device_token in body; invalidates the current token). Standard success/error envelope with success/data/message/errors; 401 Unauthenticated, 403 wrong role, 422 validation, 429 too many attempts."

## Clarifications

### Session 2026-09-07

- Q: Should the stored sign-in credential survive the administrator fully closing and reopening the browser, or only page reloads within the same browsing session? → A: Persist across full browser restart; the session resumes on later visits until the backend credential expires or is revoked.
- Q: When an administrator signs out (or the session is lost) in one browser tab, should the other open dashboard tabs also drop to the sign-in screen? → A: Yes — clearing the stored credential in one tab returns all open dashboard tabs to the sign-in screen promptly; a fresh sign-in is not propagated the same way.
- Q: When valid credentials belong to a non-administrator, should the dashboard call the invalidate endpoint to kill the just-issued bearer token rather than only discarding it? → A: Yes — call the authentication service to invalidate the just-issued credential, then discard it locally and show the not-permitted message; failure of that call does not change the refusal.
- Q: What accessibility bar must the sign-in screen and auth error states meet? → A: WCAG 2.1 AA for the sign-in screen and all auth error/loading states (labelled fields, keyboard operable, visible focus, errors announced to assistive tech).
- Q: Should the dashboard automatically sign the administrator out after a period of inactivity, independent of the backend credential's lifetime? → A: No client-side inactivity timeout in this phase; the session ends only on sign-out, backend credential expiry/revocation, or a rejected authenticated request.

### Session 2026-09-07 (analysis remediation)

- Startup restore failure handling split: HTTP 401 → discard credential, silent sign-in screen (FR-014); 5xx / connectivity / timeout → retain credential, silent sign-in screen, retry on next startup (FR-014a). FR-024's generic error message applies only to administrator-initiated actions.
- Role gate value made explicit: the backend's administrator role value is the literal `admin` (FR-005, Key Entities).
- Mid-session role downgrade clarified: role is re-checked only on startup restore, not polled during a live session (FR-015).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Administrator signs in to the dashboard (Priority: P1)

An administrator opens the admin dashboard, is presented with a sign-in screen, enters their identifier (email or phone number) and password, and is granted access to the dashboard. If the credentials belong to a non-administrator account, access is refused with a clear explanation even though the credentials themselves are valid.

**Why this priority**: Nothing else in the admin dashboard is reachable without an authenticated administrator session. This is the minimum viable slice — with only this story implemented, an administrator can get into the product.

**Independent Test**: Load the dashboard while signed out, submit valid administrator credentials, and confirm the administrator reaches the authenticated area with their name/account visible. Repeat with valid non-administrator credentials and confirm access is refused.

**Acceptance Scenarios**:

1. **Given** a signed-out visitor on the sign-in screen, **When** they submit a correct identifier and password for an account whose role is administrator, **Then** they are taken into the authenticated dashboard and their account details (name, email, avatar) are available to the interface.
2. **Given** a signed-out visitor, **When** they submit correct credentials for an account whose role is customer, cook, or driver, **Then** access is refused, no session is established, and they see a message that the account is not permitted to use the admin dashboard.
3. **Given** a signed-out visitor, **When** they submit an identifier that does not exist or a wrong password, **Then** access is refused and they see a message that the sign-in details are incorrect, without revealing which field was wrong.
4. **Given** a signed-out visitor, **When** they submit the form with the identifier or password left empty, **Then** the form is not sent and each missing field is flagged.
5. **Given** a visitor who has failed sign-in repeatedly in a short period, **When** they attempt to sign in again, **Then** they are told too many attempts have been made and to wait before trying again.
6. **Given** a visitor submitting valid administrator credentials, **When** the sign-in request is in progress, **Then** the submit control is disabled and a progress indicator is shown so the request cannot be sent twice.

---

### User Story 2 - Session is restored when the dashboard is reopened (Priority: P2)

An administrator who signed in earlier reopens or reloads the dashboard. The dashboard silently re-establishes their session from the previously stored access credential and returns them to the authenticated area without asking for their password again. If the stored credential is missing, expired, or has been revoked, the administrator is returned to the sign-in screen.

**Why this priority**: Without session restoration the administrator would have to sign in on every page reload, which makes the dashboard impractical for daily operational use. It depends on Story 1 but adds the continuity that makes the product usable.

**Independent Test**: Sign in as an administrator, reload the page, and confirm the authenticated area is shown again with no credential prompt and with current account details. Then invalidate the stored credential and reload, and confirm the sign-in screen is shown.

**Acceptance Scenarios**:

1. **Given** an administrator with a valid stored session, **When** they reload or reopen the dashboard, **Then** the dashboard fetches the current account, confirms the role is administrator, and shows the authenticated area without a credential prompt.
2. **Given** a stored session that is no longer valid (expired or revoked), **When** the dashboard starts and tries to fetch the current account, **Then** the stored credential is discarded and the administrator is shown the sign-in screen.
3. **Given** no stored session, **When** the dashboard starts, **Then** the sign-in screen is shown immediately without a failed background request being surfaced to the user.
4. **Given** a stored session whose account role is no longer administrator, **When** the dashboard fetches the current account on startup, **Then** the session is treated as invalid and the administrator is returned to the sign-in screen with the not-permitted message.
5. **Given** an administrator working in the dashboard, **When** a request fails because the session has become unauthenticated mid-use, **Then** the dashboard ends the local session and returns them to the sign-in screen rather than showing a broken page.

---

### User Story 3 - Administrator signs out (Priority: P3)

An administrator chooses to sign out. The dashboard ends the session, discards the stored access credential locally, and returns to the sign-in screen. The previous session credential can no longer be used to reach the dashboard.

**Why this priority**: Sign-out is important for shared or public computers and for basic account hygiene, but the dashboard is operable without it. It builds on Stories 1 and 2.

**Independent Test**: Sign in, use the sign-out control, confirm the sign-in screen is shown, then confirm that attempting to reuse the prior session (e.g. via a stored credential or back navigation) does not grant access.

**Acceptance Scenarios**:

1. **Given** a signed-in administrator, **When** they activate the sign-out control, **Then** the session-end request is sent, the stored credential is removed locally, and the sign-in screen is shown.
2. **Given** an administrator who has signed out, **When** they reload the dashboard, **Then** the sign-in screen is shown and no authenticated content is briefly visible.
3. **Given** an administrator whose session-end request fails (e.g. no connectivity or the credential is already invalid), **When** the failure occurs, **Then** the local session is still cleared and the administrator is returned to the sign-in screen.
4. **Given** an administrator signed in on the dashboard, **When** they sign out, **Then** the credential used for that session is rejected if presented again.

---

### Edge Cases

- **Non-admin with valid credentials**: valid identifier/password but role is not administrator — access refused at sign-in and again on session restore; no session persisted; the credential issued for that attempt is invalidated with the authentication service on a best-effort basis.
- **Incorrect credentials**: unknown identifier or wrong password — single generic "sign-in details are incorrect" message, no field-level disclosure of which part was wrong.
- **Empty submission**: missing identifier and/or password — blocked client-side with per-field messages; no request sent.
- **Rate limiting**: too many failed attempts from the same account or the same origin in a short window — administrator is told to wait; the message does not expose exact limits or counters.
- **Expired or revoked stored credential on startup**: current-account lookup is rejected with HTTP 401 — stored credential discarded, sign-in screen shown, no error toast.
- **Connectivity/server failure during startup restore**: the current-account lookup cannot complete (offline, timeout, 5xx) — the dashboard shows the sign-in screen with no error toast and retains the stored credential; a later reopen with connectivity restores the session silently (FR-014a).
- **Role downgraded since last sign-in**: account was an administrator, now is not — detected on the next startup restore (`GET /auth/me` returns a non-administrator role → FR-015). The dashboard does not poll for role changes mid-session; a downgrade that does not cause an authentication failure takes effect on the next reload/reopen.
- **Session lost mid-session**: an in-app action is rejected as unauthenticated — dashboard ends the local session and redirects to sign-in without a broken/blank view.
- **Network failure during sign-in**: request cannot complete — administrator sees a retryable "connection problem" message and remains on the sign-in screen; no partial session created.
- **Network failure during sign-out**: local session cleared regardless; administrator is signed out from the dashboard's perspective.
- **Double submission**: submit pressed repeatedly or Enter held — only one sign-in request is sent; control is disabled while in flight.
- **Reload during an in-flight sign-in**: no partially authenticated state persists; administrator lands on either the sign-in screen or the authenticated area, never an ambiguous state.
- **Server-side unexpected error during any of the three actions**: administrator sees a generic "something went wrong, please try again" message and the dashboard remains in a consistent signed-in or signed-out state.
- **Multiple open tabs**: signing out or losing the session in one tab clears the shared stored credential; other open dashboard tabs detect this and return to the sign-in screen without showing stale authenticated content.

## Requirements *(mandatory)*

### Functional Requirements

#### Sign-in

- **FR-001**: The dashboard MUST present a sign-in screen to any visitor who does not have a valid active session.
- **FR-002**: The sign-in screen MUST collect exactly two inputs: an identifier (accepting either an email address or a phone number) and a password.
- **FR-003**: The dashboard MUST require both the identifier and the password to be non-empty before a sign-in attempt is sent, and MUST flag each missing field.
- **FR-004**: On a sign-in attempt, the dashboard MUST authenticate the supplied credentials against the authentication service and, on success, obtain the account profile and an access credential for subsequent requests.
- **FR-005**: The dashboard MUST grant access only when the authenticated account's role is administrator (the backend represents this as the exact value `admin` in `data.user.role`); for any other role it MUST refuse access, MUST NOT persist a session, MUST call the authentication service to invalidate the credential that was just issued for that sign-in, and MUST show a message that the account is not permitted to use the admin dashboard. Failure of the invalidation call MUST NOT change the refusal outcome or the message shown.
- **FR-006**: On successful administrator sign-in, the dashboard MUST store the access credential in persistent client storage so the session survives a page reload and a full browser close/reopen, remaining valid until the backend credential expires or is revoked, and MUST make the account profile (identifier, first and last name, email, phone, role, status, email-verified flag, avatar) available to the interface.
- **FR-007**: The dashboard MUST show a single generic error when credentials are rejected as incorrect, without indicating whether the identifier or the password was the problem.
- **FR-008**: The dashboard MUST detect when a sign-in attempt is refused for exceeding the allowed number of attempts and MUST tell the administrator to wait and try again later.
- **FR-009**: While a sign-in attempt is in progress, the dashboard MUST disable the submit control and indicate progress so that no duplicate attempt is sent.
- **FR-010**: If a sign-in attempt fails due to a connectivity or unexpected server error, the dashboard MUST keep the administrator on the sign-in screen, show a retryable message, and MUST NOT create any partial session.

#### Session restoration

- **FR-011**: On startup, if a stored access credential exists, the dashboard MUST attempt to retrieve the current account before showing authenticated content.
- **FR-012**: If the current-account retrieval succeeds and the role is administrator, the dashboard MUST restore the session and show the authenticated area without prompting for credentials.
- **FR-013**: If no stored access credential exists on startup, the dashboard MUST show the sign-in screen immediately and MUST NOT surface a failed background request to the user.
- **FR-014**: If the stored credential is definitively rejected (HTTP 401 — expired, revoked, or invalid) during startup retrieval, the dashboard MUST discard the stored credential and show the sign-in screen without an error toast.
- **FR-014a**: If startup current-account retrieval fails for a non-authentication reason (server error 5xx, connectivity failure, or timeout), the dashboard MUST show the sign-in screen without an error toast, MUST NOT display authenticated content while validity is unconfirmed, and MUST retain the stored credential so a subsequent startup can retry the restore.
- **FR-015**: If the restored account's role is not administrator, the dashboard MUST treat the session as invalid, discard the stored credential, call the authentication service to invalidate that credential (failure of that call does not change the outcome), and show the not-permitted message. This role check occurs on every startup restore; the dashboard does not re-verify role during an already-established session.
- **FR-016**: If any authenticated request during a live session is rejected as unauthenticated, the dashboard MUST end the local session and return the administrator to the sign-in screen without leaving a broken view.
- **FR-017**: The dashboard MUST NOT briefly display authenticated content before session validity has been confirmed on startup.

#### Sign-out

- **FR-018**: The dashboard MUST provide a sign-out control that is available whenever an administrator is signed in.
- **FR-019**: On sign-out, the dashboard MUST request that the current session be invalidated by the authentication service.
- **FR-020**: On sign-out, the dashboard MUST remove the stored access credential and any cached account profile locally, regardless of whether the invalidation request succeeded.
- **FR-021**: After sign-out, the dashboard MUST show the sign-in screen and MUST NOT allow authenticated content to remain visible or be reached by navigating back.

#### Cross-cutting

- **FR-022**: The dashboard MUST attach the stored access credential to every request that requires authentication while a session is active.
- **FR-023**: The dashboard MUST interpret the standard response envelope, using its status and message fields to drive success and error handling, and surfacing field-level validation messages where present.
- **FR-024**: For unexpected server errors on any authentication action initiated by the administrator (sign-in, sign-out), the dashboard MUST show a generic "please try again" message and MUST remain in a consistent signed-in or signed-out state. The automatic startup restore is not an administrator-initiated action and is governed by FR-014/FR-014a instead.
- **FR-025**: The dashboard MUST NOT log, display, or transmit the password anywhere other than the single sign-in request, and MUST NOT persist the password.
- **FR-026**: When the stored access credential is cleared in one browser tab (by sign-out or by session-loss handling), every other open dashboard tab in the same browser profile MUST detect the change and return to the sign-in screen promptly, without waiting for its own next authenticated request to fail. A fresh sign-in in one tab is not required to re-authenticate other tabs.
- **FR-027**: The sign-in screen and all authentication error, validation, and loading states MUST meet WCAG 2.1 AA: form fields have programmatic labels, the flow is fully keyboard operable with a visible focus indicator, and sign-in errors, the rate-limit message, and validation messages are announced to assistive technology.

### Key Entities *(include if feature involves data)*

- **Administrator account**: The person authorised to operate the admin dashboard. Key attributes: unique identifier, first name, last name, email, phone, role (must be exactly `admin` — the backend's value for an administrator — for access), account status (e.g. active), email-verified flag, optional avatar. The role attribute is the sole gate for dashboard access.
- **Session / access credential**: A time-limited credential issued on successful sign-in that represents the administrator's authenticated session. It is stored by the dashboard to survive reloads, presented on every authenticated request, and invalidated on sign-out or when rejected by the service.
- **Sign-in attempt**: A single submission of an identifier and password. Attempts are counted per account and per origin; exceeding the allowed number within a short window causes further attempts to be temporarily refused.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A returning administrator can go from opening the dashboard to a working authenticated view in under 15 seconds and no more than one screen of input (identifier + password + submit).
- **SC-002**: On reopening or reloading the dashboard with a valid session, the administrator reaches the authenticated view without re-entering credentials in at least 99% of reloads where the session is still valid.
- **SC-003**: 100% of sign-in attempts with valid non-administrator credentials are refused, with no session persisted and a clear not-permitted message shown.
- **SC-004**: 100% of sign-out actions result in the previous session credential being unusable and the sign-in screen being shown, including when the sign-out network request fails.
- **SC-005**: When a session becomes invalid mid-use, the administrator is returned to the sign-in screen on the next action in 100% of cases, with no blank or broken screen.
- **SC-006**: Incorrect-credential errors never disclose which field was wrong; a review of all sign-in error messages shows a single generic message for every incorrect-credential case.
- **SC-007**: Duplicate sign-in requests are never sent from a single submission, verified by observing exactly one request per submit action under rapid repeated clicks.
- **SC-008**: No authenticated content is rendered before session validation completes on startup, verified across repeated cold loads.
- **SC-009**: The sign-in screen and its error, validation, and loading states pass a WCAG 2.1 AA audit with zero AA-level violations, including keyboard-only completion of a full sign-in and assistive-technology announcement of every auth error and the rate-limit message.

## Assumptions

- The backend authentication endpoints described in `admin-dashboard-api.md` Phase 1 (sign-in, current-account, sign-out) already exist and behave as documented, including the shared success/error envelope and the status codes 401, 403, 404, 422, 429, 500.
- This feature covers only the admin dashboard web client's authentication and session behaviour; it does not include building or changing the backend, other user roles' apps, or any screen beyond sign-in and the authenticated shell.
- Authentication is single-factor (identifier + password). Multi-factor authentication, "remember me" duration controls, social sign-in, password reset, and account registration are out of scope for this phase.
- The identifier field accepts either an email address or a phone number; the client does not need to determine which format was entered before submitting.
- The access credential is stored on the client in persistent storage so the session persists across page reloads and full browser restarts within the same browser profile; the exact storage mechanism is an implementation detail.
- Session lifetime and the exact attempt-throttling thresholds are owned by the backend; the client only reacts to the responses it receives. There is no client-side inactivity auto-logout in this phase; the session ends only on explicit sign-out, backend credential expiry or revocation, or a request rejected as unauthenticated.
- The dashboard is a web application used on modern desktop browsers; a signed-out state is the default whenever session validity cannot be confirmed.
- An optional device token may be included with the sign-out request when available; its absence does not block sign-out.
- Localisation: user-facing messages follow the dashboard's existing language conventions; wording in this spec is descriptive, not final copy.

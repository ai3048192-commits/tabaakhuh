# Feature Specification: Cook Applications Review

**Feature Branch**: `002-cook-applications-review`

**Created**: 2026-09-07

**Status**: Draft

**Input**: User description: "Phase 2 — Cook Applications Review (from admin-dashboard-api.md). Goal: let an administrator review pending cook applications and approve them or reject them with a mandatory reason. All endpoints live under /admin and require an administrator session. GET /admin/cooks/pending returns the list of cook profiles whose approval_status is pending, each with its verification documents (national ID front/back, avatar, banner) and, when present, the signed contract (template version, signed file, signed date); contract may be null when the cook has not signed yet. POST /admin/cooks/{id}/approve (id = cook_profile.id, no body) approves an application and returns the updated profile with approval_status approved. POST /admin/cooks/{id}/reject takes a required reason (string, 1..1000 chars) and returns the updated profile with approval_status rejected and rejection_reason filled. Errors: 404 application not found, 422 application is not in pending state, 422 reason missing on reject. Standard success/error envelope."

## Clarifications

### Session 2026-09-07

- Q: Roughly how many cook applications should the pending queue be built to display at once without pagination or incremental loading? → A: Moderate — up to ~200 in one response; the dashboard renders them as a plain list and must stay responsive at that size, without virtualization or client-side paging.
- Q: In what order should the pending applications appear in the queue? → A: Oldest first (first-come-first-served) — ordered by contract signed date ascending, and for applications with no signed contract yet, by the application's creation/submission time; this order is applied client-side and is stable across refreshes.
- Q: For the "service city" shown on each application (data carries only a city reference, not a name), what must this phase do? → A: Resolve the reference to a human-readable city name using the platform's city list; this phase takes on a read dependency on that city data. If a reference has no match, fall back to showing the raw reference.
- Q: How should an administrator open and inspect a verification document (national ID front/back, photo, banner)? → A: In-dashboard overlay/lightbox viewer that stays within the authenticated session, with zoom and keyboard navigation between that application's documents. The signed contract (a PDF) opens in the dashboard's document viewer, or a new browser tab only if in-overlay PDF rendering is not feasible.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Administrator reviews the queue of pending cook applications (Priority: P1)

An administrator opens the cook applications area of the dashboard and sees every cook whose application is awaiting a decision. For each applicant they can read the kitchen/store details the cook submitted and open each verification document (national ID front, national ID back, profile photo, storefront banner) in an in-dashboard viewer they can zoom until the applicant's identity details are legible. When the applicant has signed the platform contract, the administrator can see which contract version was signed, when it was signed, and open the signed document; when no contract has been signed yet, the entry says so clearly.

**Why this priority**: An administrator cannot make a sound approve/reject decision without seeing the application and its documents. With only this story implemented, an administrator can already triage and audit the pending pipeline, which is the minimum useful slice.

**Independent Test**: Sign in as an administrator, open the cook applications area, and confirm that all pending applications are listed with their submitted details, that every verification document opens and is legible, that a signed contract shows its version/date and opens, and that an application with no signed contract is clearly marked.

**Acceptance Scenarios**:

1. **Given** there are cook applications in the pending state, **When** the administrator opens the cook applications area, **Then** every pending application is listed oldest-first (by contract signed date, then by submission time for the not-yet-signed), and none that has already been approved or rejected appears.
2. **Given** a pending application is shown, **When** the administrator inspects it, **Then** the store name, bio, service city, area, address text, delivery radius, current open/closed state, and rating summary are all visible.
3. **Given** a pending application is shown, **When** the administrator opens the national ID front, national ID back, profile photo, and banner, **Then** each image opens in an in-dashboard viewer that can be zoomed until identity-document text is legible and navigated by keyboard, or a clear "document unavailable" message is shown if it cannot be loaded.
4. **Given** a pending application whose cook has signed the contract, **When** the administrator views it, **Then** the signed contract's template version and signed date are shown and the signed document can be opened.
5. **Given** a pending application whose cook has not signed the contract, **When** the administrator views it, **Then** the entry clearly indicates that no contract has been signed yet.
6. **Given** there are no applications in the pending state, **When** the administrator opens the area, **Then** an explicit "no applications awaiting review" state is shown rather than an empty screen.
7. **Given** the administrator is viewing the queue, **When** they refresh it, **Then** the list reflects the current pending applications, including any that were added or decided since it was last loaded.

---

### User Story 2 - Administrator approves a cook application (Priority: P2)

After reviewing an application, the administrator approves it. The application leaves the pending queue, the cook's status becomes approved, and the administrator sees confirmation. If the application was already decided by someone else in the meantime, or no longer exists, the administrator is told and the queue is brought up to date instead of a silent failure.

**Why this priority**: Approving is the primary throughput action that lets new cooks start operating on the platform. It depends on Story 1 for context but delivers the core business outcome of the phase.

**Independent Test**: With a pending application on screen, approve it, confirm it disappears from the pending queue and a success confirmation is shown, and confirm that re-attempting the same decision reports that it was already handled.

**Acceptance Scenarios**:

1. **Given** a pending application, **When** the administrator confirms approval, **Then** the decision is submitted, the application is removed from the pending queue, and a success confirmation naming the store is shown.
2. **Given** the administrator triggers approval, **When** the request is in progress, **Then** the approve and reject controls for that application are disabled and progress is indicated so the decision cannot be submitted twice.
3. **Given** an application that another administrator has already approved or rejected, **When** this administrator tries to approve it, **Then** they are told the application is no longer awaiting review and the queue is refreshed to remove it.
4. **Given** an application that no longer exists, **When** the administrator tries to approve it, **Then** they are told it could not be found and the queue is refreshed.
5. **Given** an approval request that fails due to connectivity or an unexpected server error, **When** the failure occurs, **Then** the application stays in the pending queue, no decision is recorded locally, and the administrator sees a retryable "please try again" message.
6. **Given** an approval requires explicit confirmation, **When** the administrator opens the approve action but cancels the confirmation, **Then** no decision is submitted and the application stays in the queue.

---

### User Story 3 - Administrator rejects a cook application with a reason (Priority: P3)

The administrator decides an application is not acceptable and rejects it. They must give a reason (for example, "ID photos are unreadable"). The reason is recorded with the decision, the application leaves the pending queue, and the cook's status becomes rejected. A rejection cannot be submitted without a reason.

**Why this priority**: Rejection with a documented reason keeps the pipeline clean and gives the cook actionable feedback, but the dashboard already delivers value with viewing and approval alone. It builds on Stories 1 and 2.

**Independent Test**: With a pending application on screen, start a rejection, confirm it cannot be submitted with an empty reason, enter a reason within the allowed length, submit, and confirm the application leaves the pending queue with the reason recorded.

**Acceptance Scenarios**:

1. **Given** a pending application, **When** the administrator chooses to reject it, **Then** they are asked for a reason before the decision can be submitted.
2. **Given** the reject reason field is empty or only whitespace, **When** the administrator tries to submit the rejection, **Then** the submission is blocked and the missing-reason field is flagged.
3. **Given** the administrator has entered a reason longer than the allowed maximum, **When** they try to submit, **Then** the submission is blocked or the input is prevented from exceeding the maximum, with the limit made clear.
4. **Given** a valid reason of allowed length, **When** the administrator confirms the rejection, **Then** the decision and reason are submitted, the application is removed from the pending queue, and a success confirmation is shown.
5. **Given** an application another administrator has already decided, **When** this administrator submits a rejection, **Then** they are told it is no longer awaiting review and the queue is refreshed.
6. **Given** a rejection request that fails due to connectivity or an unexpected server error, **When** the failure occurs, **Then** the application stays in the pending queue, no decision is recorded locally, the entered reason is preserved, and a retryable message is shown.

---

### Edge Cases

- **Application decided by another administrator between load and action**: approve/reject is refused because the application is not pending — the administrator sees a "no longer awaiting review" message and the queue reconciles by removing the entry.
- **Application not found on action**: the referenced application does not exist — the administrator is told it could not be found and the queue is refreshed.
- **Contract not yet signed**: the application is listed with a clear "no contract signed" indicator; approval and rejection are still available (contract signing is not a client-side precondition in this phase).
- **Verification document fails to load**: a document link is broken or unavailable — the administrator sees a "document unavailable" state for that item instead of a broken image, and can still act on the application.
- **Empty or whitespace-only reject reason**: blocked before any request is sent, with the field flagged.
- **Reject reason at or beyond the maximum length**: the administrator is kept at or under the maximum, with the limit communicated; an over-length reason is never submitted.
- **Rapid or repeated clicks on approve/reject**: only one decision request is sent per application; the controls are disabled while a decision is in flight.
- **Large pending queue**: with up to ~200 applications returned in a single response, the area remains scannable and responsive as a plain rendered list; each application's identity and key details stay discoverable without excessive scrolling or waiting, and no virtualization or client-side paging is required.
- **Session lost mid-review**: an approve/reject or queue request is rejected as unauthenticated — handled by the dashboard's session-loss behaviour (return to sign-in), consistent with the authentication feature; the administrator is not shown a broken view.
- **Non-administrator reaches the area**: access is refused; this area is only reachable within an administrator session.
- **Sensitive identity documents**: national ID images are shown only within an authenticated administrator session and are not retained by the dashboard after the administrator leaves the area.
- **Unknown or inactive service city**: an application's city reference has no match in the city list (or the city has been deactivated) — the application still displays, showing the resolved name when available or the raw reference as a fallback; it is never blocked from review.
- **City list unavailable**: the city list cannot be loaded — applications still display with the raw city reference in place of a name, and the queue and decision actions remain fully usable.
- **Unexpected server error on the queue request**: the administrator sees a generic "something went wrong, please try again" message and a way to retry, with no partial or stale list presented as authoritative.
- **Decision succeeds but the updated profile cannot be displayed**: the application is still treated as decided and removed from the pending queue; the administrator sees the success confirmation.

## Requirements *(mandatory)*

### Functional Requirements

#### Reviewing the pending queue

- **FR-001**: The dashboard MUST provide an area, reachable only within an administrator session, that lists every cook application whose approval status is pending.
- **FR-002**: The dashboard MUST NOT show applications that are already approved or rejected in the pending queue.
- **FR-003**: For each pending application, the dashboard MUST display the submitted store/kitchen details: store name, bio, service city (shown as a human-readable city name), area, address text, delivery radius, current open/closed state, and rating summary (average and count).
- **FR-003a**: The dashboard MUST resolve each application's city reference to a city name using the platform's city list (which includes inactive cities). If a reference has no matching city, the dashboard MUST fall back to showing the raw reference rather than a blank or an error.
- **FR-004**: For each pending application, the dashboard MUST let the administrator open the applicant's verification images — national ID front, national ID back, profile photo, and storefront banner — in an in-dashboard overlay viewer that remains within the authenticated session (the raw file URLs are not navigated to as top-level pages).
- **FR-004a**: The document viewer MUST support zooming an image to at least a level where identity-document text is legible, and MUST let the administrator move between that application's documents and close the viewer using the keyboard alone.
- **FR-005**: When a document cannot be loaded, the dashboard MUST show a clear "document unavailable" state for that item (both in the card and in the viewer) and MUST still allow the administrator to act on the application.
- **FR-006**: When a pending application has a signed contract, the dashboard MUST display the contract template version and the signed date, and MUST allow the signed contract document to be opened — in the dashboard's document viewer, or in a new browser tab only if rendering the PDF within the viewer is not feasible.
- **FR-007**: When a pending application has no signed contract, the dashboard MUST clearly indicate that no contract has been signed yet.
- **FR-008**: The dashboard MUST indicate how many applications are currently awaiting review.
- **FR-009**: When there are no pending applications, the dashboard MUST show an explicit empty-state message rather than a blank area.
- **FR-010**: The dashboard MUST allow the administrator to refresh the queue, and after any approve or reject action it MUST bring the displayed queue back in line with the current set of pending applications.
- **FR-011**: The dashboard MUST order the queue oldest-first (first-come-first-served): ascending by the contract signed date, and for applications with no signed contract, ascending by the application's creation/submission time (or, if no such timestamp is available in the data, ascending by application identifier as a creation-order proxy). This order MUST be applied by the dashboard and MUST be stable across refreshes so the same applications appear in the same sequence.
- **FR-011a**: The dashboard MUST render the full set of pending applications returned in one response (expected up to ~200) as a single plain list that stays responsive to scrolling and interaction, without pagination, incremental loading, or virtualization.

#### Approving an application

- **FR-012**: The dashboard MUST provide an approve action for each pending application that requires no additional input beyond an explicit confirmation.
- **FR-013**: The dashboard MUST require the administrator to confirm an approval before the decision is submitted, and MUST NOT submit the decision if the confirmation is cancelled.
- **FR-014**: On a confirmed approval, the dashboard MUST submit the decision for that application, and on success MUST remove the application from the pending queue and show a success confirmation identifying the store.
- **FR-015**: While an approval decision is in progress, the dashboard MUST disable the approve and reject controls for that application and indicate progress so the decision cannot be submitted more than once.

#### Rejecting an application

- **FR-016**: The dashboard MUST provide a reject action for each pending application that collects a free-text reason before the decision can be submitted.
- **FR-017**: The dashboard MUST prevent a rejection from being submitted when the reason is empty or contains only whitespace, and MUST flag the missing reason.
- **FR-018**: The dashboard MUST prevent a rejection reason longer than the allowed maximum from being submitted, and MUST make the length limit visible to the administrator.
- **FR-019**: On a confirmed rejection with a valid reason, the dashboard MUST submit the decision and reason for that application, and on success MUST remove the application from the pending queue and show a success confirmation.
- **FR-020**: If a rejection request fails, the dashboard MUST preserve the reason the administrator entered so it does not have to be retyped.
- **FR-021**: While a rejection decision is in progress, the dashboard MUST disable the approve and reject controls for that application and indicate progress so the decision cannot be submitted more than once.

#### Decision outcome handling (approve and reject)

- **FR-022**: If a decision is refused because the application is no longer in the pending state, the dashboard MUST tell the administrator the application is no longer awaiting review and MUST refresh the queue to remove it.
- **FR-023**: If a decision is refused because the application cannot be found, the dashboard MUST tell the administrator it could not be found and MUST refresh the queue.
- **FR-024**: If a decision request fails due to connectivity or an unexpected server error, the dashboard MUST leave the application in the pending queue, MUST NOT record the decision locally, and MUST show a retryable "please try again" message.
- **FR-025**: If a decision succeeds but the updated application details cannot be displayed, the dashboard MUST still treat the application as decided, remove it from the pending queue, and show the success confirmation.

#### Cross-cutting

- **FR-026**: Every request the dashboard makes for this feature MUST carry the administrator's active session credential, and MUST rely on the dashboard's shared session-loss handling (return to the sign-in screen) when a request is rejected as unauthenticated.
- **FR-027**: The dashboard MUST interpret the standard response envelope for this feature, using its status and message fields to drive success and error handling and surfacing field-level validation messages (such as a missing reason) where present.
- **FR-028**: The dashboard MUST NOT retain the applicants' verification documents (in particular national ID images) after the administrator navigates away from the cook applications area, and MUST only display them within an authenticated administrator session.
- **FR-029**: For unexpected server errors on any action in this feature, the dashboard MUST show a generic "something went wrong, please try again" message and MUST keep the queue in a consistent state (no half-applied decisions shown).
- **FR-030**: The cook applications area, including the document viewer, the approval confirmation, the rejection reason entry, and all error, empty, and loading states, MUST meet WCAG 2.1 AA: controls and fields have programmatic labels, the flow is fully keyboard operable with a visible focus indicator, the document viewer and every dialog trap and restore focus and are dismissible by keyboard, image documents have meaningful alternative text identifying which document they are, and success and error messages (including the missing-reason and "no longer awaiting review" messages) are announced to assistive technology.

### Key Entities *(include if feature involves data)*

- **Cook application**: A cook's request to operate on the platform, identified by the cook profile identifier used for decisions. Key attributes: store name, bio, profile photo, storefront banner, national ID front image, national ID back image, service city reference, area, address text, geographic location, delivery radius, current open/closed state, approval status (pending, approved, or rejected), rejection reason (set only when rejected), rating average, rating count. Only applications with approval status pending are in scope for this feature.
- **Signed contract**: The platform agreement a cook has signed as part of applying. Key attributes: template version, signed document, signed date. Optional — absent until the cook signs.
- **Review decision**: An administrator's ruling on one pending application. Either an approval (no additional data) or a rejection carrying a reason of 1 to 1000 characters. A decision can only be made while the application is pending; once made it moves the application out of the pending queue.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An administrator can open any pending application's four verification documents in the in-dashboard viewer and, using zoom, judge them legible within 10 seconds of opening the application, without leaving the dashboard.
- **SC-002**: 100% of successful approve and reject actions remove the application from the pending queue without a manual page reload.
- **SC-003**: 100% of rejections recorded include a non-empty reason; a rejection with no reason is never submitted.
- **SC-004**: When an application has already been decided by another administrator, 100% of subsequent decision attempts on it are reported to the administrator and result in the entry being removed from the queue, with no incorrect "success" shown.
- **SC-005**: Duplicate decision requests are never sent for a single application from repeated clicks, verified by observing exactly one request per confirmed decision under rapid repeated activation.
- **SC-006**: An administrator can process a queue of 20 pending applications — inspecting documents and recording a decision on each — in a single session without page reloads or losing their place in the queue.
- **SC-006a**: With ~200 pending applications in the queue, the list becomes usable (scrollable and interactive) within 3 seconds of the data arriving, and scrolling stays smooth with no perceptible stutter.
- **SC-007**: After the administrator leaves the cook applications area, none of the viewed verification documents remain retrievable from the dashboard.
- **SC-008**: The cook applications area and all its dialogs and states pass a WCAG 2.1 AA audit with zero AA-level violations, including keyboard-only completion of an approval and a rejection and assistive-technology announcement of every success and error message.

## Assumptions

- The backend endpoints described in `admin-dashboard-api.md` Phase 2 (`GET /admin/cooks/pending`, `POST /admin/cooks/{id}/approve`, `POST /admin/cooks/{id}/reject`) already exist and behave as documented, including the shared success/error envelope and the status codes 401, 403, 404, and 422.
- This feature covers only the admin dashboard web client's behaviour for reviewing pending cook applications. It does not include the backend, the cooks' own application flow, notifications to cooks, or any screen for browsing already approved or rejected cooks.
- The administrator session, sign-in, and session-loss handling are provided by the Admin Authentication & Session feature (Phase 1) and are reused here rather than redefined.
- The pending list endpoint returns the full set of pending applications in one response with no pagination; the realistic ceiling is ~200 applications, which the dashboard renders as a single plain list (no virtualization or client-side paging) while keeping it scannable and responsive.
- The identifier used in the approve and reject requests is the cook profile identifier carried in each list entry.
- Queue ordering relies on the contract signed date for signed applications; for not-yet-signed applications the documented list payload has no submission timestamp, so the dashboard falls back to ascending application identifier as a creation-order proxy unless the backend adds a submission/created timestamp.
- The maximum rejection reason length enforced by the client matches the backend limit of 1000 characters; the minimum is a single non-whitespace character.
- The service city is referenced by identifier in the application data. This phase takes on a read dependency on the platform's city list (as covered by Cities Management, Phase 5) to resolve those references to names; the list is assumed to include inactive cities. When the list or a specific entry is unavailable, the raw reference is shown instead, and this never blocks review.
- Approving or rejecting is a consequential action, so an explicit confirmation step is included even though the backend requires no confirmation field.
- The rejection reason is surfaced to the cook by the backend; how the cook receives it is out of scope for this feature.
- User-facing wording in this spec is descriptive, not final copy, and follows the dashboard's existing language conventions.

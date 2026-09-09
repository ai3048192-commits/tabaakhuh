# Feature Specification: Driver Applications Review

**Feature Branch**: `003-driver-applications-review`

**Created**: 2026-09-07

**Status**: Draft

**Input**: User description: "Phase 3 — Driver Applications Review (from admin-dashboard-api.md). Goal: let an administrator review pending driver applications and approve them or reject them with a mandatory reason. All endpoints live under /admin and require an administrator session. GET /admin/drivers/pending returns the list of driver profiles whose approval_status is pending, each with its vehicle details (type, model, year, colour, plate number, plate letters), the driver's city reference and birth date, submission timestamp, availability flag, rating summary, and its three verification documents (national ID front, national ID back, driving licence). POST /admin/drivers/{id}/approve (id = driver_profile.id, no body) approves an application and returns the updated profile with approval_status approved. POST /admin/drivers/{id}/reject takes a required reason (string, 1..1000 chars) and returns the updated profile with approval_status rejected and rejection_reason filled. Errors: 404 application not found, 422 application is not in pending state, 422 reason missing on reject. Standard success/error envelope. UI: a Driver Applications page consistent with the existing Phase 1 auth and Phase 2 cook-applications-review screens, listing pending applications as cards/rows with identity and vehicle details and thumbnail links to the three documents that open full size, Approve and Reject actions (Reject opens a modal requiring a 1–1000 char reason), post-action refetch so a decided application leaves the pending list, success/error toasts from the envelope message, empty and loading states, reusing the existing API client, auth guard, layout/sidebar, and toast infrastructure."

## Clarifications

### Session 2026-09-07

- Q: When the administrator opens one of an applicant's three documents (national ID front/back, driving licence), should each open inside the dashboard in an overlay/lightbox, or in a new browser tab at full size? → A: In-dashboard overlay/lightbox viewer with zoom, keyboard navigation between that application's documents, and dismiss-by-keyboard (matches the Phase 2 cook-review viewer); raw file URLs are not opened as top-level pages, keeping the non-retention and in-session-only constraints.
- Q: Before an approval is submitted, must the administrator pass through an explicit confirmation step, or should one click on Approve submit immediately? → A: Explicit confirmation prompt/dialog before the approval request is sent; cancelling submits nothing (matches the Phase 2 cook-review flow).
- Q: Should the dashboard evaluate birth date against a minimum-age rule and flag under-age applicants, or display birth date as reference only? → A: Display birth date as reference only; no minimum-age calculation, warning, or Approve gate on the client (eligibility rules stay with the backend).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Administrator reviews the queue of pending driver applications (Priority: P1)

An administrator opens the driver applications area of the dashboard and sees every driver whose application is awaiting a decision. For each applicant they can read the vehicle and identity details the driver submitted — vehicle type, model, year, colour, plate number and plate letters, service city, and birth date — and open each verification document (national ID front, national ID back, driving licence) in an in-dashboard viewer they can zoom until the applicant's identity and licence details are legible. The applicant's submission date and rating summary are shown so the administrator can see how long the application has been waiting.

**Why this priority**: An administrator cannot make a sound approve/reject decision without seeing the application and its documents. With only this story implemented, an administrator can already triage and audit the pending driver pipeline, which is the minimum useful slice.

**Independent Test**: Sign in as an administrator, open the driver applications area, and confirm that all pending applications are listed with their submitted vehicle and identity details, that every verification document opens and is legible, and that an application with no pending applications shows an explicit empty state.

**Acceptance Scenarios**:

1. **Given** there are driver applications in the pending state, **When** the administrator opens the driver applications area, **Then** every pending application is listed oldest-first by submission date, and none that has already been approved or rejected appears.
2. **Given** a pending application is shown, **When** the administrator inspects it, **Then** the driver identifier, vehicle type, vehicle model, vehicle year, vehicle colour, plate number, plate letters, service city, birth date, current availability state, submission date, and rating summary (average and count) are all visible.
3. **Given** a pending application is shown, **When** the administrator opens the national ID front, national ID back, and driving licence, **Then** each image opens in an in-dashboard viewer that can be zoomed until identity-document and licence text is legible and navigated by keyboard, or a clear "document unavailable" message is shown if it cannot be loaded.
4. **Given** there are no applications in the pending state, **When** the administrator opens the area, **Then** an explicit "no applications awaiting review" state is shown rather than an empty screen.
5. **Given** the administrator is viewing the queue, **When** they refresh it, **Then** the list reflects the current pending applications, including any that were added or decided since it was last loaded.
6. **Given** an application whose city reference has no match in the platform's city list, **When** it is displayed, **Then** the raw city reference is shown as a fallback and the application is still fully reviewable.

---

### User Story 2 - Administrator approves a driver application (Priority: P2)

After reviewing an application, the administrator approves it. The application leaves the pending queue, the driver's status becomes approved, and the administrator sees confirmation. If the application was already decided by someone else in the meantime, or no longer exists, the administrator is told and the queue is brought up to date instead of a silent failure.

**Why this priority**: Approving is the primary throughput action that lets new drivers start operating on the platform. It depends on Story 1 for context but delivers the core business outcome of the phase.

**Independent Test**: With a pending application on screen, approve it, confirm it disappears from the pending queue and a success confirmation is shown, and confirm that re-attempting the same decision reports that it was already handled.

**Acceptance Scenarios**:

1. **Given** a pending application, **When** the administrator confirms approval, **Then** the decision is submitted, the application is removed from the pending queue, and a success confirmation is shown.
2. **Given** the administrator triggers approval, **When** the request is in progress, **Then** the approve and reject controls for that application are disabled and progress is indicated so the decision cannot be submitted twice.
3. **Given** an application that another administrator has already approved or rejected, **When** this administrator tries to approve it, **Then** they are told the application is no longer awaiting review and the queue is refreshed to remove it.
4. **Given** an application that no longer exists, **When** the administrator tries to approve it, **Then** they are told it could not be found and the queue is refreshed.
5. **Given** an approval request that fails due to connectivity or an unexpected server error, **When** the failure occurs, **Then** the application stays in the pending queue, no decision is recorded locally, and the administrator sees a retryable "please try again" message.
6. **Given** an approval requires explicit confirmation, **When** the administrator opens the approve action but cancels the confirmation, **Then** no decision is submitted and the application stays in the queue.

---

### User Story 3 - Administrator rejects a driver application with a reason (Priority: P3)

The administrator decides an application is not acceptable and rejects it. They must give a reason (for example, "licence has expired"). The reason is captured in a modal and recorded with the decision, the application leaves the pending queue, and the driver's status becomes rejected. A rejection cannot be submitted without a reason.

**Why this priority**: Rejection with a documented reason keeps the pipeline clean and gives the driver actionable feedback, but the dashboard already delivers value with viewing and approval alone. It builds on Stories 1 and 2.

**Independent Test**: With a pending application on screen, start a rejection, confirm the modal cannot be submitted with an empty reason, enter a reason within the allowed length, submit, and confirm the application leaves the pending queue with the reason recorded.

**Acceptance Scenarios**:

1. **Given** a pending application, **When** the administrator chooses to reject it, **Then** a modal opens asking for a reason before the decision can be submitted.
2. **Given** the reject reason field is empty or only whitespace, **When** the administrator tries to submit the rejection, **Then** the submission is blocked and the missing-reason field is flagged.
3. **Given** the administrator has entered a reason longer than the allowed maximum, **When** they try to submit, **Then** the submission is blocked or the input is prevented from exceeding the maximum, with the limit made clear.
4. **Given** a valid reason of allowed length, **When** the administrator confirms the rejection, **Then** the decision and reason are submitted, the application is removed from the pending queue, and a success confirmation is shown.
5. **Given** an application another administrator has already decided, **When** this administrator submits a rejection, **Then** they are told it is no longer awaiting review and the queue is refreshed.
6. **Given** a rejection request that fails due to connectivity or an unexpected server error, **When** the failure occurs, **Then** the application stays in the pending queue, no decision is recorded locally, the entered reason is preserved in the modal, and a retryable message is shown.
7. **Given** the administrator has opened the reject modal, **When** they cancel or dismiss it, **Then** no decision is submitted and the application stays in the queue.

---

### Edge Cases

- **Application decided by another administrator between load and action**: approve/reject is refused because the application is not pending — the administrator sees a "no longer awaiting review" message and the queue reconciles by removing the entry.
- **Application not found on action**: the referenced application does not exist — the administrator is told it could not be found and the queue is refreshed.
- **Verification document fails to load**: a document link is broken or unavailable — the administrator sees a "document unavailable" state for that item instead of a broken image, and can still act on the application.
- **Empty or whitespace-only reject reason**: blocked before any request is sent, with the field flagged.
- **Reject reason at or beyond the maximum length**: the administrator is kept at or under the maximum (1000 characters), with the limit communicated; an over-length reason is never submitted.
- **Rapid or repeated clicks on approve/reject**: only one decision request is sent per application; the controls are disabled while a decision is in flight.
- **Large pending queue**: with the full set of pending applications returned in a single unpaginated response (expected up to ~200), the area remains scannable and responsive as a plain rendered list, with no virtualization or client-side paging required.
- **Session lost mid-review**: an approve/reject or queue request is rejected as unauthenticated — handled by the dashboard's shared session-loss behaviour (return to sign-in), consistent with the authentication feature; the administrator is not shown a broken view.
- **Non-administrator reaches the area**: access is refused; this area is only reachable within an administrator session, and a signed-in user whose role is not administrator is denied.
- **Sensitive identity documents**: national ID and licence images are shown only within an authenticated administrator session and are not retained by the dashboard after the administrator leaves the area.
- **Unknown or inactive service city**: an application's city reference has no match in the city list (or the city has been deactivated) — the application still displays, showing the resolved name when available or the raw reference as a fallback; it is never blocked from review.
- **City list unavailable**: the city list cannot be loaded — applications still display with the raw city reference in place of a name, and the queue and decision actions remain fully usable.
- **Unexpected server error on the queue request**: the administrator sees a generic "something went wrong, please try again" message and a way to retry, with no partial or stale list presented as authoritative.
- **Decision succeeds but the updated profile cannot be displayed**: the application is still treated as decided and removed from the pending queue; the administrator sees the success confirmation.
- **Missing or malformed vehicle field**: an individual vehicle detail (for example plate letters or vehicle year) is absent in the payload — the card shows a neutral placeholder for that field and the rest of the application still renders and can be acted on.

## Requirements *(mandatory)*

### Functional Requirements

#### Reviewing the pending queue

- **FR-001**: The dashboard MUST provide a Driver Applications area, reachable only within an administrator session, that lists every driver application whose approval status is pending.
- **FR-002**: The dashboard MUST NOT show applications that are already approved or rejected in the pending queue.
- **FR-003**: For each pending application, the dashboard MUST display the submitted identity and vehicle details: driver identifier, vehicle type, vehicle model, vehicle year, vehicle colour, plate number, plate letters, service city (shown as a human-readable city name), birth date, current availability state, submission date, and rating summary (average and count).
- **FR-003a**: The dashboard MUST resolve each application's city reference to a city name using the platform's city list (which includes inactive cities). If a reference has no matching city, the dashboard MUST fall back to showing the raw reference rather than a blank or an error.
- **FR-003b**: When an individual identity or vehicle field is missing or empty in the data, the dashboard MUST show a neutral placeholder for that field and MUST still render and allow action on the rest of the application.
- **FR-003c**: The dashboard MUST display the applicant's birth date as reference information only. It MUST NOT compute the applicant's age, MUST NOT show an age-based warning, and MUST NOT gate or disable the approve action based on age; driver eligibility rules remain with the backend.
- **FR-004**: For each pending application, the dashboard MUST let the administrator open the applicant's three verification images — national ID front, national ID back, and driving licence — in an in-dashboard overlay viewer that remains within the authenticated session (the raw file URLs are not navigated to as top-level pages).
- **FR-004a**: The document viewer MUST support zooming an image to at least a level where identity-document and licence text is legible, and MUST let the administrator move between that application's documents and close the viewer using the keyboard alone.
- **FR-005**: When a document cannot be loaded, the dashboard MUST show a clear "document unavailable" state for that item (both in the card and in the viewer) and MUST still allow the administrator to act on the application.
- **FR-006**: The dashboard MUST indicate how many applications are currently awaiting review.
- **FR-007**: When there are no pending applications, the dashboard MUST show an explicit empty-state message rather than a blank area.
- **FR-008**: The dashboard MUST show a loading state while the pending queue is being retrieved, distinct from the empty state.
- **FR-009**: The dashboard MUST allow the administrator to refresh the queue, and after any approve or reject action it MUST re-retrieve the pending applications so the displayed queue reflects the current set.
- **FR-010**: The dashboard MUST order the queue oldest-first by the application's submission date (ascending). Where two applications share a submission date, the order MUST be deterministic (for example, by ascending application identifier) and stable across refreshes.
- **FR-011**: The dashboard MUST render the full set of pending applications returned in one response (expected up to ~200) as a single plain list that stays responsive to scrolling and interaction, without pagination, incremental loading, or virtualization.

#### Approving an application

- **FR-012**: The dashboard MUST provide an approve action for each pending application that requires no additional input beyond an explicit confirmation.
- **FR-013**: The dashboard MUST require the administrator to confirm an approval before the decision is submitted, and MUST NOT submit the decision if the confirmation is cancelled.
- **FR-014**: On a confirmed approval, the dashboard MUST submit the decision for that application, and on success MUST remove the application from the pending queue and show a success confirmation using the message returned in the response.
- **FR-015**: While an approval decision is in progress, the dashboard MUST disable the approve and reject controls for that application and indicate progress so the decision cannot be submitted more than once.

#### Rejecting an application

- **FR-016**: The dashboard MUST provide a reject action for each pending application that opens a modal collecting a free-text reason before the decision can be submitted.
- **FR-017**: The dashboard MUST prevent a rejection from being submitted when the reason is empty or contains only whitespace, and MUST flag the missing reason.
- **FR-018**: The dashboard MUST prevent a rejection reason longer than 1000 characters from being submitted, and MUST make the length limit visible to the administrator.
- **FR-019**: On a confirmed rejection with a valid reason (1 to 1000 characters), the dashboard MUST submit the decision and reason for that application, and on success MUST remove the application from the pending queue and show a success confirmation using the message returned in the response.
- **FR-020**: If a rejection request fails, the dashboard MUST preserve the reason the administrator entered in the modal so it does not have to be retyped.
- **FR-021**: While a rejection decision is in progress, the dashboard MUST disable the approve and reject controls for that application and the modal's submit control, and indicate progress so the decision cannot be submitted more than once.
- **FR-022**: The dashboard MUST let the administrator cancel or dismiss the reject modal without submitting a decision, leaving the application in the queue.

#### Decision outcome handling (approve and reject)

- **FR-023**: If a decision is refused because the application is no longer in the pending state, the dashboard MUST tell the administrator the application is no longer awaiting review and MUST refresh the queue to remove it.
- **FR-024**: If a decision is refused because the application cannot be found, the dashboard MUST tell the administrator it could not be found and MUST refresh the queue.
- **FR-025**: If a decision request fails due to connectivity or an unexpected server error, the dashboard MUST leave the application in the pending queue, MUST NOT record the decision locally, and MUST show a retryable "please try again" message.
- **FR-026**: If a decision succeeds but the updated application details cannot be displayed, the dashboard MUST still treat the application as decided, remove it from the pending queue, and show the success confirmation.
- **FR-027**: When a rejection is refused for a missing reason, the dashboard MUST surface the field-level validation message from the response envelope against the reason field.

#### Cross-cutting

- **FR-028**: Every request the dashboard makes for this feature MUST carry the administrator's active session credential, and MUST rely on the dashboard's shared session-loss handling (return to the sign-in screen) when a request is rejected as unauthenticated.
- **FR-029**: The Driver Applications area MUST be denied to a signed-in user whose role is not administrator, consistent with the rest of the admin dashboard.
- **FR-030**: The dashboard MUST interpret the standard response envelope for this feature, using its success flag and message to drive success and error toasts and surfacing field-level validation messages where present.
- **FR-031**: The dashboard MUST NOT retain the applicants' verification documents (in particular national ID and licence images) after the administrator navigates away from the driver applications area, and MUST only display them within an authenticated administrator session.
- **FR-032**: For unexpected server errors on any action in this feature, the dashboard MUST show a generic "something went wrong, please try again" message and MUST keep the queue in a consistent state (no half-applied decisions shown).
- **FR-033**: The Driver Applications area MUST reuse the dashboard's existing shell — the shared layout, sidebar navigation, API client, authentication guard, and toast infrastructure established in Phases 1 and 2 — and MUST add a sidebar entry for the area.
- **FR-034**: The driver applications area, including the document viewer, the approval confirmation, the rejection reason modal, and all error, empty, and loading states, MUST meet WCAG 2.1 AA: controls and fields have programmatic labels, the flow is fully keyboard operable with a visible focus indicator, the document viewer and every dialog trap and restore focus and are dismissible by keyboard, image documents have meaningful alternative text identifying which document they are, and success and error messages (including the missing-reason and "no longer awaiting review" messages) are announced to assistive technology.

### Key Entities *(include if feature involves data)*

- **Driver application**: A driver's request to operate on the platform, identified by the driver profile identifier used for decisions. Key attributes: driver identifier, vehicle type, vehicle model, vehicle year, vehicle colour, plate number, plate letters, national ID front image, national ID back image, driving licence image, service city reference, birth date, submission date, current availability state, approval status (pending, approved, or rejected), rejection reason (set only when rejected), rating average, rating count. Only applications with approval status pending are in scope for this feature.
- **Verification document**: An image an applicant submitted for identity and eligibility checks — national ID front, national ID back, or driving licence. Displayed only within an authenticated administrator session and not retained after the administrator leaves the area.
- **Review decision**: An administrator's ruling on one pending application. Either an approval (no additional data) or a rejection carrying a reason of 1 to 1000 characters. A decision can only be made while the application is pending; once made it moves the application out of the pending queue.
- **Service city**: A platform city referenced by identifier in the application data. Resolved to a human-readable name via the platform's city list (which includes inactive cities); when unresolved, the raw reference is shown.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An administrator can open any pending application's three verification documents in the in-dashboard viewer and, using zoom, judge them legible within 10 seconds of opening the application, without leaving the dashboard.
- **SC-002**: 100% of successful approve and reject actions remove the application from the pending queue without a manual page reload.
- **SC-003**: 100% of rejections recorded include a non-empty reason of at most 1000 characters; a rejection with no reason is never submitted.
- **SC-004**: When an application has already been decided by another administrator, 100% of subsequent decision attempts on it are reported to the administrator and result in the entry being removed from the queue, with no incorrect "success" shown.
- **SC-005**: Duplicate decision requests are never sent for a single application from repeated clicks, verified by observing exactly one request per confirmed decision under rapid repeated activation.
- **SC-006**: An administrator can process a queue of 20 pending applications — inspecting documents and recording a decision on each — in a single session without page reloads or losing their place in the queue.
- **SC-007**: With ~200 pending applications in the queue, the list becomes usable (scrollable and interactive) within 3 seconds of the data arriving, and scrolling stays smooth with no perceptible stutter.
- **SC-008**: After the administrator leaves the driver applications area, none of the viewed verification documents remain retrievable from the dashboard.
- **SC-009**: The driver applications area and all its dialogs and states pass a WCAG 2.1 AA audit with zero AA-level violations, including keyboard-only completion of an approval and a rejection and assistive-technology announcement of every success and error message.
- **SC-010**: Pending applications are always presented oldest-first by submission date, verified to be identical in order across consecutive refreshes with an unchanged dataset.

## Assumptions

- The backend endpoints described in `admin-dashboard-api.md` Phase 3 (`GET /admin/drivers/pending`, `POST /admin/drivers/{id}/approve`, `POST /admin/drivers/{id}/reject`) already exist and behave as documented, including the shared success/error envelope and the status codes 401, 403, 404, and 422.
- This feature covers only the admin dashboard web client's behaviour for reviewing pending driver applications. It does not include the backend, the drivers' own application flow, notifications to drivers, or any screen for browsing already approved or rejected drivers.
- The administrator session, sign-in, and session-loss handling are provided by the Admin Authentication & Session feature (Phase 1) and are reused here rather than redefined. The shared layout, sidebar, API client, and toast infrastructure from Phases 1 and 2 are reused.
- The pending list endpoint returns the full set of pending applications in one response with no pagination; consistent with the cook applications queue (Phase 2), the realistic ceiling is treated as ~200 applications, which the dashboard renders as a single plain list (no virtualization or client-side paging) while keeping it scannable and responsive.
- The identifier used in the approve and reject requests is the driver profile identifier carried in each list entry.
- Each list entry carries a submission timestamp, so the queue is ordered oldest-first by that timestamp; ties are broken by ascending application identifier for a deterministic, refresh-stable order.
- The maximum rejection reason length enforced by the client matches the backend limit of 1000 characters; the minimum is a single non-whitespace character.
- The three verification documents (national ID front, national ID back, driving licence) are images, so they are shown in the same in-dashboard overlay/lightbox viewer used for cook verification images in Phase 2, with zoom and keyboard navigation. There is no signed contract in the driver flow.
- The service city is referenced by identifier in the application data. This phase takes on a read dependency on the platform's city list (as covered by Cities Management, Phase 5) to resolve those references to names; the list is assumed to include inactive cities. When the list or a specific entry is unavailable, the raw reference is shown instead, and this never blocks review.
- Approving or rejecting is a consequential action, so an explicit confirmation step (a confirmation prompt for approve, the reason modal for reject) is included even though the backend requires no confirmation field.
- The rejection reason is surfaced to the driver by the backend; how the driver receives it is out of scope for this feature.
- Birth date is displayed for identity cross-checking only; this phase does not compute or enforce a minimum-age rule on the client.
- User-facing wording in this spec is descriptive, not final copy, and follows the dashboard's existing language conventions.

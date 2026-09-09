# Feature Specification: Withdrawals Management

**Feature Branch**: `004-withdrawals-management`

**Created**: 2026-09-07

**Status**: Draft

**Input**: User description: "Phase 4 — Withdrawals Management (إدارة السحوبات, from admin-dashboard-api.md). Goal: let an administrator manage the queue of balance-withdrawal requests raised by cooks and drivers — list them, approve them, reject them, and mark them paid once the money has actually been transferred. All endpoints live under /admin and require an administrator session. Request status lifecycle: pending → {approved, rejected}; approved → paid; rejected and paid are terminal. GET /admin/withdrawals returns a paginated list (per_page fixed at 20 by the backend, navigate via ?page=N) of withdrawal requests, each with id, amount, payment_details, status, requested_at, and processed_at (null until decided); an optional ?status= filter accepts pending | approved | rejected | paid, and an invalid value returns 422. POST /admin/withdrawals/{id}/approve (no body) returns the updated request with status approved and processed_at set; errors 404 not found, 422 current status does not allow the transition. POST /admin/withdrawals/{id}/reject (no body) returns the updated request with status rejected. POST /admin/withdrawals/{id}/mark-paid (no body) is used after approval and after the transfer has happened, and returns the updated request with status paid; error 422 when the request is not in approved status. Standard success/error envelope { success, data, message, errors }; status codes 401 unauthenticated, 403 non-admin, 404 not found, 422 validation / domain-rule violation, 500 unexpected. UI: a Withdrawals page consistent with the existing Phase 1–3 admin screens, with a status filter (all / pending / approved / rejected / paid), a paginated table showing id, amount, payment details, status badge, requested date, and processed date, plus contextual action buttons — Approve and Reject for pending rows, Mark Paid for approved rows — with actions that are not valid for a row's current status disabled or hidden, success and error toasts driven by the envelope message, and empty and loading states. Reuse the existing API client, auth guard, layout/sidebar, and toast infrastructure."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Administrator reviews the queue of withdrawal requests (Priority: P1)

An administrator opens the withdrawals area of the dashboard and sees the balance-withdrawal requests raised by cooks and drivers, one page at a time. For each request they can read the amount asked for, the payment details the requester supplied for the transfer, the current status, the date the request was made, and — once a decision has been taken — the date it was processed. The administrator can narrow the list to a single status (awaiting decision, approved, rejected, or paid) or view every request, and can move through the pages when there are more requests than fit on one page.

**Why this priority**: An administrator cannot act on a withdrawal without first seeing the queue and being able to focus on the requests that still need a decision. With only this story implemented, an administrator can already monitor and audit the withdrawal pipeline and see how much money is waiting to be paid out, which is the minimum useful slice.

**Independent Test**: Sign in as an administrator, open the withdrawals area, and confirm that requests are listed with their amount, payment details, status, requested date, and processed date; that the status filter changes which requests are shown; that paging moves through the full set; and that a filter with no matching requests shows an explicit empty state.

**Acceptance Scenarios**:

1. **Given** there are withdrawal requests in various statuses, **When** the administrator opens the withdrawals area, **Then** the requests awaiting a decision are shown first by default, each row showing the request identifier, amount, payment details, a status indicator, the requested date, and the processed date (or a neutral placeholder when it has not been processed).
2. **Given** the administrator is viewing the queue, **When** they choose a status filter (awaiting decision, approved, rejected, paid, or all), **Then** the list updates to show only requests in that status (or all requests), the view returns to the first page, and the chosen filter is visibly indicated.
3. **Given** there are more requests than fit on one page, **When** the administrator moves to the next or a specific page, **Then** the next set of requests is shown, and the current page position and the total number of matching requests are visible.
4. **Given** a status filter that matches no requests, **When** it is applied, **Then** an explicit "no withdrawal requests" state is shown for that filter rather than a blank table.
5. **Given** the administrator is viewing the queue, **When** they refresh it, **Then** the list reflects the current requests for the active filter and page, including any raised or decided since it was last loaded.
6. **Given** the queue is being retrieved, **When** the data has not yet arrived, **Then** a loading state is shown that is distinct from the empty state.

---

### User Story 2 - Administrator approves a pending withdrawal request (Priority: P2)

After reviewing a request that is awaiting a decision, the administrator approves it. The request moves to the approved status, its processed date is recorded, and the administrator sees confirmation. Approving does not yet mean the money has been sent — it authorises the payout. If the request was already decided by someone else in the meantime, or no longer exists, the administrator is told and the queue is brought up to date instead of a silent failure.

**Why this priority**: Approving is the gate that lets a payout proceed. It depends on Story 1 for context but delivers the first half of the core business outcome of the phase.

**Independent Test**: With a request awaiting a decision on screen, approve it, confirm its status becomes approved with a processed date and a success confirmation is shown, and confirm that re-attempting a decision on the same request reports that it can no longer be approved.

**Acceptance Scenarios**:

1. **Given** a request that is awaiting a decision, **When** the administrator confirms approval, **Then** the decision is submitted, the row's status becomes approved, its processed date is populated, and a success confirmation is shown using the message returned in the response.
2. **Given** the administrator triggers approval, **When** the request is in progress, **Then** the action controls for that row are disabled and progress is indicated so the decision cannot be submitted twice.
3. **Given** a request that another administrator has already approved, rejected, or paid, **When** this administrator tries to approve it, **Then** they are told the request can no longer be approved and the queue is refreshed to show its current state.
4. **Given** a request that no longer exists, **When** the administrator tries to approve it, **Then** they are told it could not be found and the queue is refreshed.
5. **Given** an approval request that fails due to connectivity or an unexpected server error, **When** the failure occurs, **Then** the row's status is unchanged, no decision is recorded locally, and the administrator sees a retryable "please try again" message.
6. **Given** approval requires explicit confirmation, **When** the administrator opens the approve action but cancels the confirmation, **Then** no decision is submitted and the request is unchanged.

---

### User Story 3 - Administrator rejects a pending withdrawal request (Priority: P3)

The administrator decides a request that is awaiting a decision should not be paid out and rejects it. The request moves to the rejected status, which is final, and the administrator sees confirmation. No reason is required for a withdrawal rejection.

**Why this priority**: Rejection clears requests that must not proceed out of the actionable queue, but the dashboard already delivers value with viewing and approval alone. It builds on Stories 1 and 2.

**Independent Test**: With a request awaiting a decision on screen, reject it, confirm its status becomes rejected, that a success confirmation is shown, and that no further action controls are offered for that row afterwards.

**Acceptance Scenarios**:

1. **Given** a request that is awaiting a decision, **When** the administrator confirms rejection, **Then** the decision is submitted, the row's status becomes rejected, its processed date is populated, and a success confirmation is shown using the message returned in the response.
2. **Given** the administrator triggers rejection, **When** the request is in progress, **Then** the action controls for that row are disabled and progress is indicated so the decision cannot be submitted twice.
3. **Given** a request that has already been decided by another administrator, **When** this administrator submits a rejection, **Then** they are told it can no longer be rejected and the queue is refreshed.
4. **Given** a rejection request that fails due to connectivity or an unexpected server error, **When** the failure occurs, **Then** the row's status is unchanged, no decision is recorded locally, and a retryable message is shown.
5. **Given** rejection requires explicit confirmation, **When** the administrator opens the reject action but cancels the confirmation, **Then** no decision is submitted and the request is unchanged.
6. **Given** a request that has reached the rejected status, **When** it is displayed, **Then** no Approve, Reject, or Mark Paid action is offered for it.

---

### User Story 4 - Administrator marks an approved withdrawal as paid (Priority: P4)

Once an approved payout has actually been transferred to the requester outside the dashboard, the administrator marks the request as paid. The request moves to the paid status, which is final, and the administrator sees confirmation. This action is only available for requests that are already approved.

**Why this priority**: Marking paid closes the loop and keeps the queue an accurate record of what has actually been settled, but it only applies after approval and is not needed to demonstrate the approve/reject decision flow.

**Independent Test**: With an approved request on screen, mark it paid, confirm its status becomes paid and a success confirmation is shown; confirm the Mark Paid action is not offered for requests that are awaiting a decision, rejected, or already paid; and confirm that attempting to mark paid a request that is no longer approved is reported and the queue reconciled.

**Acceptance Scenarios**:

1. **Given** a request in the approved status, **When** the administrator confirms marking it paid, **Then** the decision is submitted, the row's status becomes paid, and a success confirmation is shown using the message returned in the response.
2. **Given** a request that is awaiting a decision, is rejected, or is already paid, **When** it is displayed, **Then** no Mark Paid action is offered for it.
3. **Given** a request that is no longer in the approved status (for example already marked paid by another administrator), **When** this administrator tries to mark it paid, **Then** they are told the request is not in a state that can be marked paid and the queue is refreshed.
4. **Given** a request that no longer exists, **When** the administrator tries to mark it paid, **Then** they are told it could not be found and the queue is refreshed.
5. **Given** a mark-paid request that fails due to connectivity or an unexpected server error, **When** the failure occurs, **Then** the row's status is unchanged, no change is recorded locally, and a retryable message is shown.
6. **Given** marking paid requires explicit confirmation, **When** the administrator opens the action but cancels the confirmation, **Then** nothing is submitted and the request is unchanged.

---

### Edge Cases

- **Request decided by another administrator between load and action**: a decision is refused because the request's current status does not allow the transition — the administrator sees a message that the action is no longer possible, and the queue reconciles by re-retrieving the active filter and page.
- **Request not found on action**: the referenced request does not exist — the administrator is told it could not be found and the queue is refreshed.
- **Mark Paid attempted on a request that is not approved**: refused as a domain-rule violation — the administrator is told the request is not in a state that can be marked paid, and the queue is refreshed.
- **Rapid or repeated clicks on an action**: only one decision request is sent per request; the row's action controls are disabled while a decision is in flight.
- **Filter value not accepted by the backend**: the status filter offers only the fixed set of statuses, so this should not arise from normal use; if the backend still reports an invalid filter value, the dashboard shows a non-destructive error and keeps the previous results visible.
- **Page number beyond the available range**: the administrator is shown an empty result with a way back to the first page, rather than an error or a blank screen.
- **Filter changed while on a later page**: the view returns to the first page of the new filter so the shown page is always valid for the active filter.
- **Processed date absent**: for a request that has not been decided, the processed-date cell shows a neutral placeholder rather than an empty or broken value.
- **Amount or payment details missing or malformed in the data**: the row shows a neutral placeholder for that field and the rest of the row still renders and can be acted on where its status allows.
- **Session lost mid-review**: an action or queue request is rejected as unauthenticated — handled by the dashboard's shared session-loss behaviour (return to sign-in), consistent with the authentication feature; the administrator is not shown a broken view.
- **Non-administrator reaches the area**: access is refused; this area is only reachable within an administrator session, and a signed-in user whose role is not administrator is denied.
- **Sensitive payment details**: payment destination details (for example wallet handles and phone numbers) are shown only within an authenticated administrator session and are not retained by the dashboard after the administrator leaves the area.
- **Unexpected server error on the queue request**: the administrator sees a generic "something went wrong, please try again" message and a way to retry, with no partial or stale list presented as authoritative.
- **Decision succeeds but the updated request cannot be displayed**: the request is still treated as decided; the administrator sees the success confirmation and the queue is re-retrieved to show the current state.
- **Large total count**: with hundreds of requests across all statuses, only one fixed-size page (20 requests) is retrieved and shown at a time, and paging stays responsive.

## Requirements *(mandatory)*

### Functional Requirements

#### Reviewing the queue

- **FR-001**: The dashboard MUST provide a Withdrawals area, reachable only within an administrator session, that lists balance-withdrawal requests raised by cooks and drivers.
- **FR-002**: For each request in the list, the dashboard MUST display the request identifier, the requested amount as a monetary value, the payment details supplied for the transfer, the current status, the requested date, and the processed date (or a neutral placeholder when the request has not been processed).
- **FR-003**: The dashboard MUST present the status of each request as a distinct, human-readable indicator for each of the four statuses: awaiting decision (pending), approved, rejected, and paid.
- **FR-004**: When an amount or payment-details value is missing or malformed in the data, the dashboard MUST show a neutral placeholder for that field and MUST still render the rest of the row and allow any actions its status permits.
- **FR-005**: When there are no requests for the active filter and page, the dashboard MUST show an explicit empty-state message rather than a blank table.
- **FR-006**: The dashboard MUST show a loading state while the queue is being retrieved, distinct from the empty state.
- **FR-007**: The dashboard MUST allow the administrator to refresh the queue, and after any approve, reject, or mark-paid action it MUST re-retrieve the requests for the active filter and page so the displayed queue reflects the current state.

#### Filtering

- **FR-008**: The dashboard MUST let the administrator filter the queue by a single status — awaiting decision, approved, rejected, or paid — or view all requests.
- **FR-009**: When the dashboard first opens, the queue MUST default to showing the requests that are awaiting a decision.
- **FR-010**: The dashboard MUST visibly indicate which status filter is currently active.
- **FR-011**: When the administrator changes the status filter, the dashboard MUST return the view to the first page of results for the new filter.
- **FR-012**: The dashboard MUST only offer the fixed set of valid statuses as filter choices, and MUST NOT allow an arbitrary status value to be entered.

#### Pagination

- **FR-013**: The dashboard MUST retrieve and display the queue one fixed-size page at a time, using the page size the backend applies (20 requests per page), and MUST NOT attempt to load or merge multiple pages into a single view.
- **FR-014**: The dashboard MUST show the administrator their current page position and the total number of requests matching the active filter.
- **FR-015**: The dashboard MUST let the administrator move to the next and previous pages, and MUST prevent navigating before the first page or beyond the last page of the current result set.
- **FR-016**: When the administrator lands on a page number beyond the available range, the dashboard MUST show an empty result with a way to return to the first page, rather than an error.

#### Approving a request

- **FR-017**: The dashboard MUST provide an Approve action only for requests that are awaiting a decision, and MUST NOT offer it for requests that are approved, rejected, or paid.
- **FR-018**: The dashboard MUST require the administrator to confirm an approval before the decision is submitted, and MUST NOT submit the decision if the confirmation is cancelled.
- **FR-019**: On a confirmed approval, the dashboard MUST submit the decision for that request, and on success MUST reflect the request's new status (approved) and its processed date, and show a success confirmation using the message returned in the response.
- **FR-020**: While an approval decision is in progress, the dashboard MUST disable the action controls for that request and indicate progress so the decision cannot be submitted more than once.

#### Rejecting a request

- **FR-021**: The dashboard MUST provide a Reject action only for requests that are awaiting a decision, and MUST NOT offer it for requests that are approved, rejected, or paid.
- **FR-022**: The dashboard MUST require the administrator to confirm a rejection before the decision is submitted, and MUST NOT submit the decision if the confirmation is cancelled. No reason input is required for a withdrawal rejection.
- **FR-023**: On a confirmed rejection, the dashboard MUST submit the decision for that request, and on success MUST reflect the request's new status (rejected) and its processed date, and show a success confirmation using the message returned in the response.
- **FR-024**: While a rejection decision is in progress, the dashboard MUST disable the action controls for that request and indicate progress so the decision cannot be submitted more than once.

#### Marking a request paid

- **FR-025**: The dashboard MUST provide a Mark Paid action only for requests in the approved status, and MUST NOT offer it for requests that are awaiting a decision, rejected, or already paid.
- **FR-026**: The dashboard MUST require the administrator to confirm marking a request paid before it is submitted, and MUST NOT submit it if the confirmation is cancelled.
- **FR-027**: On a confirmed mark-paid, the dashboard MUST submit the change for that request, and on success MUST reflect the request's new status (paid) and show a success confirmation using the message returned in the response.
- **FR-028**: While a mark-paid change is in progress, the dashboard MUST disable the action controls for that request and indicate progress so it cannot be submitted more than once.

#### Action outcome handling (approve, reject, mark paid)

- **FR-029**: If an action is refused because the request's current status does not allow the transition, the dashboard MUST tell the administrator the action is no longer possible for that request and MUST re-retrieve the active filter and page.
- **FR-030**: If an action is refused because the request cannot be found, the dashboard MUST tell the administrator it could not be found and MUST re-retrieve the active filter and page.
- **FR-031**: If an action request fails due to connectivity or an unexpected server error, the dashboard MUST leave the request's status unchanged, MUST NOT record the change locally, and MUST show a retryable "please try again" message.
- **FR-032**: If an action succeeds but the updated request details cannot be displayed, the dashboard MUST still treat the action as applied, show the success confirmation, and re-retrieve the active filter and page.
- **FR-033**: The dashboard MUST never present an action as successful unless the response indicates success.

#### Cross-cutting

- **FR-034**: Every request the dashboard makes for this feature MUST carry the administrator's active session credential, and MUST rely on the dashboard's shared session-loss handling (return to the sign-in screen) when a request is rejected as unauthenticated.
- **FR-035**: The Withdrawals area MUST be denied to a signed-in user whose role is not administrator, consistent with the rest of the admin dashboard.
- **FR-036**: The dashboard MUST interpret the standard response envelope for this feature, using its success flag and message to drive success and error toasts and surfacing field-level validation messages where present.
- **FR-037**: For unexpected server errors on any action in this feature, the dashboard MUST show a generic "something went wrong, please try again" message and MUST keep the queue in a consistent state (no half-applied changes shown).
- **FR-038**: The dashboard MUST NOT retain requesters' payment details after the administrator navigates away from the Withdrawals area, and MUST only display them within an authenticated administrator session.
- **FR-039**: The Withdrawals area MUST reuse the dashboard's existing shell — the shared layout, sidebar navigation, API client, authentication guard, and toast infrastructure established in Phases 1–3 — and MUST add a sidebar entry for the area.
- **FR-040**: The Withdrawals area, including the status filter, the paginated table, every confirmation prompt, and all error, empty, and loading states, MUST meet WCAG 2.1 AA: controls and fields have programmatic labels, the flow is fully keyboard operable with a visible focus indicator, every confirmation dialog traps and restores focus and is dismissible by keyboard, the table has a programmatic header association for each column, status indicators are not conveyed by colour alone, and success and error messages (including the "no longer possible" and "not found" messages) are announced to assistive technology.

### Key Entities *(include if feature involves data)*

- **Withdrawal request**: A cook's or driver's request to withdraw funds from their platform balance, identified by the request identifier used for actions. Key attributes: request identifier, requested amount (monetary value), payment details (free text describing where and how to send the money), status (pending, approved, rejected, or paid), requested date, processed date (set once the request leaves the pending status). The requester's identity is not part of the data available to this feature.
- **Request status lifecycle**: The permitted transitions for a withdrawal request — a request awaiting a decision (pending) may become approved or rejected; an approved request may become paid; rejected and paid are final and allow no further action. The dashboard only offers actions that are valid for a request's current status.
- **Decision action**: An administrator's action on one withdrawal request — approve, reject, or mark paid. Each carries no additional data beyond the confirmation. An action is only valid while the request is in the status that permits it; once applied it moves the request to the next status in the lifecycle.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An administrator can open the Withdrawals area and, within 5 seconds of the data arriving, see the requests awaiting a decision with their amount, payment details, requested date, and status.
- **SC-002**: 100% of successful approve, reject, and mark-paid actions are reflected in the queue (new status shown, actions updated) without a manual page reload.
- **SC-003**: The dashboard only ever offers an action that is valid for a row's current status — Approve and Reject only while awaiting a decision, Mark Paid only while approved — verified across one request taken through the full pending → approved → paid path and one taken pending → rejected.
- **SC-004**: When a request has already been decided by another administrator, 100% of subsequent action attempts on it are reported to the administrator and result in the queue being brought up to date, with no incorrect "success" shown.
- **SC-005**: Duplicate action requests are never sent for a single request from repeated clicks, verified by observing exactly one request per confirmed action under rapid repeated activation.
- **SC-006**: An administrator can filter to each of the four statuses and to "all", and each filter shows only requests in that status (or all), verified against a dataset containing requests in every status.
- **SC-007**: An administrator can page through a result set of at least 60 matching requests (three or more pages) and reach every request, with the page position and total count always shown and never navigating outside the valid range.
- **SC-008**: After the administrator leaves the Withdrawals area, none of the viewed payment details remain retrievable from the dashboard.
- **SC-009**: The Withdrawals area and all its dialogs and states pass a WCAG 2.1 AA audit with zero AA-level violations, including keyboard-only completion of an approval, a rejection, and a mark-paid, and assistive-technology announcement of every success and error message.
- **SC-010**: On first open, the queue always shows the requests awaiting a decision, verified across repeated visits with an unchanged dataset.

## Assumptions

- The backend endpoints described in `admin-dashboard-api.md` Phase 4 (`GET /admin/withdrawals`, `POST /admin/withdrawals/{id}/approve`, `POST /admin/withdrawals/{id}/reject`, `POST /admin/withdrawals/{id}/mark-paid`) already exist and behave as documented, including the shared success/error envelope, the pagination shape (`items`, `page`, `per_page`, `total`), and the status codes 401, 403, 404, and 422.
- This feature covers only the admin dashboard web client's behaviour for managing withdrawal requests. It does not include the backend, the cooks' or drivers' request flow, balance accounting, notifications to requesters, or any export or reporting of withdrawals.
- The administrator session, sign-in, and session-loss handling are provided by the Admin Authentication & Session feature (Phase 1) and are reused here rather than redefined. The shared layout, sidebar, API client, and toast infrastructure from Phases 1–3 are reused.
- The list endpoint is paginated with a page size the backend fixes at 20; the dashboard shows one page at a time and navigates with a page number. The dashboard does not assume a client-configurable page size.
- Each list entry carries only the request identifier, amount, payment details, status, requested date, and processed date. The payload does not identify which cook or driver raised the request, so the dashboard does not display or filter by requester; if requester information is later added to the payload it is out of scope for this spec.
- The default view on opening the area is the requests awaiting a decision (status `pending`), since that is the actionable queue; an "all" option and the other single-status filters are also offered.
- Amounts are monetary values in the platform's currency and are displayed with the dashboard's standard monetary formatting; requested and processed dates use the dashboard's standard date/time formatting.
- Approving, rejecting, and marking paid are consequential actions, so an explicit confirmation step is included for each even though the backend requires no confirmation field. A withdrawal rejection does not collect a reason (unlike cook and driver rejections in Phases 2 and 3).
- "Mark paid" records that a transfer already made outside the dashboard has been completed; the dashboard does not perform or verify the transfer itself.
- Changing the status filter resets the view to the first page; after a successful action the dashboard re-retrieves the same filter and page rather than trying to locally patch the row, to stay consistent with the backend.
- Rejected and paid are terminal statuses; the dashboard offers no action for requests in those statuses, and none for approved requests other than Mark Paid.
- User-facing wording in this spec is descriptive, not final copy, and follows the dashboard's existing language conventions.

# Feature Specification: Cities Management

**Feature Branch**: `005-cities-management`

**Created**: 2026-09-07

**Status**: Draft

**Input**: User description: "Phase 5 — Cities Management (from admin-dashboard-api.md). Goal: let an administrator manage the list of cities the platform operates in — view every city, add a new one, edit its Arabic and/or English name, and activate or deactivate it. All endpoints live under /admin and require an administrator session; the dashboard must reject any signed-in user whose role is not admin. GET /admin/cities returns every city (active and inactive), unpaginated, each with id, name_ar, name_en, is_active. POST /admin/cities creates a city from name_ar (required, string, 1–255) and name_en (required, string, 1–255) and returns 201 with the new city, which starts active; 422 on a duplicate name or missing fields. PUT /admin/cities/{id} edits the name — name_ar and name_en are each optional but at least one must be supplied, both 1–255; returns 200 with the updated city; 404 when the city does not exist, 422 on a duplicate name or when neither field is supplied. PATCH /admin/cities/{id}/status sets is_active (required, boolean) and returns 200 with the updated city; 404 when the city does not exist, 422 when the value is not a boolean. Standard success/error envelope { success, data, message, errors }; status codes 401 unauthenticated, 403 non-admin, 404 not found, 422 validation / domain-rule violation, 500 unexpected. UI: a Cities Management page inside the dashboard with a table of every city (Arabic name, English name, active/inactive status), a clear visual distinction between active and inactive cities, an Add City button opening a two-field form (name_ar, name_en) with immediate validation of required fields and the 255-character limit, editing a city's name from its own row (inline or modal) allowing one or both names, a toggle to activate/deactivate a city directly from the table with visible confirmation, clear display of API errors (especially the 422 duplicate-name error), success messages (City created / City updated / City status updated), loading and empty states, and an Arabic RTL-first layout."

## Clarifications

### Session 2026-09-07

- Q: When an administrator edits a city's name, should the fields appear inline in the row or in a separate modal dialog? → A: Modal dialog opened from the row, mirroring the Add City form (two fields, submit/cancel, errors shown in the dialog).
- Q: If two administrators edit the same city concurrently, how should the second save be handled (backend has no conflict check)? → A: Last-write-wins — the second save overwrites; the post-save list refresh shows the final names. Documented as an accepted limitation, no conflict detection or conflict UI.
- Q: Should the page include a way to find a city within the unpaginated list in this version? → A: Yes — a client-side text search that filters the list by Arabic or English name as the administrator types. No sorting and no status filter in this version.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Administrator views the list of cities (Priority: P1)

An administrator opens the Cities Management area of the dashboard and sees every city the platform operates in, active and inactive together, in a single list. For each city they can read its Arabic name, its English name, and whether it is currently active or inactive, with active and inactive cities visually distinguishable at a glance. The list is not paged — every city is shown at once. To find a particular city quickly, the administrator can type into a search box that filters the list by Arabic or English name as they type.

**Why this priority**: An administrator cannot add, rename, or enable/disable a city without first seeing the full set of cities and their current state. With only this story implemented, an administrator can already audit which cities the platform serves and which are switched off, which is the minimum useful slice.

**Independent Test**: Sign in as an administrator, open the Cities Management area, and confirm that every city is listed with its Arabic name, English name, and active/inactive status; that active and inactive cities are visually distinct; that typing in the search box narrows the list by name; that a loading state is shown while the list is being retrieved; and that an explicit empty state is shown when there are no cities.

**Acceptance Scenarios**:

1. **Given** the platform has cities in both active and inactive states, **When** the administrator opens the Cities Management area, **Then** every city is shown in one list, each row showing the city's Arabic name, English name, and a status indicator, with active and inactive cities visually distinguishable by more than colour alone.
2. **Given** the list is being retrieved, **When** the data has not yet arrived, **Then** a loading state is shown that is distinct from the empty state.
3. **Given** the platform has no cities at all, **When** the administrator opens the area, **Then** an explicit "no cities" state is shown rather than a blank table.
4. **Given** the administrator is viewing the list, **When** they refresh it, **Then** the list reflects the current set of cities, including any added, renamed, or enabled/disabled since it was last loaded.
5. **Given** the list request fails due to connectivity or an unexpected server error, **When** the failure occurs, **Then** the administrator sees a retryable "something went wrong, please try again" message and is not shown a blank list presented as authoritative.
6. **Given** the list contains many cities, **When** the administrator types text into the search box, **Then** the list narrows to only the cities whose Arabic or English name matches what was typed, without a server request, and clearing the box restores the full list.
7. **Given** the administrator has typed a search term, **When** no city's Arabic or English name matches it, **Then** an explicit "no cities match your search" state is shown (distinct from the "no cities" state) with the search term still editable.

---

### User Story 2 - Administrator adds a new city (Priority: P2)

The administrator adds a city the platform is expanding into. They open an Add City form, enter the Arabic name and the English name, and submit. The new city is created, starts out active, and appears in the list. If a name is missing, too long, or duplicates an existing city, the administrator is told which field is at fault and the city is not created.

**Why this priority**: Adding cities is the primary reason an administrator visits this area — it is how the platform's coverage grows. It depends on Story 1 for context but delivers the first half of the core outcome of the phase.

**Independent Test**: With the list on screen, open the Add City form, submit it with a missing name and confirm it is refused with a field-level message; submit it with a name that duplicates an existing city and confirm the duplicate-name error is shown clearly; submit it with two valid names and confirm the city is created, shown as active, added to the list, and a "City created" success confirmation is shown.

**Acceptance Scenarios**:

1. **Given** the administrator opens the Add City form, **When** they enter a valid Arabic name and a valid English name and submit, **Then** the city is created, it appears in the list as active, and a success confirmation is shown using the message returned in the response.
2. **Given** the Add City form is open, **When** the administrator leaves the Arabic name or the English name empty, **Then** submission is blocked with a message identifying the missing field, before any request is sent.
3. **Given** the Add City form is open, **When** the administrator enters a name longer than 255 characters in either field, **Then** submission is blocked with a message about the length limit, before any request is sent.
4. **Given** the administrator submits a city whose Arabic or English name matches an existing city, **When** the create is refused as a duplicate, **Then** the administrator sees a clear message that the name is already in use, tied to the offending field where the response indicates it, and the form stays open with the entered values.
5. **Given** the administrator triggers a create, **When** the request is in progress, **Then** the submit control is disabled and progress is indicated so the city cannot be created twice.
6. **Given** a create request fails due to connectivity or an unexpected server error, **When** the failure occurs, **Then** no city is added to the list, and the administrator sees a retryable "please try again" message with the form values preserved.
7. **Given** the administrator opens the Add City form, **When** they cancel it without submitting, **Then** no city is created and the list is unchanged.

---

### User Story 3 - Administrator edits a city's name (Priority: P3)

The administrator corrects or updates a city's Arabic name, its English name, or both, from that city's own row. Editing opens a modal dialog that mirrors the Add City form, pre-filled with the city's current names. They may change just one name and leave the other as it is. The change is saved, the list reflects the new name, and the administrator sees confirmation. Submitting with no change to either name, or a name that duplicates another city, is refused with a clear message.

**Why this priority**: Renaming keeps the city list accurate over time, but the area already delivers value with viewing and adding alone. It builds on Stories 1 and 2.

**Independent Test**: With the list on screen, open the edit dialog for a city, clear both name fields and confirm submission is refused because at least one name is required; change only the Arabic name to a value that duplicates another city and confirm the duplicate-name error is shown in the dialog; change only the Arabic name to a valid new value and confirm the city's row updates, a "City updated" success confirmation is shown, and the English name is unchanged.

**Acceptance Scenarios**:

1. **Given** a city in the list, **When** the administrator opens its edit dialog, **Then** a modal opens with the city's current Arabic and English names pre-filled and editable, and keyboard focus moves into the dialog.
2. **Given** the edit dialog is open, **When** the administrator changes one or both names to valid values and submits, **Then** the change is saved, the dialog closes, the city's row shows the new name(s), any name not changed is left as it was, and a success confirmation is shown using the message returned in the response.
3. **Given** the edit dialog is open, **When** the administrator submits without providing either name (both cleared or unchanged-and-empty), **Then** submission is refused with a message, shown in the dialog, that at least one name is required.
4. **Given** the edit dialog is open, **When** the administrator enters a name longer than 255 characters in either field, **Then** submission is blocked with a message about the length limit, before any request is sent.
5. **Given** the administrator submits an edit whose Arabic or English name matches another existing city, **When** the update is refused as a duplicate, **Then** the administrator sees a clear message that the name is already in use, tied to the offending field where the response indicates it, and the edit dialog stays open with the entered values.
6. **Given** the administrator submits an edit for a city that no longer exists, **When** the update is refused as not found, **Then** the administrator is told the city could not be found, the dialog closes, and the list is refreshed.
7. **Given** the administrator triggers an edit, **When** the request is in progress, **Then** the submit control is disabled and progress is indicated so the edit cannot be submitted twice.
8. **Given** an edit request fails due to connectivity or an unexpected server error, **When** the failure occurs, **Then** the city's name is unchanged in the list, no change is recorded locally, and the administrator sees a retryable "please try again" message.
9. **Given** the administrator opens the edit dialog, **When** they cancel or dismiss it without submitting, **Then** no change is made, the city's row is unchanged, and focus returns to the control that opened the dialog.

---

### User Story 4 - Administrator activates or deactivates a city (Priority: P4)

The administrator switches a city on or off directly from its row in the table. Deactivating a city takes it out of service without deleting it; reactivating brings it back. The administrator confirms the change, the city's status updates in the list, and a confirmation is shown. There is no delete — a city can only be switched between active and inactive.

**Why this priority**: Toggling a city's availability is how the platform pauses or resumes a market, but it only matters once cities exist and are listed. It builds on Stories 1–3.

**Independent Test**: With the list on screen, use the toggle on an active city, confirm the change when prompted, and confirm the city's status becomes inactive with a "City status updated" confirmation and a visible change in the row; use the toggle again to reactivate it and confirm it returns to active; attempt a toggle on a city that no longer exists and confirm it is reported and the list reconciled.

**Acceptance Scenarios**:

1. **Given** an active city in the list, **When** the administrator uses its toggle and confirms, **Then** the city's status becomes inactive, the row's appearance changes to reflect that, and a success confirmation is shown using the message returned in the response.
2. **Given** an inactive city in the list, **When** the administrator uses its toggle and confirms, **Then** the city's status becomes active and the row reflects the change.
3. **Given** the administrator uses a city's toggle, **When** they cancel the confirmation, **Then** no change is submitted and the city's status is unchanged.
4. **Given** the administrator triggers a status change, **When** the request is in progress, **Then** that city's toggle is disabled and progress is indicated so the change cannot be submitted twice.
5. **Given** the administrator changes the status of a city that no longer exists, **When** the change is refused as not found, **Then** the administrator is told the city could not be found and the list is refreshed.
6. **Given** a status-change request fails due to connectivity or an unexpected server error, **When** the failure occurs, **Then** the city's status is unchanged in the list, no change is recorded locally, and the administrator sees a retryable "please try again" message.

---

### Edge Cases

- **Duplicate name on create or edit**: the platform refuses the name because it is already used by another city — the administrator sees a clear, specific message (not a generic failure), attached to the Arabic or English field where the response identifies it, and the Add City or Edit City dialog stays open with the entered values so the name can be corrected.
- **Edit submitted with no name provided**: an update with neither an Arabic nor an English name is refused — the administrator is told at least one name is required, and no request is sent if the dashboard can detect this before submission.
- **City deleted or missing between load and action**: an edit or status change targets a city that no longer exists — the administrator is told it could not be found and the list is re-retrieved to reconcile.
- **Two administrators edit the same city at once**: the backend has no conflict check, so the later save overwrites the earlier one (last-write-wins); the list refresh that follows each successful save shows the final names. The dashboard does not detect or warn about this, and it is an accepted limitation.
- **Name longer than the 255-character limit**: caught before submission where possible, with a field-level message; if the platform still rejects an over-long name, the field-level error from the response is shown.
- **Whitespace-only name**: a name that is blank once surrounding whitespace is ignored is treated as missing and refused with the same message as an empty field.
- **Rapid or repeated clicks on a save or toggle control**: only one request is sent per action; the relevant control is disabled while a request is in flight.
- **Non-boolean status value**: the toggle only ever submits an explicit active/inactive value, so this should not arise from normal use; if the platform still reports an invalid value, the dashboard shows a non-destructive error and leaves the city's shown status unchanged.
- **Toggling a city that is already in the target state**: for example another administrator has just deactivated it — the request is still accepted or the list is reconciled on the next refresh; the administrator is never shown a false "success" for a state the city is not actually in.
- **Empty city list**: a fresh platform with no cities shows an explicit empty state with the Add City action still available.
- **Session lost mid-task**: a list, create, edit, or status request is rejected as unauthenticated — handled by the dashboard's shared session-loss behaviour (return to sign-in), consistent with the authentication feature; the administrator is not shown a broken view.
- **Non-administrator reaches the area**: access is refused; this area is only reachable within an administrator session, and a signed-in user whose role is not administrator is denied.
- **Unexpected server error on any request**: the administrator sees a generic "something went wrong, please try again" message and a way to retry, with no half-applied change shown as authoritative.
- **Create or edit succeeds but the updated city cannot be displayed**: the change is still treated as applied; the administrator sees the success confirmation and the list is re-retrieved to show the current set.
- **Large number of cities**: with the list unpaginated, every city is retrieved and rendered at once; the table stays readable and responsive when there are many cities.

## Requirements *(mandatory)*

### Functional Requirements

#### Viewing the city list

- **FR-001**: The dashboard MUST provide a Cities Management area, reachable only within an administrator session, that lists every city the platform operates in, both active and inactive, in a single unpaginated list.
- **FR-002**: For each city in the list, the dashboard MUST display its Arabic name, its English name, and its current status (active or inactive).
- **FR-003**: The dashboard MUST make active and inactive cities visually distinguishable by more than colour alone (for example a text label or icon in addition to any colour treatment).
- **FR-004**: The dashboard MUST show a loading state while the city list is being retrieved, distinct from the empty state.
- **FR-005**: When the platform has no cities, the dashboard MUST show an explicit empty-state message rather than a blank table, and the Add City action MUST remain available.
- **FR-006**: The dashboard MUST allow the administrator to refresh the list, and after any create, edit, or status-change action it MUST re-retrieve the city list so the displayed list reflects the current state.
- **FR-007**: If the list request fails due to connectivity or an unexpected server error, the dashboard MUST show a retryable "something went wrong, please try again" message and MUST NOT present a blank list as authoritative.

#### Searching the list

- **FR-042**: The dashboard MUST provide a labelled search box on the Cities Management area that filters the displayed cities by Arabic or English name as the administrator types, entirely client-side (no server request), matching against either name.
- **FR-043**: When a search term matches no city, the dashboard MUST show an explicit "no cities match your search" state, distinct from the "no cities" empty state, and clearing the search box MUST restore the full list. The search term MUST NOT affect which cities are retrieved, created, edited, or toggled — only which are shown.

#### Adding a city

- **FR-008**: The dashboard MUST provide an Add City action that opens a modal dialog with two fields — the city's Arabic name and its English name — plus submit and cancel actions, with validation and error messages displayed within the dialog.
- **FR-009**: The dashboard MUST require both the Arabic name and the English name for a new city, and MUST block submission with a message identifying the missing field when either is empty or whitespace-only, before sending a request.
- **FR-010**: The dashboard MUST enforce a maximum length of 255 characters on each name field and MUST block submission with a length message when either name exceeds it, before sending a request.
- **FR-011**: On a valid submission, the dashboard MUST create the city, and on success MUST show it in the list as active and show a success confirmation using the message returned in the response.
- **FR-012**: When a create is refused because the name duplicates an existing city, the dashboard MUST show a clear, specific "name already in use" message — attached to the Arabic or English field where the response identifies it — and MUST keep the form open with the administrator's entered values.
- **FR-013**: While a create is in progress, the dashboard MUST disable the submit control and indicate progress so a city cannot be created more than once.
- **FR-014**: If a create request fails due to connectivity or an unexpected server error, the dashboard MUST NOT add a city to the list, MUST preserve the entered form values, and MUST show a retryable "please try again" message.
- **FR-015**: The dashboard MUST let the administrator cancel the Add City form without creating a city, leaving the list unchanged.

#### Editing a city's name

- **FR-016**: The dashboard MUST let the administrator edit a city's name through a modal dialog opened from that city's own row. The dialog MUST mirror the Add City form (an Arabic name field and an English name field with submit and cancel actions), MUST pre-fill the current Arabic and English names, and MUST display its validation and error messages within the dialog.
- **FR-017**: The dashboard MUST allow the administrator to change one name or both, and MUST leave any name they do not change as it was.
- **FR-018**: The dashboard MUST refuse an edit that supplies neither an Arabic nor an English name, with a message that at least one name is required, and MUST NOT send a request when it can detect this before submission.
- **FR-019**: The dashboard MUST enforce the 255-character maximum on each name field in the Edit City dialog and MUST block submission with a length message when either name exceeds it, before sending a request.
- **FR-020**: On a valid submission, the dashboard MUST save the change, and on success MUST show the new name(s) in the city's row and a success confirmation using the message returned in the response.
- **FR-021**: When an edit is refused because a name duplicates another existing city, the dashboard MUST show a clear, specific "name already in use" message — attached to the offending field where the response identifies it — and MUST keep the edit dialog open with the entered values.
- **FR-022**: When an edit is refused because the city cannot be found, the dashboard MUST tell the administrator it could not be found and MUST re-retrieve the city list.
- **FR-023**: While an edit is in progress, the dashboard MUST disable the submit control and indicate progress so the edit cannot be submitted more than once.
- **FR-024**: If an edit request fails due to connectivity or an unexpected server error, the dashboard MUST leave the city's name unchanged in the list, MUST NOT record the change locally, and MUST show a retryable "please try again" message in the dialog.
- **FR-025**: The dashboard MUST let the administrator cancel or dismiss the edit dialog without changing the city, returning focus to the control that opened it.

#### Activating and deactivating a city

- **FR-026**: The dashboard MUST provide a control on each city's row to switch it between active and inactive, and MUST NOT provide any way to delete a city.
- **FR-027**: The dashboard MUST require the administrator to confirm a status change before it is submitted, and MUST NOT submit it if the confirmation is cancelled.
- **FR-028**: On a confirmed status change, the dashboard MUST submit the new status for that city, and on success MUST reflect the new status in the city's row and show a success confirmation using the message returned in the response.
- **FR-029**: While a status change is in progress, the dashboard MUST disable that city's toggle and indicate progress so the change cannot be submitted more than once.
- **FR-030**: When a status change is refused because the city cannot be found, the dashboard MUST tell the administrator it could not be found and MUST re-retrieve the city list.
- **FR-031**: If a status-change request fails due to connectivity or an unexpected server error, the dashboard MUST leave the city's status unchanged in the list, MUST NOT record the change locally, and MUST show a retryable "please try again" message.

#### Outcome handling (all actions)

- **FR-032**: If a create, edit, or status change succeeds but the updated city details cannot be displayed, the dashboard MUST still treat the action as applied, show the success confirmation, and re-retrieve the city list.
- **FR-033**: The dashboard MUST never present an action as successful unless the response indicates success.
- **FR-034**: The dashboard MUST surface field-level validation messages from the response against the corresponding form fields, and MUST fall back to the response's overall message when no field-level detail is provided.

#### Cross-cutting

- **FR-035**: Every request the dashboard makes for this feature MUST carry the administrator's active session credential, and MUST rely on the dashboard's shared session-loss handling (return to the sign-in screen) when a request is rejected as unauthenticated.
- **FR-036**: The Cities Management area MUST be denied to a signed-in user whose role is not administrator, consistent with the rest of the admin dashboard.
- **FR-037**: The dashboard MUST interpret the standard response envelope for this feature, using its success flag and message to drive success and error notifications and surfacing field-level validation messages where present.
- **FR-038**: For unexpected server errors on any request in this feature, the dashboard MUST show a generic "something went wrong, please try again" message and MUST keep the list in a consistent state (no half-applied changes shown).
- **FR-039**: The Cities Management area MUST reuse the dashboard's existing shell — the shared layout, sidebar navigation, API client, authentication guard, and notification infrastructure established in earlier phases — and MUST add a sidebar entry for the area.
- **FR-040**: The Cities Management area MUST be presented Arabic-first with a right-to-left layout, including the table, the search box, the Add City dialog, the Edit City dialog, every confirmation prompt, and all error, empty, and loading states.
- **FR-041**: The Cities Management area, including the table, the search box, the Add City dialog, the Edit City dialog, every confirmation prompt, and all error, empty, and loading states, MUST meet WCAG 2.1 AA: controls and fields have programmatic labels, the flow is fully keyboard operable with a visible focus indicator, every dialog traps and restores focus and is dismissible by keyboard, the table has a programmatic header association for each column, the active/inactive status is not conveyed by colour alone, changes to the filtered result count (including the no-match state) are communicated to assistive technology, and success and error messages (including the duplicate-name and not-found messages) are announced to assistive technology.

### Key Entities *(include if feature involves data)*

- **City**: A city the platform operates in. Key attributes: identifier (used to target edit and status-change actions), Arabic name (1–255 characters), English name (1–255 characters), status (active or inactive). A newly created city starts active. Cities are never deleted, only switched between active and inactive. The identifier is not shown as a primary column but is used internally to address a specific city.
- **City name**: The Arabic name and the English name of a city. Each is 1–255 characters and required when creating a city. When editing, either or both may be supplied, but at least one must be. A name must be unique across cities; reusing another city's Arabic or English name is refused.
- **City status**: Whether a city is currently in service. Only two values — active and inactive — with free movement between them. Deactivating removes a city from service without deleting it; reactivating restores it.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An administrator can open the Cities Management area and, within 5 seconds of the data arriving, see every city with its Arabic name, English name, and active/inactive status.
- **SC-002**: An administrator can add a city with valid Arabic and English names and see it appear in the list as active, with a success confirmation, without a manual page reload — verified for at least one new city.
- **SC-003**: 100% of create and edit attempts that use a name already belonging to another city are refused with a clear, specific "name already in use" message shown against a name field, with no city created or renamed.
- **SC-004**: 100% of edit attempts that supply neither an Arabic nor an English name are refused with an "at least one name required" message, with no request sent where the dashboard can detect this in advance.
- **SC-005**: An administrator can rename a city by changing only one of its two names and confirm the other name is left unchanged — verified for both the Arabic-only and English-only cases.
- **SC-006**: An administrator can deactivate an active city and reactivate it, with the list showing the correct status after each change and no manual page reload, verified across a full active → inactive → active cycle.
- **SC-007**: Active and inactive cities are distinguishable without relying on colour, verified by a review that ignores colour (for example in greyscale).
- **SC-008**: Duplicate requests are never sent for a single create, edit, or status change from repeated clicks, verified by observing exactly one request per confirmed action under rapid repeated activation.
- **SC-009**: When an edit or status change targets a city that no longer exists, 100% of such attempts are reported to the administrator and result in the list being re-retrieved, with no incorrect "success" shown.
- **SC-010**: The Cities Management area and all its dialogs and states pass a WCAG 2.1 AA audit with zero AA-level violations, including keyboard-only completion of adding a city, editing a name, and toggling a city's status, and assistive-technology announcement of every success and error message.
- **SC-011**: The Cities Management area renders correctly in a right-to-left Arabic layout across the table, forms, dialogs, and all state messages, with no clipped, mirrored-incorrectly, or overlapping content.
- **SC-012**: When two administrators save different names for the same city in overlapping sessions, both saves complete without error and the city list, once refreshed, shows the name from the save that completed last — with no data loss beyond the overwritten name and no stuck or inconsistent row.
- **SC-013**: With a list of at least 30 cities, an administrator can type part of a city's Arabic or English name and see the list narrow to the matching cities within 1 second and with no server request; clearing the search restores the full list, and a term matching nothing shows the "no cities match your search" state.

## Assumptions

- The backend endpoints described in `admin-dashboard-api.md` Phase 5 (`GET /admin/cities`, `POST /admin/cities`, `PUT /admin/cities/{id}`, `PATCH /admin/cities/{id}/status`) already exist and behave as documented, including the shared success/error envelope, the field rules (`name_ar` / `name_en` 1–255; create requires both; edit requires at least one; `is_active` boolean), the 201 response on create, and the status codes 401, 403, 404, and 422.
- This feature covers only the admin dashboard web client's behaviour for managing cities. It does not include the backend, how cities are used elsewhere (cook and driver profiles, order filtering, delivery areas), city-level configuration beyond the name and active flag, or any import/export of cities.
- The administrator session, sign-in, and session-loss handling are provided by the Admin Authentication & Session feature (Phase 1) and are reused here rather than redefined. The shared layout, sidebar, API client, and notification infrastructure from earlier phases are reused, and a sidebar entry is added for this area.
- The city list is returned unpaginated; the dashboard retrieves and renders every city at once and does not implement paging or a configurable page size for this area. A client-side text search that filters the loaded list by Arabic or English name is included (FR-042/FR-043); column sorting and a status (active/inactive) filter are out of scope for this version.
- Each city record carries only an identifier, an Arabic name, an English name, and an active flag. There is no city-level metadata (region, coordinates, delivery radius, etc.) in this feature's payload, so the dashboard does not display or edit any.
- "Duplicate name" is enforced by the backend and reported as a 422; the dashboard surfaces that error against the relevant name field where the response's `errors` map identifies it, and otherwise against the form as a whole. The exact matching rule (which name, case sensitivity, trimming) is the backend's; the dashboard does not pre-check for duplicates.
- Creating, editing, and toggling a city's status are consequential actions. A create and an edit are each submitted from an explicit modal dialog with a submit action (the Edit City dialog mirrors the Add City dialog and is pre-filled with the city's current names); a status change is guarded by an explicit confirmation step even though the backend requires no confirmation field. There is no bulk action and no delete.
- A newly created city is active by default (per the documented 201 response); the dashboard does not offer a way to create an inactive city.
- After a successful create, edit, or status change the dashboard re-retrieves the full city list rather than locally patching a row, to stay consistent with the backend.
- The backend edit endpoint provides no version token or conflict check, so concurrent edits to the same city are last-write-wins. The dashboard does not implement optimistic-concurrency detection or a conflict-resolution flow; the post-save list refresh is relied on to surface the current state. This is an accepted limitation given how infrequent and low-stakes city edits are.
- Names are stored and displayed as free text; the dashboard applies its standard text handling (trimming leading/trailing whitespace for the empty/whitespace-only check) and does not impose a character set restriction beyond the 255-length limit.
- The area is Arabic-first and right-to-left, consistent with the dashboard's language conventions; English names are still displayed (and are left-to-right within their cell) but the overall layout is RTL.
- User-facing wording in this spec is descriptive, not final copy, and follows the dashboard's existing language conventions.

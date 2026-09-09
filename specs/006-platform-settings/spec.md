# Feature Specification: Platform Settings

**Feature Branch**: `006-platform-settings`

**Created**: 2026-09-07

**Status**: Draft

**Input**: User description: "Phase 6 — Platform Settings (from admin-dashboard-api.md). Goal: a screen in the admin dashboard to view and change the platform's general settings. Today the only setting is the delivery fee (`delivery_fee`). All endpoints live under `/admin` and require an administrator session; the dashboard must reject any signed-in user whose role is not admin. `GET /admin/settings` returns the current settings — `data = { delivery_fee: 25.0 }` (a decimal number), message `OK`. `PUT /admin/settings` changes the delivery fee — body `{ delivery_fee: 30 }`, validation `delivery_fee` required, numeric, min:0; returns 200 with `data = { delivery_fee: 30.0 }` and message `Delivery fee updated.`; 422 on a negative, non-numeric, or missing value. Standard success/error envelope `{ success, data, message, errors }`; status codes 401 unauthenticated, 403 non-admin, 422 validation, 500 unexpected. UI: a Settings entry in the dashboard sidebar opens this screen; the screen shows the current `delivery_fee` on load with a loading state and, on a failed fetch, an error state with a retry button; a form with one numeric field (delivery fee) in Egyptian pounds that rejects negative values with immediate client-side validation before submit; a Save button that is disabled unless the value differs from the saved one and shows a 'saving' state; on success a success toast and the displayed value updates; on a backend 422 the error message from `errors` is shown under the field; follows the same pattern as earlier screens (Cities Management) for styling, API handling, and the auth guard; Arabic RTL interface text."

## Clarifications

### Session 2026-09-07

- Q: Before a changed delivery fee is sent, should the dashboard require an explicit confirmation step, or is the disabled-until-changed Save button plus its click enough? → A: No confirmation dialog — Save is enabled only when the value changed and is valid; clicking it submits directly, with a success toast afterward.
- Q: When the administrator enters or pastes a delivery fee with more than two decimal places, what should the dashboard do? → A: Reject on Save with a field-level message ("use at most two decimal places"); no request is sent until corrected.
- Q: If the administrator has a changed-but-unsaved fee and navigates away from the Settings screen, what should happen? → A: Silently discard the unsaved change with no prompt; re-opening the screen shows the current saved fee.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Administrator views the current delivery fee (Priority: P1)

An administrator opens the Settings area of the dashboard and sees the platform's current delivery fee — the flat fee added to every order — shown as an amount in Egyptian pounds. While the value is being retrieved the administrator sees a loading state; if the retrieval fails they see an explicit error state with a way to try again, not a blank or zeroed field presented as real.

**Why this priority**: An administrator cannot safely change the delivery fee without first seeing what it currently is. With only this story implemented, an administrator can already confirm the fee the platform is charging, which is the minimum useful slice.

**Independent Test**: Sign in as an administrator, open the Settings area, and confirm the current delivery fee is displayed as an Egyptian-pound amount; that a loading state is shown while it is being retrieved; and that a failed retrieval shows a retryable error state rather than a blank or zero value shown as authoritative.

**Acceptance Scenarios**:

1. **Given** the platform has a delivery fee configured, **When** the administrator opens the Settings area, **Then** the current delivery fee is displayed as an amount in Egyptian pounds, using the value returned in the response.
2. **Given** the delivery fee is being retrieved, **When** the value has not yet arrived, **Then** a loading state is shown and the form's Save action is not yet available.
3. **Given** the retrieval fails due to connectivity or an unexpected server error, **When** the failure occurs, **Then** the administrator sees a "something went wrong, please try again" message with a retry control, and no editable value is shown as the current fee.
4. **Given** the administrator is viewing the Settings area, **When** they use the retry control after a failed load, **Then** the value is retrieved again and, on success, the current delivery fee is displayed and the form becomes available.

---

### User Story 2 - Administrator updates the delivery fee (Priority: P2)

The administrator changes the platform's delivery fee — for example raising it from 25 to 30 pounds. They edit the single delivery-fee field, and the Save action becomes available only once the value differs from the saved one. A negative or non-numeric entry is refused in the screen before any request is sent. On a successful save the administrator sees a success confirmation and the displayed current fee updates to the new value. If the platform rejects the value, the reason is shown against the field and the fee is not changed.

**Why this priority**: Updating the fee is the reason an administrator visits this area — it is how the platform's delivery pricing is adjusted. It builds on Story 1 for context and delivers the core outcome of the phase.

**Independent Test**: With the current fee on screen, confirm the Save action is disabled until the field value changes; enter a negative value and confirm submission is blocked with a field-level message and no request is sent; enter a valid new amount and confirm the save succeeds, a success confirmation is shown, and the displayed current fee updates; force a backend rejection and confirm the reason is shown under the field with the fee unchanged.

**Acceptance Scenarios**:

1. **Given** the current delivery fee is displayed in the field, **When** the administrator has not changed the value, **Then** the Save action is disabled.
2. **Given** the administrator changes the delivery-fee field to a different valid amount, **When** the value differs from the saved one, **Then** the Save action becomes enabled.
3. **Given** the administrator has entered a changed valid amount, **When** they Save, **Then** the new fee is submitted, and on success a success confirmation is shown using the message returned in the response and the displayed current fee updates to the saved value.
4. **Given** the administrator enters a negative amount, **When** they attempt to Save, **Then** submission is blocked with a field-level message that the fee cannot be negative, before any request is sent.
5. **Given** the administrator clears the field or enters a non-numeric value, **When** they attempt to Save, **Then** submission is blocked with a field-level message that a valid amount is required, before any request is sent.
6. **Given** the administrator submits a changed amount, **When** the platform refuses it with a validation error, **Then** the error message from the response is shown against the delivery-fee field, the displayed current fee is unchanged, and the entered value is preserved for correction.
7. **Given** the administrator triggers a Save, **When** the request is in progress, **Then** the Save action is disabled and shows a "saving" state so the change cannot be submitted twice.
8. **Given** a save request fails due to connectivity or an unexpected server error, **When** the failure occurs, **Then** the displayed current fee is unchanged, no change is recorded locally, and the administrator sees a retryable "please try again" message with the entered value preserved.
9. **Given** the administrator has changed the field but not saved, **When** they reset the field to the saved value, **Then** the Save action becomes disabled again and no field-level error remains shown.

---

### Edge Cases

- **Value unchanged**: while the field equals the last saved fee, Save stays disabled; whitespace or formatting differences that resolve to the same numeric amount do not enable Save.
- **Negative value**: caught in the screen before submission with a field-level message; if the platform still rejects a negative value, the field-level error from the response is shown and the fee is unchanged.
- **Empty or non-numeric value**: treated as invalid — Save is blocked with a "valid amount required" message and no request is sent.
- **Zero**: `0` is a valid fee (min is zero) and can be saved like any other value.
- **Very large value**: the screen does not impose an upper limit (the platform only requires a non-negative number); if the platform rejects an out-of-range value, its message is shown against the field.
- **More decimal places than the currency uses**: a value with more than two decimal places is refused on Save with a field-level message ("use at most two decimal places"); it is never silently rounded or sent with hidden precision, and no request is made until the administrator corrects it.
- **Fee changed by another administrator between load and save**: there is no conflict check, so the later save overwrites (last-write-wins); after a successful save the screen shows the value it just saved, and re-opening or reloading the area shows the current stored value.
- **Save succeeds but the returned value cannot be read**: the change is still treated as applied; the administrator sees the success confirmation and the area re-retrieves the current fee.
- **Rapid or repeated clicks on Save**: only one request is sent per change; the Save action is disabled while a request is in flight.
- **Session lost mid-task**: a load or save request is rejected as unauthenticated — handled by the dashboard's shared session-loss behaviour (return to sign-in), consistent with the authentication feature; the administrator is not shown a broken view.
- **Non-administrator reaches the area**: access is refused; this area is only reachable within an administrator session, and a signed-in user whose role is not administrator is denied.
- **Unexpected server error on load or save**: the administrator sees a generic "something went wrong, please try again" message and a way to retry, with no half-applied change shown as authoritative.
- **Navigating away with unsaved changes**: the changed-but-unsaved value is silently discarded with no prompt; re-opening the Settings screen shows the current saved fee. An unsaved edit is never treated as applied.

## Requirements *(mandatory)*

### Functional Requirements

#### Viewing settings

- **FR-001**: The dashboard MUST provide a Settings area, reachable only within an administrator session, that displays the platform's current delivery fee.
- **FR-002**: The dashboard MUST display the delivery fee as a monetary amount in Egyptian pounds, using the value returned by the platform.
- **FR-003**: The dashboard MUST show a loading state while the current settings are being retrieved, during which the Save action is unavailable.
- **FR-004**: If the settings retrieval fails due to connectivity or an unexpected server error, the dashboard MUST show a retryable "something went wrong, please try again" message and MUST NOT present any editable value as the current fee.
- **FR-005**: The dashboard MUST provide a retry control on the failed-load state that re-retrieves the current settings and, on success, shows the current fee and enables the form.

#### Updating the delivery fee

- **FR-006**: The dashboard MUST provide a form with a single delivery-fee field, pre-filled with the current fee once it has been retrieved.
- **FR-007**: The dashboard MUST keep the Save action disabled while the field value is equal to the last saved fee, and MUST enable it only when the entered value differs from the saved fee and is valid.
- **FR-008**: The dashboard MUST reject a negative value in the screen, with a field-level message, and MUST NOT send a request for a negative value.
- **FR-009**: The dashboard MUST reject an empty or non-numeric value in the screen, with a field-level message that a valid amount is required, and MUST NOT send a request for such a value.
- **FR-010**: The dashboard MUST reject a value with more than two decimal places on Save, with a field-level message that at most two decimal places are allowed, and MUST NOT send such a value (no silent rounding). It MUST never send a value with more precision than is shown to the administrator.
- **FR-011**: The dashboard MUST accept zero as a valid fee.
- **FR-012**: On a valid, changed submission, the dashboard MUST submit the new delivery fee directly on the Save action without an intervening confirmation dialog or "click again to confirm" step, and on success MUST update the displayed current fee to the saved value and show a success confirmation using the message returned in the response.
- **FR-013**: While a save is in progress, the dashboard MUST disable the Save action and show a "saving" state so the change cannot be submitted more than once.
- **FR-014**: When a save is refused with a validation error, the dashboard MUST show the error message from the response against the delivery-fee field, MUST leave the displayed current fee unchanged, and MUST preserve the entered value for correction.
- **FR-015**: If a save request fails due to connectivity or an unexpected server error, the dashboard MUST leave the displayed current fee unchanged, MUST NOT record the change locally, and MUST show a retryable "please try again" message with the entered value preserved.
- **FR-016**: When the administrator resets the field back to the saved fee, the dashboard MUST disable the Save action again and clear any field-level error.
- **FR-017**: The dashboard MUST ensure an unsaved edit to the fee is never treated as applied — an edit that is not successfully saved leaves the platform's fee unchanged. When the administrator navigates away from the Settings area with a changed-but-unsaved value, the dashboard MUST silently discard that value without a prompt, and MUST show the current saved fee when the area is next opened.

#### Outcome handling

- **FR-018**: If a save succeeds but the returned value cannot be read, the dashboard MUST still treat the change as applied, show the success confirmation, and re-retrieve the current settings.
- **FR-019**: The dashboard MUST never present a save as successful unless the response indicates success.
- **FR-020**: The dashboard MUST surface the field-level validation message from the response against the delivery-fee field, and MUST fall back to the response's overall message when no field-level detail is provided.

#### Cross-cutting

- **FR-021**: Every request the dashboard makes for this feature MUST carry the administrator's active session credential, and MUST rely on the dashboard's shared session-loss handling (return to the sign-in screen) when a request is rejected as unauthenticated.
- **FR-022**: The Settings area MUST be denied to a signed-in user whose role is not administrator, consistent with the rest of the admin dashboard.
- **FR-023**: The dashboard MUST interpret the standard response envelope for this feature, using its success flag and message to drive success and error notifications and surfacing the field-level validation message where present.
- **FR-024**: For unexpected server errors on any request in this feature, the dashboard MUST show a generic "something went wrong, please try again" message and MUST keep the displayed fee in a consistent state (no half-applied change shown).
- **FR-025**: The Settings area MUST reuse the dashboard's existing shell — the shared layout, sidebar navigation, API client, authentication guard, and notification infrastructure established in earlier phases — and MUST add a sidebar entry for the area.
- **FR-026**: The Settings area MUST be presented Arabic-first with a right-to-left layout, including the field and its label, the Save action, the success confirmation, and all error and loading states. The numeric amount and currency are shown in a way consistent with the dashboard's conventions.
- **FR-027**: The Settings area, including the field, the Save action, the success confirmation, and all error and loading states, MUST meet WCAG 2.1 AA: the field has a programmatic label and its unit (Egyptian pounds) is announced, the flow is fully keyboard operable with a visible focus indicator, field-level validation errors are programmatically associated with the field and announced to assistive technology, and success and error messages (including the backend validation message) are announced to assistive technology.

### Key Entities *(include if feature involves data)*

- **Platform settings**: The platform's general configuration, surfaced to the administrator as a single settings record. In this feature it contains exactly one value — the delivery fee. There is one settings record for the whole platform; it is read and replaced, never created or deleted from this area.
- **Delivery fee**: The flat fee, in Egyptian pounds, added to every order's total. A non-negative number; zero is allowed. It has no per-order or per-city variation in this feature — a single platform-wide value. Displayed and entered to at most two decimal places.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An administrator can open the Settings area and, within 5 seconds of the data arriving, see the platform's current delivery fee as an Egyptian-pound amount.
- **SC-002**: An administrator can change the delivery fee to a valid new amount and see the displayed current fee update, with a success confirmation, without a manual page reload — verified for at least one change.
- **SC-003**: The Save action is disabled whenever the field value equals the saved fee and enabled only for a changed valid value — verified across no-change, valid-change, and change-then-revert.
- **SC-004**: 100% of attempts to save a negative, non-numeric, or more-than-two-decimal-places value are refused in the screen with a field-level message and no request sent.
- **SC-005**: When the platform rejects a saved value with a validation error, 100% of such attempts show the response's message against the field and leave the current fee unchanged.
- **SC-006**: Duplicate save requests are never sent for a single change from repeated clicks, verified by observing exactly one request per confirmed save under rapid repeated activation.
- **SC-007**: A failed load never leaves the administrator on a blank or zero value presented as the current fee — verified by forcing a load failure and confirming the retryable error state and retry recovery.
- **SC-008**: The Settings area and its states pass a WCAG 2.1 AA audit with zero AA-level violations, including keyboard-only completion of changing and saving the fee and assistive-technology announcement of the success and validation messages.
- **SC-009**: The Settings area renders correctly in a right-to-left Arabic layout across the field, label, Save action, and all state messages, with no clipped, mirrored-incorrectly, or overlapping content.

## Assumptions

- The backend endpoints described in `admin-dashboard-api.md` Phase 6 (`GET /admin/settings`, `PUT /admin/settings`) already exist and behave as documented, including the shared success/error envelope, the field rule (`delivery_fee` required, numeric, min:0), the 200 response on update carrying the saved value, the message `Delivery fee updated.`, and the status codes 401, 403, 422, and 500.
- This feature covers only the admin dashboard web client's behaviour for viewing and changing platform settings. It does not include the backend, how the delivery fee is applied to orders, order pricing history, or any other setting not yet exposed by the endpoint.
- The only setting in scope is the delivery fee. The screen is built so a further setting could be added later, but this specification does not define any additional setting.
- The administrator session, sign-in, and session-loss handling are provided by the Admin Authentication & Session feature (Phase 1) and are reused here. The shared layout, sidebar, API client, and notification infrastructure from earlier phases (most recently Cities Management, Phase 5) are reused, and a sidebar entry labelled "Settings" is added for this area.
- `PUT /admin/settings` replaces the settings in full with the value supplied; there is no partial-update semantics needed while the delivery fee is the only field.
- The delivery fee is a currency amount in Egyptian pounds. The dashboard displays and accepts it to at most two decimal places; the platform's `numeric` rule does not itself cap precision, so the dashboard is responsible for keeping the entered value to a sensible currency precision. Over-precise input is rejected on Save rather than rounded (see Clarifications 2026-09-07).
- The platform enforces only a lower bound of zero on the fee. No maximum is specified, so the dashboard does not impose one; if a very large value is entered and the platform rejects it, the platform's message is shown against the field.
- Changing the delivery fee is treated as an ordinary form save guarded by the disabled-until-changed Save control and an explicit click, with no separate confirmation dialog or inline "click again to confirm" step (see Clarifications 2026-09-07). The action is easily reversible (the fee can be set back), unlike the destructive toggles elsewhere in the dashboard. Navigating away with a changed-but-unsaved value silently discards it with no prompt (see Clarifications 2026-09-07).
- The settings endpoint provides no version token or conflict check, so concurrent changes by two administrators are last-write-wins. The dashboard does not implement optimistic-concurrency detection; re-opening or reloading the area shows the current stored value.
- After a successful save the dashboard uses the value returned in the response as the new "current" fee rather than issuing a fresh retrieval, except in the outcome-handling fallback where the returned value cannot be read.
- The area is Arabic-first and right-to-left, consistent with the dashboard's language conventions; the numeric amount is rendered per the dashboard's existing number and currency conventions.
- User-facing wording in this spec is descriptive, not final copy, and follows the dashboard's existing language conventions.

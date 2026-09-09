# Feature Specification: Dashboard Reports / Overview

**Feature Branch**: `008-dashboard-reports-overview`

**Created**: 2026-09-07

**Status**: Draft

**Input**: User description: "Phase 8 — Dashboard Reports / Overview (from admin-dashboard-api.md). Goal: the statistics cards on the admin dashboard home page, computed live with no caching. All access is under /admin and requires an administrator session; a signed-in user whose role is not admin is denied. GET /admin/reports/overview takes no parameters and returns data with three parts: users_by_role — a count of users for each role (customer, cook, driver, admin); orders_by_status — a count of orders for each OrderStatus value (pending, accepted, preparing, ready_for_pickup, assigned_to_driver, picked_up, on_the_way, delivered, completed, cancelled, pending_review, quoted); and total_sales_revenue — the sum of total across every completed order only. Standard success/error envelope { success, data, message, errors }; status codes 401 unauthenticated, 403 non-admin, 500 unexpected. UI: a dashboard home / overview screen showing these numbers as stat cards grouped into users-by-role, orders-by-status, and total sales revenue, with loading / empty / error states, a way to re-fetch the current numbers, and an Arabic RTL-first layout."

## Clarifications

### Session 2026-09-07

- Q: في مجموعة "الطلبات حسب الحالة"، هل تُعرض كل الحالات الاثنتي عشرة دائماً (بما فيها ذات العدد صفر)، أم تُعرض فقط الحالات التي عددها أكبر من صفر؟ → A: تُعرض كل الحالات الاثنتي عشرة دائماً، بما فيها ذات العدد صفر، في شبكة بطاقات ثابتة الترتيب.
- Q: هل بطاقات الإحصائيات قابلة للنقر للانتقال إلى القائمة المقابلة (مثلاً بطاقة "قيد المراجعة" تفتح شاشة الطلبات مفلترة على `pending_review`، وبطاقة "الطهاة" تفتح قائمة الطهاة)، أم أنها للعرض فقط في هذه المرحلة؟ → A: بطاقات مجموعة "الطلبات حسب الحالة" فقط قابلة للنقر وتفتح شاشة الطلبات مفلترة على تلك الحالة؛ مجموعة "المستخدمين حسب الدور" وبطاقة إجمالي المبيعات للعرض فقط. أي بطاقة حالة لا تتوفر لها شاشة طلبات تُعرض كرقم عادي غير قابل للنقر.
- Q: بما أن الأرقام محسوبة لحظياً بلا cache، هل تُحدَّث الصفحة تلقائياً على فاصل زمني (polling)، أم تُجلب فقط عند فتح الصفحة وعند ضغط الأدمن على "تحديث" يدوياً؟ → A: تحديث تلقائي كل ٦٠ ثانية بالإضافة إلى زر تحديث يدوي.
- Q: في هذه الشاشة العربية (RTL)، أي نظام أرقام يُستخدم لكل القيَم المعروضة (كل العدّادات وإجمالي المبيعات)؟ → A: أرقام لاتينية/غربية (0–9) مع فواصل آلاف، وكل التسميات والعناوين بالعربية.
- Q: هل يستمر التحديث التلقائي كل ٦٠ ثانية بينما تبويب الداشبورد مخفي/في الخلفية، أم يتوقّف أثناء الإخفاء ويُجلب فوراً عند عودة الأدمن للتبويب؟ → A: يتوقّف التحديث التلقائي أثناء إخفاء التبويب؛ وعند العودة يُجلب فوراً ثم تُستأنف الدورة كل ٦٠ ثانية.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Administrator sees the platform overview at a glance (Priority: P1)

An administrator opens the dashboard home / overview screen and immediately sees the current shape of the platform as a set of stat cards, organised into three groups. The first group shows how many users exist for each role — customers, cooks, drivers, and administrators. The second group shows how many orders are currently in each order status — from newly placed orders through preparation, delivery, completion, cancellation, orders awaiting review, and quoted custom orders. The third group shows the total sales revenue, which is the combined value of every completed order. The numbers are the platform's live figures at the moment the screen was loaded, not stale values. Loading, empty, and error states are all explicit.

**Why this priority**: This screen is the landing page of the whole dashboard and the entire point of the phase. With just this story implemented — the three groups of numbers shown accurately with proper loading and error handling — an administrator can open the dashboard and understand the state of the platform in seconds. Every other story only adds convenience on top of this.

**Independent Test**: Sign in as an administrator, open the dashboard home / overview screen, and confirm that three groups of stat cards are shown: a per-role user count (customer, cook, driver, admin), a per-status order count covering the order statuses, and a single total-sales-revenue figure; that a loading state is shown while the figures are being retrieved; that an explicit error state with a retry option is shown if retrieval fails; and that the figures shown match the platform's current data.

**Acceptance Scenarios**:

1. **Given** an administrator is signed in, **When** they open the dashboard home / overview screen, **Then** they see a users-by-role group with a labelled count for each of customer, cook, driver, and administrator.
2. **Given** an administrator is signed in, **When** the overview screen is shown, **Then** they see an orders-by-status group with a labelled count for each order status (pending, accepted, preparing, ready for pickup, assigned to driver, picked up, on the way, delivered, completed, cancelled, pending review, quoted).
3. **Given** an administrator is signed in, **When** the overview screen is shown, **Then** they see a total sales revenue figure representing the combined value of all completed orders, formatted as a currency amount.
4. **Given** the overview figures are being retrieved, **When** the data has not yet arrived, **Then** a loading state is shown that is distinct from a state of all-zero data.
5. **Given** the platform has no users, no orders, and no completed sales, **When** the overview screen is shown, **Then** every count shows zero and the revenue shows a zero amount, presented as real values rather than as an error or a blank screen.
6. **Given** the retrieval of the overview figures fails due to connectivity or an unexpected server error, **When** the failure occurs, **Then** the administrator sees a retryable "something went wrong, please try again" message and is not shown stale or partial numbers presented as current.
7. **Given** a role or an order status has a count of zero, **When** the overview screen is shown, **Then** that entry is still shown with its label and a zero value; all twelve order statuses and all four roles appear at all times in a fixed order.
8. **Given** the overview response arrives, **When** an order status the platform reports is not one the screen has a label for, **Then** the screen still shows its count with a readable fallback label rather than dropping the number or breaking the layout.
9. **Given** the screen presents large figures, **When** counts or the revenue total are large numbers, **Then** they are shown with digit grouping so they stay readable, and the card layout does not break.

---

### User Story 2 - Administrator refreshes the overview to see current figures (Priority: P2)

Because the figures are computed live with no caching, the administrator can ask the screen to fetch the numbers again without leaving and re-entering the dashboard, and see the counts and revenue update to the platform's current state. The refresh shows its own in-progress indication and, if it fails, leaves the previously shown figures in place with a clear notice rather than wiping the screen.

**Why this priority**: The overview is a monitoring surface. An administrator watching for a spike in pending-review orders or cancellations needs to re-check the numbers during a session. It builds directly on Story 1 and is low effort once the screen exists, but the screen is still useful without it.

**Independent Test**: With the overview on screen, trigger a refresh and confirm the figures are retrieved again and updated to match current data; confirm a refresh-in-progress indication is shown during the fetch; change platform data (e.g. an order moves to completed), refresh, and confirm the affected counts and the revenue total change accordingly; simulate a failed refresh and confirm the last good figures stay on screen with a clear "couldn't refresh" notice.

**Acceptance Scenarios**:

1. **Given** the overview figures are on screen, **When** the administrator triggers a refresh, **Then** the figures are retrieved again and the displayed counts and revenue total update to the current values.
2. **Given** a refresh is in progress, **When** the new figures have not yet arrived, **Then** a refresh-in-progress indication is shown while the previously retrieved figures remain visible.
3. **Given** platform data has changed since the screen was first loaded, **When** the administrator refreshes, **Then** the changed counts and, where applicable, the revenue total reflect the new state.
4. **Given** a refresh fails due to connectivity or an unexpected server error, **When** the failure occurs, **Then** the last successfully retrieved figures stay on screen and a clear "couldn't refresh, showing last known figures" notice with a retry option is shown.
5. **Given** the screen is first opened, **When** the initial figures are retrieved, **Then** the retrieval time is indicated so the administrator can tell how current the numbers are.
6. **Given** the screen is open, visible, and left idle, **When** 60 seconds pass since the last successful retrieval, **Then** the figures are re-fetched automatically and the displayed values update, using the same in-progress indication and failure handling as a manual refresh.
7. **Given** an automatic refresh fails, **When** the failure occurs, **Then** the last good figures stay on screen with the "couldn't refresh" notice, and automatic refresh attempts continue on the interval.
8. **Given** the dashboard tab is hidden or in the background, **When** it is hidden, **Then** the automatic re-fetch pauses; **and when** the admin returns to the tab, **then** the screen fetches immediately and resumes the 60-second cycle.

---

### User Story 3 - Administrator jumps from an order-status figure to those orders (Priority: P3)

From a card in the orders-by-status group, the administrator can move directly to the orders screen already filtered to that status — for example, from the "pending review" count to the orders awaiting review, or from the "cancelled" count to the cancelled orders. This turns the overview from a passive readout into the starting point for acting on what it shows. The users-by-role cards and the total sales revenue card are display-only.

**Why this priority**: It is a convenience that shortens a common path (see a concerning number, go look at what makes it up). It depends on the orders oversight screen existing and is not required for the overview to deliver its core value, so it is the lowest priority and may be deferred.

**Independent Test**: From the overview, activate an orders-by-status card (e.g. "cancelled") and confirm the orders screen opens filtered to that status; confirm the users-by-role cards and the revenue card are not activatable; confirm an order-status card whose orders screen is unavailable is shown as a plain, non-interactive figure rather than a dead link.

**Acceptance Scenarios**:

1. **Given** the overview is on screen, **When** the administrator activates an orders-by-status card, **Then** the orders screen opens filtered to that status.
2. **Given** the overview is on screen, **When** the administrator views the users-by-role cards or the total sales revenue card, **Then** those cards are plain figures and are not presented as activatable.
3. **Given** an orders-by-status card's target orders screen is unavailable, **When** the overview is shown, **Then** that card is shown as a plain figure and is not presented as activatable.
4. **Given** the administrator follows a drill-down and then returns, **When** they come back to the overview, **Then** the overview is shown again with freshly retrieved figures.
5. **Given** the orders-by-status cards are activatable, **When** the administrator navigates the screen by keyboard, **Then** each activatable card is reachable and operable without a pointer, and its purpose is clear to assistive technology.
6. **Given** an orders-by-status card shows a count of zero, **When** the administrator activates it, **Then** the orders screen still opens filtered to that status and shows its own explicit "no orders match these filters" state.

---

### Edge Cases

- **All-zero platform**: no users, orders, or completed sales — every count is zero and the revenue is a zero amount, shown as genuine values, not as an error or an empty screen.
- **Zero-count entries within a group**: some roles or statuses have a count of zero while others do not — every role and every one of the twelve statuses is still shown, with its label and a zero value, in a fixed order.
- **Unknown order status in the response**: the platform reports a status the screen has no label for — its count is still shown with a readable fallback label and the layout holds.
- **Missing group or key in the response**: a group or an expected key is absent from the response — the screen shows the missing role or status as a zero-count card (every role and status is always shown) rather than showing broken cards or crashing.
- **Revenue scope**: total sales revenue counts only completed orders — orders that are delivered but not yet completed, cancelled, or in any other status do not contribute, and this scope is made clear to the administrator (e.g. via the card label or a short note).
- **Large figures**: very large counts or a very large revenue total are shown with digit grouping and do not overflow or break the card layout.
- **Currency formatting**: the revenue total is shown as a currency amount with a consistent format across the dashboard; a whole-number total and a total with a fractional part are both formatted consistently.
- **Slow response**: the figures take a long time to arrive — the loading state persists and the administrator is not shown a premature all-zero screen.
- **Failed initial load**: the first retrieval fails — an explicit error state with a retry option is shown, not a blank or all-zero screen.
- **Failed refresh**: a refresh after a successful load fails — the last good figures stay visible with a clear "couldn't refresh" notice.
- **Stale numbers during a session**: platform data changes after load — the screen keeps showing the figures from the last retrieval, with the retrieval time indicated, until the next automatic refresh (every 60 seconds while the tab is visible) or a manual refresh replaces them.
- **Tab hidden then reopened**: while the tab is hidden the automatic refresh pauses; when the admin returns to the tab the screen fetches immediately, so a long-idle tab shows current figures on return rather than a stale value that updates a minute later.
- **Session lost mid-task**: a retrieval is rejected as unauthenticated — handled by the dashboard's shared session-loss behaviour (return to sign-in), consistent with the authentication feature; the administrator is not shown a broken view.
- **Non-administrator reaches the screen**: access is refused; this screen is only reachable within an administrator session, and a signed-in user whose role is not administrator is denied.
- **Unexpected server error**: the administrator sees a generic "something went wrong, please try again" message and a way to retry, with no stale figures shown as current.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The overview screen MUST be reachable only within an administrator session; a request from an unauthenticated visitor MUST result in the dashboard's standard session-loss handling (return to sign-in), and a signed-in user whose role is not administrator MUST be denied access.
- **FR-002**: The overview screen MUST retrieve the platform overview figures when it is opened, without requiring any input or filter from the administrator.
- **FR-003**: The overview screen MUST present the figures in three distinct, labelled groups: users by role, orders by status, and total sales revenue.
- **FR-004**: The users-by-role group MUST show a labelled count for each of the customer, cook, driver, and administrator roles.
- **FR-005**: The orders-by-status group MUST show a labelled count for each order status the platform reports (pending, accepted, preparing, ready for pickup, assigned to driver, picked up, on the way, delivered, completed, cancelled, pending review, quoted).
- **FR-006**: The screen MUST always show every one of the four roles and every one of the twelve order statuses, including those with a count of zero, in a fixed, stable order that does not change between retrievals.
- **FR-007**: The total sales revenue MUST be shown as a single currency-formatted figure representing the combined value of completed orders only, and the screen MUST make clear that the figure covers completed orders only.
- **FR-008**: All counts and the revenue total MUST be rendered in Western/Latin digits (0–9) with thousands separators so large values stay readable, and the card layout MUST remain intact for large values.
- **FR-009**: The screen MUST show a loading state while the figures are being retrieved that is visually distinct from a state where the figures are genuinely all zero.
- **FR-010**: When the platform has no users, no orders, and no completed sales, the screen MUST show every count as zero and the revenue as a zero amount, presented as real values rather than as an error or an empty screen.
- **FR-011**: When retrieval of the figures fails due to connectivity or an unexpected server error, the screen MUST show a retryable "something went wrong, please try again" message and MUST NOT present stale or partial figures as current.
- **FR-012**: The screen MUST provide a way for the administrator to re-fetch the current figures without leaving and re-entering the dashboard.
- **FR-013**: While a re-fetch is in progress, the screen MUST show a refresh-in-progress indication while keeping the previously retrieved figures visible.
- **FR-014**: When a re-fetch fails after a previous successful load, the screen MUST keep the last successfully retrieved figures on screen and show a clear "couldn't refresh, showing last known figures" notice with a retry option.
- **FR-015**: The screen MUST indicate how current the displayed figures are (for example, the time of the last successful retrieval).
- **FR-016**: The screen MUST re-fetch the figures automatically every 60 seconds while it is open and visible, in addition to the manual refresh, using the same in-progress indication and the same failure handling (FR-013, FR-014) as a manual refresh; a manual refresh MUST reset the interval. While the tab is hidden or in the background the automatic re-fetch MUST pause; when the tab becomes visible again the screen MUST fetch immediately and then resume the 60-second cycle.
- **FR-017**: If the response omits a group or an expected role/status key, the screen MUST show the missing role or status as a zero-count card (per FR-006 every role and status is always shown) and MUST NOT show broken cards or fail to render.
- **FR-018**: If the response includes an order status the screen has no label for, the screen MUST still show that status's count with a readable fallback label and MUST keep the layout intact.
- **FR-019**: The screen MUST be laid out Arabic RTL-first, with all group titles, card labels, role names, and status names in Arabic while numeric values use Western/Latin digits (per FR-008), and MUST NOT rely on colour alone to convey the meaning of any figure.
- **FR-020**: Each card in the orders-by-status group MUST link to the orders screen filtered to that status when that screen is available; the users-by-role cards and the total sales revenue card MUST be display-only.
- **FR-021**: Each activatable orders-by-status card MUST be reachable and operable by keyboard and MUST expose its purpose to assistive technology; an orders-by-status card whose target orders screen is unavailable MUST be shown as a plain, non-activatable figure rather than a dead link.

### Key Entities *(include if feature involves data)*

- **Platform Overview**: the live snapshot shown on the dashboard home screen. Composed of three parts — a set of per-role user counts, a set of per-status order counts, and a single total sales revenue amount. Has no identifier and is not stored; it is recomputed each time it is retrieved.
- **User Role Count**: a role name (customer, cook, driver, administrator) paired with the number of users currently holding that role.
- **Order Status Count**: an order status (pending, accepted, preparing, ready for pickup, assigned to driver, picked up, on the way, delivered, completed, cancelled, pending review, quoted) paired with the number of orders currently in that status.
- **Total Sales Revenue**: a single monetary amount, the sum of the order total across every order in the completed status; excludes orders in any other status.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An administrator opening the dashboard home screen can read the current customer, cook, driver, and administrator user counts, the per-status order counts, and the total sales revenue without applying any filter or taking any other action.
- **SC-002**: The figures shown on first load match the platform's current data for the same moment in 100% of checks (every count and the revenue total reconcile against the underlying records).
- **SC-003**: On a normal connection, the overview figures are visible within 3 seconds of opening the screen in at least 95% of loads, with a loading state shown until then.
- **SC-004**: After the administrator triggers a refresh, the displayed figures reflect any platform changes made since the last retrieval in 100% of checks.
- **SC-005**: When retrieval fails, 100% of cases show an explicit, retryable error (initial load) or a "showing last known figures" notice (refresh) rather than a blank screen, an all-zero screen presented as real, or stale figures presented as current.
- **SC-006**: The total sales revenue equals the sum of order totals for completed orders only, and excludes every non-completed order, in 100% of checks.
- **SC-007**: A signed-in non-administrator and an unauthenticated visitor are denied the overview screen in 100% of attempts.
- **SC-008**: All group titles and card labels render correctly right-to-left in Arabic, all numeric values render in Western/Latin digits with thousands separators, and every figure's meaning is distinguishable without relying on colour.

## Assumptions

- The overview is the dashboard's home / landing screen; opening the dashboard after sign-in lands the administrator here.
- The figures are read-only. This phase adds no way to change users, orders, or revenue from the overview screen.
- The set of order statuses is the one listed in the platform's order status values (pending, accepted, preparing, ready_for_pickup, assigned_to_driver, picked_up, on_the_way, delivered, completed, cancelled, pending_review, quoted); the screen provides an Arabic label for each.
- "Completed orders" for revenue means orders in the `completed` status specifically; `delivered` and other near-final statuses do not count until the order reaches `completed`.
- The revenue figure is a single platform-wide total with no per-city, per-cook, or per-period breakdown in this phase.
- The currency and its formatting are the same as used elsewhere in the dashboard (e.g. the delivery fee and order totals screens).
- There is no date range, city, or any other filter on this screen; the endpoint takes no parameters.
- The figures are computed fresh on every retrieval with no caching; any "how current" indicator therefore reflects the time of the last retrieval, not a server-side cache timestamp. The screen re-fetches automatically every 60 seconds while open, plus on manual refresh.
- Session loss (unauthenticated response) is handled by the shared dashboard authentication behaviour defined in the admin authentication feature, not re-specified here.
- The standard success/error envelope and status codes (401 unauthenticated, 403 non-admin, 500 unexpected) described in the API conventions apply; this screen has no request validation of its own because it sends no parameters.
- Drill-down navigation is limited to the orders-by-status cards and depends on the orders oversight screen (Phase 7) existing; where that screen is missing, an order-status card degrades to a plain figure. The users-by-role cards and the revenue card are display-only regardless.

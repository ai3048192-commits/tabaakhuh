# Auth & Session Requirements Quality Checklist: Admin Authentication & Session

**Purpose**: Unit-test the *requirements* for security & session handling, accessibility, error/edge-case coverage, and the auth API contract — before or alongside implementation.
**Created**: 2026-09-07
**Feature**: [spec.md](../spec.md)
**Depth**: Standard review · **Audience**: Reviewer at PR / pre-implementation

**How to use**: Each item asks whether the spec is written well enough, not whether code works. Mark `[x]` when the requirement text passes; add the gap inline when it fails. `[Spec §…]` points at existing text; `[Gap]` means "we looked and found nothing".

## Requirement Completeness

- [ ] CHK001 Are the visible states of the startup "checking" period specified (what the administrator sees while `GET /auth/me` is pending), or only what must *not* be shown? [Completeness, Spec §FR-011, §FR-017]
- [x] CHK002 Are requirements defined for session restoration failing due to a network/connectivity error at startup (distinct from a rejected credential)? [Gap, Spec §FR-014, Edge Cases] — resolved: FR-014a added (retain token, silent, retry).
- [ ] CHK003 Is a bound specified for how long the client waits on the startup current-account call before falling back to the signed-out default? [Gap, Spec §FR-011]
- [ ] CHK004 Are requirements stated for behaviour when the client-side credential store is unavailable or a write fails (private mode, disabled storage, quota)? [Gap, Spec §FR-006]
- [ ] CHK005 Is the required ordering of local-state clearing versus the invalidation request on sign-out stated in the spec itself (not only implied by "regardless of whether the invalidation request succeeded")? [Gap, Spec §FR-019, §FR-020]
- [ ] CHK006 Does the spec define which routes/content constitute "the authenticated area" / "authenticated shell", so "no authenticated content before validation" is unambiguous? [Completeness, Spec §FR-012, §FR-017]
- [ ] CHK007 Are requirements defined for an already-authenticated administrator who navigates directly to the sign-in screen? [Gap, Spec §FR-001]
- [ ] CHK008 Are logging/observability requirements for auth state transitions and failures specified (or explicitly deferred)? [Gap]

## Requirement Clarity & Ambiguity

- [ ] CHK009 Is "promptly" for cross-tab return to the sign-in screen quantified or given an observable trigger (e.g. on focus, within N ms)? [Ambiguity, Spec §FR-026]
- [ ] CHK010 Is "persistent client storage" defined by its observable guarantees — survives reload and browser restart, scoped to one browser profile, not shared across devices — precisely enough to test? [Clarity, Spec §FR-006, Clarifications 2026-09-07]
- [ ] CHK011 Is "MUST NOT briefly display authenticated content" given a measurable bar (any frame is a failure vs a tolerance), so SC-008 is objectively checkable? [Measurability, Spec §FR-017, §SC-008]
- [ ] CHK012 For the incorrect-credentials case, is the "single generic error" defined at the level needed for acceptance testing given final copy is deferred to existing conventions? [Clarity, Spec §FR-007, Assumptions]
- [ ] CHK013 Is it specified whether the rate-limit message may surface a backend-provided wait duration, or must always be generic with no timing? [Ambiguity, Spec §FR-008, Edge Cases]
- [ ] CHK014 Is the "best-effort" invalidation of a non-admin's just-issued credential bounded (does the client wait for it, and for how long) beyond "failure does not change the outcome"? [Clarity, Spec §FR-005, §FR-015]
- [ ] CHK015 Is "the next action" that triggers return-to-sign-in after a mid-session invalidation defined (any authenticated request only, or also navigation / idle interaction)? [Clarity, Spec §FR-016, §SC-005]
- [ ] CHK016 Is "modern desktop browsers" pinned to a concrete support set, given the accessibility and cross-tab (`storage`-event-class) guarantees depend on it? [Clarity, Assumptions]

## Requirement Consistency & Conflicts

- [x] CHK017 Do FR-014 (rejected stored credential → discard, no error toast) and FR-024 (unexpected server error → generic message) give a single unambiguous answer for a 500 on the startup current-account call? [Conflict, Spec §FR-014, §FR-024] — resolved: FR-014a governs startup 5xx; FR-024 scoped to admin-initiated actions.
- [x] CHK018 Is mid-session role downgrade addressed consistently? FR-015 covers it only at startup and FR-016 only on an unauthenticated (401) response — is a live session whose account silently loses admin role in scope? [Consistency, Spec §FR-015, §FR-016, Edge Cases] — resolved: FR-015 + Edge Case now state role is re-checked only on startup, not polled mid-session.
- [ ] CHK019 Do the non-admin refusal requirements at sign-in (FR-005) and at restore (FR-015) specify an identical resulting user-facing state — same message, same notice persistence, same screen? [Consistency, Spec §FR-005, §FR-015]
- [ ] CHK020 Is it consistent throughout that the identifier is one field accepting email-or-phone, given acceptance text about "which field was wrong" (AC3) and the two-input requirement (FR-002)? [Consistency, Spec §FR-002, §FR-007]
- [ ] CHK021 Are the HTTP status codes the client must handle listed consistently between Assumptions (401, 403, 404, 422, 429, 500) and the functional requirements (which name only 401 and 429 explicitly)? [Consistency, Spec §FR-008, Assumptions]

## Acceptance Criteria & Measurability

- [ ] CHK022 Does SC-002 define its measurement population and method ("at least 99% of reloads where the session is still valid" — over what window, what counts as a reload)? [Measurability, Spec §SC-002]
- [ ] CHK023 Is SC-001's "under 15 seconds" meaningful as a ceiling, and is it attributable (client vs network) enough to act on when it fails? [Measurability, Spec §SC-001]
- [ ] CHK024 Does the spec name the audit method and enumerate the exact screen states to audit for SC-009's "zero AA-level violations", rather than leaving that to downstream docs? [Measurability, Spec §SC-009, §FR-027]
- [ ] CHK025 Is there a measurable success criterion for the cross-tab requirement (no SC currently maps to FR-026)? [Coverage, Spec §FR-026]
- [ ] CHK026 Is FR-025 ("never log, display, transmit, or persist the password") given an objective verification method, since "never" is otherwise untestable? [Measurability, Spec §FR-025]
- [ ] CHK027 Does SC-007 specify the disable/de-bounce window and Enter-key-hold behaviour as a requirement, not only the "exactly one request" outcome? [Measurability, Spec §FR-009, §SC-007]

## Scenario & Edge Case Coverage

- [ ] CHK028 Are requirements defined for a second tab signing in as a *different* administrator while the first tab is active (token replaced, not just cleared)? [Gap, Spec §FR-026]
- [ ] CHK029 Is "reload during an in-flight sign-out" covered, given Edge Cases addresses reload during in-flight sign-in only? [Gap, Edge Cases]
- [ ] CHK030 Are requirements defined for a 403 response (documented in the API contract) as distinct from 401 on any of the three auth calls? [Gap, Spec Assumptions, contracts/auth-api.md]
- [ ] CHK031 Is behaviour specified for a well-formed 200 whose envelope is missing expected fields (no `data.user`, no `data.token`)? [Edge Case, Spec §FR-023]
- [ ] CHK032 Is a requirement stated to prevent an unbounded retry loop of the current-account call under repeated startup network failures? [Gap, Spec §FR-011]

## Non-Functional Requirements (Security, Accessibility, i18n)

- [ ] CHK033 Are the security implications of storing the bearer token in script-readable client storage, and the accepted mitigations, captured as requirements or an explicit accepted risk? [Gap, Spec §FR-006, Clarifications 2026-09-07]
- [ ] CHK034 Are the FR-027 accessibility requirements individually testable — is each of labelling, keyboard operability, visible focus, and assistive-tech announcement tied to a specific screen state (default / validation error / rate-limit / server error / loading)? [Clarity, Spec §FR-027, §SC-009]
- [ ] CHK035 Is focus-management behaviour specified (where focus lands on validation failure and on return to the sign-in screen after a refusal), or only that errors are "announced"? [Gap, Spec §FR-027]
- [ ] CHK036 Is "follow the dashboard's existing language conventions" specific enough to author and review the new auth strings against, including RTL handling? [Clarity, Assumptions]

## Dependencies & Assumptions

- [ ] CHK037 Is the assumption that the Phase 1 backend endpoints "already exist and behave as documented" assigned an owner or validation step, rather than stated open-ended? [Assumption, Spec Assumptions]
- [ ] CHK038 Is the dependency on the access-credential format documented as opaque, so no requirement or acceptance criterion relies on its structure? [Assumption, contracts/auth-api.md]
- [ ] CHK039 Is the `device_token` on sign-out clarified for this phase — can the dashboard ever supply one here, or is its absence the only case? [Ambiguity, Spec Assumptions, §FR-019]

## Notes

- Check items off as the requirement text is confirmed adequate: `[x]`
- Record each failing item's specific gap or conflict inline for the spec author
- Items reference `[Spec §…]` for existing text and `[Gap]` where nothing was found

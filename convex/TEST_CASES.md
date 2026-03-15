# Insight Platform — Test Cases

150 test cases across 24 test files covering authentication, authorization (RBAC), tenant isolation, CRUD operations, state transitions, idempotency, and edge cases.

---

## B0 — Foundation (39 tests)

### `users.test.ts` — 9 tests

| # | Test Case | Category | What It Validates |
|---|-----------|----------|-------------------|
| 1 | getMe returns authenticated user profile | Auth | Authenticated user retrieves their own profile with correct name and email |
| 2 | getMe throws when not authenticated | Auth | Unauthenticated access is rejected |
| 3 | createOrGet creates new user when email not found | CRUD | New user is created with correct name and email fields |
| 4 | createOrGet returns existing user when email exists (idempotent) | Idempotency | Returns existing user ID without creating a duplicate or updating the name |
| 5 | updateProfile updates only specified fields | CRUD | Partial update only changes specified fields, leaves others untouched |
| 6 | updateProfile rejects when not authenticated | Auth | Profile update requires authentication |
| 7 | updateAvatar stores storage ID | CRUD | Avatar storage ID is correctly persisted to the user record |
| 8 | updateNotificationPrefs persists all notification settings | CRUD | All notification preferences (push, email, sms, inApp, quiet hours, frequency cap) are saved |
| 9 | updateUnitPreferences persists weight/distance/height preferences | CRUD | Unit preferences (lbs, miles, ft_in) are persisted correctly |

### `tenants.test.ts` — 11 tests

| # | Test Case | Category | What It Validates |
|---|-----------|----------|-------------------|
| 1 | create creates tenant with owner membership and default roles | CRUD | Tenant creation also creates owner membership with isPrimaryGym flag and schedules default roles seeding |
| 2 | create rejects duplicate slug | Edge Case | Duplicate tenant slugs are rejected with error |
| 3 | getBySlug returns tenant for valid slug | CRUD | Tenant is retrieved correctly by slug |
| 4 | getBySlug returns null for nonexistent slug | Edge Case | Returns null for non-existent slug instead of throwing |
| 5 | getMyTenants returns all tenants user belongs to | CRUD | User retrieves all their tenant memberships with correct data |
| 6 | getMyTenants returns empty array for user with no memberships | Edge Case | Returns empty array instead of error for users with no memberships |
| 7 | updateBranding succeeds for owner | RBAC | Owner can update primary and secondary colors |
| 8 | updateBranding rejects for athlete (RBAC) | RBAC | Athletes are blocked from updating branding |
| 9 | updateBranding rejects for coach (RBAC) | RBAC | Coaches are blocked from updating branding |
| 10 | updateSettings persists timezone and business hours | CRUD | Timezone and business hours configuration is saved correctly |
| 11 | tenant isolation: user A cannot access tenant B data | Isolation | Users without membership in a tenant cannot modify it |

### `memberships.test.ts` — 13 tests

| # | Test Case | Category | What It Validates |
|---|-----------|----------|-------------------|
| 1 | join creates active membership with athlete role | CRUD | Membership is created with default "athlete" role and "active" status |
| 2 | join sets isPrimaryGym true for first membership | Logic | First gym membership is automatically marked as primary |
| 3 | join sets isPrimaryGym false for subsequent memberships | Logic | Additional memberships are not marked as primary |
| 4 | join rejects if already a member | Edge Case | Duplicate membership in same gym is prevented |
| 5 | updateRole owner can promote athlete to coach | RBAC | Owner can change an athlete's role to coach |
| 6 | updateRole coach cannot promote anyone (RBAC) | RBAC | Coaches are blocked from role changes |
| 7 | updateRole owner cannot demote themselves | Logic | Owners cannot change their own role (self-demotion guard) |
| 8 | updateStatus admin can freeze membership | RBAC | Admin can change membership status to frozen |
| 9 | updateStatus athlete cannot freeze others | RBAC | Athletes are blocked from changing others' membership status |
| 10 | setPrimaryGym unsets previous primary and sets new | Logic | Changing primary gym correctly updates both old (false) and new (true) flags |
| 11 | leave sets status to cancelled | State | Leaving a gym sets membership status to "cancelled" |
| 12 | leave owner cannot leave | Logic | Owners are blocked from leaving their own gym |
| 13 | listByTenant returns only members of that tenant (isolation) | Isolation | Member list only returns members from the specified tenant |

### `rolesPermissions.test.ts` — 6 tests

| # | Test Case | Category | What It Validates |
|---|-----------|----------|-------------------|
| 1 | seedDefaultRoles creates 4 roles with correct permissions | CRUD | Seeding creates athlete, coach, admin, owner roles with correct tier assignments |
| 2 | upsert creates new custom role | CRUD | New custom role is created with specified permissions and tier |
| 3 | upsert updates existing role permissions | CRUD | Existing role's permissions are updated, same ID returned |
| 4 | remove deletes custom role | CRUD | Custom role is deleted successfully |
| 5 | remove rejects deletion of built-in role | Edge Case | Built-in roles (athlete, coach, admin, owner) cannot be deleted |
| 6 | getMyPermissions returns correct permissions for user role | CRUD | User permissions match their role's configuration |

---

## B1 — Gym / Tenant Management (25 tests)

### `invitations.test.ts` — 8 tests

| # | Test Case | Category | What It Validates |
|---|-----------|----------|-------------------|
| 1 | create generates token and sets 7-day expiry | CRUD | Invitation includes generated token and 7-day expiration timestamp |
| 2 | create rejects duplicate invite for same email+tenant (pending) | Edge Case | Cannot create duplicate pending invitation for same email in same gym |
| 3 | create requires admin role (athlete should fail) | RBAC | Only admins can create invitations |
| 4 | accept creates membership and updates invite status to accepted | State | Accepting invitation creates membership and transitions invite status |
| 5 | accept rejects expired token | Edge Case | Expired invitation tokens are rejected |
| 6 | accept rejects already-accepted token | Edge Case | Already-used invitation tokens cannot be reused |
| 7 | revoke sets status to revoked | State | Admin can revoke a pending invitation |
| 8 | getByToken returns null for nonexistent token | Edge Case | Returns null for non-existent tokens instead of throwing |

### `staff.test.ts` — 4 tests

| # | Test Case | Category | What It Validates |
|---|-----------|----------|-------------------|
| 1 | create links to membership correctly | CRUD | Staff record stores correct membershipId, tenantId, and jobTitle |
| 2 | create requires owner role (admin should fail) | RBAC | Only owners can create staff records |
| 3 | deactivate sets status to inactive | State | Staff deactivation changes status to "inactive" |
| 4 | listByTenant only returns staff for that tenant | Isolation | Staff listing is isolated per tenant |

### `memberNotes.test.ts` — 4 tests

| # | Test Case | Category | What It Validates |
|---|-----------|----------|-------------------|
| 1 | create stores note with correct authorId | CRUD | Note records the creating user as author |
| 2 | update only allows original author | Ownership | Only the note author can edit; other coaches are blocked |
| 3 | listByMember returns notes for correct member only | CRUD | Notes are filtered to the specified member |
| 4 | listByMember requires coach role (athlete fails) | RBAC | Athletes cannot access member notes |

### `waivers.test.ts` — 5 tests

| # | Test Case | Category | What It Validates |
|---|-----------|----------|-------------------|
| 1 | create sets version 1 and isActive true | CRUD | New waiver starts at version 1, active |
| 2 | update creates new version and deactivates old | State | Updating a waiver creates a new version record and deactivates the previous one |
| 3 | sign creates signature record | CRUD | Signing a waiver creates a waiver_signatures record |
| 4 | getSignatureStatus correctly reports signed/unsigned | CRUD | Signature status query correctly returns signed=true/false |
| 5 | listActive returns only active waivers for tenant | CRUD | Only active waivers are returned, inactive versions filtered out |

### `checkIns.test.ts` — 4 tests

| # | Test Case | Category | What It Validates |
|---|-----------|----------|-------------------|
| 1 | checkIn creates record with timestamp | CRUD | Check-in creates record with userId, tenantId, method, and timestamp |
| 2 | checkIn athlete can only check in self | RBAC | Athletes cannot check in other users (requires admin) |
| 3 | checkIn admin can check in others | RBAC | Admins can check in any user on behalf of front-desk |
| 4 | listByUser athlete sees only own check-ins | Ownership | Athletes can only view their own check-in history |

---

## B2 — Workout & Performance (24 tests)

### `exercises.test.ts` — 8 tests

| # | Test Case | Category | What It Validates |
|---|-----------|----------|-------------------|
| 1 | list returns platform + tenant exercises | CRUD | Both platform-wide and tenant-specific exercises are returned together |
| 2 | list does not return other tenant's exercises (isolation) | Isolation | Exercises from other tenants are excluded |
| 3 | list filters by category correctly | CRUD | Category filter returns only matching exercises |
| 4 | search matches name (case-insensitive) | CRUD | Search finds exercises regardless of case |
| 5 | create requires coach role (athlete fails) | RBAC | Only coaches can create exercises |
| 6 | create sets tenantId to current tenant | CRUD | Created exercises are assigned to the caller's tenant |
| 7 | update rejects edits to platform exercises | Ownership | Platform-wide exercises cannot be modified by tenants |
| 8 | remove rejects deletion of platform exercises | Ownership | Platform-wide exercises cannot be deleted by tenants |

### `workoutLogs.test.ts` — 11 tests

| # | Test Case | Category | What It Validates |
|---|-----------|----------|-------------------|
| 1 | create stores log with all metadata | CRUD | Workout log stores date, type, scaling, RPE, notes, draft status |
| 2 | create idempotency — same key returns existing ID | Idempotency | Duplicate idempotency key returns existing record instead of creating duplicate |
| 3 | saveDraft creates with isDraft=true | CRUD | Draft logs are created with isDraft flag set |
| 4 | finalize sets isDraft=false | State | Finalizing a draft clears the isDraft flag |
| 5 | update only allows own logs | Ownership | Users cannot update workout logs belonging to other users |
| 6 | listMine returns only authenticated user's logs | Ownership | Only the caller's logs are returned |
| 7 | listMine respects date range filter | CRUD | Date range filtering works correctly |
| 8 | listByUser requires coach role | RBAC | Only coaches can view another user's workout history |
| 9 | getPreviousScores returns history for same workout | CRUD | Previous scores for the same workout definition are retrieved correctly |
| 10 | getDrafts returns only drafts for current user | CRUD | Only draft logs for the current user are returned |
| 11 | Tenant isolation: cannot see other tenant's workout logs | Isolation | Workout logs are isolated per tenant |

### `trainingPrograms.test.ts` — 5 tests

| # | Test Case | Category | What It Validates |
|---|-----------|----------|-------------------|
| 1 | create requires coach role | RBAC | Only coaches can create training programs |
| 2 | assignToUser creates assignment with correct start date | CRUD | Program assignment stores correct user, program, start date, and active status |
| 3 | getMyAssignments returns only current user's assignments | Ownership | Only the caller's program assignments are returned |
| 4 | unassign removes assignment | CRUD | Program assignment is deleted |
| 5 | unassign removes assignment (verification) | CRUD | Confirms assignment no longer exists after deletion |

---

## B3 — Body Composition & Goals (11 tests)

### `bodyMeasurements.test.ts` — 5 tests

| # | Test Case | Category | What It Validates |
|---|-----------|----------|-------------------|
| 1 | create and listMine returns the measurement | CRUD | Body measurement is created and retrievable |
| 2 | getByDate returns measurement for the requested date | CRUD | Measurement lookup by date works correctly |
| 3 | update modifies an existing measurement | CRUD | Measurement values can be updated |
| 4 | remove deletes a measurement | CRUD | Measurement can be deleted |
| 5 | update rejects when user does not own the measurement | Ownership | Users cannot modify other users' measurements |

### `goals.test.ts` — 6 tests

| # | Test Case | Category | What It Validates |
|---|-----------|----------|-------------------|
| 1 | create sets status to active | CRUD | New goal starts with "active" status |
| 2 | listMine returns only the user's goals | Ownership | Only the caller's goals are returned |
| 3 | update modifies own goal only | Ownership | Users can update their own goals |
| 4 | update rejects another user's goal | Ownership | Users cannot update other users' goals |
| 5 | markComplete transitions status to completed | State | Goal completion sets status="completed" and completedAt timestamp |
| 6 | abandon transitions status to abandoned | State | Goal abandonment sets status="abandoned" |

---

## B4 — Connected Equipment (10 tests)

### `devices.test.ts` — 5 tests

| # | Test Case | Category | What It Validates |
|---|-----------|----------|-------------------|
| 1 | register creates a new device (admin only) | RBAC | Only admins can register devices |
| 2 | listByTenant returns devices for coach role | RBAC | Coaches can view device list |
| 3 | updateStatus changes device online status (internal) | CRUD | Internal mutation updates device online/offline status |
| 4 | deregister removes a device (admin only) | RBAC | Only admins can remove devices |
| 5 | deregister rejects device from another tenant | Isolation | Devices from other tenants cannot be deleted |

### `equipmentSessions.test.ts` — 5 tests

| # | Test Case | Category | What It Validates |
|---|-----------|----------|-------------------|
| 1 | start creates an active session (internal) | CRUD | Internal mutation creates session with "active" status and start timestamp |
| 2 | complete transitions session to completed (internal) | State | Session completion sets status, completedAt, and stores metrics |
| 3 | assignAthlete links a user to the session (coach) | CRUD | Coach assigns an athlete to an active equipment session |
| 4 | abandon marks session as abandoned (coach) | State | Session abandonment sets status="abandoned" |
| 5 | listActive returns only active sessions for the tenant | CRUD | Only active (not completed/abandoned) sessions are returned |

---

## B6 — Coach Tools (6 tests)

### `classRegistrations.test.ts` — 6 tests

| # | Test Case | Category | What It Validates |
|---|-----------|----------|-------------------|
| 1 | register creates a registration with status registered | CRUD | Class registration is created with correct status |
| 2 | register waitlists when class is full | Logic | When class is at max capacity, new registrations go to waitlist |
| 3 | cancel sets status to cancelled | State | Registration cancellation updates status |
| 4 | checkIn sets status to attended (coach) | State | Coach marks registration as attended with timestamp |
| 5 | markNoShow sets status to no_show (coach) | State | Coach marks absent registrant as no-show |
| 6 | promoteFromWaitlist promotes first waitlisted (internal) | Logic | Internal mutation promotes the first waitlisted person to registered |

---

## B7 — Social, Community & Gamification (16 tests)

### `challenges.test.ts` — 6 tests

| # | Test Case | Category | What It Validates |
|---|-----------|----------|-------------------|
| 1 | create makes a new challenge (coach) | RBAC | Only coaches can create challenges |
| 2 | join adds participant and leave removes them | CRUD | Participants can join and leave challenges |
| 3 | join rejects duplicate enrollment | Edge Case | Users cannot join the same challenge twice |
| 4 | updateProgress updates participant progress (internal) | CRUD | Internal mutation updates participant's progress value |
| 5 | getStandings returns participants sorted by progress desc | Logic | Standings are sorted by progress in descending order |
| 6 | close sets challenge status | State | Coach can close a challenge |

### `streaks.test.ts` — 5 tests

| # | Test Case | Category | What It Validates |
|---|-----------|----------|-------------------|
| 1 | updateStreak increments count on consecutive days | Logic | Streak count increases when activity is on consecutive days |
| 2 | updateStreak resets count on gap of more than one day | Logic | Streak resets to 1 when there's a day gap in activity |
| 3 | updateStreak same-day activity is a no-op | Logic | Duplicate same-day activity does not affect streak count |
| 4 | useFreeze decrements freeze credits | CRUD | Using a freeze decrements the available freeze credits |
| 5 | getMine returns empty array when no streaks exist | Edge Case | Returns empty array instead of error when no streaks |

### `badges.test.ts` — 5 tests

| # | Test Case | Category | What It Validates |
|---|-----------|----------|-------------------|
| 1 | awardBadge creates a user_badge record (internal) | CRUD | Internal mutation creates badge award record |
| 2 | awardBadge is idempotent (no duplicates) | Idempotency | Awarding same badge twice does not create duplicate records |
| 3 | getMyBadges returns badges with details | CRUD | Badge query returns full badge details joined from badges table |
| 4 | list returns all platform badges | CRUD | All available badges are returned |
| 5 | getUserBadges returns badges for a specific user | CRUD | Coach can view another user's badge collection |

---

## B8 — Communication & Messaging (10 tests)

### `conversations.test.ts` — 5 tests

| # | Test Case | Category | What It Validates |
|---|-----------|----------|-------------------|
| 1 | create direct conversation includes creator as participant | CRUD | Creator is automatically included in participant list |
| 2 | listMine filters by participant | Ownership | Only conversations the user participates in are returned |
| 3 | addParticipant adds a user to the conversation | CRUD | New participant is appended to participant list |
| 4 | removeParticipant removes a user from the conversation | CRUD | Participant is removed from conversation |
| 5 | getById rejects non-participant | Auth | Non-participants cannot view conversation details |

### `messages.test.ts` — 5 tests

| # | Test Case | Category | What It Validates |
|---|-----------|----------|-------------------|
| 1 | send updates conversation.lastMessageTimestamp | Logic | Sending a message updates the conversation's last activity timestamp |
| 2 | listByConversation returns messages ordered desc | CRUD | Messages are returned in reverse chronological order |
| 3 | markRead sets read receipt for the user | CRUD | Read receipt is recorded for the reading user |
| 4 | search filters messages by content | CRUD | Content-based message search returns matching messages |
| 5 | send rejects non-participant | Auth | Non-participants cannot send messages to a conversation |

---

## B10 — Billing & Payments (5 tests)

### `subscriptions.test.ts` — 5 tests

| # | Test Case | Category | What It Validates |
|---|-----------|----------|-------------------|
| 1 | getMySubscription returns active subscription | CRUD | User retrieves their active subscription |
| 2 | changePlan updates subscription planId | CRUD | Plan change updates the membership plan reference |
| 3 | freeze sets status to paused | State | Freezing sets status="paused" and records freeze timestamp |
| 4 | cancel sets cancelAtPeriodEnd to true | State | Cancellation marks subscription to end at current period, not immediately |
| 5 | syncFromStripe updates subscription from webhook (internal) | CRUD | Internal mutation syncs subscription data from Stripe webhook payload |

---

## B12 — Platform Admin (5 tests)

### `featureFlags.test.ts` — 5 tests

| # | Test Case | Category | What It Validates |
|---|-----------|----------|-------------------|
| 1 | create and list returns the flag | CRUD | Feature flag is created and appears in list |
| 2 | isEnabled returns true for enabled flag | Logic | Enabled flags return true |
| 3 | isEnabled returns false for disabled flag | Logic | Disabled flags return false |
| 4 | isEnabled returns false for nonexistent flag | Edge Case | Missing flags return false instead of throwing |
| 5 | getByName returns flag details | CRUD | Flag details including rollout percentage are retrievable by name |

---

## Test Coverage Summary by Category

| Category | Tests | Description |
|----------|-------|-------------|
| **CRUD** | 68 | Create, read, update, delete operations work correctly |
| **RBAC** | 27 | Role-based access control enforces minimum role requirements |
| **Ownership** | 16 | Users can only modify their own data (unless elevated role) |
| **Isolation** | 10 | Tenant data is never leaked across gym boundaries |
| **State Transitions** | 14 | Status fields transition correctly (active→frozen, draft→final, etc.) |
| **Edge Cases** | 10 | Duplicates, missing data, empty results handled gracefully |
| **Auth** | 5 | Authentication is required for protected functions |
| **Idempotency** | 3 | Duplicate operations return existing data without side effects |
| **Logic** | 9 | Business logic (streaks, waitlists, standings, primary gym) works correctly |
| **Total** | **150** | |

---

## Test Coverage by Domain

| Domain | Files | Tests | Key Scenarios |
|--------|-------|-------|---------------|
| B0 Foundation | 4 | 39 | Auth, RBAC, tenant isolation, role hierarchy |
| B1 Tenant Mgmt | 5 | 25 | Invitations, waivers, check-ins, staff RBAC |
| B2 Workouts | 3 | 24 | Idempotency, drafts, platform vs tenant exercises |
| B3 Body Comp | 2 | 11 | Ownership, state transitions (goals) |
| B4 Equipment | 2 | 10 | Internal mutations, session lifecycle |
| B6 Coach Tools | 1 | 6 | Capacity/waitlist, attendance tracking |
| B7 Social | 3 | 16 | Streaks, badges (idempotent), challenge standings |
| B8 Communication | 2 | 10 | Participant enforcement, real-time ordering |
| B10 Billing | 1 | 5 | Subscription lifecycle, Stripe sync |
| B12 Platform Admin | 1 | 5 | Feature flag evaluation |
| **Total** | **24** | **150** | |

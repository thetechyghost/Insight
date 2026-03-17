import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // ==========================================================================
  // B0 — FOUNDATION
  // ==========================================================================

  // Core user profile. Single identity across all tenants.
  users: defineTable({
    name: v.string(),
    email: v.string(),
    avatarStorageId: v.optional(v.id("_storage")),
    bio: v.optional(v.string()),

    // Physical attributes
    height: v.optional(v.number()),  // cm
    weight: v.optional(v.number()),  // kg
    dateOfBirth: v.optional(v.string()),
    gender: v.optional(
      v.union(v.literal("male"), v.literal("female"), v.literal("prefer_not_to_say"))
    ),
    trainingStartDate: v.optional(v.string()),

    // Emergency & medical
    emergencyContact: v.optional(v.object({
      name: v.string(),
      phone: v.string(),
      relationship: v.string(),
    })),
    medicalInfo: v.optional(v.string()),

    // Notification preferences
    notificationPrefs: v.optional(v.object({
      push: v.boolean(),
      email: v.boolean(),
      sms: v.boolean(),
      inApp: v.boolean(),
      quietHoursStart: v.optional(v.string()),
      quietHoursEnd: v.optional(v.string()),
      frequencyCapPerHour: v.optional(v.number()),
    })),

    // Preferences
    unitPreferences: v.optional(v.object({
      weight: v.union(v.literal("lbs"), v.literal("kg")),
      distance: v.union(v.literal("miles"), v.literal("km")),
      height: v.union(v.literal("ft_in"), v.literal("cm")),
    })),
    defaultScalingLevel: v.optional(
      v.union(v.literal("Rx+"), v.literal("Rx"), v.literal("Scaled"))
    ),

    // Physiological baselines (HR zone calculations)
    maxHR: v.optional(v.number()),
    lactateThreshold: v.optional(v.number()),
    preferredHRZoneMethod: v.optional(
      v.union(v.literal("maxHR"), v.literal("lactate"), v.literal("custom"))
    ),

    // Onboarding
    onboardingStatus: v.optional(v.union(
      v.literal("not_started"),
      v.literal("profile_created"),
      v.literal("gym_joined"),
      v.literal("first_workout"),
      v.literal("complete"),
    )),
  })
    .index("by_email", ["email"]),

  // Gym / organization tenant
  tenants: defineTable({
    name: v.string(),
    slug: v.string(),

    branding: v.optional(v.object({
      logoStorageId: v.optional(v.id("_storage")),
      primaryColor: v.optional(v.string()),
      secondaryColor: v.optional(v.string()),
      typography: v.optional(v.string()),
    })),

    terminologyDictionary: v.optional(v.any()), // Record<string, string>
    featureToggles: v.optional(v.any()),         // Record<string, boolean>
    customDomain: v.optional(v.string()),

    businessHours: v.optional(v.any()), // Record<dayOfWeek, {open, close}>
    timezone: v.optional(v.string()),
    location: v.optional(v.object({
      address: v.string(),
      city: v.string(),
      state: v.optional(v.string()),
      postalCode: v.string(),
      country: v.string(),
      latitude: v.optional(v.number()),
      longitude: v.optional(v.number()),
    })),
    contactInfo: v.optional(v.object({
      phone: v.optional(v.string()),
      email: v.optional(v.string()),
      website: v.optional(v.string()),
    })),
    cancellationPolicies: v.optional(v.string()),

    // Billing (Stripe Connect)
    stripeConnectAccountId: v.optional(v.string()),
    taxRate: v.optional(v.number()),
    currency: v.optional(v.string()),
    invoiceSettings: v.optional(v.object({
      companyName: v.optional(v.string()),
      taxId: v.optional(v.string()),
      footer: v.optional(v.string()),
    })),
  })
    .index("by_slug", ["slug"]),

  // User-to-tenant membership join table
  memberships: defineTable({
    userId: v.id("users"),
    tenantId: v.id("tenants"),
    role: v.union(
      v.literal("athlete"), v.literal("coach"), v.literal("owner"), v.literal("admin")
    ),
    status: v.union(
      v.literal("active"), v.literal("frozen"), v.literal("cancelled"), v.literal("pending")
    ),
    isPrimaryGym: v.boolean(),
    membershipPlanId: v.optional(v.id("membership_plans")),
    subscriptionId: v.optional(v.id("subscriptions")),
    stripeCustomerId: v.optional(v.string()),
    paymentStatus: v.optional(
      v.union(v.literal("current"), v.literal("past_due"), v.literal("none"))
    ),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    joinDate: v.string(),
    referralSource: v.optional(v.string()),
    membershipType: v.optional(v.string()),
  })
    .index("by_userId", ["userId"])
    .index("by_tenantId", ["tenantId"])
    .index("by_userId_tenantId", ["userId", "tenantId"])
    .index("by_tenantId_status", ["tenantId", "status"])
    .index("by_tenantId_role", ["tenantId", "role"]),

  // RBAC roles with permission arrays
  roles_permissions: defineTable({
    tenantId: v.id("tenants"),
    roleName: v.string(),
    permissions: v.array(v.string()),
    tier: v.optional(v.union(
      v.literal("athlete"), v.literal("coach"), v.literal("owner"),
      v.literal("admin"), v.literal("super_admin"),
    )),
  })
    .index("by_tenantId", ["tenantId"])
    .index("by_tenantId_roleName", ["tenantId", "roleName"]),

  // ==========================================================================
  // B1 — GYM / TENANT MANAGEMENT
  // ==========================================================================

  staff: defineTable({
    membershipId: v.id("memberships"),
    tenantId: v.id("tenants"),
    jobTitle: v.optional(v.string()),
    hireDate: v.optional(v.string()),
    permissions: v.optional(v.array(v.string())),
    status: v.union(v.literal("active"), v.literal("inactive")),
    assignedRoles: v.optional(v.array(v.string())),
  })
    .index("by_tenantId", ["tenantId"])
    .index("by_membershipId", ["membershipId"]),

  invitations: defineTable({
    email: v.string(),
    tenantId: v.id("tenants"),
    role: v.union(v.literal("athlete"), v.literal("coach"), v.literal("owner"), v.literal("admin")),
    token: v.string(),
    expiresAt: v.number(),
    status: v.union(v.literal("pending"), v.literal("accepted"), v.literal("expired"), v.literal("revoked")),
    invitedBy: v.id("users"),
  })
    .index("by_tenantId", ["tenantId"])
    .index("by_token", ["token"])
    .index("by_email_tenantId", ["email", "tenantId"]),

  member_notes: defineTable({
    memberId: v.id("memberships"),
    tenantId: v.id("tenants"),
    authorId: v.id("users"),
    content: v.string(),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  })
    .index("by_tenantId_memberId", ["tenantId", "memberId"]),

  waivers: defineTable({
    tenantId: v.id("tenants"),
    title: v.string(),
    content: v.string(),
    version: v.number(),
    isActive: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_tenantId", ["tenantId"])
    .index("by_tenantId_isActive", ["tenantId", "isActive"]),

  waiver_signatures: defineTable({
    waiverId: v.id("waivers"),
    userId: v.id("users"),
    tenantId: v.id("tenants"),
    signedAt: v.number(),
    waiverVersion: v.number(),
    ipAddress: v.optional(v.string()),
  })
    .index("by_tenantId_userId", ["tenantId", "userId"])
    .index("by_waiverId", ["waiverId"]),

  check_ins: defineTable({
    userId: v.id("users"),
    tenantId: v.id("tenants"),
    checkedInAt: v.number(),
    method: v.union(
      v.literal("qr"), v.literal("nfc"), v.literal("pin"),
      v.literal("barcode"), v.literal("manual"),
    ),
  })
    .index("by_tenantId", ["tenantId"])
    .index("by_userId_tenantId", ["userId", "tenantId"])
    .index("by_tenantId_checkedInAt", ["tenantId", "checkedInAt"]),

  // ==========================================================================
  // B2 — WORKOUT & PERFORMANCE
  // ==========================================================================

  exercises: defineTable({
    name: v.string(),
    category: v.union(
      v.literal("weightlifting"), v.literal("gymnastics"),
      v.literal("monostructural"), v.literal("other"),
    ),
    equipment: v.optional(v.array(v.string())),
    muscleGroups: v.optional(v.array(v.string())),
    instructions: v.optional(v.string()),
    demoVideoStorageIds: v.optional(v.array(v.id("_storage"))),
    aliases: v.optional(v.array(v.string())),
    scalingAlternatives: v.optional(v.array(v.string())),
    commonSubstitutions: v.optional(v.array(v.string())),
    difficultyLevel: v.optional(
      v.union(v.literal("beginner"), v.literal("intermediate"), v.literal("advanced"), v.literal("elite"))
    ),
    progressionPaths: v.optional(v.array(v.string())),
    tenantId: v.optional(v.id("tenants")),
  })
    .index("by_tenantId", ["tenantId"])
    .index("by_name", ["name"])
    .index("by_category", ["category"]),

  benchmark_workouts: defineTable({
    name: v.string(),
    workoutType: v.string(),
    prescribedMovements: v.array(v.object({
      exerciseId: v.optional(v.id("exercises")),
      exerciseName: v.string(),
      reps: v.optional(v.number()),
      weight: v.optional(v.object({ value: v.number(), unit: v.string() })),
      distance: v.optional(v.object({ value: v.number(), unit: v.string() })),
      calories: v.optional(v.number()),
    })),
    timeCap: v.optional(v.number()),
    scoringMethod: v.union(
      v.literal("time"), v.literal("reps"), v.literal("rounds_reps"),
      v.literal("weight"), v.literal("distance"), v.literal("calories"),
    ),
    category: v.optional(
      v.union(v.literal("Hero"), v.literal("Girl"), v.literal("Open"), v.literal("custom"))
    ),
    description: v.optional(v.string()),
    intendedStimulus: v.optional(v.string()),
    tenantId: v.optional(v.id("tenants")),
  })
    .index("by_tenantId", ["tenantId"])
    .index("by_name", ["name"])
    .index("by_category", ["category"]),

  workout_definitions: defineTable({
    workoutType: v.union(
      v.literal("ForTime"), v.literal("AMRAP"), v.literal("EMOM"),
      v.literal("Tabata"), v.literal("Chipper"), v.literal("Ladder"),
      v.literal("Strength"), v.literal("Custom"),
    ),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    components: v.array(v.object({
      exerciseId: v.optional(v.id("exercises")),
      exerciseName: v.string(),
      reps: v.optional(v.number()),
      sets: v.optional(v.number()),
      weight: v.optional(v.object({ value: v.number(), unit: v.string() })),
      distance: v.optional(v.object({ value: v.number(), unit: v.string() })),
      duration: v.optional(v.number()),
      calories: v.optional(v.number()),
      notes: v.optional(v.string()),
      order: v.number(),
    })),
    timeCap: v.optional(v.number()),
    rounds: v.optional(v.number()),
    intervalDuration: v.optional(v.number()),
    restBetweenRounds: v.optional(v.number()),
    scalingOptions: v.optional(v.array(v.object({
      level: v.string(),
      description: v.string(),
    }))),
    intendedStimulus: v.optional(v.string()),
    scalingGuidance: v.optional(v.string()),
    warmUpRef: v.optional(v.id("workout_definitions")),
    coolDownRef: v.optional(v.id("workout_definitions")),
    movementDemoVideoStorageIds: v.optional(v.array(v.id("_storage"))),
    tenantId: v.optional(v.id("tenants")),
    createdBy: v.optional(v.id("users")),
  })
    .index("by_tenantId", ["tenantId"])
    .index("by_tenantId_workoutType", ["tenantId", "workoutType"])
    .index("by_createdBy", ["createdBy"]),

  // Workout log metadata. Performance metrics go to TimescaleDB.
  workout_logs: defineTable({
    userId: v.id("users"),
    tenantId: v.id("tenants"),
    workoutDefinitionId: v.optional(v.id("workout_definitions")),
    benchmarkWorkoutId: v.optional(v.id("benchmark_workouts")),
    date: v.string(),
    workoutType: v.optional(v.string()),
    scalingDesignation: v.optional(
      v.union(v.literal("Rx+"), v.literal("Rx"), v.literal("Scaled"))
    ),
    rpe: v.optional(v.number()),
    notes: v.optional(v.string()),
    isDraft: v.boolean(),
    idempotencyKey: v.optional(v.string()),
  })
    .index("by_userId_tenantId", ["userId", "tenantId"])
    .index("by_tenantId", ["tenantId"])
    .index("by_tenantId_date", ["tenantId", "date"])
    .index("by_userId_date", ["userId", "date"])
    .index("by_workoutDefinitionId", ["workoutDefinitionId"])
    .index("by_idempotencyKey", ["idempotencyKey"]),

  training_programs: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    authorId: v.id("users"),
    weeks: v.number(),
    phaseLabels: v.optional(v.array(v.string())),
    tenantId: v.optional(v.id("tenants")),
    price: v.optional(v.number()),
    currency: v.optional(v.string()),
    publishedStatus: v.optional(
      v.union(v.literal("draft"), v.literal("published"), v.literal("archived"))
    ),
    purchaseCount: v.optional(v.number()),
    averageRating: v.optional(v.number()),
    authorBio: v.optional(v.string()),
  })
    .index("by_tenantId", ["tenantId"])
    .index("by_authorId", ["authorId"])
    .index("by_publishedStatus", ["publishedStatus"]),

  program_assignments: defineTable({
    userId: v.id("users"),
    programId: v.id("training_programs"),
    startDate: v.string(),
    currentWeek: v.optional(v.number()),
    status: v.optional(v.union(v.literal("active"), v.literal("completed"), v.literal("dropped"))),
    tenantId: v.id("tenants"),
  })
    .index("by_userId_tenantId", ["userId", "tenantId"])
    .index("by_programId", ["programId"]),

  // ==========================================================================
  // B3 — BODY COMPOSITION, GOALS & CONTENT
  // ==========================================================================

  body_measurements: defineTable({
    userId: v.id("users"),
    tenantId: v.id("tenants"),
    date: v.string(),
    waist: v.optional(v.number()),
    hips: v.optional(v.number()),
    chest: v.optional(v.number()),
    leftArm: v.optional(v.number()),
    rightArm: v.optional(v.number()),
    leftThigh: v.optional(v.number()),
    rightThigh: v.optional(v.number()),
    leftCalf: v.optional(v.number()),
    rightCalf: v.optional(v.number()),
    neck: v.optional(v.number()),
    notes: v.optional(v.string()),
  })
    .index("by_userId_tenantId", ["userId", "tenantId"])
    .index("by_userId_date", ["userId", "date"]),

  progress_photos: defineTable({
    userId: v.id("users"),
    tenantId: v.id("tenants"),
    fileId: v.id("_storage"),
    date: v.string(),
    bodyRegionTags: v.optional(v.array(v.string())),
    privacySetting: v.union(v.literal("private"), v.literal("coach_only"), v.literal("gym")),
  })
    .index("by_userId_tenantId", ["userId", "tenantId"])
    .index("by_userId_date", ["userId", "date"]),

  goals: defineTable({
    userId: v.id("users"),
    tenantId: v.id("tenants"),
    type: v.union(
      v.literal("strength"), v.literal("body_comp"), v.literal("endurance"),
      v.literal("consistency"), v.literal("skill"),
    ),
    title: v.string(),
    description: v.optional(v.string()),
    targetValue: v.optional(v.number()),
    currentValue: v.optional(v.number()),
    unit: v.optional(v.string()),
    targetUnit: v.optional(v.string()),
    deadline: v.optional(v.string()),
    targetDate: v.optional(v.string()),
    status: v.union(v.literal("active"), v.literal("completed"), v.literal("abandoned")),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
    linkedExerciseId: v.optional(v.id("exercises")),
    linkedBenchmarkId: v.optional(v.id("benchmark_workouts")),
  })
    .index("by_userId_tenantId", ["userId", "tenantId"])
    .index("by_userId_status", ["userId", "status"]),

  habits: defineTable({
    userId: v.id("users"),
    tenantId: v.id("tenants"),
    name: v.string(),
    frequency: v.union(v.literal("daily"), v.literal("weekly")),
    trackingRecords: v.optional(v.array(v.string())),
  })
    .index("by_userId_tenantId", ["userId", "tenantId"]),

  program_content: defineTable({
    programId: v.id("training_programs"),
    weekNumber: v.number(),
    dayNumber: v.number(),
    workoutDefinitionId: v.optional(v.id("workout_definitions")),
    isRestDay: v.boolean(),
    notes: v.optional(v.string()),
  })
    .index("by_programId", ["programId"])
    .index("by_programId_week_day", ["programId", "weekNumber", "dayNumber"]),

  educational_content: defineTable({
    title: v.string(),
    body: v.string(),
    tags: v.array(v.string()),
    difficultyLevel: v.optional(
      v.union(v.literal("beginner"), v.literal("intermediate"), v.literal("advanced"))
    ),
    category: v.optional(v.string()),
    tenantId: v.optional(v.id("tenants")),
  })
    .index("by_tenantId", ["tenantId"])
    .index("by_category", ["category"]),

  // ==========================================================================
  // B4 — CONNECTED EQUIPMENT & IoT
  // ==========================================================================

  devices: defineTable({
    tenantId: v.id("tenants"),
    name: v.string(),
    type: v.union(
      v.literal("RowErg"), v.literal("BikeErg"), v.literal("SkiErg"),
      v.literal("Treadmill"), v.literal("AssaultBike"), v.literal("Other"),
    ),
    serialNumber: v.optional(v.string()),
    locationLabel: v.optional(v.string()),
    isOnline: v.boolean(),
    lastSeenAt: v.optional(v.number()),
    firmwareVersion: v.optional(v.string()),
    iotHubDeviceId: v.optional(v.string()),
  })
    .index("by_tenantId", ["tenantId"]),

  device_maintenance: defineTable({
    deviceId: v.id("devices"),
    tenantId: v.id("tenants"),
    description: v.string(),
    performedAt: v.number(),
    performedBy: v.id("users"),
    nextDueAt: v.optional(v.number()),
  })
    .index("by_deviceId", ["deviceId"])
    .index("by_tenantId", ["tenantId"]),

  equipment_sessions: defineTable({
    deviceId: v.id("devices"),
    tenantId: v.id("tenants"),
    userId: v.optional(v.id("users")),
    workoutLogId: v.optional(v.id("workout_logs")),
    status: v.union(v.literal("active"), v.literal("completed"), v.literal("abandoned")),
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
    metrics: v.optional(v.any()),
  })
    .index("by_tenantId", ["tenantId"])
    .index("by_deviceId", ["deviceId"])
    .index("by_tenantId_status", ["tenantId", "status"]),

  concept2_streaks: defineTable({
    userId: v.id("users"),
    tenantId: v.id("tenants"),
    currentStreak: v.number(),
    longestStreak: v.number(),
    lastActivityDate: v.optional(v.string()),
    freezeCreditsRemaining: v.optional(v.number()),
  })
    .index("by_userId_tenantId", ["userId", "tenantId"]),

  // ==========================================================================
  // B5 — WEARABLE INTEGRATION
  // ==========================================================================

  wearable_connections: defineTable({
    userId: v.id("users"),
    tenantId: v.id("tenants"),
    provider: v.union(
      v.literal("apple_health"), v.literal("garmin"), v.literal("fitbit"),
      v.literal("whoop"), v.literal("strava"), v.literal("trainingpeaks"),
    ),
    accessToken: v.optional(v.string()),
    refreshToken: v.optional(v.string()),
    expiresAt: v.optional(v.number()),
    lastSyncAt: v.optional(v.number()),
    syncStatus: v.optional(v.union(
      v.literal("active"), v.literal("error"), v.literal("paused")
    )),
    scopes: v.optional(v.array(v.string())),
  })
    .index("by_userId_tenantId", ["userId", "tenantId"])
    .index("by_userId_provider", ["userId", "provider"]),

  hr_zones: defineTable({
    userId: v.id("users"),
    tenantId: v.id("tenants"),
    method: v.union(v.literal("maxHR"), v.literal("lactate"), v.literal("custom")),
    maxHR: v.optional(v.number()),
    lactateThreshold: v.optional(v.number()),
    zones: v.optional(v.array(v.object({
      name: v.string(),
      lowerBound: v.number(),
      upperBound: v.number(),
    }))),
  })
    .index("by_userId_tenantId", ["userId", "tenantId"]),

  // ==========================================================================
  // B6 — COACH / TRAINER TOOLS
  // ==========================================================================

  programs_coach: defineTable({
    name: v.string(),
    tenantId: v.id("tenants"),
    authorId: v.id("users"),
    periodizationType: v.optional(v.union(
      v.literal("linear"), v.literal("undulating"), v.literal("conjugate"), v.literal("block"),
    )),
    phaseLabels: v.optional(v.array(v.string())),
    publishedStatus: v.union(v.literal("draft"), v.literal("published"), v.literal("archived")),
    track: v.optional(v.union(
      v.literal("Competitors"), v.literal("Fitness"), v.literal("Endurance"), v.literal("Foundations"),
    )),
  })
    .index("by_tenantId", ["tenantId"])
    .index("by_tenantId_authorId", ["tenantId", "authorId"])
    .index("by_tenantId_publishedStatus", ["tenantId", "publishedStatus"]),

  program_days: defineTable({
    programId: v.id("programs_coach"),
    dayNumber: v.number(),
    weekNumber: v.number(),
    workoutDefinitionId: v.optional(v.id("workout_definitions")),
    coachNotes: v.optional(v.string()),
    intendedStimulus: v.optional(v.string()),
    scalingGuidance: v.optional(v.string()),
    warmUp: v.optional(v.string()),
    coolDown: v.optional(v.string()),
  })
    .index("by_programId", ["programId"])
    .index("by_programId_week_day", ["programId", "weekNumber", "dayNumber"]),

  daily_wod: defineTable({
    tenantId: v.id("tenants"),
    track: v.optional(v.string()),
    date: v.string(),
    workoutDefinitionId: v.id("workout_definitions"),
    coachNotes: v.optional(v.string()),
    stimulusDescription: v.optional(v.string()),
    scalingOptions: v.optional(v.array(v.object({
      level: v.string(),
      description: v.string(),
    }))),
    publishTime: v.optional(v.number()),
    autoPublishSchedule: v.optional(v.string()),
  })
    .index("by_tenantId_date", ["tenantId", "date"])
    .index("by_tenantId_track_date", ["tenantId", "track", "date"]),

  program_revisions: defineTable({
    programId: v.id("programs_coach"),
    revisionNumber: v.number(),
    snapshotData: v.any(),
    authorId: v.id("users"),
  })
    .index("by_programId", ["programId"]),

  classes: defineTable({
    tenantId: v.id("tenants"),
    name: v.string(),
    schedule: v.optional(v.any()),
    capacity: v.number(),
    coachId: v.optional(v.id("users")),
    track: v.optional(v.string()),
    location: v.optional(v.string()),
    scheduleTemplateId: v.optional(v.id("schedule_templates")),
    bookingPolicyId: v.optional(v.id("booking_policies")),
  })
    .index("by_tenantId", ["tenantId"])
    .index("by_tenantId_coachId", ["tenantId", "coachId"]),

  class_sessions: defineTable({
    classId: v.id("classes"),
    tenantId: v.id("tenants"),
    date: v.string(),
    startTime: v.optional(v.string()),
    coachId: v.optional(v.id("users")),
    workoutDefinitionId: v.optional(v.id("workout_definitions")),
    status: v.union(
      v.literal("scheduled"), v.literal("in_progress"),
      v.literal("complete"), v.literal("cancelled"),
    ),
    linkedEquipmentSessionIds: v.optional(v.array(v.id("equipment_sessions"))),
  })
    .index("by_tenantId", ["tenantId"])
    .index("by_tenantId_date", ["tenantId", "date"])
    .index("by_classId", ["classId"])
    .index("by_coachId", ["coachId"]),

  class_registrations: defineTable({
    classSessionId: v.id("class_sessions"),
    userId: v.id("users"),
    tenantId: v.id("tenants"),
    status: v.union(
      v.literal("registered"), v.literal("waitlisted"), v.literal("attended"),
      v.literal("no_show"), v.literal("late_cancel"),
    ),
    checkInTime: v.optional(v.number()),
    checkOutTime: v.optional(v.number()),
    cancellationTimestamp: v.optional(v.number()),
    penaltyApplied: v.optional(v.boolean()),
    bookingSource: v.optional(
      v.union(v.literal("app"), v.literal("web"), v.literal("front_desk"))
    ),
  })
    .index("by_classSessionId", ["classSessionId"])
    .index("by_userId_tenantId", ["userId", "tenantId"])
    .index("by_tenantId", ["tenantId"])
    .index("by_classSessionId_status", ["classSessionId", "status"]),

  video_submissions: defineTable({
    userId: v.id("users"),
    tenantId: v.id("tenants"),
    fileId: v.id("_storage"),
    movementTag: v.optional(v.string()),
    status: v.union(v.literal("pending"), v.literal("reviewed"), v.literal("returned")),
    submittedAt: v.number(),
  })
    .index("by_tenantId", ["tenantId"])
    .index("by_tenantId_status", ["tenantId", "status"])
    .index("by_userId", ["userId"]),

  video_annotations: defineTable({
    videoSubmissionId: v.id("video_submissions"),
    frameTimestamp: v.number(),
    annotationType: v.union(v.literal("drawing"), v.literal("text"), v.literal("voice_over")),
    content: v.optional(v.string()),
    fileId: v.optional(v.id("_storage")),
    annotationTemplateId: v.optional(v.id("annotation_templates")),
  })
    .index("by_videoSubmissionId", ["videoSubmissionId"]),

  annotation_templates: defineTable({
    name: v.string(),
    tenantId: v.id("tenants"),
    movementCategory: v.optional(v.string()),
    content: v.string(),
  })
    .index("by_tenantId", ["tenantId"]),

  coach_notes: defineTable({
    coachId: v.id("users"),
    athleteId: v.id("users"),
    tenantId: v.id("tenants"),
    content: v.string(),
  })
    .index("by_tenantId_athleteId", ["tenantId", "athleteId"])
    .index("by_coachId", ["coachId"]),

  class_notes: defineTable({
    classSessionId: v.id("class_sessions"),
    tenantId: v.id("tenants"),
    content: v.string(),
    coachId: v.id("users"),
  })
    .index("by_classSessionId", ["classSessionId"])
    .index("by_tenantId", ["tenantId"]),

  // ==========================================================================
  // B7 — SOCIAL, COMMUNITY & GAMIFICATION
  // ==========================================================================

  activity_feed: defineTable({
    type: v.union(
      v.literal("workout_logged"), v.literal("pr_achieved"),
      v.literal("challenge_completed"), v.literal("milestone"),
      v.literal("badge_earned"), v.literal("streak"),
    ),
    userId: v.id("users"),
    tenantId: v.id("tenants"),
    timestamp: v.number(),
    visibility: v.union(
      v.literal("gym"), v.literal("friends"), v.literal("public"), v.literal("private")
    ),
    linkedEntityId: v.optional(v.string()),
    linkedEntityType: v.optional(v.string()),
    displayData: v.optional(v.any()),
  })
    .index("by_tenantId_timestamp", ["tenantId", "timestamp"])
    .index("by_userId", ["userId"])
    .index("by_userId_tenantId", ["userId", "tenantId"]),

  reactions: defineTable({
    feedItemId: v.id("activity_feed"),
    userId: v.id("users"),
    emoji: v.string(),
  })
    .index("by_feedItemId", ["feedItemId"])
    .index("by_userId", ["userId"]),

  comments: defineTable({
    feedItemId: v.optional(v.id("activity_feed")),
    parentCommentId: v.optional(v.id("comments")),
    userId: v.id("users"),
    tenantId: v.id("tenants"),
    content: v.string(),
  })
    .index("by_feedItemId", ["feedItemId"])
    .index("by_parentCommentId", ["parentCommentId"]),

  follows: defineTable({
    followerId: v.id("users"),
    followedId: v.id("users"),
    tenantId: v.id("tenants"),
    status: v.union(v.literal("pending"), v.literal("accepted")),
  })
    .index("by_followerId", ["followerId"])
    .index("by_followedId", ["followedId"])
    .index("by_followerId_tenantId", ["followerId", "tenantId"])
    .index("by_followedId_tenantId", ["followedId", "tenantId"]),

  challenges: defineTable({
    name: v.string(),
    type: v.union(
      v.literal("distance"), v.literal("volume"), v.literal("frequency"), v.literal("benchmark"),
    ),
    tenantId: v.optional(v.id("tenants")),
    startDate: v.string(),
    endDate: v.string(),
    rules: v.optional(v.any()),
    description: v.optional(v.string()),
  })
    .index("by_tenantId", ["tenantId"])
    .index("by_tenantId_endDate", ["tenantId", "endDate"]),

  challenge_participants: defineTable({
    challengeId: v.id("challenges"),
    userId: v.id("users"),
    progress: v.optional(v.number()),
    enrolledAt: v.number(),
  })
    .index("by_challengeId", ["challengeId"])
    .index("by_userId", ["userId"]),

  milestones: defineTable({
    type: v.string(),
    thresholds: v.array(v.number()),
    description: v.optional(v.string()),
    name: v.string(),
  }),

  milestone_achievements: defineTable({
    milestoneId: v.id("milestones"),
    userId: v.id("users"),
    tenantId: v.id("tenants"),
    achievedAt: v.number(),
    thresholdReached: v.optional(v.number()),
  })
    .index("by_userId_tenantId", ["userId", "tenantId"])
    .index("by_milestoneId", ["milestoneId"]),

  badges: defineTable({
    name: v.string(),
    iconStorageId: v.optional(v.id("_storage")),
    description: v.string(),
    category: v.union(
      v.literal("movement"), v.literal("consistency"),
      v.literal("community"), v.literal("competition"),
    ),
    criteria: v.any(),
    rarityTier: v.optional(v.union(
      v.literal("common"), v.literal("uncommon"), v.literal("rare"),
      v.literal("epic"), v.literal("legendary"),
    )),
  })
    .index("by_category", ["category"]),

  user_badges: defineTable({
    badgeId: v.id("badges"),
    userId: v.id("users"),
    tenantId: v.id("tenants"),
    earnedAt: v.number(),
  })
    .index("by_userId_tenantId", ["userId", "tenantId"])
    .index("by_badgeId", ["badgeId"]),

  streaks: defineTable({
    userId: v.id("users"),
    tenantId: v.id("tenants"),
    type: v.union(
      v.literal("workout"), v.literal("class_attendance"),
      v.literal("logging"), v.literal("concept2"),
    ),
    currentCount: v.number(),
    longestCount: v.number(),
    lastActivityDate: v.optional(v.string()),
    freezeCreditsRemaining: v.optional(v.number()),
  })
    .index("by_userId_tenantId", ["userId", "tenantId"])
    .index("by_userId_type", ["userId", "type"]),

  points: defineTable({
    userId: v.id("users"),
    tenantId: v.id("tenants"),
    actionType: v.string(),
    pointsEarned: v.number(),
    timestamp: v.number(),
  })
    .index("by_userId_tenantId", ["userId", "tenantId"])
    .index("by_tenantId", ["tenantId"]),

  rewards: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    pointCost: v.number(),
    quantityAvailable: v.optional(v.number()),
    tenantId: v.id("tenants"),
  })
    .index("by_tenantId", ["tenantId"]),

  reward_redemptions: defineTable({
    rewardId: v.id("rewards"),
    userId: v.id("users"),
    tenantId: v.id("tenants"),
    redeemedAt: v.number(),
  })
    .index("by_userId_tenantId", ["userId", "tenantId"])
    .index("by_rewardId", ["rewardId"]),

  motivation_quotes: defineTable({
    content: v.string(),
    tenantId: v.optional(v.id("tenants")),
  })
    .index("by_tenantId", ["tenantId"]),

  leaderboards: defineTable({
    scope: v.union(v.literal("class"), v.literal("gym"), v.literal("global")),
    workoutRef: v.optional(v.id("workout_definitions")),
    benchmarkRef: v.optional(v.id("benchmark_workouts")),
    timeWindow: v.optional(v.union(
      v.literal("daily"), v.literal("weekly"), v.literal("monthly"), v.literal("all_time"),
    )),
    filters: v.optional(v.any()),
    tenantId: v.optional(v.id("tenants")),
  })
    .index("by_tenantId", ["tenantId"]),

  // ==========================================================================
  // B8 — COMMUNICATION & MESSAGING
  // ==========================================================================

  conversations: defineTable({
    type: v.union(v.literal("direct"), v.literal("group"), v.literal("class"), v.literal("program")),
    participantIds: v.array(v.id("users")),
    tenantId: v.id("tenants"),
    lastMessageTimestamp: v.optional(v.number()),
    name: v.optional(v.string()),
  })
    .index("by_tenantId", ["tenantId"])
    .index("by_tenantId_lastMessage", ["tenantId", "lastMessageTimestamp"]),

  messages: defineTable({
    conversationId: v.id("conversations"),
    senderId: v.id("users"),
    content: v.string(),
    attachments: v.optional(v.array(v.id("_storage"))),
    readReceipts: v.optional(v.any()),
    timestamp: v.number(),
  })
    .index("by_conversationId", ["conversationId"])
    .index("by_conversationId_timestamp", ["conversationId", "timestamp"]),

  notification_queue: defineTable({
    userId: v.id("users"),
    type: v.union(v.literal("push"), v.literal("email"), v.literal("sms"), v.literal("in_app")),
    templateId: v.optional(v.id("notification_templates")),
    payload: v.any(),
    status: v.union(v.literal("pending"), v.literal("sent"), v.literal("failed"), v.literal("read")),
    scheduledSendTime: v.optional(v.number()),
  })
    .index("by_userId_status", ["userId", "status"])
    .index("by_status", ["status"])
    .index("by_userId", ["userId"]),

  notification_templates: defineTable({
    tenantId: v.id("tenants"),
    channel: v.union(v.literal("push"), v.literal("email"), v.literal("sms"), v.literal("in_app")),
    triggerEvent: v.string(),
    subject: v.optional(v.string()),
    body: v.string(),
    mergeFields: v.optional(v.array(v.string())),
    enabled: v.boolean(),
  })
    .index("by_tenantId", ["tenantId"])
    .index("by_tenantId_triggerEvent", ["tenantId", "triggerEvent"]),

  automation_workflows: defineTable({
    tenantId: v.id("tenants"),
    triggerEvent: v.string(),
    conditions: v.optional(v.any()),
    action: v.string(),
    delay: v.optional(v.number()),
    audienceFilter: v.optional(v.any()),
    isActive: v.boolean(),
  })
    .index("by_tenantId", ["tenantId"])
    .index("by_tenantId_triggerEvent", ["tenantId", "triggerEvent"]),

  email_campaigns: defineTable({
    tenantId: v.id("tenants"),
    subject: v.string(),
    body: v.string(),
    audienceSegment: v.optional(v.any()),
    status: v.union(v.literal("draft"), v.literal("scheduled"), v.literal("sent")),
    sendDate: v.optional(v.number()),
    trackingRefs: v.optional(v.any()),
  })
    .index("by_tenantId", ["tenantId"])
    .index("by_tenantId_status", ["tenantId", "status"]),

  announcement_posts: defineTable({
    tenantId: v.id("tenants"),
    authorId: v.id("users"),
    content: v.string(),
    isPinned: v.boolean(),
    visibility: v.union(
      v.literal("all_members"), v.literal("coaches_only"), v.literal("staff_only")
    ),
    expiryDate: v.optional(v.number()),
  })
    .index("by_tenantId", ["tenantId"])
    .index("by_tenantId_isPinned", ["tenantId", "isPinned"]),

  // ==========================================================================
  // B9 — SCHEDULING & BOOKING
  // ==========================================================================

  schedule_templates: defineTable({
    tenantId: v.id("tenants"),
    name: v.string(),
    classId: v.id("classes"),
    dayOfWeek: v.number(), // 0-6
    startTime: v.string(),
    endTime: v.string(),
    coachId: v.optional(v.id("users")),
    isActive: v.boolean(),
  })
    .index("by_tenantId", ["tenantId"]),

  schedule_exceptions: defineTable({
    tenantId: v.id("tenants"),
    templateId: v.id("schedule_templates"),
    date: v.string(),
    type: v.union(v.literal("cancelled"), v.literal("modified"), v.literal("holiday")),
    modifiedStartTime: v.optional(v.string()),
    modifiedEndTime: v.optional(v.string()),
    reason: v.optional(v.string()),
  })
    .index("by_templateId", ["templateId"])
    .index("by_tenantId_date", ["tenantId", "date"]),

  booking_policies: defineTable({
    tenantId: v.id("tenants"),
    cancellationWindowHours: v.number(),
    lateCancelPenalty: v.optional(v.number()),
    maxBookingsPerWeek: v.optional(v.number()),
    waitlistEnabled: v.boolean(),
    autoPromoteFromWaitlist: v.boolean(),
  })
    .index("by_tenantId", ["tenantId"]),

  pt_sessions: defineTable({
    tenantId: v.id("tenants"),
    coachId: v.id("users"),
    clientId: v.id("users"),
    type: v.union(v.literal("recurring"), v.literal("one_time")),
    duration: v.number(),
    pricePerSession: v.optional(v.number()),
    notes: v.optional(v.string()),
    status: v.union(v.literal("active"), v.literal("completed"), v.literal("cancelled")),
  })
    .index("by_tenantId", ["tenantId"])
    .index("by_coachId", ["coachId"])
    .index("by_clientId", ["clientId"]),

  pt_bookings: defineTable({
    tenantId: v.id("tenants"),
    ptSessionId: v.id("pt_sessions"),
    date: v.string(),
    startTime: v.string(),
    endTime: v.string(),
    status: v.union(
      v.literal("scheduled"), v.literal("completed"),
      v.literal("cancelled"), v.literal("no_show"),
    ),
    cancelledAt: v.optional(v.number()),
    notes: v.optional(v.string()),
  })
    .index("by_ptSessionId", ["ptSessionId"])
    .index("by_tenantId_date", ["tenantId", "date"]),

  events: defineTable({
    tenantId: v.id("tenants"),
    name: v.string(),
    description: v.optional(v.string()),
    date: v.string(),
    startTime: v.string(),
    endTime: v.optional(v.string()),
    location: v.optional(v.string()),
    maxCapacity: v.optional(v.number()),
    registrationDeadline: v.optional(v.string()),
    status: v.union(
      v.literal("upcoming"), v.literal("in_progress"),
      v.literal("completed"), v.literal("cancelled"),
    ),
    createdBy: v.id("users"),
  })
    .index("by_tenantId", ["tenantId"])
    .index("by_tenantId_date", ["tenantId", "date"]),

  event_registrations: defineTable({
    tenantId: v.id("tenants"),
    eventId: v.id("events"),
    userId: v.id("users"),
    status: v.union(
      v.literal("registered"), v.literal("cancelled"), v.literal("attended"),
    ),
    registeredAt: v.number(),
    cancelledAt: v.optional(v.number()),
  })
    .index("by_eventId", ["eventId"])
    .index("by_userId_tenantId", ["userId", "tenantId"]),

  calendar_sync: defineTable({
    userId: v.id("users"),
    tenantId: v.id("tenants"),
    provider: v.union(v.literal("google"), v.literal("apple"), v.literal("outlook")),
    externalCalendarId: v.optional(v.string()),
    syncEnabled: v.boolean(),
    lastSyncAt: v.optional(v.number()),
  })
    .index("by_userId_tenantId", ["userId", "tenantId"]),

  // ==========================================================================
  // B10 — BILLING & PAYMENTS
  // ==========================================================================

  membership_plans: defineTable({
    tenantId: v.id("tenants"),
    name: v.string(),
    description: v.optional(v.string()),
    type: v.union(
      v.literal("recurring"), v.literal("punch_card"),
      v.literal("drop_in"), v.literal("trial"),
    ),
    price: v.number(),
    currency: v.optional(v.string()),
    billingInterval: v.optional(v.union(
      v.literal("weekly"), v.literal("monthly"), v.literal("quarterly"), v.literal("annual"),
    )),
    classesPerWeek: v.optional(v.number()),
    contractLengthMonths: v.optional(v.number()),
    setupFee: v.optional(v.number()),
    trialDays: v.optional(v.number()),
    features: v.optional(v.array(v.string())),
    includedClassesPerPeriod: v.optional(v.number()),
    freezePolicy: v.optional(v.string()),
    cancellationTerms: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  })
    .index("by_tenantId", ["tenantId"])
    .index("by_tenantId_isActive", ["tenantId", "isActive"]),

  subscriptions: defineTable({
    userId: v.id("users"),
    tenantId: v.id("tenants"),
    planId: v.id("membership_plans"),
    stripeSubscriptionId: v.optional(v.string()),
    status: v.union(
      v.literal("active"), v.literal("past_due"), v.literal("frozen"),
      v.literal("cancelled"), v.literal("trialing"), v.literal("paused"),
    ),
    startDate: v.string(),
    currentPeriodStart: v.optional(v.string()),
    currentPeriodEnd: v.optional(v.string()),
    cancelAtPeriodEnd: v.optional(v.boolean()),
    frozenAt: v.optional(v.number()),
    frozenUntil: v.optional(v.string()),
  })
    .index("by_userId_tenantId", ["userId", "tenantId"])
    .index("by_tenantId", ["tenantId"])
    .index("by_tenantId_status", ["tenantId", "status"])
    .index("by_stripeSubscriptionId", ["stripeSubscriptionId"]),

  payment_methods: defineTable({
    userId: v.id("users"),
    tenantId: v.id("tenants"),
    stripePaymentMethodId: v.optional(v.string()),
    type: v.union(
      v.literal("card"), v.literal("bank"), v.literal("apple_pay"), v.literal("google_pay")
    ),
    last4: v.optional(v.string()),
    brand: v.optional(v.string()),
    expiryMonth: v.optional(v.number()),
    expiryYear: v.optional(v.number()),
    isDefault: v.boolean(),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_tenantId", ["userId", "tenantId"]),

  invoices: defineTable({
    userId: v.id("users"),
    tenantId: v.id("tenants"),
    subscriptionId: v.optional(v.id("subscriptions")),
    stripeInvoiceId: v.optional(v.string()),
    amount: v.number(),
    currency: v.string(),
    lineItems: v.optional(v.array(v.object({
      description: v.string(),
      amount: v.number(),
      quantity: v.number(),
    }))),
    subtotal: v.optional(v.number()),
    tax: v.optional(v.number()),
    total: v.optional(v.number()),
    status: v.union(
      v.literal("draft"), v.literal("open"), v.literal("paid"),
      v.literal("void"), v.literal("uncollectible"),
    ),
    dueDate: v.optional(v.string()),
    paidAt: v.optional(v.number()),
    paidDate: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_userId_tenantId", ["userId", "tenantId"])
    .index("by_tenantId", ["tenantId"])
    .index("by_tenantId_status", ["tenantId", "status"])
    .index("by_stripeInvoiceId", ["stripeInvoiceId"]),

  punch_cards: defineTable({
    userId: v.id("users"),
    tenantId: v.id("tenants"),
    membershipPlanId: v.optional(v.id("membership_plans")),
    totalPunches: v.number(),
    remainingPunches: v.number(),
    purchasedAt: v.number(),
    expiresAt: v.optional(v.number()),
    expiryDate: v.optional(v.string()),
  })
    .index("by_userId_tenantId", ["userId", "tenantId"]),

  promo_codes: defineTable({
    tenantId: v.id("tenants"),
    code: v.string(),
    discountType: v.union(v.literal("percentage"), v.literal("fixed")),
    discountValue: v.number(),
    type: v.optional(v.union(v.literal("percentage"), v.literal("fixed"), v.literal("trial_extension"))),
    value: v.optional(v.number()),
    validFrom: v.optional(v.string()),
    validUntil: v.optional(v.string()),
    validTo: v.optional(v.string()),
    maxUses: v.optional(v.number()),
    currentUses: v.number(),
    isActive: v.boolean(),
    applicablePlanIds: v.optional(v.array(v.id("membership_plans"))),
  })
    .index("by_tenantId", ["tenantId"])
    .index("by_tenantId_code", ["tenantId", "code"]),

  payment_history: defineTable({
    userId: v.id("users"),
    tenantId: v.id("tenants"),
    amount: v.number(),
    currency: v.string(),
    type: v.union(
      v.literal("charge"), v.literal("refund"), v.literal("credit"),
      v.literal("subscription"), v.literal("one_time"),
    ),
    description: v.optional(v.string()),
    stripePaymentIntentId: v.optional(v.string()),
    createdAt: v.number(),
    timestamp: v.optional(v.number()),
    status: v.optional(v.union(
      v.literal("succeeded"), v.literal("pending"), v.literal("failed"), v.literal("refunded")
    )),
  })
    .index("by_userId_tenantId", ["userId", "tenantId"])
    .index("by_tenantId", ["tenantId"])
    .index("by_tenantId_timestamp", ["tenantId", "timestamp"]),

  credits: defineTable({
    userId: v.id("users"),
    tenantId: v.id("tenants"),
    amount: v.number(),
    reason: v.string(),
    grantedBy: v.optional(v.id("users")),
    createdAt: v.number(),
    expiresAt: v.optional(v.number()),
    expiryDate: v.optional(v.string()),
  })
    .index("by_userId_tenantId", ["userId", "tenantId"]),

  failed_payments: defineTable({
    userId: v.id("users"),
    tenantId: v.id("tenants"),
    amount: v.number(),
    currency: v.string(),
    reason: v.string(),
    stripePaymentIntentId: v.optional(v.string()),
    retryCount: v.number(),
    nextRetryAt: v.optional(v.number()),
    createdAt: v.number(),
    subscriptionId: v.optional(v.id("subscriptions")),
    attemptCount: v.optional(v.number()),
    lastAttemptDate: v.optional(v.string()),
    nextRetryDate: v.optional(v.string()),
    status: v.optional(v.union(
      v.literal("retrying"), v.literal("action_required"), v.literal("written_off")
    )),
  })
    .index("by_userId_tenantId", ["userId", "tenantId"])
    .index("by_tenantId", ["tenantId"])
    .index("by_tenantId_status", ["tenantId", "status"])
    .index("by_subscriptionId", ["subscriptionId"]),

  // ==========================================================================
  // B11 — MARKETING, REPORTING & ADVANCED
  // ==========================================================================

  leads: defineTable({
    tenantId: v.id("tenants"),
    name: v.string(),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    source: v.optional(v.union(
      v.literal("web_form"), v.literal("referral"), v.literal("walk_in"),
      v.literal("social"), v.literal("ad"), v.literal("other"),
    )),
    status: v.union(
      v.literal("new"), v.literal("contacted"), v.literal("trial"),
      v.literal("converted"), v.literal("lost"),
    ),
    assignedStaffId: v.optional(v.id("users")),
    notes: v.optional(v.string()),
    score: v.optional(v.number()),
  })
    .index("by_tenantId", ["tenantId"])
    .index("by_tenantId_status", ["tenantId", "status"])
    .index("by_assignedStaffId", ["assignedStaffId"]),

  lead_sources: defineTable({
    tenantId: v.id("tenants"),
    name: v.string(),
    utmMappings: v.optional(v.any()),
    landingPageRef: v.optional(v.string()),
  })
    .index("by_tenantId", ["tenantId"]),

  trials: defineTable({
    tenantId: v.id("tenants"),
    leadId: v.optional(v.id("leads")),
    userId: v.optional(v.id("users")),
    startDate: v.string(),
    endDate: v.string(),
    planId: v.optional(v.id("membership_plans")),
    status: v.union(v.literal("active"), v.literal("converted"), v.literal("expired")),
  })
    .index("by_tenantId", ["tenantId"])
    .index("by_tenantId_status", ["tenantId", "status"]),

  referrals: defineTable({
    tenantId: v.id("tenants"),
    referrerUserId: v.id("users"),
    referredLeadId: v.optional(v.id("leads")),
    referredUserId: v.optional(v.id("users")),
    status: v.union(v.literal("pending"), v.literal("converted")),
    rewardStatus: v.optional(v.union(v.literal("pending"), v.literal("paid"))),
    rewardType: v.optional(v.string()),
  })
    .index("by_tenantId", ["tenantId"])
    .index("by_referrerUserId", ["referrerUserId"]),

  referral_programs: defineTable({
    tenantId: v.id("tenants"),
    rewardType: v.union(
      v.literal("credit"), v.literal("discount"), v.literal("free_month"), v.literal("custom")
    ),
    rewardValue: v.optional(v.number()),
    conditions: v.optional(v.any()),
  })
    .index("by_tenantId", ["tenantId"]),

  promotions: defineTable({
    tenantId: v.id("tenants"),
    name: v.string(),
    terms: v.optional(v.string()),
    validFrom: v.optional(v.string()),
    validTo: v.optional(v.string()),
    targetAudienceSegment: v.optional(v.any()),
    promoCodeId: v.optional(v.id("promo_codes")),
  })
    .index("by_tenantId", ["tenantId"]),

  products: defineTable({
    tenantId: v.id("tenants"),
    name: v.string(),
    description: v.optional(v.string()),
    sku: v.optional(v.string()),
    categoryId: v.optional(v.id("product_categories")),
    price: v.number(),
    variants: v.optional(v.array(v.object({
      name: v.string(),
      value: v.string(),
      priceAdjustment: v.optional(v.number()),
      sku: v.optional(v.string()),
    }))),
    stockQuantity: v.optional(v.number()),
    imageStorageIds: v.optional(v.array(v.id("_storage"))),
    isActive: v.boolean(),
  })
    .index("by_tenantId", ["tenantId"])
    .index("by_tenantId_categoryId", ["tenantId", "categoryId"]),

  product_categories: defineTable({
    tenantId: v.id("tenants"),
    name: v.string(),
    parentCategoryId: v.optional(v.id("product_categories")),
  })
    .index("by_tenantId", ["tenantId"]),

  orders: defineTable({
    userId: v.id("users"),
    tenantId: v.id("tenants"),
    lineItems: v.array(v.object({
      productId: v.id("products"),
      productName: v.string(),
      quantity: v.number(),
      unitPrice: v.number(),
      variantInfo: v.optional(v.string()),
    })),
    subtotal: v.number(),
    tax: v.number(),
    total: v.number(),
    paymentRef: v.optional(v.string()),
    status: v.union(
      v.literal("pending"), v.literal("paid"), v.literal("fulfilled"), v.literal("refunded"),
    ),
    fulfillmentMethod: v.optional(v.union(v.literal("in_person"), v.literal("shipped"))),
  })
    .index("by_userId_tenantId", ["userId", "tenantId"])
    .index("by_tenantId", ["tenantId"]),

  inventory_log: defineTable({
    productId: v.id("products"),
    tenantId: v.id("tenants"),
    quantityChange: v.number(),
    reason: v.union(
      v.literal("sale"), v.literal("restock"), v.literal("adjustment"), v.literal("return")
    ),
    timestamp: v.number(),
  })
    .index("by_productId", ["productId"])
    .index("by_tenantId", ["tenantId"]),

  food_log: defineTable({
    userId: v.id("users"),
    tenantId: v.id("tenants"),
    date: v.string(),
    meal: v.union(
      v.literal("breakfast"), v.literal("lunch"), v.literal("dinner"), v.literal("snack")
    ),
    foodItem: v.string(),
    calories: v.optional(v.number()),
    protein: v.optional(v.number()),
    carbs: v.optional(v.number()),
    fat: v.optional(v.number()),
    fiber: v.optional(v.number()),
  })
    .index("by_userId_tenantId", ["userId", "tenantId"])
    .index("by_userId_date", ["userId", "date"]),

  nutrition_targets: defineTable({
    userId: v.id("users"),
    tenantId: v.id("tenants"),
    calories: v.optional(v.number()),
    protein: v.optional(v.number()),
    carbs: v.optional(v.number()),
    fat: v.optional(v.number()),
    setBy: v.optional(v.union(v.literal("user"), v.literal("coach"))),
  })
    .index("by_userId_tenantId", ["userId", "tenantId"]),

  food_database: defineTable({
    name: v.string(),
    servingSize: v.optional(v.string()),
    calories: v.optional(v.number()),
    protein: v.optional(v.number()),
    carbs: v.optional(v.number()),
    fat: v.optional(v.number()),
    fiber: v.optional(v.number()),
    source: v.union(v.literal("platform"), v.literal("user_created")),
    tenantId: v.optional(v.id("tenants")),
  })
    .index("by_name", ["name"])
    .index("by_tenantId", ["tenantId"]),

  saved_reports: defineTable({
    tenantId: v.id("tenants"),
    name: v.string(),
    reportType: v.string(),
    filters: v.optional(v.any()),
    grouping: v.optional(v.any()),
    dateRange: v.optional(v.object({ start: v.string(), end: v.string() })),
    schedule: v.optional(v.string()),
  })
    .index("by_tenantId", ["tenantId"]),

  report_exports: defineTable({
    savedReportId: v.id("saved_reports"),
    format: v.union(v.literal("csv"), v.literal("pdf")),
    fileId: v.id("_storage"),
    generatedAt: v.number(),
  })
    .index("by_savedReportId", ["savedReportId"]),

  // ==========================================================================
  // B12 — PLATFORM ADMIN, COMPLIANCE & API
  // ==========================================================================

  platform_config: defineTable({
    key: v.string(),
    value: v.any(),
  })
    .index("by_key", ["key"]),

  tenant_provisioning: defineTable({
    requestedBy: v.id("users"),
    tenantId: v.optional(v.id("tenants")),
    status: v.union(
      v.literal("pending"), v.literal("approved"), v.literal("active"), v.literal("suspended"),
    ),
    checklistState: v.optional(v.any()),
    stripeConnectOnboardingStatus: v.optional(v.string()),
  })
    .index("by_status", ["status"])
    .index("by_tenantId", ["tenantId"]),

  platform_audit_log: defineTable({
    actorId: v.id("users"),
    action: v.string(),
    targetEntity: v.string(),
    targetId: v.optional(v.string()),
    beforeValue: v.optional(v.any()),
    afterValue: v.optional(v.any()),
    timestamp: v.number(),
  })
    .index("by_timestamp", ["timestamp"])
    .index("by_actorId", ["actorId"])
    .index("by_targetEntity", ["targetEntity"]),

  platform_content: defineTable({
    type: v.string(),
    data: v.any(),
    version: v.number(),
  })
    .index("by_type", ["type"]),

  platform_metrics: defineTable({
    metricName: v.string(),
    value: v.number(),
    updatedAt: v.number(),
  })
    .index("by_metricName", ["metricName"]),

  feature_flags: defineTable({
    name: v.string(),
    status: v.union(
      v.literal("enabled"), v.literal("disabled"), v.literal("percentage_rollout")
    ),
    targetTenantIds: v.optional(v.array(v.id("tenants"))),
    targetSegments: v.optional(v.any()),
    rolloutPercentage: v.optional(v.number()),
  })
    .index("by_name", ["name"]),

  consent_records: defineTable({
    userId: v.id("users"),
    type: v.union(
      v.literal("terms_of_service"), v.literal("privacy_policy"),
      v.literal("marketing"), v.literal("data_sharing"), v.literal("cookies"),
    ),
    versionAccepted: v.string(),
    timestamp: v.number(),
    ipAddress: v.optional(v.string()),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_type", ["userId", "type"]),

  data_requests: defineTable({
    userId: v.id("users"),
    type: v.union(
      v.literal("access"), v.literal("export"), v.literal("deletion"), v.literal("rectification")
    ),
    status: v.union(v.literal("received"), v.literal("processing"), v.literal("completed")),
    submittedDate: v.number(),
    completedDate: v.optional(v.number()),
    auditTrail: v.optional(v.array(v.object({
      action: v.string(),
      timestamp: v.number(),
      details: v.optional(v.string()),
    }))),
  })
    .index("by_userId", ["userId"])
    .index("by_status", ["status"]),

  legal_documents: defineTable({
    type: v.union(
      v.literal("terms_of_service"), v.literal("privacy_policy"),
      v.literal("waiver"), v.literal("dpa"),
    ),
    version: v.string(),
    content: v.string(),
    effectiveDate: v.string(),
    tenantId: v.optional(v.id("tenants")),
  })
    .index("by_type", ["type"])
    .index("by_tenantId", ["tenantId"]),

  security_events: defineTable({
    userId: v.optional(v.id("users")),
    eventType: v.union(
      v.literal("login_success"), v.literal("login_failure"),
      v.literal("password_change"), v.literal("mfa_enabled"),
      v.literal("suspicious_activity"), v.literal("account_locked"),
      v.literal("session_created"), v.literal("session_terminated"),
    ),
    ipAddress: v.optional(v.string()),
    deviceFingerprint: v.optional(v.string()),
    timestamp: v.number(),
    details: v.optional(v.any()),
  })
    .index("by_userId", ["userId"])
    .index("by_timestamp", ["timestamp"])
    .index("by_eventType", ["eventType"]),

  age_verification: defineTable({
    userId: v.id("users"),
    guardianContact: v.optional(v.object({
      name: v.string(),
      email: v.string(),
      phone: v.optional(v.string()),
    })),
    consentStatus: v.union(v.literal("pending"), v.literal("granted"), v.literal("denied")),
    verificationMethod: v.optional(v.string()),
  })
    .index("by_userId", ["userId"]),

  platform_admins: defineTable({
    userId: v.id("users"),
    platformRole: v.union(
      v.literal("super_admin"),
      v.literal("platform_support"),
      v.literal("platform_ops")
    ),
    status: v.union(v.literal("active"), v.literal("suspended")),
    lastLoginAt: v.optional(v.number()),
  })
    .index("by_userId", ["userId"]),

  platform_tenant_notes: defineTable({
    tenantId: v.id("tenants"),
    authorId: v.id("users"),
    content: v.string(),
    updatedAt: v.optional(v.number()),
  })
    .index("by_tenantId", ["tenantId"]),

  check_in_systems: defineTable({
    tenantId: v.id("tenants"),
    method: v.union(v.literal("qr"), v.literal("nfc"), v.literal("pin"), v.literal("barcode")),
    deviceRegistration: v.optional(v.any()),
    location: v.optional(v.string()),
  })
    .index("by_tenantId", ["tenantId"]),

  facility_areas: defineTable({
    tenantId: v.id("tenants"),
    name: v.string(),
    capacity: v.optional(v.number()),
    equipmentList: v.optional(v.array(v.string())),
    bookingRules: v.optional(v.any()),
  })
    .index("by_tenantId", ["tenantId"]),

  facility_access_rules: defineTable({
    tenantId: v.id("tenants"),
    membershipPlanId: v.id("membership_plans"),
    areaId: v.id("facility_areas"),
    allowedHours: v.optional(v.any()),
    blackoutDates: v.optional(v.array(v.string())),
  })
    .index("by_tenantId", ["tenantId"])
    .index("by_membershipPlanId", ["membershipPlanId"]),

  facility_hours: defineTable({
    tenantId: v.id("tenants"),
    dayOfWeek: v.number(),
    openTime: v.string(),
    closeTime: v.string(),
    holidayOverrides: v.optional(v.array(v.object({
      date: v.string(),
      openTime: v.optional(v.string()),
      closeTime: v.optional(v.string()),
      isClosed: v.boolean(),
    }))),
  })
    .index("by_tenantId", ["tenantId"]),

  access_log: defineTable({
    userId: v.id("users"),
    tenantId: v.id("tenants"),
    areaId: v.optional(v.id("facility_areas")),
    timestamp: v.number(),
    method: v.union(
      v.literal("qr"), v.literal("nfc"), v.literal("pin"),
      v.literal("barcode"), v.literal("manual"),
    ),
    granted: v.boolean(),
  })
    .index("by_tenantId", ["tenantId"])
    .index("by_userId_tenantId", ["userId", "tenantId"])
    .index("by_tenantId_timestamp", ["tenantId", "timestamp"]),

  api_keys: defineTable({
    tenantId: v.id("tenants"),
    keyHash: v.string(),
    name: v.string(),
    scopes: v.array(v.string()),
    rateLimitTier: v.union(v.literal("free"), v.literal("standard"), v.literal("premium")),
    lastUsedAt: v.optional(v.number()),
    isActive: v.boolean(),
  })
    .index("by_tenantId", ["tenantId"])
    .index("by_keyHash", ["keyHash"]),

  webhooks_outbound: defineTable({
    tenantId: v.id("tenants"),
    url: v.string(),
    eventsSubscribed: v.array(v.string()),
    secret: v.string(),
    status: v.union(v.literal("active"), v.literal("disabled"), v.literal("failed")),
    failureCount: v.optional(v.number()),
  })
    .index("by_tenantId", ["tenantId"]),

  integration_connections: defineTable({
    tenantId: v.id("tenants"),
    provider: v.string(),
    status: v.union(v.literal("connected"), v.literal("disconnected"), v.literal("error")),
    credentials: v.optional(v.string()),
    syncConfig: v.optional(v.any()),
  })
    .index("by_tenantId", ["tenantId"])
    .index("by_tenantId_provider", ["tenantId", "provider"]),
});

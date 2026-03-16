import { v } from "convex/values";

// --- Pagination ---

export const paginationArgs = {
  cursor: v.optional(v.string()),
  limit: v.optional(v.number()),
};

// --- Roles & Statuses ---

export const roleValidator = v.union(
  v.literal("athlete"),
  v.literal("coach"),
  v.literal("owner"),
  v.literal("admin")
);

export const platformRoleValidator = v.union(
  v.literal("super_admin"),
  v.literal("platform_support"),
  v.literal("platform_ops")
);

export const platformAdminStatusValidator = v.union(
  v.literal("active"),
  v.literal("suspended")
);

export const membershipStatusValidator = v.union(
  v.literal("active"),
  v.literal("frozen"),
  v.literal("cancelled"),
  v.literal("pending")
);

export const staffStatusValidator = v.union(
  v.literal("active"),
  v.literal("inactive")
);

export const inviteStatusValidator = v.union(
  v.literal("pending"),
  v.literal("accepted"),
  v.literal("expired"),
  v.literal("revoked")
);

// --- Gender ---

export const genderValidator = v.union(
  v.literal("male"),
  v.literal("female"),
  v.literal("prefer_not_to_say")
);

// --- Onboarding ---

export const onboardingStatusValidator = v.union(
  v.literal("not_started"),
  v.literal("profile_created"),
  v.literal("gym_joined"),
  v.literal("first_workout"),
  v.literal("complete")
);

// --- Workout Types ---

export const workoutTypeValidator = v.union(
  v.literal("ForTime"),
  v.literal("AMRAP"),
  v.literal("EMOM"),
  v.literal("Tabata"),
  v.literal("Chipper"),
  v.literal("Ladder"),
  v.literal("Strength"),
  v.literal("Custom")
);

export const scalingDesignationValidator = v.union(
  v.literal("Rx+"),
  v.literal("Rx"),
  v.literal("Scaled")
);

// --- Exercise Category ---

export const exerciseCategoryValidator = v.union(
  v.literal("weightlifting"),
  v.literal("gymnastics"),
  v.literal("monostructural")
);

// --- Benchmark Category ---

export const benchmarkCategoryValidator = v.union(
  v.literal("Hero"),
  v.literal("Girl"),
  v.literal("Open"),
  v.literal("custom")
);

// --- Check-in Method ---

export const checkInMethodValidator = v.union(
  v.literal("qr"),
  v.literal("nfc"),
  v.literal("pin"),
  v.literal("barcode"),
  v.literal("manual")
);

// --- Unit Preferences ---

export const unitPreferencesValidator = v.object({
  weight: v.union(v.literal("lbs"), v.literal("kg")),
  distance: v.union(v.literal("miles"), v.literal("km")),
  height: v.union(v.literal("ft_in"), v.literal("cm")),
});

// --- Notification Preferences ---

export const notificationPrefsValidator = v.object({
  push: v.boolean(),
  email: v.boolean(),
  sms: v.boolean(),
  inApp: v.boolean(),
  quietHoursStart: v.optional(v.string()),
  quietHoursEnd: v.optional(v.string()),
  frequencyCapPerHour: v.optional(v.number()),
});

// --- Emergency Contact ---

export const emergencyContactValidator = v.object({
  name: v.string(),
  phone: v.string(),
  relationship: v.string(),
});

// --- Branding ---

export const brandingValidator = v.object({
  logoStorageId: v.optional(v.id("_storage")),
  primaryColor: v.optional(v.string()),
  secondaryColor: v.optional(v.string()),
  typography: v.optional(v.string()),
});

// --- Location ---

export const locationValidator = v.object({
  address: v.string(),
  city: v.string(),
  state: v.optional(v.string()),
  postalCode: v.string(),
  country: v.string(),
  latitude: v.optional(v.number()),
  longitude: v.optional(v.number()),
});

// --- Contact Info ---

export const contactInfoValidator = v.object({
  phone: v.optional(v.string()),
  email: v.optional(v.string()),
  website: v.optional(v.string()),
});

// --- Goal Types ---

export const goalTypeValidator = v.union(
  v.literal("strength"),
  v.literal("body_comp"),
  v.literal("endurance"),
  v.literal("consistency"),
  v.literal("skill")
);

export const goalStatusValidator = v.union(
  v.literal("active"),
  v.literal("completed"),
  v.literal("abandoned")
);

// --- Published Status ---

export const publishedStatusValidator = v.union(
  v.literal("draft"),
  v.literal("published"),
  v.literal("archived")
);

// --- Difficulty Level ---

export const difficultyLevelValidator = v.union(
  v.literal("beginner"),
  v.literal("intermediate"),
  v.literal("advanced"),
  v.literal("elite")
);

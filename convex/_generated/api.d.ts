/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as accessLog from "../accessLog.js";
import type * as activityFeed from "../activityFeed.js";
import type * as ageVerification from "../ageVerification.js";
import type * as annotationTemplates from "../annotationTemplates.js";
import type * as announcements from "../announcements.js";
import type * as apiKeys from "../apiKeys.js";
import type * as automationWorkflows from "../automationWorkflows.js";
import type * as badges from "../badges.js";
import type * as benchmarkWorkouts from "../benchmarkWorkouts.js";
import type * as bodyMeasurements from "../bodyMeasurements.js";
import type * as bookingPolicies from "../bookingPolicies.js";
import type * as calendarSync from "../calendarSync.js";
import type * as challenges from "../challenges.js";
import type * as checkInSystems from "../checkInSystems.js";
import type * as checkIns from "../checkIns.js";
import type * as classNotes from "../classNotes.js";
import type * as classRegistrations from "../classRegistrations.js";
import type * as classSessions from "../classSessions.js";
import type * as classes from "../classes.js";
import type * as coachNotes from "../coachNotes.js";
import type * as coachPrograms from "../coachPrograms.js";
import type * as comments from "../comments.js";
import type * as concept2Streaks from "../concept2Streaks.js";
import type * as consentRecords from "../consentRecords.js";
import type * as conversations from "../conversations.js";
import type * as crons from "../crons.js";
import type * as dailyWod from "../dailyWod.js";
import type * as dataRequests from "../dataRequests.js";
import type * as deviceMaintenance from "../deviceMaintenance.js";
import type * as devices from "../devices.js";
import type * as educationalContent from "../educationalContent.js";
import type * as emailCampaigns from "../emailCampaigns.js";
import type * as equipmentSessions from "../equipmentSessions.js";
import type * as eventRegistrations from "../eventRegistrations.js";
import type * as events from "../events.js";
import type * as exercises from "../exercises.js";
import type * as facilityAccessRules from "../facilityAccessRules.js";
import type * as facilityAreas from "../facilityAreas.js";
import type * as facilityHours from "../facilityHours.js";
import type * as featureFlags from "../featureFlags.js";
import type * as follows from "../follows.js";
import type * as foodDatabase from "../foodDatabase.js";
import type * as foodLog from "../foodLog.js";
import type * as goals from "../goals.js";
import type * as habits from "../habits.js";
import type * as hrZones from "../hrZones.js";
import type * as http from "../http.js";
import type * as integrationConnections from "../integrationConnections.js";
import type * as inventory from "../inventory.js";
import type * as invitations from "../invitations.js";
import type * as invoices from "../invoices.js";
import type * as leaderboards from "../leaderboards.js";
import type * as leads from "../leads.js";
import type * as legalDocuments from "../legalDocuments.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_customFunctions from "../lib/customFunctions.js";
import type * as lib_helpers from "../lib/helpers.js";
import type * as lib_platformFunctions from "../lib/platformFunctions.js";
import type * as lib_rbac from "../lib/rbac.js";
import type * as lib_tenancy from "../lib/tenancy.js";
import type * as lib_validators from "../lib/validators.js";
import type * as memberNotes from "../memberNotes.js";
import type * as membershipPlans from "../membershipPlans.js";
import type * as memberships from "../memberships.js";
import type * as messages from "../messages.js";
import type * as milestones from "../milestones.js";
import type * as motivationQuotes from "../motivationQuotes.js";
import type * as notificationTemplates from "../notificationTemplates.js";
import type * as notifications from "../notifications.js";
import type * as nutritionTargets from "../nutritionTargets.js";
import type * as orders from "../orders.js";
import type * as paymentMethods from "../paymentMethods.js";
import type * as payments from "../payments.js";
import type * as platformAdmins from "../platformAdmins.js";
import type * as platformAlerts from "../platformAlerts.js";
import type * as platformAnnouncements from "../platformAnnouncements.js";
import type * as platformAuditLog from "../platformAuditLog.js";
import type * as platformBenchmarkWorkouts from "../platformBenchmarkWorkouts.js";
import type * as platformConfig from "../platformConfig.js";
import type * as platformApiKeys from "../platformApiKeys.js";
import type * as platformExercises from "../platformExercises.js";
import type * as platformFeatureFlags from "../platformFeatureFlags.js";
import type * as platformIntegrations from "../platformIntegrations.js";
import type * as platformMetrics from "../platformMetrics.js";
import type * as platformModeration from "../platformModeration.js";
import type * as platformTenantNotes from "../platformTenantNotes.js";
import type * as platformTenants from "../platformTenants.js";
import type * as points from "../points.js";
import type * as productCategories from "../productCategories.js";
import type * as products from "../products.js";
import type * as programContent from "../programContent.js";
import type * as programDays from "../programDays.js";
import type * as progressPhotos from "../progressPhotos.js";
import type * as promoCodes from "../promoCodes.js";
import type * as promotions from "../promotions.js";
import type * as ptBookings from "../ptBookings.js";
import type * as ptSessions from "../ptSessions.js";
import type * as punchCards from "../punchCards.js";
import type * as reactions from "../reactions.js";
import type * as referralPrograms from "../referralPrograms.js";
import type * as referrals from "../referrals.js";
import type * as rewards from "../rewards.js";
import type * as rolesPermissions from "../rolesPermissions.js";
import type * as savedReports from "../savedReports.js";
import type * as scheduleExceptions from "../scheduleExceptions.js";
import type * as scheduleTemplates from "../scheduleTemplates.js";
import type * as securityEvents from "../securityEvents.js";
import type * as staff from "../staff.js";
import type * as streaks from "../streaks.js";
import type * as subscriptions from "../subscriptions.js";
import type * as tenantProvisioning from "../tenantProvisioning.js";
import type * as tenants from "../tenants.js";
import type * as test_setup from "../test/setup.js";
import type * as testing from "../testing.js";
import type * as trainingPrograms from "../trainingPrograms.js";
import type * as trials from "../trials.js";
import type * as users from "../users.js";
import type * as videoAnnotations from "../videoAnnotations.js";
import type * as videoSubmissions from "../videoSubmissions.js";
import type * as waivers from "../waivers.js";
import type * as wearableConnections from "../wearableConnections.js";
import type * as webhooksOutbound from "../webhooksOutbound.js";
import type * as workoutDefinitions from "../workoutDefinitions.js";
import type * as workoutLogs from "../workoutLogs.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  accessLog: typeof accessLog;
  activityFeed: typeof activityFeed;
  ageVerification: typeof ageVerification;
  annotationTemplates: typeof annotationTemplates;
  announcements: typeof announcements;
  apiKeys: typeof apiKeys;
  automationWorkflows: typeof automationWorkflows;
  badges: typeof badges;
  benchmarkWorkouts: typeof benchmarkWorkouts;
  bodyMeasurements: typeof bodyMeasurements;
  bookingPolicies: typeof bookingPolicies;
  calendarSync: typeof calendarSync;
  challenges: typeof challenges;
  checkInSystems: typeof checkInSystems;
  checkIns: typeof checkIns;
  classNotes: typeof classNotes;
  classRegistrations: typeof classRegistrations;
  classSessions: typeof classSessions;
  classes: typeof classes;
  coachNotes: typeof coachNotes;
  coachPrograms: typeof coachPrograms;
  comments: typeof comments;
  concept2Streaks: typeof concept2Streaks;
  consentRecords: typeof consentRecords;
  conversations: typeof conversations;
  crons: typeof crons;
  dailyWod: typeof dailyWod;
  dataRequests: typeof dataRequests;
  deviceMaintenance: typeof deviceMaintenance;
  devices: typeof devices;
  educationalContent: typeof educationalContent;
  emailCampaigns: typeof emailCampaigns;
  equipmentSessions: typeof equipmentSessions;
  eventRegistrations: typeof eventRegistrations;
  events: typeof events;
  exercises: typeof exercises;
  facilityAccessRules: typeof facilityAccessRules;
  facilityAreas: typeof facilityAreas;
  facilityHours: typeof facilityHours;
  featureFlags: typeof featureFlags;
  follows: typeof follows;
  foodDatabase: typeof foodDatabase;
  foodLog: typeof foodLog;
  goals: typeof goals;
  habits: typeof habits;
  hrZones: typeof hrZones;
  http: typeof http;
  integrationConnections: typeof integrationConnections;
  inventory: typeof inventory;
  invitations: typeof invitations;
  invoices: typeof invoices;
  leaderboards: typeof leaderboards;
  leads: typeof leads;
  legalDocuments: typeof legalDocuments;
  "lib/auth": typeof lib_auth;
  "lib/customFunctions": typeof lib_customFunctions;
  "lib/helpers": typeof lib_helpers;
  "lib/platformFunctions": typeof lib_platformFunctions;
  "lib/rbac": typeof lib_rbac;
  "lib/tenancy": typeof lib_tenancy;
  "lib/validators": typeof lib_validators;
  memberNotes: typeof memberNotes;
  membershipPlans: typeof membershipPlans;
  memberships: typeof memberships;
  messages: typeof messages;
  milestones: typeof milestones;
  motivationQuotes: typeof motivationQuotes;
  notificationTemplates: typeof notificationTemplates;
  notifications: typeof notifications;
  nutritionTargets: typeof nutritionTargets;
  orders: typeof orders;
  paymentMethods: typeof paymentMethods;
  payments: typeof payments;
  platformAdmins: typeof platformAdmins;
  platformAlerts: typeof platformAlerts;
  platformAnnouncements: typeof platformAnnouncements;
  platformAuditLog: typeof platformAuditLog;
  platformBenchmarkWorkouts: typeof platformBenchmarkWorkouts;
  platformConfig: typeof platformConfig;
  platformApiKeys: typeof platformApiKeys;
  platformExercises: typeof platformExercises;
  platformFeatureFlags: typeof platformFeatureFlags;
  platformIntegrations: typeof platformIntegrations;
  platformMetrics: typeof platformMetrics;
  platformModeration: typeof platformModeration;
  platformTenantNotes: typeof platformTenantNotes;
  platformTenants: typeof platformTenants;
  points: typeof points;
  productCategories: typeof productCategories;
  products: typeof products;
  programContent: typeof programContent;
  programDays: typeof programDays;
  progressPhotos: typeof progressPhotos;
  promoCodes: typeof promoCodes;
  promotions: typeof promotions;
  ptBookings: typeof ptBookings;
  ptSessions: typeof ptSessions;
  punchCards: typeof punchCards;
  reactions: typeof reactions;
  referralPrograms: typeof referralPrograms;
  referrals: typeof referrals;
  rewards: typeof rewards;
  rolesPermissions: typeof rolesPermissions;
  savedReports: typeof savedReports;
  scheduleExceptions: typeof scheduleExceptions;
  scheduleTemplates: typeof scheduleTemplates;
  securityEvents: typeof securityEvents;
  staff: typeof staff;
  streaks: typeof streaks;
  subscriptions: typeof subscriptions;
  tenantProvisioning: typeof tenantProvisioning;
  tenants: typeof tenants;
  "test/setup": typeof test_setup;
  testing: typeof testing;
  trainingPrograms: typeof trainingPrograms;
  trials: typeof trials;
  users: typeof users;
  videoAnnotations: typeof videoAnnotations;
  videoSubmissions: typeof videoSubmissions;
  waivers: typeof waivers;
  wearableConnections: typeof wearableConnections;
  webhooksOutbound: typeof webhooksOutbound;
  workoutDefinitions: typeof workoutDefinitions;
  workoutLogs: typeof workoutLogs;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};

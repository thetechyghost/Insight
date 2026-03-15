import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// B7: Evaluate all streaks daily at 6:00 UTC
// crons.daily("evaluate-streaks", { hourUTC: 6, minuteUTC: 0 },
//   internal.streaks.evaluateAll);

// B8: Process pending notifications every minute
// crons.interval("process-notifications", { minutes: 1 },
//   internal.notifications.processQueue);

// B8: Evaluate automation workflows every 5 minutes
// crons.interval("evaluate-automations", { minutes: 5 },
//   internal.automationWorkflows.evaluateAll);

// B9: Generate class sessions from templates weekly on Sunday at 2:00 UTC
// crons.weekly("generate-sessions", { dayOfWeek: "sunday", hourUTC: 2, minuteUTC: 0 },
//   internal.scheduleTemplates.generateUpcomingSessions);

// B5: Refresh wearable OAuth tokens daily at 3:00 UTC
// crons.daily("refresh-wearable-tokens", { hourUTC: 3, minuteUTC: 0 },
//   internal.wearableConnections.refreshAllTokens);

// B10: Daily billing checks at 8:00 UTC
// crons.daily("billing-daily-checks", { hourUTC: 8, minuteUTC: 0 },
//   internal.subscriptions.dailyChecks);

// B12: Data retention enforcement weekly on Monday at 4:00 UTC
// crons.weekly("data-retention", { dayOfWeek: "monday", hourUTC: 4, minuteUTC: 0 },
//   internal.dataRequests.enforceRetentionPolicies);

// NOTE: Cron jobs are commented out because the internal functions they reference
// (evaluateAll, processQueue, etc.) are not yet implemented. Uncomment each
// cron as its backing function is built.

export default crons;

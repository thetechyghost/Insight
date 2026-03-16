import {
  customQuery,
  customMutation,
  customAction,
} from "convex-helpers/server/customFunctions";
import { query, mutation, action } from "../_generated/server";
import { getUserFromAuth, getIdentityFromAuth } from "./auth";
import { ConvexError } from "convex/values";
import { Doc, Id } from "../_generated/dataModel";

export type PlatformAdminCtx = {
  user: Doc<"users">;
  userId: Id<"users">;
  platformAdmin: Doc<"platform_admins">;
  platformRole: Doc<"platform_admins">["platformRole"];
};

// ============================================================================
// platformQuery — requires authentication + active platform_admins record
// ============================================================================

export const platformQuery = customQuery(query, {
  args: {},
  input: async (ctx, _args) => {
    const { userId, user } = await getUserFromAuth(ctx);
    const platformAdmin = await ctx.db
      .query("platform_admins")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    if (!platformAdmin || platformAdmin.status !== "active") {
      throw new ConvexError("Unauthorized");
    }
    return {
      ctx: { user, userId, platformAdmin, platformRole: platformAdmin.platformRole },
      args: {},
    };
  },
});

// ============================================================================
// platformMutation — requires authentication + active platform_admins record
// ============================================================================

export const platformMutation = customMutation(mutation, {
  args: {},
  input: async (ctx, _args) => {
    const { userId, user } = await getUserFromAuth(ctx);
    const platformAdmin = await ctx.db
      .query("platform_admins")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    if (!platformAdmin || platformAdmin.status !== "active") {
      throw new ConvexError("Unauthorized");
    }
    return {
      ctx: { user, userId, platformAdmin, platformRole: platformAdmin.platformRole },
      args: {},
    };
  },
});

// ============================================================================
// platformAction — requires authentication + identity for external API calls
// NOTE: Actions cannot access ctx.db, so we cannot verify platform_admins here.
// Any platformAction handler that needs admin verification must call a query
// internally. This matches the tenantAction pattern in customFunctions.ts.
// ============================================================================

export const platformAction = customAction(action, {
  args: {},
  input: async (ctx, _args) => {
    const identity = await getIdentityFromAuth(ctx);
    return {
      ctx: { identity },
      args: {},
    };
  },
});

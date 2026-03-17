import { v } from "convex/values";
import { platformQuery, platformMutation } from "./lib/platformFunctions";

const apiKeySafe = v.object({
  _id: v.id("api_keys"),
  _creationTime: v.number(),
  tenantId: v.id("tenants"),
  name: v.string(),
  scopes: v.array(v.string()),
  rateLimitTier: v.union(v.literal("free"), v.literal("standard"), v.literal("premium")),
  lastUsedAt: v.optional(v.number()),
  isActive: v.boolean(),
});

// ============================================================================
// listAll — list all API keys across tenants (platform admin), without keyHash
// ============================================================================

export const listAll = platformQuery({
  args: {},
  returns: v.array(apiKeySafe),
  handler: async (ctx) => {
    const keys = await ctx.db.query("api_keys").collect();
    return keys.map(({ keyHash, ...rest }) => rest);
  },
});

// ============================================================================
// revoke — revoke an API key from any tenant (platform admin)
// ============================================================================

export const revoke = platformMutation({
  args: { apiKeyId: v.id("api_keys") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const key = await ctx.db.get(args.apiKeyId);
    if (!key) throw new Error("API key not found");
    await ctx.db.patch(args.apiKeyId, { isActive: false });
    return null;
  },
});

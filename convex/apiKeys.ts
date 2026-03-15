import { v, ConvexError } from "convex/values";
import { tenantQuery, tenantMutation, enforceRole } from "./lib/customFunctions";

const rateLimitValidator = v.union(
  v.literal("free"),
  v.literal("standard"),
  v.literal("premium")
);

const apiKeyDoc = v.object({
  _id: v.id("api_keys"),
  _creationTime: v.number(),
  tenantId: v.id("tenants"),
  name: v.string(),
  keyHash: v.string(),
  scopes: v.array(v.string()),
  rateLimitTier: rateLimitValidator,
  lastUsedAt: v.optional(v.number()),
  isActive: v.boolean(),
});

// Safe view without keyHash
const apiKeySafe = v.object({
  _id: v.id("api_keys"),
  _creationTime: v.number(),
  tenantId: v.id("tenants"),
  name: v.string(),
  scopes: v.array(v.string()),
  rateLimitTier: rateLimitValidator,
  lastUsedAt: v.optional(v.number()),
  isActive: v.boolean(),
});

async function generateApiKey() {
  const rawKey = `ink_${crypto.randomUUID().replace(/-/g, "")}`;
  const encoder = new TextEncoder();
  const buf = await crypto.subtle.digest("SHA-256", encoder.encode(rawKey));
  const keyHash = Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
  return { rawKey, keyHash };
}

// list — list API keys for the tenant (owner+), without keyHash
export const list = tenantQuery({
  args: {},
  returns: v.array(apiKeySafe),
  handler: async (ctx) => {
    enforceRole(ctx.role, "owner");
    const keys = await ctx.db
      .query("api_keys")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", ctx.tenantId))
      .collect();
    return keys.map(({ keyHash, ...rest }) => rest);
  },
});

// create — create a new API key (owner+), returns the key once
export const create = tenantMutation({
  args: {
    name: v.string(),
    scopes: v.array(v.string()),
    rateLimitTier: rateLimitValidator,
  },
  returns: v.object({ id: v.id("api_keys"), key: v.string() }),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "owner");
    const { rawKey, keyHash } = await generateApiKey();
    const id = await ctx.db.insert("api_keys", {
      tenantId: ctx.tenantId,
      name: args.name, keyHash, scopes: args.scopes,
      rateLimitTier: args.rateLimitTier, isActive: true,
    });
    return { id, key: rawKey };
  },
});

// rotate — rotate an API key (owner+), returns the new key once
export const rotate = tenantMutation({
  args: { apiKeyId: v.id("api_keys") },
  returns: v.object({ key: v.string() }),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "owner");
    const existing = await ctx.db.get(args.apiKeyId);
    if (!existing) throw new ConvexError("API key not found");
    if (existing.tenantId !== ctx.tenantId) throw new ConvexError("Key does not belong to this tenant");
    const { rawKey, keyHash } = await generateApiKey();
    await ctx.db.patch(args.apiKeyId, { keyHash });
    return { key: rawKey };
  },
});

// revoke — revoke an API key (owner+)
export const revoke = tenantMutation({
  args: { apiKeyId: v.id("api_keys") },
  returns: v.null(),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "owner");
    const existing = await ctx.db.get(args.apiKeyId);
    if (!existing) throw new ConvexError("API key not found");
    if (existing.tenantId !== ctx.tenantId) throw new ConvexError("Key does not belong to this tenant");
    await ctx.db.patch(args.apiKeyId, { isActive: false });
    return null;
  },
});

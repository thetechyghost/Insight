import { QueryCtx, MutationCtx, ActionCtx } from "../_generated/server";
import { ConvexError } from "convex/values";
import { Doc, Id } from "../_generated/dataModel";

export type AuthenticatedCtx = {
  userId: Id<"users">;
  user: Doc<"users">;
};

/**
 * Reads the authenticated identity from ctx.auth and resolves
 * the corresponding user record from the users table.
 *
 * Throws ConvexError if not authenticated or user not found.
 */
export async function getUserFromAuth(
  ctx: QueryCtx | MutationCtx
): Promise<AuthenticatedCtx> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new ConvexError("Not authenticated");
  }

  const user = await ctx.db
    .query("users")
    .withIndex("by_email", (q) => q.eq("email", identity.email!))
    .unique();

  if (!user) {
    throw new ConvexError("User not found. Please complete registration first.");
  }

  return { userId: user._id, user };
}

/**
 * Same as getUserFromAuth but for action contexts where
 * we don't have direct DB access. Returns just the identity.
 */
export async function getIdentityFromAuth(ctx: ActionCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new ConvexError("Not authenticated");
  }
  return identity;
}

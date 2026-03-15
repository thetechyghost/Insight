import { QueryCtx } from "../_generated/server";

/**
 * Generate a random token string for invitations, API keys, etc.
 */
export function generateToken(): string {
  return crypto.randomUUID();
}

/**
 * Check if a timestamp has passed.
 */
export function isExpired(expiresAt: number): boolean {
  return Date.now() > expiresAt;
}

/**
 * Default pagination limit.
 */
export const DEFAULT_PAGE_SIZE = 50;
export const MAX_PAGE_SIZE = 100;

/**
 * Clamp a requested page size to within bounds.
 */
export function clampPageSize(requested?: number): number {
  if (!requested || requested < 1) return DEFAULT_PAGE_SIZE;
  return Math.min(requested, MAX_PAGE_SIZE);
}

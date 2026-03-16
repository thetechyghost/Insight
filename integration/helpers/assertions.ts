import { expect } from "vitest";

/**
 * Assert that an async function throws a ConvexError.
 * Convex wraps errors in a specific format when called via HTTP client.
 */
export async function expectToThrow(
  fn: () => Promise<unknown>,
  messageSubstring?: string
): Promise<void> {
  try {
    await fn();
    expect.fail("Expected function to throw, but it did not");
  } catch (error: unknown) {
    if (messageSubstring) {
      const message =
        error instanceof Error ? error.message : String(error);
      expect(message).toContain(messageSubstring);
    }
  }
}

/**
 * Assert that a value is a valid Convex document ID (string format).
 */
export function expectValidId(value: unknown): void {
  expect(typeof value).toBe("string");
  expect((value as string).length).toBeGreaterThan(0);
}

/**
 * Assert that an array contains exactly the expected number of items.
 */
export function expectCount<T>(arr: T[], count: number): void {
  expect(arr).toHaveLength(count);
}

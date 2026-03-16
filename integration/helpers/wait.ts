/**
 * Poll a function until it returns a truthy value, or timeout.
 * Useful for waiting on eventually-consistent operations.
 */
export async function waitFor<T>(
  fn: () => Promise<T>,
  options: {
    timeoutMs?: number;
    intervalMs?: number;
    description?: string;
  } = {}
): Promise<T> {
  const { timeoutMs = 10_000, intervalMs = 500, description = "condition" } = options;

  const start = Date.now();
  let lastResult: T;

  while (Date.now() - start < timeoutMs) {
    lastResult = await fn();
    if (lastResult) return lastResult;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error(
    `Timed out waiting for ${description} after ${timeoutMs}ms`
  );
}

/**
 * Simple delay utility.
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

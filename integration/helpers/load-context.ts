import * as fs from "node:fs";
import * as path from "node:path";
import type { SeedContext } from "../seed/types";

const CONTEXT_FILE = path.join(__dirname, "..", ".seed-context.json");

let _cached: SeedContext | null = null;

/**
 * Load the SeedContext written by globalSetup.
 * Cached after first load.
 */
export function loadSeedContext(): SeedContext {
  if (_cached) return _cached;

  if (!fs.existsSync(CONTEXT_FILE)) {
    throw new Error(
      "Seed context file not found. Did globalSetup run? " +
        "Make sure you're running integration tests via `npm run test:integration`."
    );
  }

  _cached = JSON.parse(fs.readFileSync(CONTEXT_FILE, "utf-8")) as SeedContext;
  return _cached;
}

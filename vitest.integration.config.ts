import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["integration/**/*.integration.ts"],
    testTimeout: 30_000,
    hookTimeout: 60_000,
    pool: "forks",
    fileParallelism: false,
    globalSetup: ["./integration/global-setup.ts"],
    setupFiles: ["dotenv/config"],
    env: {
      DOTENV_CONFIG_PATH: ".env.test",
    },
  },
});

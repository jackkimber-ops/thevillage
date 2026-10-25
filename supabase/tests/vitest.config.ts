import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["**/*.test.ts"],
    exclude: ["node_modules/**"],
    globalSetup: ["./global-setup.ts"],
    fileParallelism: false,
    testTimeout: 20000,
  },
});

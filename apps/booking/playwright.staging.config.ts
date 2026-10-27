import { defineConfig, devices } from "@playwright/test";

// The full check against staging: npm run check:staging (see e2e-staging/README.md).
export default defineConfig({
  testDir: "./e2e-staging",
  globalSetup: "./e2e-staging/global-setup.ts",
  timeout: 180_000,
  expect: { timeout: 15_000 },
  workers: 2,
  retries: 0,
  reporter: [["list"], ["json", { outputFile: "test-results/staging.json" }]],
  use: {
    baseURL: process.env.STAGING_URL ?? "https://thevillage-booking-git-staging-the-village-c37390c6.vercel.app",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    launchOptions: process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : undefined,
  },
  projects: [
    { name: "phone", use: { ...devices["Pixel 7"] }, testIgnore: /04-system/ },
    { name: "desktop", use: { ...devices["Desktop Chrome"] }, testIgnore: /02-customer|04-system/ },
    { name: "system", testMatch: /04-system/, dependencies: ["phone", "desktop"] },
  ],
});

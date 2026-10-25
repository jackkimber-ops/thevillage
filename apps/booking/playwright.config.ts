import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;

export default defineConfig({
  testDir: "./e2e",
  use: { baseURL: `http://localhost:${PORT}` },
  projects: [
    { name: "phone", use: { ...devices["Pixel 7"] }, testIgnore: /staff\.spec/ },
    { name: "desktop", use: { ...devices["Desktop Chrome"] }, testMatch: /staff\.spec/ },
  ],
  webServer: {
    command: `npm run start -- -p ${PORT}`,
    env: { DEMO_DATA: "1" },
    url: `http://localhost:${PORT}/api/health`,
    reuseExistingServer: !process.env.CI,
  },
});

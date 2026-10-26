import { defineConfig, devices } from "@playwright/test";

const PORT = 3110;

export default defineConfig({
  testDir: "./e2e",
  use: { baseURL: `http://localhost:${PORT}` },
  projects: [
    { name: "phone", use: { ...devices["Pixel 7"] } },
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: `npm run start -- -p ${PORT}`,
    url: `http://localhost:${PORT}/`,
    env: { DEMO_DATA: "1" },
    reuseExistingServer: !process.env.CI,
  },
});

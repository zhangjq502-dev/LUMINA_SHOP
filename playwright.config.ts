import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 45000,
  globalSetup: "./e2e/global-setup.ts",
  reporter: [["list"], ...(process.env.CI ? [["github"] as ["github"]] : []), ["html", { open: "never" }]],
  use: {
    baseURL: "http://localhost:5188",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        ...(process.env.CI ? {} : { channel: "chrome" }),
      },
    },
  ],
});

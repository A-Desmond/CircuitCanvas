import { defineConfig, devices } from "@playwright/test";

const port = process.env.PLAYWRIGHT_PORT ?? "3100";
const host = process.env.PLAYWRIGHT_HOST ?? "127.0.0.1";
const useExistingServer = process.env.PLAYWRIGHT_EXISTING_SERVER === "true";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  use: { baseURL: `http://${host}:${port}`, trace: "on-first-retry" },
  webServer: useExistingServer ? undefined : {
    command: `npm run dev -- --hostname ${host} --port ${port}`,
    url: `http://${host}:${port}`,
    reuseExistingServer: !process.env.CI,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});

import { defineConfig, devices } from "@playwright/test";

/**
 * Сквозные тесты основного сценария MVP и проверки прав доступа.
 * Требуют запущенного Supabase (npx supabase start) и приложения (npm run dev / npm start).
 * Переменные: см. e2e/README.md.
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 180_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  outputDir: "e2e/.artifacts",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    locale: "ru-RU",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});

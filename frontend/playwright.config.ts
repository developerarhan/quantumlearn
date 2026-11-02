import { defineConfig, devices } from '@playwright/test';

const FRONTEND_URL = 'http://localhost:5173';
const BACKEND_HEALTH_URL = 'http://127.0.0.1:8000/api/v1/health';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 20_000 },
  reporter: [['list']],
  outputDir: 'test-results',
  use: {
    baseURL: FRONTEND_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: '.venv\\Scripts\\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000',
      cwd: '../backend',
      url: BACKEND_HEALTH_URL,
      reuseExistingServer: true,
      timeout: 120_000,
    },
    {
      command: 'npm run dev',
      url: FRONTEND_URL,
      reuseExistingServer: true,
      timeout: 120_000,
    },
  ],
});

import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env['FORTY_HARNESS_PORT']) || 4400;
const BASE_URL = `http://localhost:${PORT}`;
const isCI = !!process.env['CI'];

export default defineConfig({
  testDir: 'projects/forty-cdk-harness/e2e',
  testMatch: /.*\.e2e\.ts$/,
  fullyParallel: true,
  forbidOnly: isCI,
  // No retries anywhere. A retry turns a race into a green run with a "flaky"
  // note nobody reads, which is how this suite lost its signal: the gate was
  // held for months over flakes that `retries: 2` had been hiding all along.
  // A test that only passes on the second attempt is a defect — in the
  // primitive, or in the test's own synchronisation — and it has to be red to
  // get fixed. CI dimensioning is handled by sharding the job, not by
  // re-running failures.
  retries: 0,
  workers: isCI ? 2 : undefined,
  timeout: 30_000,
  expect: { timeout: 5_000 },
  // `blob` is what `playwright merge-reports` consumes: each sharded CI job
  // uploads its blob and a final job stitches them into one HTML report.
  // `list` rides along so a failing shard's own log is readable without
  // downloading an artifact.
  reporter: isCI ? [['list'], ['blob']] : [['list']],
  use: {
    baseURL: BASE_URL,
    // Not `on-first-retry`: with `retries: 0` that setting captures nothing
    // ever, so the one run that mattered would leave no diagnostic behind.
    trace: 'retain-on-failure',
    actionTimeout: 5_000,
    navigationTimeout: 15_000,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'], hasTouch: true },
      grep: /@mobile/,
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'], hasTouch: true },
      grep: /@mobile/,
    },
  ],
  webServer: {
    command: `pnpm exec ng serve forty-cdk-harness --port ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !isCI,
    stdout: 'pipe',
    stderr: 'pipe',
    timeout: 180_000,
  },
});

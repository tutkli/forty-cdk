import { defineConfig } from 'vitest/config';

/**
 * Vitest configuration for forty-cdk.
 *
 * The `@angular/build:unit-test` builder loads it for both test targets through
 * `runnerConfig: true` in `angular.json`, which searches the project root and then the
 * workspace root for a file named `vitest-base.config.*`. Under any other name the
 * builder runs with `config: false` and drops every flag below. The builder wraps these
 * options into the single project it builds, keeps its own `isolate: false` default, and
 * supplies the Angular plugins, the jsdom environment and the setup files.
 *
 * - `clearMocks`, `restoreMocks`, `unstubGlobals`, `unstubEnvs` — Vitest resets `vi.fn()`
 *   history, `vi.spyOn` patches and `vi.stubGlobal` / `vi.stubEnv` before each test.
 *   `vitest-invariants-setup.ts` repeats the resets after each test, so the last test of a
 *   spec file does not hand its stubs to the next file its worker runs.
 * - `testTimeout: 15000` — the floating-ui overlay suites drain several real macrotask hops
 *   per `flush()`, and a worker starved under the parallel schedule can push one past
 *   Vitest's 5000ms default on a correct test.
 *
 * ### Worst-case (nightly) profile
 *
 * `FORTY_CDK_TEST_WORST_CASE=true` switches to the scheduler-hostile schedule that
 * `.github/workflows/test-shuffle.yml` runs every night: one forked worker, no isolation,
 * no file parallelism, and a shuffled file and test order.
 */
const worstCase = process.env['FORTY_CDK_TEST_WORST_CASE'] === 'true';

export default defineConfig({
  test: {
    testTimeout: 15000,
    clearMocks: true,
    restoreMocks: true,
    unstubGlobals: true,
    unstubEnvs: true,
    ...(worstCase
      ? {
          pool: 'forks',
          maxWorkers: 1,
          isolate: false,
          fileParallelism: false,
          sequence: { shuffle: { files: true, tests: true } },
        }
      : {}),
  },
});

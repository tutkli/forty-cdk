import { defineConfig } from 'vitest/config';

/**
 * Vitest configuration for forty-cdk.
 *
 * Loaded by the `@angular/build:unit-test` builder via the `runnerConfig: true`
 * option (see `angular.json` → `forty-cdk` → `architect.test.options`).
 *
 * The Angular builder supplies the actual test plugins (Angular compiler
 * integration, jsdom environment, polyfills, TestBed init) and wraps the user
 * config into a `projects: [...]` array internally. Mock-reset / unstub
 * invariants declared at the root of this file are nominally merged into that
 * project config, but the builder's project wrapper does not currently
 * propagate them to the runner's `RuntimeConfig` (the same code path Vitest
 * uses to read `clearMocks` at the test boundary). The invariants are
 * therefore *also* applied imperatively from
 * `projects/forty-cdk/src/test-utils/vitest-invariants-setup.ts`, which is
 * wired through the builder's `setupFiles` option in `angular.json` and runs
 * before any spec file is loaded.
 *
 * Keeping both layers in place is intentional defence in depth:
 *
 * - `clearMocks: true` — `vi.fn()` call history is reset between tests, so
 *   call-count assertions don't rely on manual `mockClear()` discipline.
 * - `restoreMocks: true` — `vi.spyOn(obj, 'method')` is auto-restored at the
 *   test boundary; a forgotten cleanup fails loudly rather than corrupting
 *   adjacent specs.
 * - `unstubGlobals: true` — `vi.stubGlobal(...)` is undone automatically. Specs
 *   that adopt this pattern instead of `Object.defineProperty` get cleanup
 *   for free.
 * - `unstubEnvs: true` — same contract for `vi.stubEnv(...)`.
 * - `isolate: true` — explicit per-pool worker isolation. This is the Vitest
 *   default today, pinned here so a future CI pool change can't silently flip it.
 * - `testTimeout: 15000` — raised from Vitest's 5000ms default. The floating-ui
 *   overlay suites (select / combobox / popover / …) drain several real
 *   macrotask hops per `flush()`; under the default parallel jsdom schedule a
 *   worker can be CPU-starved long enough for one of those hops to blow the
 *   5000ms budget on an otherwise-correct test (select.spec runs ~7x slower
 *   under full-suite contention than in isolation). 15000ms absorbs the
 *   contention spike without masking a genuine hang. Same propagation caveat as
 *   the mock-reset flags below, so it is mirrored imperatively in
 *   `vitest-invariants-setup.ts`.
 *
 * If a future `@angular/build` release wires user `test.*` invariants through
 * to the runtime config, the setup-file layer becomes redundant but harmless.
 *
 * ### Worst-case (nightly) overrides
 *
 * When `FORTY_CDK_TEST_WORST_CASE=true` is set in the environment, the config
 * declares the scheduler-hostile combination intended to expose test leaks
 * (polyfills, live regions, fake timers) the default isolated schedule masks:
 * single forked worker, no per-test isolation, no file parallelism, and
 * randomised file + test order. This is the schedule the nightly
 * `.github/workflows/test-shuffle.yml` job runs against; locally a contributor
 * reproduces it with `FORTY_CDK_TEST_WORST_CASE=true pnpm test`. The branch
 * is intentionally a spread-when-true so the default `pnpm test` path is
 * byte-identical to before.
 *
 * **Builder propagation caveat.** The `@angular/build:unit-test` builder
 * (verified against `@angular/build@21.2.9`) injects this user config under
 * `test.projects[0]` rather than at the runner top level. Vitest's runtime
 * reads `pool` and `isolate` from the per-project config, so those two flags
 * take effect today (verified by inspecting `__vitest_worker__.config` from a
 * setup hook). `fileParallelism`, `maxWorkers`, and `sequence.*` are
 * runner-top-level settings — they are merged into the project config but
 * silently dropped by the orchestrator, and `sequence.shuffle.{files,tests}`
 * therefore does **not** activate today. The flags are kept here so they
 * activate automatically the moment the Angular builder propagates user
 * config to the runner level; until then the nightly job still exercises a
 * non-isolated, single-forked schedule, which is enough to surface most
 * cross-test state leaks (the original motivation of audit #231).
 */
const worstCase = process.env['FORTY_CDK_TEST_WORST_CASE'] === 'true';

export default defineConfig({
  test: {
    isolate: true,
    testTimeout: 15000,
    clearMocks: true,
    restoreMocks: true,
    unstubGlobals: true,
    unstubEnvs: true,
    ...(worstCase
      ? {
          pool: 'forks',
          poolOptions: { forks: { singleFork: true } },
          isolate: false,
          fileParallelism: false,
          sequence: { shuffle: { files: true, tests: true } },
        }
      : {}),
  },
});

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
 * ### Spec files share workers
 *
 * No `test.*` flag in this file reaches the worker: on `@angular/build@22.0.3`
 * `__vitest_worker__.config` reads `isolate: false`, the default `forks` pool
 * and Vitest's defaults for every mock / unstub flag, with or without
 * `FORTY_CDK_TEST_WORST_CASE`. `isolate: false` is the builder's own project
 * default, so every run, local and CI, executes several spec files in turn in
 * each forked worker, and a global one file leaves behind is visible to the
 * next. Which files share a worker depends on how long each takes, so a leak
 * fails a spec on one run and not on the next. The suite accepts that schedule
 * instead of forcing isolation through the builder's `isolate` option: a spec
 * restores every global it touches, and `vi.stubGlobal` is the shape that
 * restores an absent global by deleting it rather than assigning `undefined`.
 *
 * ### Worst-case (nightly) overrides
 *
 * When `FORTY_CDK_TEST_WORST_CASE=true` is set in the environment, the config
 * declares the scheduler-hostile combination intended to expose test leaks
 * (polyfills, live regions, fake timers): single forked worker, no per-test
 * isolation, no file parallelism, and randomised file + test order. The
 * nightly `.github/workflows/test-shuffle.yml` job sets the variable; locally
 * a contributor sets it with `FORTY_CDK_TEST_WORST_CASE=true pnpm test`. The
 * branch is a spread-when-true so the default `pnpm test` path is unchanged.
 *
 * **The profile is inert today.** For the reason in the previous section, none
 * of these flags reaches the worker, so the nightly job runs the same
 * multi-worker, non-isolated, fixed-order schedule as `pnpm test`. The flags
 * are kept so they take effect if a future `@angular/build` release
 * propagates user config to the runner.
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
          poolOptions: { forks: { singleFork: true } },
          isolate: false,
          fileParallelism: false,
          sequence: { shuffle: { files: true, tests: true } },
        }
      : {}),
  },
});

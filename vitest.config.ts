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
 *
 * If a future `@angular/build` release wires user `test.*` invariants through
 * to the runtime config, the setup-file layer becomes redundant but harmless.
 */
export default defineConfig({
  test: {
    isolate: true,
    clearMocks: true,
    restoreMocks: true,
    unstubGlobals: true,
    unstubEnvs: true,
  },
});

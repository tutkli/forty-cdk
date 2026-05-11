/**
 * Imperative twin of the mock-reset / unstub invariants declared in the
 * repo-root `vitest.config.ts`.
 *
 * Wired through the `@angular/build:unit-test` builder's `setupFiles` option
 * in `angular.json`. The builder's plugin pipeline currently does NOT
 * propagate `test.clearMocks` / `test.restoreMocks` / `test.unstubGlobals` /
 * `test.unstubEnvs` from the user `vitest.config.ts` to the per-project
 * `RuntimeConfig` Vitest reads at the test boundary, so the file-level config
 * alone is silently dropped. Running these resets from a setup file works
 * regardless of whether the builder ever propagates the flags, and stays
 * harmless if it eventually does.
 *
 * Effect, applied after every test in every spec:
 *
 * - `vi.restoreAllMocks()` — undoes `vi.spyOn(obj, 'method')` (mirrors
 *   `restoreMocks: true`).
 * - `vi.clearAllMocks()` — clears `vi.fn()` call history (mirrors
 *   `clearMocks: true`).
 * - `vi.unstubAllGlobals()` — undoes `vi.stubGlobal(...)` (mirrors
 *   `unstubGlobals: true`).
 * - `vi.unstubAllEnvs()` — undoes `vi.stubEnv(...)` (mirrors
 *   `unstubEnvs: true`).
 *
 * Order matches Vitest's own internal `clearModuleMocks` helper so behaviour
 * is identical to the native invariants.
 */
import { afterEach, vi } from 'vitest';

afterEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

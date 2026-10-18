/**
 * After-each twin of the mock-reset / unstub invariants declared in the
 * repo-root `vitest-base.config.ts`.
 *
 * Wired through the `@angular/build:unit-test` builder's `setupFiles` option
 * in `angular.json`. Vitest applies `clearMocks` / `restoreMocks` /
 * `unstubGlobals` / `unstubEnvs` before each test; spec files share a worker
 * (`isolate: false`), so without a reset after each test the last test of one
 * file would hand its spies and stubs to the module scope of the next file
 * that worker loads.
 *
 * Effect, applied after every test in every spec:
 *
 * - `vi.restoreAllMocks()` — undoes `vi.spyOn(obj, 'method')`.
 * - `vi.clearAllMocks()` — clears `vi.fn()` call history.
 * - `vi.unstubAllGlobals()` — undoes `vi.stubGlobal(...)`.
 * - `vi.unstubAllEnvs()` — undoes `vi.stubEnv(...)`.
 *
 * Order matches Vitest's own internal `clearModuleMocks` helper so behaviour
 * is identical to the native invariants.
 *
 * The file is also where `assertNoAngularDiagnostics` is armed, over every
 * `NG<NNNN>` code. A setup file is imported before the spec module it
 * precedes, which is the only point early enough to observe an AOT fixture's
 * definition-time `NG0912`
 * ([#1957](https://github.com/tutkli/forty-cdk/issues/1957)); the recording
 * patch travels with that import.
 *
 * The assertion runs from `onTestFinished`, not from this file's `afterEach`:
 * Vitest runs `afterEach` hooks innermost first and in reverse registration
 * order, so the builder's `TestBed` teardown — an `afterEach` registered by a
 * setup file loaded before this one — runs after every hook here, while
 * `onTestFinished` runs after all of them. A diagnostic raised while the
 * `TestBed` destroys a fixture therefore fails the test that mounted it.
 */
import { afterEach, beforeEach, onTestFinished, vi } from 'vitest';

import { assertNoAngularDiagnostics } from './angular-diagnostics';

beforeEach(() => {
  onTestFinished(() => assertNoAngularDiagnostics());
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

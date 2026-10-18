/**
 * Permanent smoke test that the four mock-reset invariants are wired up.
 *
 * Each case dirties one invariant inside the test and asserts, from
 * `onTestFinished`, that it is clean again. Vitest calls `onTestFinished`
 * after every `afterEach` hook and before the next test's own resets, so
 * the only thing that can have cleaned it by then is the
 * `vitest-invariants-setup.ts` setup file (see `angular.json`) — the layer
 * that keeps the last test of one spec file from handing its spies and
 * stubs to the next file its worker runs. The repo-root
 * `vitest-base.config.ts` applies the same four resets before each test, so
 * a check made at the next test's entry would pass with the setup file's
 * reset deleted.
 *
 * Each case also asserts the invariant clean on entry and dirty after the
 * write, so a predicate that cannot tell the two states apart fails rather
 * than reporting green. The cases share no state, so the nightly
 * scheduler-hostile profile's in-file shuffle cannot change what they
 * detect.
 */
import { onTestFinished, vi } from 'vitest';

const GLOBAL_PROBE = '__fortyInvariantProbe';
const ENV_PROBE = 'FORTY_INVARIANT_PROBE';

const processEnv = (
  globalThis as unknown as {
    readonly process: { readonly env: Record<string, string | undefined> };
  }
).process.env;

const spy = vi.fn();
const target = { read: (): string => 'real' };

interface Invariant {
  readonly name: string;
  readonly dirty: () => void;
  readonly isClean: () => boolean;
}

const INVARIANTS: readonly Invariant[] = [
  {
    name: 'clearMocks',
    dirty: () => spy('call'),
    isClean: () => spy.mock.calls.length === 0,
  },
  {
    name: 'restoreMocks',
    dirty: () => {
      vi.spyOn(target, 'read').mockReturnValue('stub');
    },
    isClean: () => !vi.isMockFunction(target.read) && target.read() === 'real',
  },
  {
    name: 'unstubGlobals',
    dirty: () => {
      vi.stubGlobal(GLOBAL_PROBE, true);
    },
    isClean: () => !(GLOBAL_PROBE in globalThis),
  },
  {
    name: 'unstubEnvs',
    dirty: () => {
      vi.stubEnv(ENV_PROBE, 'stubbed');
    },
    isClean: () => processEnv[ENV_PROBE] === undefined,
  },
];

describe('vitest mock-reset invariants', () => {
  it.each(INVARIANTS)('$name is reset by the setup file after the test', ({ dirty, isClean }) => {
    expect(isClean()).toBe(true);
    dirty();
    expect(isClean()).toBe(false);

    onTestFinished(() => {
      expect(isClean()).toBe(true);
    });
  });
});

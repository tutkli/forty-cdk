/**
 * Turns Angular's `NG0953` destroyed-`OutputRef` warning into a failing test.
 *
 * Angular drops an `emit()` on an `OutputEmitterRef` whose owning directive is
 * already destroyed, so no subscriber runs and the emit's return value — for a
 * vetoable event, `defaultPrevented` — reports the consumer's silence as
 * consent. The primitive then performs the action the consumer asked it to
 * skip. Nothing turns red: the warning is the only evidence, and Vitest's
 * default reporter suppresses a file's `stderr` block on a green run.
 *
 * The suite therefore does not carry the warning at all: this module records it
 * and {@link assertNoDestroyedOutputEmits} — called from
 * `vitest-invariants-setup.ts` after every test — throws it back as a failure.
 * It patches `console.warn` the same way, and after, the `NG0912` guard, so the
 * two chain rather than replace each other.
 *
 * A recorded warning is **not** forwarded to `console.warn`; the guard is the
 * channel. The same two gaps its sibling documents apply here: a spec holding
 * its own `vi.spyOn(console, 'warn').mockImplementation(…)` swallows the
 * warning before the record sees it, and under the nightly `isolate: false`
 * profile the record is shared across files in one worker, so an emit may be
 * attributed to the file whose test drained it.
 */

const DESTROYED_OUTPUT_EMIT = 'NG0953';

const recorded: string[] = [];

const passThrough = console.warn.bind(console);

console.warn = (...args: unknown[]): void => {
  const [message] = args;
  if (typeof message === 'string' && message.startsWith(DESTROYED_OUTPUT_EMIT)) {
    recorded.push(message);
    return;
  }
  passThrough(...args);
};

/**
 * Throws when an emit on a destroyed `OutputRef` was recorded since the last
 * call, drains the record either way.
 *
 * Draining is what keeps one emit to one failure, and is what lets the liveness
 * probe assert the throw without failing the run it just proved.
 */
export function assertNoDestroyedOutputEmits(): void {
  if (recorded.length === 0) return;

  const count = recorded.length;
  recorded.length = 0;

  throw new Error(
    `[forty-cdk/test-utils] ${DESTROYED_OUTPUT_EMIT}: ${count} emit(s) reached an OutputRef whose ` +
      'owning directive was already destroyed, so no subscriber ran.\n\n' +
      'Fix: resolve the hook through a channel that survives teardown — ' +
      '`injectVetoableEmitter` for a vetoable one, a function `input` for a value the primitive ' +
      'reports from its destroy hook — instead of emitting into the output directly.',
  );
}

/**
 * Turns Angular's `NG0912` component-ID collision warning into a failing test.
 *
 * Angular derives a component's id from its **shape** — selector,
 * `decls` / `vars` / `consts`, host bindings, inputs / outputs, encapsulation,
 * query flags and the prototype's own property names — and the class name is
 * not part of it. Two spec fixtures whose templates differ only in tag names or
 * attribute values therefore hash to the same value under the auto-generated
 * `ng-component` selector a component declares no explicit one, and Angular
 * warns. The id is load-bearing in the two places it is used (the `ngh`
 * hydration annotation and `@defer` dependency tracking), so the warning exists
 * to be read — but Vitest's default reporter suppresses a file's `stderr` block
 * on a green run, so a collision is invisible until something else fails.
 *
 * The suite therefore does not carry the warning at all: this module records it
 * and {@link assertNoComponentIdCollisions} — called from
 * `vitest-invariants-setup.ts` after every test — throws it back as a failure
 * naming both fixtures. Wired through the `@angular/build:unit-test` builder's
 * `setupFiles`, so the patch is installed before the spec module is imported
 * and sees the definition-time warning of an AOT-compiled fixture, whose
 * `ɵcmp` static initializer runs while its `describe` callback is evaluated.
 *
 * A recorded warning is **not** forwarded to `console.warn`. The guard is the
 * channel now, and re-emitting would put back the same silent-on-green hum the
 * guard replaces — including one from the deliberately colliding pair in
 * [`component-id-collisions.spec.ts`](./component-id-collisions.spec.ts), which
 * exists precisely so a run that stopped detecting cannot pass.
 *
 * Two gaps are known rather than closed. A collision emitted while a spec holds
 * its own `vi.spyOn(console, 'warn').mockImplementation(…)` reaches neither the
 * record nor the reporter — unchanged from before the guard, since such a spec
 * already swallowed it. And under the nightly `isolate: false` profile the
 * record is shared across files in one worker, so a collision may be attributed
 * to the file whose test drained it rather than to the file that emitted it;
 * the message names the two classes either way.
 */

const COMPONENT_ID_COLLISION = 'NG0912';

const recorded: string[] = [];

const passThrough = console.warn.bind(console);

console.warn = (...args: unknown[]): void => {
  const [message] = args;
  if (typeof message === 'string' && message.startsWith(COMPONENT_ID_COLLISION)) {
    recorded.push(message);
    return;
  }
  passThrough(...args);
};

/**
 * Throws when a component-ID collision was recorded since the last call,
 * drains the record either way.
 *
 * Draining is what keeps one collision to one failure, and is what lets the
 * liveness probe assert the throw without failing the run it just proved.
 */
export function assertNoComponentIdCollisions(): void {
  if (recorded.length === 0) return;

  const reported = recorded.join('\n');
  recorded.length = 0;

  throw new Error(
    `[forty-cdk/test-utils] ${COMPONENT_ID_COLLISION}: two fixtures generated the same component ID.\n\n` +
      `${reported}\n\n` +
      "Fix: give one of them a distinct shape. A `host: { 'data-fixture': '<name>' }` block " +
      'moves `hostAttrs` into the hash without touching a template or a selector, and the value ' +
      'only has to be unique within the declaring file.',
  );
}

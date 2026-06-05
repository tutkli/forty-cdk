/**
 * Fixture for `forty-cdk/no-effect-state-propagation`.
 *
 * Reading a signal reactively and writing the same signal via `.set` /
 * `.update` inside an `effect()` callback is forbidden — it is the
 * state-propagation anti-pattern (implicit cycles, double change-detection,
 * ordering bugs). Derive the value with `computed()` / `linkedSignal()`
 * instead, or wrap the read in `untracked()` when the current value is
 * genuinely needed without subscribing. See CLAUDE.md > "Never propagate
 * state inside `effect()`".
 */

declare function effect(fn: () => void): void;
declare function untracked<T>(fn: () => T): T;
declare interface WritableSignal<T> {
  (): T;
  set(value: T): void;
  update(fn: (value: T) => T): void;
}
declare const s: WritableSignal<number>;
declare const other: WritableSignal<number>;
declare function observe(cb: () => void): void;

// Expected: 1× forty-cdk/no-effect-state-propagation
// The synthetic violation from issue #509's acceptance criteria: the same
// signal `s` is read (`s()`) and written (`s.set(...)`) in the same effect.
effect(() => {
  s.set(s() + 1);
});

// Expected: 1× forty-cdk/no-effect-state-propagation
// `.update` form is the same anti-pattern.
effect(() => {
  if (s() > 0) {
    s.update((v) => v + 1);
  }
});

// Allowed: read one signal, write a different one — no self-cycle on a
// single signal. (Cross-signal propagation is a softer smell the rule does
// not flag; CLAUDE.md targets the same-signal read-and-write case.)
effect(() => {
  other.set(s() + 1);
});

// Allowed: the read is wrapped in `untracked()` — the documented escape
// hatch for needing the current value without subscribing.
effect(() => {
  s.set(untracked(() => s()) + 1);
});

// Allowed: the write happens inside a nested callback that fires outside the
// reactive scope (a ResizeObserver-style bridge), not in the effect's own
// synchronous run.
effect(() => {
  observe(() => {
    s.set(s() + 1);
  });
});

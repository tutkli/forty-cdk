/**
 * Fixture for `forty-cdk/require-sanctioned-effect-marker`.
 *
 * Every `.set(…)` / `.update(…)` inside an `effect()` callback in library source
 * must be licensed by the canonical marker comment placed immediately above the
 * `effect(` call — `// @sanctioned-effect(<invariant>): <why the write cannot
 * cycle>`. The invariant name is what a reviewer verifies and what a future
 * refactor must preserve, and `grep @sanctioned-effect` is the library's
 * complete carve-out ledger. See CLAUDE.md > conventions > "The
 * sanctioned-effect marker".
 */

declare function effect(fn: () => void): void;
declare function untracked<T>(fn: () => T): T;
declare interface WritableSignal<T> {
  (): T;
  set(value: T): void;
  update(fn: (value: T) => T): void;
}
declare const out: WritableSignal<number>;
declare const open: WritableSignal<boolean>;
declare const disabled: () => boolean;
declare const host: HTMLElement;
declare const mirrored: WritableSignal<number>;
declare const measured: { width: number };
declare function observe(cb: () => void): void;

// Expected: 1× forty-cdk/require-sanctioned-effect-marker
// An unmarked write to a different signal — invisible to
// `no-effect-state-propagation` (no same-signal read), which is exactly the gap
// this rule closes.
effect(() => {
  out.set(1);
});

// Expected: 1× forty-cdk/require-sanctioned-effect-marker
// `.update` is the same write channel.
effect(() => {
  out.update((value) => value + 1);
});

// Expected: 1× forty-cdk/require-sanctioned-effect-marker (malformedMarker)
// The marker is present but carries no invariant name and no rationale, so it
// documents nothing and is rejected rather than accepted.
// @sanctioned-effect
effect(() => {
  out.set(2);
});

// Allowed: a well-formed marker licenses the write.
// @sanctioned-effect(untracked-read): the `open` read is untracked, so the
// effect reacts to `disabled` alone and never cycles on the signal it writes.
effect(() => {
  if (disabled() && untracked(open)) {
    open.set(false);
  }
});

// Allowed: writing the DOM is what `effect()` is for — no signal write, no
// marker needed.
effect(() => {
  host.toggleAttribute('data-disabled', disabled());
  host.style.setProperty('--for-fixture-flag', '1');
});

// Allowed: the write lives in a nested callback that fires outside the effect's
// reactive run, matching `no-effect-state-propagation`'s scoping.
effect(() => {
  observe(() => {
    out.set(3);
  });
});

function syncMirrored(): void {
  mirrored.set(measured.width);
}

// Expected: 1× forty-cdk/require-sanctioned-effect-marker
// A write one same-file helper call away. Before #1575 this effect looked like a
// side-effect-only bridge, so the marker `core/element-size` carries by
// convention was unenforceable; the report now names the helper.
effect(() => {
  syncMirrored();
});

// Expected: 1× forty-cdk/require-sanctioned-effect-marker
// The class-method flavour, resolved through `this` in the same class body.
class MirrorsInAMethod {
  constructor() {
    effect(() => {
      this.#sync();
    });
  }

  #sync(): void {
    mirrored.set(measured.width);
  }
}

// Allowed: the very same helper-call shape, licensed by a well-formed marker —
// which is the whole point of following the call one level deep.
// @sanctioned-effect(external-source): mirrors an imperative measurement, so no
// read in this effect can depend on the written signal.
effect(() => {
  syncMirrored();
});

/**
 * Fixture for `forty-cdk/require-sanctioned-pull-marker`.
 *
 * A **pull** is a read of a lazy store performed purely so its computation runs
 * while a transient source is observable — the mounted option / item window,
 * which exists only while the consumer's `@if` keeps it rendered. Every pull
 * inside an `effect()` in library source must be licensed by the canonical
 * marker comment placed immediately above the `effect(` call —
 * `// @sanctioned-pull(<store>): <why the source is transient>` — and the effect
 * it sits in must stay read-only, because a pull drags its own tracked set into
 * whatever else shares the effect. See CLAUDE.md > conventions > "The
 * sanctioned-pull marker".
 */

declare function effect(fn: () => void): void;
declare function untracked<T>(fn: () => T): T;
declare interface WritableSignal<T> {
  (): T;
  set(value: T): void;
  update(fn: (value: T) => T): void;
}
declare const labelCache: { prime(): void; windowEntries(): readonly string[] };
declare const activeId: WritableSignal<string | null>;
declare const open: () => boolean;
declare const host: HTMLElement;
declare function runVirtualizedNavigatorBridge(deps: { items: () => unknown }): boolean;
declare const items: () => readonly string[];
declare function observe(cb: () => void): void;
declare const scratch: Map<string, number>;
declare const builder: { update(patch: string): void };

// Expected: 1× forty-cdk/require-sanctioned-pull-marker
// The bare shape #1580 AC3 names: an effect whose entire body is a pull.
effect(() => {
  labelCache.prime();
});

// Expected: 1× forty-cdk/require-sanctioned-pull-marker
// A pull one file away, behind a named core runner. Cross-file resolution is
// the sibling rules' residual gap, so the runner is named in the rule instead.
effect(() => {
  runVirtualizedNavigatorBridge({ items });
});

// Expected: 1× forty-cdk/require-sanctioned-pull-marker (malformedMarker)
// The marker is present but names no store and gives no rationale, so it
// documents nothing and is rejected rather than accepted.
// @sanctioned-pull
effect(() => {
  labelCache.prime();
});

// Expected: 1× forty-cdk/require-sanctioned-pull-marker (pullWithWrite)
// The #1600 shape: the pull tracks the store's own sources, so the
// activedescendant write beside it re-runs on every one of them. No marker
// licenses this — the pull belongs in its own read-only effect.
// @sanctioned-pull(label-cache-window): the option window is transient.
effect(() => {
  labelCache.prime();
  activeId.set(labelCache.windowEntries()[0] ?? null);
});

// Allowed: the write channel is arity-checked (#1606), so a two-argument
// `Map.set(k, v)` on a scratch collection is not read as a signal write —
// `WritableSignal.set(v)` takes one argument, `Map.set` takes two, and the
// commonest false positive of the branch above disappears with no disable.
// @sanctioned-pull(label-cache-window): the option window is transient.
effect(() => {
  labelCache.prime();
  scratch.set(labelCache.windowEntries()[0] ?? '', 1);
});

// Allowed: the residual false positive and its sanctioned resolution. A
// one-argument `.update(…)` on a plain builder is indistinguishable from a
// signal write without type information, so the disable goes on the write line
// alone — where it silences the misread and nothing else — and names the
// receiver.
// @sanctioned-pull(label-cache-window): the option window is transient.
effect(() => {
  labelCache.prime();
  // `builder` is a plain string builder, not a signal.
  // eslint-disable-next-line forty-cdk/require-sanctioned-pull-marker
  builder.update(labelCache.windowEntries()[0] ?? '');
});

// Expected: 1× forty-cdk/require-sanctioned-pull-marker (missingMarker)
// The hatch above costs no ledger entry: the write branch reports without
// returning, so silencing the misread write leaves the marker check live and the
// unmarked pull is still reported on its own line.
effect(() => {
  labelCache.prime();
  // `builder` is a plain string builder, not a signal.
  // eslint-disable-next-line forty-cdk/require-sanctioned-pull-marker
  builder.update('pending');
});

// Allowed: a well-formed marker licenses a read-only pull.
// @sanctioned-pull(label-cache-window): the option window exists only while the
// listbox is open, and the closed-state matchers reading it have no reader then.
effect(() => {
  if (open()) {
    labelCache.prime();
  }
});

// Allowed: the same runner call, licensed.
// @sanctioned-pull(navigator-position-map): the rendered window is transient, so
// a window nothing reads during is lost to the lazy fold.
effect(() => {
  runVirtualizedNavigatorBridge({ items });
});

// Allowed: an effect that writes but never pulls is the sanctioned-effect
// rule's business, not this one.
effect(() => {
  activeId.set(untracked(() => items()[0]) ?? null);
});

// Allowed: a DOM-only effect touching neither a store nor a signal.
effect(() => {
  host.toggleAttribute('data-open', open());
});

// Allowed: the pull lives in a nested callback that fires outside the effect's
// reactive run, matching the sibling rules' scoping.
effect(() => {
  observe(() => {
    labelCache.prime();
  });
});

function primeViaHelper(): void {
  labelCache.prime();
}

// Expected: 1× forty-cdk/require-sanctioned-pull-marker (missingMarkerViaHelper)
// A pull one same-file helper call away — the shape that hid the write from both
// sibling rules until #1575, reported here against the helper by name.
effect(() => {
  primeViaHelper();
});

// Expected: 1× forty-cdk/require-sanctioned-pull-marker (missingMarkerViaHelper)
// The class-method flavour, resolved through `this` in the same class body.
class PrimesInAMethod {
  constructor() {
    effect(() => {
      this.#pull();
    });
  }

  #pull(): void {
    labelCache.prime();
  }
}

// Allowed: the very same helper-call shape, licensed by a well-formed marker.
// @sanctioned-pull(label-cache-window): the option window is transient, so the
// fold only ever sees a window something reads it during.
effect(() => {
  primeViaHelper();
});

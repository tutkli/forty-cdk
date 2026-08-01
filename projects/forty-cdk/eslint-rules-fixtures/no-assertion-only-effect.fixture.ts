/**
 * Fixture for `forty-cdk/no-assertion-only-effect`.
 *
 * An `effect()` whose whole body is a `throw` or an `assert*` call is `effect()`
 * used as a **validation channel**, and it does not reach the consumer: Angular
 * routes the throw to the application `ErrorHandler`, so the stack names the
 * scheduler rather than the binding at fault, the effect re-throws on every
 * re-run, and an app with its own `ErrorHandler` swallows it. The invariant
 * belongs at its point of use — at every one of them, and with the gain stated
 * accurately: attributable and one-shot everywhere, catchable by the consumer
 * only where the point of use is a render-time derivation rather than an event
 * handler. See CLAUDE.md > conventions > "Assertions are dev-gated and live at
 * the point of use".
 */

declare function effect(fn: () => void): void;
declare function isDevMode(): boolean;
declare function assertColumnName(name: string, piece: string): void;
declare function throwUnsupportedCombination(primitive: string): void;
declare function publishWidth(column: string, width: number): void;
declare interface Signal<T> {
  (): T;
}
declare const selectionFollowsFocus: Signal<boolean>;
declare const virtualized: Signal<boolean>;
declare const columnName: Signal<string>;
declare const width: Signal<number>;
declare const host: HTMLElement;

// Expected: 1× forty-cdk/no-assertion-only-effect
// The #1583 shape: two config inputs watched purely so an unsupported
// combination can throw. The consumer never sees it, and it re-throws forever.
effect(() => {
  if (selectionFollowsFocus() && virtualized()) {
    throw new Error('[forty-cdk/select] `selectionFollowsFocus` is not supported …');
  }
});

// Expected: 1× forty-cdk/no-assertion-only-effect
// The same fault behind an `assert*` helper rather than an inline `throw` —
// dev-gating it changes nothing about where the error surfaces.
effect(() => {
  assertColumnName(columnName(), 'ForColumnDef');
});

// Expected: 1× forty-cdk/no-assertion-only-effect
// A `const` that only gathers the value being asserted is scaffolding, not
// work: the effect still does nothing but validate.
effect(() => {
  const name = columnName();
  if (name !== '') {
    assertColumnName(name, 'ForColumnDef');
  }
});

// Expected: 1× forty-cdk/no-assertion-only-effect
// A dev gate around the whole body does not make it a side-effect effect — the
// gate is orthogonal to *where* the throw surfaces.
effect(() => {
  if (!isDevMode()) {
    return;
  }
  throwUnsupportedCombination('tree');
});

// Expected: 1× forty-cdk/no-assertion-only-effect
// The concise-body flavour, which has no block to inspect.
effect(() => assertColumnName(columnName(), 'ForColumnDef'));

// Allowed: an assertion *beside* real work. `[forTableColumnResizer]` asserts
// its column name inside the effect that publishes the width var — which is the
// point of use, so the rule leaves the effect alone.
effect(() => {
  const column = columnName();
  assertColumnName(column, 'ForTableColumnResizer');
  publishWidth(column, width());
});

// Allowed: a DOM-only effect, the thing `effect()` is for.
effect(() => {
  host.toggleAttribute('data-virtualized', virtualized());
});

// Allowed: the sanctioned exemption, expressed as a condition rather than a
// path list — an `effect()` inside a function whose own name starts with
// `assert` is a reusable assertion *scheduler*. `assertInputBound` is the one
// instance: it asserts that a binding was ever written, which is observable
// only after the update pass, so there is no point of use to move to.
export function assertBoundLikeCore(value: Signal<string>): void {
  if (!isDevMode()) {
    return;
  }
  effect(() => {
    if (value() === '') {
      throw new Error('[forty-cdk/table] [forColumnDef] has no binding.');
    }
  });
}

// Expected: 1× forty-cdk/no-assertion-only-effect
// The exemption is the enclosing function's *name*, so a helper that merely
// wraps the anti-pattern under some other name is still reported.
export function watchColumnName(value: Signal<string>): void {
  effect(() => {
    assertColumnName(value(), 'ForColumnDef');
  });
}

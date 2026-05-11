/**
 * Fixture for `forty-cdk/no-directive-internal-signal-read`.
 *
 * Reading a directive's internal signal from a spec
 * (`fixture.componentRef.injector.get(For<X>).somethingSignal()`) is
 * forbidden — the contract is the rendered DOM, not the directive's
 * private signal shape. Imperative method calls (`directive.close()` on a
 * stored variable) remain allowed; this rule targets the inline chained
 * pattern. See CLAUDE.md > Testing notes > Test isolation —
 * non-negotiables > rule 6.
 */

// Synthetic directive token whose name starts with `For` — matches the
// audit's pattern.
declare class ForFoo {
  isOpen(): boolean; // a signal accessor (zero-arg call returns the value)
  close(): void; // an imperative method — NOT flagged when called on a stored variable.
}

declare const fixture: {
  componentRef: { injector: { get<T>(token: new () => T): T } };
};

export function bad(): boolean {
  // Expected: 1× forty-cdk/no-directive-internal-signal-read
  // The chained pattern (.get(ForFoo).isOpen()) is the forbidden one — the
  // rule cannot statically distinguish a signal accessor from a method call,
  // so it forbids the inline chain entirely. Use the DOM (ARIA, data-state)
  // for assertions instead.
  return fixture.componentRef.injector.get(ForFoo).isOpen();
}

// Allowed: stored variable + imperative method call. The rule does NOT fire
// here because there's no inline `.get(For<X>).method()` chain — the audit
// explicitly preserves this pattern (H6 finding).
export function allowed(): void {
  const directive = fixture.componentRef.injector.get(ForFoo);
  directive.close();
}

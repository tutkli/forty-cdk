import { isDevMode } from '@angular/core';
import { fortyError } from '../errors/errors';

/**
 * Identity of the piece asserting its root context, plus the probe that tells
 * the root apart from any other value the token's public type admits.
 */
export interface RootContextAssertion {
  /** Entry-point name for the `[forty-cdk/<entryPoint>]` error prefix, e.g. `'accordion'`. */
  readonly entryPoint: string;
  /** Name of the token the piece resolved, e.g. `'FOR_ACCORDION_CONTEXT'`. */
  readonly token: string;
  /** Selector of the root the token must be aliased to, e.g. `'[forAccordion]'`. */
  readonly root: string;
  /** The piece the error names, e.g. `'ForAccordionTrigger'`. */
  readonly piece: string;
  /**
   * Reads one member the resolved context only has when it is the root: a
   * `register*` method the internal interface adds, or — where the internal
   * interface adds no method of its own and only widens a member, as in Select
   * — a nested member the public facade narrows away.
   *
   * The probe passes when it resolves to a function. A probe that *throws*
   * counts as a miss, so a value missing the whole nesting level fails with the
   * error below instead of with the raw `TypeError` the read produced.
   */
  readonly probe: () => unknown;
}

/** The probed member, or `undefined` when reading it threw. */
function readProbe(probe: () => unknown): unknown {
  try {
    return probe();
  } catch {
    return undefined;
  }
}

/**
 * Dev-mode guard that the value behind a split root's context token really is
 * the root. Call it from the primitive's `inject<Primitive>Context` resolver,
 * immediately after the orphan branch.
 *
 * A split root provides **one** token, publicly typed as
 * the consumer read surface, which the resolver reads at the unexported
 * internal interface's type so the pieces reach the registration protocol.
 * Nothing checks that cast: a consumer who provides the token with any other
 * value satisfying the public type typechecks and resolves, then fails inside
 * the first piece to reach the protocol — with no `[forty-cdk/<entry>]` prefix
 * and a stack pointing at a library file for a mistake made in consumer
 * providers.
 *
 * There is no compile-time channel for this, which is why the check is a
 * runtime one: the roots declare `implements For<Primitive>Context` only, and a
 * `satisfies <Primitive>Context` cannot be added because the protocol members
 * are TS-`private` — keeping them out of the emitted `.d.ts` and coupling the
 * class to the internal interface are mutually exclusive.
 *
 * The gate lives inside the helper, so it travels with the check and no call
 * site can forget it. The resolver runs from a piece's constructor, so the
 * throw aborts the render and a consumer's `try` sees it — unlike an assertion
 * routed through an `effect()`.
 */
export function assertRootContext(assertion: RootContextAssertion): void {
  if (!isDevMode()) {
    return;
  }
  if (typeof readProbe(assertion.probe) === 'function') {
    return;
  }
  throw fortyError({
    code: 'FORCDK-CORE-007',
    scope: assertion.entryPoint,
    message: `${assertion.piece} resolved a ${assertion.token} provider that is not the ${assertion.root} root.`,
    cause:
      'The token is publicly typed as the consumer read surface, but the pieces read it at the ' +
      "root's internal registration protocol, which only the root implements.",
    fix:
      `Alias the token to the root itself: { provide: ${assertion.token}, useExisting: MyRoot }, ` +
      `where MyRoot is ${assertion.root} or a subclass of it.`,
  });
}

import { effect, isDevMode, type Signal } from '@angular/core';
import { fortyError } from '../errors/errors';

const UNSET: unique symbol = Symbol('forty-cdk:unset-input');

/**
 * The type of the {@link unsetInput} sentinel. A signal typed `T | Unset`
 * belongs to a piece whose binding may not be written yet; narrow it with
 * {@link isUnset} before the value is used as a `T`.
 */
export type Unset = typeof UNSET;

/**
 * The sentinel a piece seeds an otherwise-required input with, typed
 * `T | Unset` so every read site has to narrow with {@link isUnset} before it
 * uses the value.
 *
 * A piece registers with its parent during the content view's *creation* pass
 * and has its binding written in that view's *update* pass, so any parent
 * lookup running in between reads a value the consumer has not supplied yet.
 * `input.required` answers that read by throwing, which forced every such
 * lookup through a `try` / `catch` keyed on an Angular error code; seeding a
 * plain `input()` with this sentinel answers it with a value instead, and the
 * lookup becomes an identity comparison ({@link isUnset}).
 *
 * The sentinel is a module-private `symbol`, so it can never collide with a
 * consumer value — which `undefined` can, on the roots generic over an
 * unconstrained `T`. Never let the sentinel reach a consumer callback
 * (`compareWith`, `itemToLabel`, …): guard with {@link isUnset} before the
 * value leaves the read site.
 *
 * The read is still tracked — Angular's input signal registers itself as a
 * producer before it resolves a value — so the binding's write marks the
 * reader dirty and the piece folds in on the run that follows.
 *
 * @example
 * ```ts
 * readonly value: InputSignal<T | Unset> = input(unsetInput<T>());
 * ```
 */
export function unsetInput<T>(): T | Unset {
  return UNSET;
}

/**
 * Whether `value` is the {@link unsetInput} sentinel — i.e. the piece's binding
 * has not been written yet. Compare before the value leaves the read site; a
 * `false` result means the value is a genuine `T`, including `null`,
 * `undefined`, or any other value a consumer's domain may contain.
 */
export function isUnset(value: unknown): value is Unset {
  return value === UNSET;
}

/** A handle paired with the value read from it, known not to be {@link Unset}. */
export interface BoundEntry<H, T> {
  readonly handle: H;
  readonly value: T;
}

/**
 * The handles whose binding is written, each paired with the value that was
 * read to decide it. A fold downstream of the filter reads `entry.value` as a
 * `T` instead of calling the signal again, which the compiler cannot narrow.
 */
export function boundEntries<H, T>(
  handles: readonly H[],
  valueOf: (handle: H) => T | Unset,
): BoundEntry<H, T>[] {
  const entries: BoundEntry<H, T>[] = [];
  for (const handle of handles) {
    const value = valueOf(handle);
    if (!isUnset(value)) {
      entries.push({ handle, value });
    }
  }
  return entries;
}

/**
 * Dev-mode guard that a piece seeded with {@link unsetInput} actually had its
 * binding written. Call it from the piece's constructor.
 *
 * Seeding the sentinel makes the input optional to Angular's template type
 * checker, so a consumer who omits the binding no longer gets a compile-time
 * error — and, because every parent lookup now skips an unset piece instead of
 * throwing, the piece would otherwise stay silently invisible to its parent.
 * This restores the loud failure, in the library's own vocabulary and naming
 * both the piece and the input.
 *
 * The check runs in an `effect`, which is the first point at which the update
 * pass has written the binding, and only in dev mode — a production build
 * creates no reactive node per piece.
 *
 * @param value The piece's input signal.
 * @param primitive Entry-point name for the error prefix, e.g. `'listbox'`.
 * @param piece Selector of the piece the error names, e.g. `'[forListboxOption]'`.
 * @param inputName Name of the unbound input, e.g. `'value'`.
 */
export function assertInputBound<T>(
  value: Signal<T>,
  primitive: string,
  piece: string,
  inputName: string,
): void {
  if (!isDevMode()) {
    return;
  }
  effect(() => {
    if (isUnset(value())) {
      throw fortyError({
        code: 'FORCDK-CORE-010',
        scope: primitive,
        message: `${piece} has no [${inputName}] binding.`,
        cause:
          'The input is declared optional so the parent can skip a piece whose binding is not ' +
          'written yet, which means a permanently unbound piece never joins its parent instead ' +
          'of failing to compile.',
        fix: `Bind [${inputName}] on every ${piece}.`,
      });
    }
  });
}

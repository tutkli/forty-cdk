import { computed, type Signal, signal } from '@angular/core';
import { fortyWarn } from '../errors/errors';

/**
 * Identifies a {@link SingleSlot} in its dev-mode duplicate-registration
 * warning. All three fields are literals from the adopting primitive, never
 * runtime values.
 */
export interface SingleSlotConfig {
  /** Entry-point name used in the `[forty-cdk/<primitive>]` warning prefix (e.g. `'search'`). */
  readonly primitive: string;
  /** Selector of the directive that owns the slot (e.g. `'[forSearchGroup]'`). */
  readonly owner: string;
  /** Selector of the directive that registers into the slot (e.g. `'[forSearch]'`). */
  readonly claimant: string;
}

/**
 * A registry for a coordination seam that supports exactly one occupant: a
 * root or group directive that must reach a single sibling piece which cannot
 * be its DOM descendant (a void `<input>` next to its buttons, the native file
 * input next to its drop zone).
 *
 * Registrations are **stacked** rather than overwritten, mirroring
 * `ForField`'s counted label / description / error slots: the newest
 * registration is the coordinated one, a duplicate emits a dev-mode warning,
 * and unregistering the newest restores the previous survivor instead of
 * emptying the slot while a piece is still mounted.
 *
 * The helper owns no teardown of its own — pair `register` / `unregister` with
 * the core `registerHandle` helper at the claimant's construction so the
 * claimant's own `DestroyRef` drives unregistration.
 *
 * @typeParam T The occupant type — a context interface, a handle, or a raw
 *   element.
 */
export interface SingleSlot<T> {
  /**
   * The coordinated occupant: the most recently registered one, or `null`
   * while the slot is empty.
   */
  readonly value: Signal<T | null>;
  /**
   * Register an occupant, making it the coordinated one. Warns in dev mode
   * when it is not the first — a second occupant means the owner's single
   * coordination surface is ambiguous.
   */
  register(occupant: T): void;
  /**
   * Remove a previously registered occupant. A no-op when it never registered,
   * and — because registrations are stacked — a late teardown of a stale
   * occupant never clears a newer one.
   */
  unregister(occupant: T): void;
}

/**
 * Creates a {@link SingleSlot}. Pure signal state: safe in a field
 * initializer, safe under SSR, and needs no injection context.
 */
export function createSingleSlot<T>(config: SingleSlotConfig): SingleSlot<T> {
  const occupants = signal<readonly T[]>([]);
  const value = computed<T | null>(() => occupants().at(-1) ?? null);

  return {
    value,
    register(occupant: T): void {
      const next = [...occupants(), occupant];
      occupants.set(next);
      if (next.length > 1) {
        fortyWarn({
          code: 'FORCDK-CORE-005',
          scope: config.primitive,
          message: `A ${config.owner} coordinates a single ${config.claimant}, but ${next.length} are registered.`,
          cause: 'Only the most recently registered one is coordinated; the rest are inert.',
          fix: `Keep one ${config.claimant} per ${config.owner}.`,
        });
      }
    },
    unregister(occupant: T): void {
      const current = occupants();
      const index = current.lastIndexOf(occupant);
      if (index < 0) {
        return;
      }
      occupants.set([...current.slice(0, index), ...current.slice(index + 1)]);
    },
  };
}

import { inject, InjectionToken, type Signal } from '@angular/core';

import { orphanContextError } from 'forty-cdk/core';

/**
 * The coordination surface a `[forSearch]` exposes to its siblings. The
 * companion `[forSearchClear]` button reads it (through the group) to drive its
 * self-hide logic, reflect its disabled state, and clear / refocus the field on
 * activation.
 */
export interface ForSearchContext {
  /** Current text value; `''` while the field is empty. */
  readonly value: Signal<string>;
  /**
   * The field's effective disabled — its own `disabled` input OR'd with a
   * surrounding disabled `[forFieldset]`. The clear button reads this so a
   * disabled fieldset also disables clearing.
   */
  readonly effectiveDisabled: Signal<boolean>;
  /** Whether the field is read-only. */
  readonly readonly: Signal<boolean>;
  /** Resets the value to `''`. No-op while disabled or read-only. */
  clear(): void;
  /** Moves focus back to the native input element. */
  focusInput(): void;
}

/**
 * The single coordination surface `[forSearchGroup]` exposes. A `[forSearch]`
 * nested under the group registers itself, and the companion `[forSearchClear]`
 * button reads the registered field through `field()` to clear / refocus it and
 * reflect its empty / disabled state. Coordination flows through this registry —
 * not the DOM — because the focusable searchbox lives on a void `<input>` that
 * can't contain the sibling button as a descendant.
 */
export interface ForSearchGroupContext {
  /** The registered search field, or `null` while none is mounted. */
  readonly field: Signal<ForSearchContext | null>;
  /** Register the search field the group coordinates. */
  register(field: ForSearchContext): void;
  /** Remove a previously registered search field. */
  unregister(field: ForSearchContext): void;
}

/**
 * Injection token for the `[forSearchGroup]` coordination surface. The search
 * field joins it via `register`; the clear button reads the registered field
 * through `field()`.
 */
export const FOR_SEARCH_GROUP = new InjectionToken<ForSearchGroupContext>('FOR_SEARCH_GROUP');

/**
 * Resolve the surrounding `[forSearchGroup]`, or throw a descriptive error. The
 * clear button is only meaningful inside a `[forSearchGroup]` that wraps a
 * `[forSearch]`.
 */
export function injectSearchGroup(piece: string): ForSearchGroupContext {
  const group = inject(FOR_SEARCH_GROUP, { optional: true });
  if (!group) {
    throw orphanContextError({
      code: 'FORCDK-SEARCH-001',
      piece,
      root: '[forSearchGroup] that wraps a [forSearch]',
      token: 'FOR_SEARCH_GROUP',
    });
  }
  return group;
}

import { inject, InjectionToken, type Signal } from '@angular/core';

import {
  type CollectionHandle,
  type ListNavigationAction,
  type WritingDirection,
  type RovingTabindex,
} from 'forty-cdk/core';

/**
 * Per-item handle stored in the group's `Collection`. The directive
 * registers itself on construction so the group can compute selection,
 * roving tabindex, and arrow-key navigation in DOM order.
 */
export interface ForToggleGroupItemHandle extends CollectionHandle {
  readonly value: Signal<string>;
  readonly disabled: Signal<boolean>;
}

/**
 * Coordination contract owned by `ForToggleGroup`. Items read selection
 * and navigation policy from here and call back through `toggle` and
 * `navigate` to drive state changes.
 */
export interface ForToggleGroupContext {
  /**
   * The current selection, as a read-only signal. Mutate it through `toggle`
   * or the root's `[(value)]` binding — a direct write would bypass the group's
   * disabled guard and single/multiple mode rules.
   */
  readonly value: Signal<readonly string[]>;
  readonly multiple: Signal<boolean>;
  /**
   * The group's effective disabled — its own `disabled` input OR'd with a
   * surrounding disabled `[forFieldset]`. Each item ORs this into its own
   * `effectiveDisabled`, so a disabled group (or fieldset) disables every item.
   */
  readonly effectiveDisabled: Signal<boolean>;
  readonly orientation: Signal<'horizontal' | 'vertical'>;
  readonly dir: Signal<WritingDirection>;
  readonly loop: Signal<boolean>;

  /**
   * Roving-tabindex tracker. Items call `setActive` on `(focus)` and prefer
   * `active()` in their tabindex computed so the tab stop follows the last
   * focused item (APG re-entry), matching Tabs / Tree.
   */
  readonly roving: RovingTabindex;

  isSelected(value: string): boolean;
  toggle(value: string): void;

  navigate(currentItem: HTMLElement, action: ListNavigationAction): void;
  isFirstFocusableItem(el: HTMLElement): boolean;

  registerItem(handle: ForToggleGroupItemHandle): void;
  unregisterItem(handle: ForToggleGroupItemHandle): void;
}

export const FOR_TOGGLE_GROUP_CONTEXT = new InjectionToken<ForToggleGroupContext>(
  'FOR_TOGGLE_GROUP_CONTEXT',
);

export function injectToggleGroupContext(piece: string): ForToggleGroupContext {
  const ctx = inject(FOR_TOGGLE_GROUP_CONTEXT, { optional: true });
  if (!ctx) {
    throw new Error(
      `[forty-cdk/toggle-group] ${piece} must be used inside a [forToggleGroup] element.`,
    );
  }
  return ctx;
}

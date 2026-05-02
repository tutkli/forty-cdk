import { booleanAttribute, computed, Directive, input } from '@angular/core';

import {
  FOR_NAVIGATION_MENU_ITEM_CONTEXT,
  type ForNavigationMenuItemContext,
  injectNavigationMenuContext,
} from './navigation-menu-context';

/**
 * Wrapper around one trigger + its content. Owns the item's `value` (the
 * id used to coordinate which item is open) and its disabled state, then
 * exposes them downstream so the trigger and content can share a single
 * source of truth.
 */
@Directive({
  selector: '[forNavigationMenuItem]',
  exportAs: 'forNavigationMenuItem',
  host: {
    '[attr.data-state]': 'state()',
    '[attr.data-disabled]': 'disabled() ? "" : null',
  },
  providers: [
    {
      provide: FOR_NAVIGATION_MENU_ITEM_CONTEXT,
      useExisting: ForNavigationMenuItem,
    },
  ],
})
export class ForNavigationMenuItem implements ForNavigationMenuItemContext {
  readonly #ctx = injectNavigationMenuContext('ForNavigationMenuItem');

  /** Identifier matched against the menu's `value`. Required. */
  readonly value = input.required<string>();

  /** Per-item disabled (in addition to the menu-level `disabled`). */
  readonly disabled = input(false, { transform: booleanAttribute });

  protected readonly state = computed(() =>
    this.#ctx.isOpen(this.value()) ? 'open' : 'closed',
  );
}

import { booleanAttribute, computed, Directive, input } from '@angular/core';

import { assertInputBound, unsetInput } from 'forty-cdk/core';
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

  /**
   * Identifier matched against the menu's `value`, shared by this item's trigger and content.
   * Mandatory — an unbound item throws in dev mode.
   *
   * That seeding is what lets both pieces register **synchronously**: the
   * pairing then resolves during the first change-detection pass, including a
   * real server render, where `afterNextRender` never fires and a deferred
   * registration would leave the pre-hydration DOM without its
   * `aria-controls` / `aria-labelledby` linkage.
   */
  readonly value = input(unsetInput<string>());

  /**
   * Per-item disabled. Stands on its own — the root `[forNavigationMenu]`'s
   * `disabled` is merged with this value by the item's trigger
   * (`ForNavigationMenuTrigger.effectiveDisabled`), which is what reflects the
   * composed state and gates activation. This host's `data-disabled` reflects
   * the per-item value only.
   */
  readonly disabled = input(false, { transform: booleanAttribute });

  protected readonly state = computed(() => (this.#ctx.isOpen(this.value()) ? 'open' : 'closed'));

  constructor() {
    assertInputBound(this.value, 'navigation-menu', '[forNavigationMenuItem]', 'value');
  }
}

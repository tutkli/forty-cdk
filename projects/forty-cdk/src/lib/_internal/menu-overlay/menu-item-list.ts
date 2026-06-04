import { type Signal } from '@angular/core';

import { Collection, type CollectionHandle } from '../collection/collection';
import {
  type ListNavigationAction,
  moveIndex,
} from '../keyboard-navigation/keyboard-navigation';
import { injectTypeahead, type Typeahead } from '../typeahead/typeahead';

/**
 * Item handle the list's `Collection` registers. Structurally compatible
 * with primitives' `ForMenuItemHandle` — typing is generic so the unit
 * stays orthogonal to `menu/menu-context.ts` (no cycle into a primitive).
 */
export interface MenuItemHandle extends CollectionHandle {
  readonly disabled: Signal<boolean>;
  readonly textValue?: Signal<string>;
}

/**
 * The keyboard-focus mechanics shared by every menu surface that holds a
 * vertical list of `menuitem`s: the item `Collection`, a typeahead buffer,
 * arrow / Home / End navigation, prefix-match typeahead, and the
 * first/last-enabled focus moves used on mount.
 *
 * Both `MenuOverlay` (for `[forDropdownMenu]` / `[forContextMenu]` /
 * `[forMenuSub]`) and `[forMenubar]`'s multiplexed menu context delegate to
 * this unit, so the verbatim navigate / typeahead / focus copies that used
 * to live in each don't drift.
 *
 * `loop` is read through an accessor so the owner can forward its own
 * reactive `loop` input without the unit depending on a specific source.
 *
 * Construct via `createMenuItemList` from a directive / helper field
 * initializer so the `injectTypeahead()` `DestroyRef` hookup resolves
 * through the surrounding injector.
 */
export class MenuItemList<H extends MenuItemHandle = MenuItemHandle> {
  readonly #items = new Collection<H>();
  readonly #typeahead: Typeahead;
  readonly #loop: () => boolean;

  constructor(loop: () => boolean, typeahead: Typeahead) {
    this.#loop = loop;
    this.#typeahead = typeahead;
  }

  registerItem(handle: H): void {
    this.#items.register(handle);
  }

  unregisterItem(handle: H): void {
    this.#items.unregister(handle);
  }

  /** Items registered with the menu, in DOM order. Exposed for tests / sub-menu wiring. */
  items(): readonly H[] {
    return this.#items.items();
  }

  navigate(currentItem: HTMLElement, action: ListNavigationAction): void {
    const items = this.#items.items();
    if (items.length === 0) {
      return;
    }
    const currentIndex = items.findIndex((i) => i.host === currentItem);
    const next = moveIndex(currentIndex < 0 ? 0 : currentIndex, items.length, action, {
      loop: this.#loop(),
      isDisabled: (i) => items[i]!.disabled(),
    });
    if (next === null) {
      return;
    }
    items[next]?.host.focus();
  }

  handleTypeahead(event: KeyboardEvent): void {
    if (!this.#typeahead.handle(event)) {
      return;
    }
    const buffer = this.#typeahead.buffer().toLowerCase();
    if (!buffer) {
      return;
    }
    const items = this.#items.items();
    const match = items.find((i) => {
      if (i.disabled()) {
        return false;
      }
      const override = i.textValue?.() ?? '';
      const source = override !== '' ? override : (i.host.textContent ?? '');
      return source.trim().toLowerCase().startsWith(buffer);
    });
    match?.host.focus();
  }

  focusFirstEnabledItem(): boolean {
    const target = this.#items.items().find((i) => !i.disabled());
    if (!target) {
      return false;
    }
    target.host.focus();
    return true;
  }

  focusLastEnabledItem(): boolean {
    const items = this.#items.items();
    for (let i = items.length - 1; i >= 0; i--) {
      const item = items[i];
      if (item && !item.disabled()) {
        item.host.focus();
        return true;
      }
    }
    return false;
  }
}

/**
 * Creates a `MenuItemList` from a directive / helper field initializer.
 * `loop` is the owner's reactive loop accessor; the typeahead instance is
 * created with `injectTypeahead()` so its debounce timer is torn down with
 * the surrounding `DestroyRef`.
 */
export function createMenuItemList<H extends MenuItemHandle = MenuItemHandle>(
  loop: () => boolean,
): MenuItemList<H> {
  return new MenuItemList<H>(loop, injectTypeahead());
}

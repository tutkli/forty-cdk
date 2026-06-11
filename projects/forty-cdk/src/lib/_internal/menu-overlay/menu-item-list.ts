import { type Signal } from '@angular/core';

import { Collection, type CollectionHandle } from '../collection/collection';
import { type ListNavigationAction, moveIndex } from '../keyboard-navigation/keyboard-navigation';
import { injectTypeahead, type Typeahead } from '../typeahead/typeahead';

/**
 * Item handle the list's `Collection` registers. Structurally compatible
 * with primitives' `ForMenuItemHandle` — typing is generic so the unit
 * stays orthogonal to `menu/menu-context.ts` (no cycle into a primitive).
 */
export interface MenuItemHandle extends CollectionHandle {
  readonly disabled: Signal<boolean>;
  readonly textValue?: Signal<string>;
  /**
   * Tells the item that the next focus it receives is a programmatic move
   * that must not reflect `data-highlighted` (the initial focus of a
   * pointer-driven open). One-shot: the item consumes the suppression on its
   * next `focus` event. Optional — items that don't reflect a highlight
   * (e.g. `[forMenuSubTrigger]`) simply omit it.
   */
  suppressHighlightOnNextFocus?(): void;
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
    if (items.length === 0) {
      return;
    }

    const cycle = this.#typeahead.isRepeatedChar();
    const query = cycle ? buffer[0]! : buffer;
    const currentIndex = items.findIndex((i) => i.host === event.target);
    // Single-character typeahead cycles: each (re-)press of one key steps to the
    // next same-initial item after the current focus and wraps around (APG menu
    // typeahead). A distinct multi-character prefix re-anchors on the current
    // focus (inclusive) so a growing prefix keeps the current item when it still
    // matches; both fall back to the top when nothing is focused.
    const anchor = currentIndex >= 0 ? currentIndex : -1;
    const start = cycle ? anchor + 1 : Math.max(anchor, 0);

    for (let offset = 0; offset < items.length; offset++) {
      const item = items[(start + offset) % items.length]!;
      if (item.disabled()) {
        continue;
      }
      const override = item.textValue?.() ?? '';
      const source = override !== '' ? override : (item.host.textContent ?? '');
      if (source.trim().toLowerCase().startsWith(query)) {
        item.host.focus();
        return;
      }
    }
  }

  /**
   * Focuses the first enabled item. Pass `highlight: false` when the move is
   * the programmatic initial focus of a pointer-driven open, so the item
   * receives DOM focus without reflecting `data-highlighted`.
   */
  focusFirstEnabledItem(highlight = true): boolean {
    const target = this.#items.items().find((i) => !i.disabled());
    if (!target) {
      return false;
    }
    this.#focusItem(target, highlight);
    return true;
  }

  /**
   * Focuses the last enabled item. Pass `highlight: false` when the move is
   * the programmatic initial focus of a pointer-driven open, so the item
   * receives DOM focus without reflecting `data-highlighted`.
   */
  focusLastEnabledItem(highlight = true): boolean {
    const items = this.#items.items();
    for (let i = items.length - 1; i >= 0; i--) {
      const item = items[i];
      if (item && !item.disabled()) {
        this.#focusItem(item, highlight);
        return true;
      }
    }
    return false;
  }

  #focusItem(item: H, highlight: boolean): void {
    if (!highlight) {
      item.suppressHighlightOnNextFocus?.();
    }
    item.host.focus();
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

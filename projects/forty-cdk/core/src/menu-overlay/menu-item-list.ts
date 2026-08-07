import { type Signal } from '@angular/core';

import { Collection, type CollectionHandle } from '../collection/collection';
import { nextEnabledHandle } from '../collection/enabled-handle-navigation';
import { type ListNavigationAction } from '../keyboard-navigation/keyboard-navigation';
import { injectTypeahead, type Typeahead } from '../typeahead/typeahead';

/**
 * Item handle the list's `Collection` registers. Structurally compatible
 * with primitives' `ForMenuItemHandle` — typing is generic so the unit
 * stays orthogonal to `./menu-context` (no cycle into a primitive).
 *
 * Stays exported from `core/src/public-api.ts` — internal tier, not blessed —
 * because it is the default type argument of `MenuOverlay`, which the emitted
 * `.d.ts` names as `MenuOverlay<MenuItemHandle>` for the `protected readonly
 * _overlay` field on `[forDropdownMenu]` / `[forContextMenu]` / `[forMenu]`.
 */
export interface MenuItemHandle extends CollectionHandle {
  /**
   * Narrowed from {@link CollectionHandle}'s `Node`: the list focuses its items
   * and scrolls them into view.
   */
  readonly host: HTMLElement;
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
  /**
   * Drops the item's `data-highlighted` without moving DOM focus. Called when
   * the pointer leaves the menu surface so the hovered item stops reading as
   * the active candidate while keyboard navigation stays anchored on it.
   * Optional — items that don't reflect a highlight omit it.
   */
  clearHighlight?(): void;
}

/**
 * The keyboard-focus mechanics shared by every menu surface that holds a
 * vertical list of `menuitem`s: the item `Collection`, a typeahead buffer,
 * arrow / Home / End navigation, prefix-match typeahead, and the
 * first/last-enabled focus moves used on mount.
 *
 * Both `MenuOverlay` (for `[forDropdownMenu]` / `[forContextMenu]` /
 * `[forMenuSub]`) and `[forMenubar]`'s multiplexed menu context delegate their
 * navigate / typeahead / focus behaviour to this unit.
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

  /**
   * Moves focus to the next enabled item for an Arrow / Home / End action,
   * honouring the owner's `loop`. The focus move passes `preventScroll` and
   * then scrolls the target into view with `block: 'nearest'`, so a menu with
   * its own overflow scrolls minimally while the page underneath the portaled
   * surface never jumps.
   */
  navigate(currentItem: HTMLElement, action: ListNavigationAction): void {
    const target = nextEnabledHandle(this.#items.items(), currentItem, action, {
      loop: this.#loop(),
    });
    if (!target) {
      return;
    }
    focusMenuItemHost(target.host);
  }

  /**
   * Feeds `event` to the typeahead buffer and focuses the first matching item.
   * Returns `true` when the key was consumed as a typeahead character (a
   * printable char, or Space while the buffer is already non-empty), `false`
   * otherwise. Items applied on a native `<button>` use the return value to
   * `preventDefault()` a mid-typeahead Space so it extends the buffer instead
   * of triggering the button's activation. The focus move passes
   * `preventScroll` and reveals the match with `scrollIntoView({ block:
   * 'nearest' })`.
   */
  handleTypeahead(event: KeyboardEvent): boolean {
    if (!this.#typeahead.handle(event)) {
      return false;
    }
    const buffer = this.#typeahead.buffer().toLowerCase();
    if (!buffer) {
      return true;
    }
    const items = this.#items.items();
    if (items.length === 0) {
      return true;
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
        focusMenuItemHost(item.host);
        return true;
      }
    }
    return true;
  }

  /**
   * Focuses the first enabled item. Pass `highlight: false` when the move is
   * the programmatic initial focus of a pointer-driven open, so the item
   * receives DOM focus without reflecting `data-highlighted`. The move passes
   * `preventScroll`: the menu surface is portaled and `position: fixed`, and
   * floating-ui has not resolved its placement yet when the initial focus
   * runs, so letting the browser scroll for it would move the page (and the
   * anchor) under a pointer-driven open.
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
   * receives DOM focus without reflecting `data-highlighted`. Like
   * {@link focusFirstEnabledItem} the move passes `preventScroll` and reveals
   * the item with `scrollIntoView({ block: 'nearest' })`, so a scrollable menu
   * still scrolls its own overflow to the last item.
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

  /**
   * Focuses the first or last enabled item per `target`. The single owner of the
   * `'first' | 'last'` → focus-call mapping every menu surface resolves its
   * initial focus through — the mount path, the already-open re-focus branch of
   * a `MenuOverlay`, and `[forMenubar]`'s equivalent — so the fallback ordering
   * and any future widening of the target union live in one place instead of one
   * copy per surface. `highlight` behaves exactly as on
   * {@link focusFirstEnabledItem} / {@link focusLastEnabledItem}.
   */
  focusInitialEnabledItem(target: 'first' | 'last', highlight = true): boolean {
    return target === 'last'
      ? this.focusLastEnabledItem(highlight)
      : this.focusFirstEnabledItem(highlight);
  }

  #focusItem(item: H, highlight: boolean): void {
    if (!highlight) {
      item.suppressHighlightOnNextFocus?.();
    }
    focusMenuItemHost(item.host);
  }

  /**
   * Drops `data-highlighted` from every registered item without touching DOM
   * focus. Used when the pointer leaves the menu surface so no item keeps
   * reading as the active candidate.
   */
  clearHighlights(): void {
    for (const item of this.#items.items()) {
      item.clearHighlight?.();
    }
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

function focusMenuItemHost(host: HTMLElement): void {
  host.focus({ preventScroll: true });
  host.scrollIntoView?.({ block: 'nearest' });
}

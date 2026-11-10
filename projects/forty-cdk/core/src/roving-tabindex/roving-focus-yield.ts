import { computed, type Signal, signal, untracked } from '@angular/core';

import type { HostRovingItemHandle } from './host-roving-context';

/**
 * Whether a disabled item of a roving group holds DOM focus, the state in which
 * every item of the group yields its tab stop so `Tab` and `Shift+Tab` leave
 * the group from that item. Fed through {@link noteFocus}.
 *
 * Internal core tier — exported from `forty-cdk/core` for the library's own
 * entry points, with no semver guarantee.
 */
export class RovingFocusYield {
  /** The element last reported to {@link noteFocus}; a plain field so a focus move notifies nothing. */
  #focused: Element | null = null;

  /**
   * Set by the first {@link noteFocus} naming an element. Until then
   * {@link yields} does not track the items, so a group focus never entered
   * never reads its item list.
   */
  #tracksItems = false;

  /** Bumped by a {@link noteFocus} that changes {@link yields}, the only way a focus move reaches it. */
  readonly #epoch = signal(0);

  readonly #items: () => readonly HostRovingItemHandle[];

  /**
   * `true` while the element last reported to {@link noteFocus} is a disabled
   * item. Notifies its readers only when that answer changes, not on every
   * focus move inside the group.
   */
  readonly yields: Signal<boolean>;

  constructor(items: () => readonly HostRovingItemHandle[]) {
    this.#items = items;
    this.yields = computed(() => {
      this.#epoch();
      if (this.#tracksItems) {
        for (const item of items()) {
          item.disabled();
        }
      }
      return untracked(() => this.#holdsDisabled());
    });
  }

  /** Report the element holding DOM focus inside the group, or `null` once focus left it. */
  noteFocus(el: Element | null): void {
    untracked(() => {
      if (this.#focused === el) {
        return;
      }
      const before = this.yields();
      this.#focused = el;
      const subscribes = el !== null && !this.#tracksItems;
      if (subscribes) {
        this.#tracksItems = true;
      }
      if (subscribes || this.#holdsDisabled() !== before) {
        this.#epoch.update((epoch) => epoch + 1);
      }
    });
  }

  #holdsDisabled(): boolean {
    const focused = this.#focused;
    return (
      focused !== null && this.#items().some((item) => item.host === focused && item.disabled())
    );
  }
}

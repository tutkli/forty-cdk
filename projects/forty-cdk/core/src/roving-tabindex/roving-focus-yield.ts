import { computed, type Signal, signal } from '@angular/core';

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
  readonly #focused = signal<Element | null>(null);

  /** `true` while the element last reported to {@link noteFocus} is a disabled item. */
  readonly yields: Signal<boolean>;

  constructor(items: () => readonly HostRovingItemHandle[]) {
    this.yields = computed(() => {
      const focused = this.#focused();
      return focused !== null && items().some((item) => item.host === focused && item.disabled());
    });
  }

  /** Report the element holding DOM focus inside the group, or `null` once focus left it. */
  noteFocus(el: Element | null): void {
    this.#focused.set(el);
  }
}

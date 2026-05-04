import {
  booleanAttribute,
  computed,
  DestroyRef,
  Directive,
  ElementRef,
  inject,
  input,
  model,
  Signal,
} from '@angular/core';

import { Collection } from '../_internal/collection/collection';
import { injectDismissableLayer } from '../_internal/dismissable-layer/dismissable-layer';
import {
  type ListNavigationAction,
  moveIndex,
  type WritingDirection,
} from '../_internal/keyboard-navigation/keyboard-navigation';
import {
  FOR_NAVIGATION_MENU_CONTEXT,
  type ForNavigationMenuContentHandle,
  type ForNavigationMenuContext,
  type ForNavigationMenuTriggerHandle,
  type NavigationMenuScheduleReason,
} from './navigation-menu-context';

/**
 * Headless implementation of the
 * [WAI-ARIA Disclosure Navigation Menu pattern](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/examples/disclosure-navigation/).
 *
 * Despite the name, this is a `<nav>` of disclosures — NOT an ARIA `menu`.
 * Triggers are buttons with `aria-expanded`, content is regular landmarks
 * with links inside; Tab moves through links; Escape closes the open item
 * and returns focus to its trigger.
 *
 * One item is open at a time. Selection is exposed as `value` (the open
 * item's id, or `''` when nothing is open). The `model()` change emitter
 * fires only on internal transitions, never on consumer writes.
 *
 * Submenús anidados (Radix-style `Sub`) están fuera de scope para v1.
 *
 * @example
 * ```html
 * <nav forNavigationMenu aria-label="Main">
 *   <ul forNavigationMenuList>
 *     <li forNavigationMenuItem value="products">
 *       <button forNavigationMenuTrigger>Products</button>
 *       @if (products.isOpen()) {
 *         <div forNavigationMenuContent>…</div>
 *       }
 *     </li>
 *   </ul>
 * </nav>
 * ```
 */
@Directive({
  selector: '[forNavigationMenu]',
  exportAs: 'forNavigationMenu',
  host: {
    '[attr.aria-label]': 'ariaLabel() || null',
    '[attr.data-state]': 'value() === "" ? "closed" : "open"',
    '[attr.data-orientation]': 'orientation()',
    '[attr.data-disabled]': 'disabled() ? "" : null',
    '[attr.dir]': 'dir() === "rtl" ? "rtl" : null',
    '(focusout)': 'onFocusOut($event)',
  },
  providers: [{ provide: FOR_NAVIGATION_MENU_CONTEXT, useExisting: ForNavigationMenu }],
})
export class ForNavigationMenu implements ForNavigationMenuContext {
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);
  /**
   * Two-way bindable. The id of the open item, or `''` for none. The
   * `model()` change emitter (`(valueChange)`) fires only on internal
   * transitions (trigger click, hover delay, Escape, outside click), never
   * on consumer writes via `[(value)]`.
   */
  readonly value = model<string>('');

  readonly orientation = input<'horizontal' | 'vertical'>('horizontal');
  readonly dir = input<WritingDirection>('ltr');
  readonly loop = input(true, { transform: booleanAttribute });
  readonly disabled = input(false, { transform: booleanAttribute });

  /** Optional accessible name for the surrounding `<nav>`. */
  readonly ariaLabel = input<string>('');

  /** ms before a hover/focus opens an item. Default `200`. */
  readonly delayDuration = input<number>(200);

  /** ms before an item closes after hover leaves. Default `300`. */
  readonly closeDelay = input<number>(150);

  /**
   * ms after a peer item closed during which the next open is instant.
   * Keeps fluid hover-across-triggers feeling responsive. Default `300`.
   */
  readonly skipDelayDuration = input<number>(300);

  readonly #triggers = new Collection<ForNavigationMenuTriggerHandle>();
  readonly #contents = new Collection<ForNavigationMenuContentHandle>();

  #pendingTimer: ReturnType<typeof setTimeout> | null = null;
  #skipDelayTimer: ReturnType<typeof setTimeout> | null = null;
  #skipDelayActive = false;

  readonly #dismiss = injectDismissableLayer();

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.#cancelPending();
      this.#cancelSkipDelay();
      this.#dismiss.deactivate();
    });
  }

  isOpen(value: string): boolean {
    return value !== '' && this.value() === value;
  }

  toggle(value: string): void {
    if (this.disabled()) return;
    if (this.value() === value) {
      this.close();
    } else {
      this.open(value);
    }
  }

  open(value: string): void {
    if (this.disabled() || value === '') return;
    this.#cancelPending();
    if (this.value() === value) return;
    this.value.set(value);
    this.#dismiss.activate({
      onEscapeKeyDown: () => {
        const current = this.value();
        this.close();
        const trigger = current ? this.triggerHostFor(current) : null;
        trigger?.focus();
      },
      onPointerDownOutside: () => this.close(),
    });
  }

  close(): void {
    this.#cancelPending();
    if (this.value() === '') return;
    this.value.set('');
    this.#dismiss.deactivate();
    this.#startSkipDelay();
  }

  scheduleOpen(value: string, reason: NavigationMenuScheduleReason): void {
    if (this.disabled() || value === '') return;
    this.#cancelPending();
    if (this.value() === value) return;
    if (reason === 'click' || reason === 'keyboard') {
      this.open(value);
      return;
    }
    const delay = this.#skipDelayActive ? 0 : Math.max(0, this.delayDuration());
    if (delay === 0) {
      this.open(value);
      return;
    }
    this.#pendingTimer = setTimeout(() => {
      this.#pendingTimer = null;
      this.open(value);
    }, delay);
  }

  scheduleClose(reason: NavigationMenuScheduleReason): void {
    this.#cancelPending();
    if (this.value() === '') return;
    if (reason === 'click' || reason === 'keyboard') {
      this.close();
      return;
    }
    const delay = Math.max(0, this.closeDelay());
    if (delay === 0) {
      this.close();
      return;
    }
    this.#pendingTimer = setTimeout(() => {
      this.#pendingTimer = null;
      this.close();
    }, delay);
  }

  cancelPending(): void {
    this.#cancelPending();
  }

  /**
   * APG: moving focus out of the navigation closes any open dropdown. Fires
   * when Tab/Shift+Tab walks past the last/first focusable inside the nav,
   * or when something else steals focus. The dismissable layer already
   * handles Escape and outside pointerdown; this covers the keyboard-tab
   * case the layer can't see.
   */
  protected onFocusOut(event: FocusEvent): void {
    if (this.value() === '') {
      return;
    }
    const next = event.relatedTarget as HTMLElement | null;
    // `null` means focus is leaving the document (e.g. browser chrome) or
    // moving to a non-focusable area — both qualify as "outside the nav".
    if (next && this.#host.nativeElement.contains(next)) {
      return;
    }
    this.close();
  }

  navigate(currentTrigger: HTMLElement, action: ListNavigationAction): void {
    if (this.disabled()) return;
    const triggers = this.#triggers.items();
    if (triggers.length === 0) return;
    const currentIndex = triggers.findIndex((t) => t.host === currentTrigger);
    const next = moveIndex(currentIndex < 0 ? 0 : currentIndex, triggers.length, action, {
      loop: this.loop(),
      isDisabled: (i) => triggers[i]!.disabled(),
    });
    if (next === null) return;
    triggers[next]?.host.focus();
  }

  focusTrigger(value: string): void {
    this.triggerHostFor(value)?.focus();
  }

  registerTrigger(handle: ForNavigationMenuTriggerHandle): void {
    this.#triggers.register(handle);
  }
  unregisterTrigger(handle: ForNavigationMenuTriggerHandle): void {
    this.#triggers.unregister(handle);
  }
  registerContent(handle: ForNavigationMenuContentHandle): void {
    this.#contents.register(handle);
  }
  unregisterContent(handle: ForNavigationMenuContentHandle): void {
    this.#contents.unregister(handle);
  }

  contentIdFor(value: string): string | null {
    for (const c of this.#contents.items()) {
      if (readSignalSafe(c.value) === value) {
        return c.id();
      }
    }
    return null;
  }

  triggerIdFor(value: string): string | null {
    for (const t of this.#triggers.items()) {
      if (readSignalSafe(t.value) === value) {
        return t.id();
      }
    }
    return null;
  }

  triggerHostFor(value: string): HTMLElement | null {
    for (const t of this.#triggers.items()) {
      if (readSignalSafe(t.value) === value) {
        return t.host;
      }
    }
    return null;
  }

  /** Layout-oriented selectors for indicator positioning. */
  readonly activeTriggerHost = computed<HTMLElement | null>(() => {
    const v = this.value();
    if (v === '') return null;
    for (const t of this.#triggers.items()) {
      if (readSignalSafe(t.value) === v) return t.host;
    }
    return null;
  });

  #cancelPending(): void {
    if (this.#pendingTimer !== null) {
      clearTimeout(this.#pendingTimer);
      this.#pendingTimer = null;
    }
  }

  #startSkipDelay(): void {
    this.#cancelSkipDelay();
    this.#skipDelayActive = true;
    this.#skipDelayTimer = setTimeout(
      () => {
        this.#skipDelayTimer = null;
        this.#skipDelayActive = false;
      },
      Math.max(0, this.skipDelayDuration()),
    );
  }

  #cancelSkipDelay(): void {
    if (this.#skipDelayTimer !== null) {
      clearTimeout(this.#skipDelayTimer);
      this.#skipDelayTimer = null;
    }
    this.#skipDelayActive = false;
  }
}

function readSignalSafe(s: Signal<string>): string | null {
  try {
    return s();
  } catch {
    return null;
  }
}

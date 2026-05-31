import {
  booleanAttribute,
  computed,
  DestroyRef,
  Directive,
  ElementRef,
  inject,
  input,
  linkedSignal,
  model,
  signal,
  type Signal,
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
  type ForNavigationMenuMotion,
  type ForNavigationMenuTriggerHandle,
  type ForNavigationMenuViewportHandle,
  type NavigationMenuScheduleReason,
} from './navigation-menu-context';
import { FOR_NAVIGATION_MENU_DEFAULTS } from './navigation-menu-defaults';

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
  readonly #defaults = inject(FOR_NAVIGATION_MENU_DEFAULTS);
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

  /**
   * Manual `aria-label` for the surrounding `<nav>`. Use this when no visible
   * label element exists; otherwise prefer pointing `aria-labelledby` at one.
   * A `null` (default) or empty value emits no attribute.
   */
  readonly ariaLabel = input<string | null>(null);

  /**
   * ms before a hover/focus opens an item. Default `200`. The default is
   * read from `provideForNavigationMenuDefaults` for the surrounding scope.
   */
  readonly delayDuration = input<number>(this.#defaults.delayDuration);

  /**
   * ms before an item closes after hover leaves. Default `150`. The default
   * is read from `provideForNavigationMenuDefaults` for the surrounding
   * scope.
   */
  readonly closeDelay = input<number>(this.#defaults.closeDelay);

  /**
   * ms after a peer item closed during which the next open is instant.
   * Keeps fluid hover-across-triggers feeling responsive. Default `300`.
   * The default is read from `provideForNavigationMenuDefaults` for the
   * surrounding scope.
   */
  readonly skipDelayDuration = input<number>(this.#defaults.skipDelayDuration);

  readonly #triggers = new Collection<ForNavigationMenuTriggerHandle>();
  readonly #contents = new Collection<ForNavigationMenuContentHandle>();
  readonly #viewport = signal<ForNavigationMenuViewportHandle | null>(null);

  /**
   * Previously open `value`, tracked so [forNavigationMenuContent] can
   * reflect `data-motion` while the leaving panel is still mounted (its
   * `animate.leave` keeps the DOM around past the value transition).
   *
   * `linkedSignal` is the canonical replacement for `effect()` writing to a
   * signal: each time `value()` changes, computation runs with the new
   * source plus the prior `{ source, value }` and returns the *previous*
   * source as the new value.
   */
  readonly previousValue = linkedSignal<string, string>({
    source: () => this.value(),
    computation: (_current, prev) => prev?.source ?? '',
  });

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
  registerViewport(handle: ForNavigationMenuViewportHandle): void {
    this.#viewport.set(handle);
  }
  unregisterViewport(handle: ForNavigationMenuViewportHandle): void {
    if (this.#viewport() === handle) {
      this.#viewport.set(null);
    }
  }
  readonly viewport: Signal<ForNavigationMenuViewportHandle | null> = this.#viewport.asReadonly();

  contentIdFor(value: string): string | null {
    for (const c of this.#contents.items()) {
      if (c.value() === value) {
        return c.id();
      }
    }
    return null;
  }

  triggerIdFor(value: string): string | null {
    for (const t of this.#triggers.items()) {
      if (t.value() === value) {
        return t.id();
      }
    }
    return null;
  }

  triggerHostFor(value: string): HTMLElement | null {
    for (const t of this.#triggers.items()) {
      if (t.value() === value) {
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
      if (t.value() === v) return t.host;
    }
    return null;
  });

  /** Currently-active content's host element, if mounted. */
  readonly activeContentHost = computed<HTMLElement | null>(() => {
    const v = this.value();
    if (v === '') return null;
    for (const c of this.#contents.items()) {
      if (c.value() === v) return c.host;
    }
    return null;
  });

  /**
   * `data-motion` direction for the content with the given `value`.
   *
   * Mirrors Radix's `NavigationMenu.Content` convention: when the user
   * moves rightward from A (index 0) to B (index 2), the entering panel
   * slides in from the end side (`from-end`) and the leaving panel slides
   * out to the start side (`to-start`) — both shift in the same logical
   * direction, like a horizontal carousel advancing.
   *
   * - The currently-entering content (`value === this.value()`) reflects
   *   `from-start` / `from-end` based on which side the previous trigger
   *   sat on relative to it.
   * - The currently-leaving content (`value === this.previousValue()`)
   *   reflects `to-start` / `to-end` based on which side the new trigger
   *   sits on relative to it.
   * - Anything else (and first open / last close, where there is no peer
   *   to compare against) returns `null` so the host binding emits no
   *   attribute.
   *
   * "Start" and "end" are logical: index 0 in DOM order is "start", which
   * maps to the visual right in `dir="rtl"`. Consumers can author the
   * keyframes once with logical CSS (e.g. `inset-inline-start`) and it
   * flips automatically.
   */
  motionFor(value: string): ForNavigationMenuMotion | null {
    if (value === '') return null;
    const current = this.value();
    const prev = this.previousValue();
    if (value === current) {
      if (prev === '' || prev === current) return null;
      const prevIndex = this.#triggerIndexFor(prev);
      const currentIndex = this.#triggerIndexFor(current);
      if (prevIndex < 0 || currentIndex < 0) return null;
      if (prevIndex < currentIndex) return 'from-end';
      if (prevIndex > currentIndex) return 'from-start';
      return null;
    }
    if (value === prev) {
      if (current === '' || current === prev) return null;
      const prevIndex = this.#triggerIndexFor(prev);
      const currentIndex = this.#triggerIndexFor(current);
      if (prevIndex < 0 || currentIndex < 0) return null;
      if (currentIndex > prevIndex) return 'to-start';
      if (currentIndex < prevIndex) return 'to-end';
      return null;
    }
    return null;
  }

  #triggerIndexFor(value: string): number {
    const triggers = this.#triggers.items();
    for (let i = 0; i < triggers.length; i++) {
      if (triggers[i]!.value() === value) return i;
    }
    return -1;
  }

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

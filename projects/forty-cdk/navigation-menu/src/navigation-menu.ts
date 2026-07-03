import {
  booleanAttribute,
  computed,
  DestroyRef,
  Directive,
  DOCUMENT,
  ElementRef,
  inject,
  input,
  linkedSignal,
  model,
  signal,
  type Signal,
} from '@angular/core';

import {
  Collection,
  injectDismissableLayer,
  createDebouncedAction,
  type ListNavigationAction,
  type WritingDirection,
  nextEnabledHandle,
  injectTextDirection,
} from 'forty-cdk/core';
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
 * Nested submenus are out of scope for v1.
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
    '[attr.dir]': 'dir()',
    '(focusout)': 'onFocusOut($event)',
  },
  providers: [{ provide: FOR_NAVIGATION_MENU_CONTEXT, useExisting: ForNavigationMenu }],
})
export class ForNavigationMenu implements ForNavigationMenuContext {
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly #document = inject(DOCUMENT);
  readonly #defaults = inject(FOR_NAVIGATION_MENU_DEFAULTS);
  /**
   * Two-way bindable. The id of the open item, or `''` for none. The
   * `model()` change emitter (`(valueChange)`) fires only on internal
   * transitions (trigger click, hover delay, Escape, outside click), never
   * on consumer writes via `[(value)]`.
   */
  readonly value = model<string>('');

  readonly orientation = input<'horizontal' | 'vertical'>('horizontal');

  /**
   * Writing direction. When unset (default `null`), the inherited ambient
   * direction is resolved from the nearest ancestor carrying a `dir` attribute
   * (or `<html dir>`), defaulting to `'ltr'`. An explicit `[dir]` always wins.
   * The resolved value is reflected to the host `dir` attribute and swaps
   * ArrowLeft / ArrowRight semantics in RTL.
   */
  readonly _dirInput = input<WritingDirection | null>(null, { alias: 'dir' });
  readonly dir = injectTextDirection(this._dirInput);
  readonly loop = input(true, { transform: booleanAttribute });
  readonly disabled = input(false, { transform: booleanAttribute });

  /**
   * Manual `aria-label` for the surrounding `<nav>`. Use this when no visible
   * label element exists; otherwise prefer pointing `aria-labelledby` at one.
   * A `null` (default) or empty value emits no attribute.
   */
  readonly ariaLabel = input<string | null>(null);

  /**
   * ms before a hover opens an item. Default `200`. The default is read from
   * `provideForNavigationMenuDefaults` for the surrounding scope.
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
   * Previously open `value`, tracked so consumers can read the most recent
   * open value before the current one.
   *
   * `linkedSignal` is the canonical replacement for `effect()` writing to a
   * signal: each time `value()` changes, computation runs with the new
   * source plus the prior `{ source, value }` and returns the *previous*
   * source as the new value.
   *
   * Note: `data-motion` no longer derives from a single `previousValue`
   * (it could only remember one leaving panel). Per-panel frozen motion is
   * tracked in `#motion` instead, so several panels can leave at once during
   * overlapping `animate.leave` transitions without losing their direction.
   */
  readonly previousValue = linkedSignal<string, string>({
    source: () => this.value(),
    computation: (_current, prev) => prev?.source ?? '',
  });

  /**
   * Frozen `data-motion` per mounted panel `value`. Recorded imperatively at
   * each `open()` / `close()` transition — the entering panel and the panel
   * that just started leaving — and left untouched for panels that began
   * leaving in an earlier transition, so their direction stays stable for as
   * long as `animate.leave` keeps them mounted. Cleared when a panel
   * unmounts (`unregisterContent`) or re-enters as the current value.
   *
   * Backed by a `signal` holding an immutable `Map` so `motionFor` stays a
   * pure, pull-based read — no state is propagated from an `effect()`.
   */
  readonly #motion = signal<ReadonlyMap<string, ForNavigationMenuMotion>>(new Map());

  /** The value a pending hover-open is queued for (so a same-trigger leave can cancel it). */
  #pendingOpenValue: string | null = null;
  readonly #openAction = createDebouncedAction(() => {
    const value = this.#pendingOpenValue;
    this.#pendingOpenValue = null;
    if (value !== null) {
      this.open(value);
    }
  });
  readonly #closeAction = createDebouncedAction(() => this.close());
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
    this.#recordMotion(this.value(), value);
    this.value.set(value);
    this.#dismiss.activate({
      onEscapeKeyDown: () => {
        const active = this.#document.activeElement;
        const content = this.activeContentHost();
        const focusWithin =
          !!active &&
          (this.#host.nativeElement.contains(active) || (!!content && content.contains(active)));
        if (!focusWithin) {
          return;
        }
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
    this.#recordMotion(this.value(), '');
    this.value.set('');
    this.#dismiss.deactivate();
    this.#startSkipDelay();
  }

  scheduleOpen(value: string, reason: NavigationMenuScheduleReason): void {
    if (this.disabled() || value === '') return;
    this.#closeAction.cancel();
    this.#clearOpenTimer();
    if (this.value() === value) return;
    if (reason === 'click' || reason === 'keyboard') {
      this.open(value);
      return;
    }
    this.#pendingOpenValue = value;
    this.#openAction.schedule(this.#skipDelayActive ? 0 : this.delayDuration());
  }

  scheduleClose(reason: NavigationMenuScheduleReason, value?: string): void {
    if (reason === 'click' || reason === 'keyboard') {
      this.#clearOpenTimer();
      this.#closeAction.cancel();
      this.close();
      return;
    }
    if (this.#openAction.isPending()) {
      // A hover-open is queued. If it is for the trigger we are leaving, cancel
      // it so a quick hover-then-leave on a closed trigger doesn't open after
      // the pointer is gone. If it is for a sibling (hover-across), leave it so
      // that pending open takes over.
      if (value !== undefined && this.#pendingOpenValue === value) {
        this.#clearOpenTimer();
      }
      return;
    }
    this.#closeAction.cancel();
    if (this.value() === '') return;
    this.#closeAction.schedule(this.closeDelay());
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
    const target = nextEnabledHandle(this.#triggers.items(), currentTrigger, action, {
      loop: this.loop(),
    });
    target?.host.focus();
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
    this.#clearMotion(handle.value());
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
   * Sets the slide direction by index comparison: when the user
   * moves rightward from A (index 0) to B (index 2), the entering panel
   * slides in from the end side (`from-end`) and the leaving panel slides
   * out to the start side (`to-start`) — both shift in the same logical
   * direction, like a horizontal carousel advancing.
   *
   * - The currently-entering content (`value === this.value()`) reflects
   *   `from-start` / `from-end` based on which side the previous trigger
   *   sat on relative to it.
   * - A leaving content reflects the `to-start` / `to-end` direction frozen
   *   at the transition that started its exit, based on which side the
   *   then-new trigger sat on relative to it. The direction stays stable for
   *   as long as the panel is mounted, even across later transitions.
   * - Anything else (and first open / last close, where there is no peer
   *   to compare against) returns `null` so the host binding emits no
   *   attribute.
   *
   * "Start" and "end" are logical: index 0 in DOM order is "start", which
   * maps to the visual right in `dir="rtl"`. Consumers can author the
   * keyframes once with logical CSS (e.g. `inset-inline-start`) and it
   * flips automatically.
   *
   * The currently-entering panel is computed live against `previousValue()`;
   * every other (leaving) panel reads its frozen direction from `#motion`,
   * recorded at the transition that started its exit. This keeps a leaving
   * panel's direction stable across later, overlapping transitions instead
   * of dropping to `null` once `previousValue` advances past it.
   */
  motionFor(value: string): ForNavigationMenuMotion | null {
    if (value === '') return null;
    if (value === this.value()) {
      return this.#enterMotion(this.previousValue(), value);
    }
    return this.#motion().get(value) ?? null;
  }

  /**
   * Record the frozen motion for a `from` → `to` transition: the entering
   * `to` panel and the leaving `from` panel. Existing entries for other
   * still-leaving panels are preserved so overlapping exits keep their
   * direction. `to`'s own stale leaving entry is dropped (it is re-entering).
   */
  #recordMotion(from: string, to: string): void {
    const next = new Map(this.#motion());
    if (to !== '') {
      const enter = this.#enterMotion(from, to);
      if (enter === null) next.delete(to);
      else next.set(to, enter);
    }
    if (from !== '') {
      const leave = this.#leaveMotion(from, to);
      if (leave === null) next.delete(from);
      else next.set(from, leave);
    }
    this.#motion.set(next);
  }

  #clearMotion(value: string): void {
    if (!this.#motion().has(value)) return;
    const next = new Map(this.#motion());
    next.delete(value);
    this.#motion.set(next);
  }

  /** Entering direction for `to` given the panel `from` it replaced. */
  #enterMotion(from: string, to: string): ForNavigationMenuMotion | null {
    if (from === '' || from === to) return null;
    const fromIndex = this.#triggerIndexFor(from);
    const toIndex = this.#triggerIndexFor(to);
    if (fromIndex < 0 || toIndex < 0) return null;
    if (fromIndex < toIndex) return 'from-end';
    if (fromIndex > toIndex) return 'from-start';
    return null;
  }

  /** Leaving direction for `from` given the panel `to` that replaced it. */
  #leaveMotion(from: string, to: string): ForNavigationMenuMotion | null {
    if (to === '' || to === from) return null;
    const fromIndex = this.#triggerIndexFor(from);
    const toIndex = this.#triggerIndexFor(to);
    if (fromIndex < 0 || toIndex < 0) return null;
    if (toIndex > fromIndex) return 'to-start';
    if (toIndex < fromIndex) return 'to-end';
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
    this.#clearOpenTimer();
    this.#closeAction.cancel();
  }

  #clearOpenTimer(): void {
    this.#openAction.cancel();
    this.#pendingOpenValue = null;
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

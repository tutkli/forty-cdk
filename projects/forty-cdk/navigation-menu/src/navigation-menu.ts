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
  injectDismissibleLayer,
  createDebouncedAction,
  createPointerSuppression,
  createSkipDelayWindow,
  type ListNavigationAction,
  type WritingDirection,
  isUnset,
  nextEnabledHandle,
  injectTextDirection,
  hostAriaLabel,
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
 * item's id, or `null` when nothing is open). The `model()` change emitter
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
    '[attr.aria-label]': 'resolvedAriaLabel()',
    '[attr.data-state]': 'value() === null ? "closed" : "open"',
    '[attr.data-orientation]': 'orientation()',
    '[attr.data-disabled]': 'disabled() ? "" : null',
    '[attr.dir]': 'dir()',
    '(focusout)': 'handleSurfaceFocusOut($event)',
  },
  providers: [{ provide: FOR_NAVIGATION_MENU_CONTEXT, useExisting: ForNavigationMenu }],
})
export class ForNavigationMenu implements ForNavigationMenuContext {
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly #document = inject(DOCUMENT);
  readonly #defaults = inject(FOR_NAVIGATION_MENU_DEFAULTS);
  /**
   * Two-way bindable. The id of the open item, or `null` for none. The
   * `model()` change emitter (`(valueChange)`) fires only on internal
   * transitions (trigger click, hover delay, Escape, outside click), never
   * on consumer writes via `[(value)]`.
   */
  readonly value = model<string | null>(null);

  /**
   * Axis the arrow keys navigate between triggers. Reflected as `data-orientation`.
   */
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
  /**
   * Whether arrow navigation wraps past the first / last enabled trigger.
   */
  readonly loop = input(true, { transform: booleanAttribute });
  /**
   * Whether every item in the navigation is disabled, so no panel can be opened.
   */
  readonly disabled = input(false, { transform: booleanAttribute });

  /**
   * Manual `aria-label` for the surrounding `<nav>`. Use this when no visible
   * label element exists; otherwise prefer pointing `aria-labelledby` at one.
   * A `null` (default) or empty value emits no attribute.
   */
  readonly ariaLabel = input<string | null>(null);

  protected readonly resolvedAriaLabel = hostAriaLabel(() => this.ariaLabel() || null);

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

  /** The `value` that was open before the current one, or `null`. */
  readonly previousValue = linkedSignal<string | null, string | null>({
    source: () => this.value(),
    computation: (_current, prev) => prev?.source ?? null,
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
  readonly #skipDelayWindow = createSkipDelayWindow(this.skipDelayDuration);

  readonly #dismiss = injectDismissibleLayer();

  /**
   * Short window opened by a pointerdown the dismissible layer resolved as
   * *inside* the widget's surface, so a `null`-`relatedTarget` focusout that
   * follows it is read as "the press moved focus to nothing" rather than as
   * "focus left the document". Both leaves are indistinguishable from the
   * `FocusEvent` alone — `document.activeElement` is `<body>` either way — and
   * the pointer is the only thing that tells them apart.
   */
  readonly #surfacePointerDown = createPointerSuppression();

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.#cancelPending();
      this.#skipDelayWindow.cancel();
      this.#dismiss.deactivate();
    });
  }

  isOpen(value: string): boolean {
    return this.value() === value;
  }

  toggle(value: string): void {
    if (this.disabled()) return;
    if (this.value() === value) {
      this.close();
    } else {
      this.open(value);
    }
  }

  /**
   * Opens the item with the given `value` and arms the dismissible layer.
   *
   * The layer owns both outside-interaction channels: `'pointer'` for an
   * outside pointerdown and `'focus'` for a focus move landing outside the
   * widget. The `'focus'` channel is what makes the APG close-on-leave rule
   * work from anywhere in the widget rather than only from the trigger row — it
   * observes `focusin` on the document, so it also fires for a panel that a
   * `[forNavigationMenuViewport]` re-parented outside the `<nav>`, whose
   * `focusout` never bubbles to the nav host. It is also the sole owner of every
   * leave that reports a destination, which is what keeps the widget's
   * containment rule single ({@link handleSurfaceFocusOut}). Both channels treat
   * the nav host, the registered viewport and the active panel — plus any layer
   * stacked above them — as inside, and the layer reports a press it resolved as
   * *inside* that same set through `onPointerDownInside` — the one input
   * {@link handleSurfaceFocusOut} needs to tell a pointer-induced blur from
   * focus leaving the document.
   */
  open(value: string): void {
    if (this.disabled()) return;
    // The single write funnel into `value`, so it is where the `unsetInput`
    // sentinel is stopped: a trigger whose `[forNavigationMenuItem]` has no
    // `[value]` binding yet would otherwise commit the sentinel into the value
    // model instead of failing (dev mode reports it through `assertInputBound`).
    if (isUnset(value)) return;
    this.#cancelPending();
    if (this.value() === value) return;
    this.#recordMotion(this.value(), value);
    this.value.set(value);
    this.#dismiss.activate({
      channels: ['pointer', 'focus'],
      exemptElements: () => this.#surfaceElements(),
      onEscapeKeyDown: () => {
        if (!this.#containsFocusTarget(this.#document.activeElement)) {
          return;
        }
        const current = this.value();
        this.close();
        const trigger = current !== null ? this.triggerHostFor(current) : null;
        trigger?.focus();
      },
      onPointerDownOutside: () => this.close(),
      onPointerDownInside: () => this.#surfacePointerDown.suppress(),
      onFocusOutside: () => this.close(),
    });
  }

  close(): void {
    this.#cancelPending();
    if (this.value() === null) return;
    this.#recordMotion(this.value(), null);
    this.value.set(null);
    this.#dismiss.deactivate();
    this.#skipDelayWindow.start();
  }

  scheduleOpen(value: string, reason: NavigationMenuScheduleReason): void {
    if (this.disabled()) return;
    if (isUnset(value)) return;
    this.#closeAction.cancel();
    this.#clearOpenTimer();
    if (this.value() === value) return;
    if (reason === 'click' || reason === 'keyboard') {
      this.open(value);
      return;
    }
    this.#pendingOpenValue = value;
    this.#openAction.schedule(this.#skipDelayWindow.active() ? 0 : this.delayDuration());
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
    if (this.value() === null) return;
    this.#closeAction.schedule(this.closeDelay());
  }

  cancelPending(): void {
    this.#cancelPending();
  }

  /**
   * Closes any open dropdown when focus leaves the navigation, per APG.
   *
   * Every leave that reports a destination is owned by the dismissible layer's `'focus'` channel
   * and returns from here untouched, so "did focus leave the widget?" has one owner.
   *
   * This handler covers only the leave the layer cannot see: a `null` `relatedTarget`, which fires
   * no `focusin` at all — focus leaving the document, or landing on a non-focusable area. It runs
   * on both the nav host and `[forNavigationMenuContent]`, since a `focusout` inside a panel
   * re-parented by `[forNavigationMenuViewport]` never bubbles to the `<nav>`.
   *
   * Because a `null` `relatedTarget` says nothing about where focus went, the decision is deferred
   * one microtask and taken against `document.activeElement` once focus has settled.
   *
   * Focus landing on `<body>` is ambiguous — it looks the same whether the user tabbed out of the
   * document or pressed a non-focusable region inside the widget. The layer resolves that press
   * against the same containment set and reports it through `onPointerDownInside`, so a
   * pointer-induced blur does not dismiss a panel the user is still interacting with.
   */
  protected handleSurfaceFocusOut(event: FocusEvent): void {
    if (this.value() === null) {
      return;
    }
    if (event.relatedTarget !== null) {
      return;
    }
    queueMicrotask(() => this.#closeIfFocusLeftSurface());
  }

  #closeIfFocusLeftSurface(): void {
    if (this.value() === null) {
      return;
    }
    if (this.#surfacePointerDown.isSuppressed()) {
      return;
    }
    if (this.#containsFocusTarget(this.#document.activeElement)) {
      return;
    }
    this.close();
  }

  #containsFocusTarget(node: Node | null): boolean {
    if (!node) {
      return false;
    }
    if (this.#host.nativeElement.contains(node)) {
      return true;
    }
    return this.#surfaceElements().some((el) => el.contains(node));
  }

  #surfaceElements(): readonly HTMLElement[] {
    const elements: HTMLElement[] = [];
    const viewport = this.#viewport();
    if (viewport) {
      elements.push(viewport.host);
    }
    const content = this.activeContentHost();
    if (content) {
      elements.push(content);
    }
    return elements;
  }

  navigate(currentTrigger: HTMLElement, action: ListNavigationAction): void {
    if (this.disabled()) return;
    const target = nextEnabledHandle(this.#triggers.items(), currentTrigger, action, {
      loop: this.loop(),
    });
    if (target === null) {
      return;
    }
    target.host.focus();
    target.host.scrollIntoView?.({ block: 'nearest' });
  }

  focusTrigger(value: string): void {
    const host = this.triggerHostFor(value);
    if (!host) {
      return;
    }
    host.focus();
    host.scrollIntoView?.({ block: 'nearest' });
  }

  private registerTrigger(handle: ForNavigationMenuTriggerHandle): void {
    this.#triggers.register(handle);
  }
  private unregisterTrigger(handle: ForNavigationMenuTriggerHandle): void {
    this.#triggers.unregister(handle);
  }
  private registerContent(handle: ForNavigationMenuContentHandle): void {
    this.#contents.register(handle);
  }
  private unregisterContent(handle: ForNavigationMenuContentHandle): void {
    this.#contents.unregister(handle);
    this.#clearMotion(handle.value());
  }
  private registerViewport(handle: ForNavigationMenuViewportHandle): void {
    this.#viewport.set(handle);
  }
  private unregisterViewport(handle: ForNavigationMenuViewportHandle): void {
    if (this.#viewport() === handle) {
      this.#viewport.set(null);
    }
  }
  private readonly viewport: Signal<ForNavigationMenuViewportHandle | null> =
    this.#viewport.asReadonly();

  contentIdFor(value: string): string | null {
    for (const c of this.#contents.items()) {
      const candidate = c.value();
      if (!isUnset(candidate) && candidate === value) {
        return c.id();
      }
    }
    return null;
  }

  triggerIdFor(value: string): string | null {
    for (const t of this.#triggers.items()) {
      const candidate = t.value();
      if (!isUnset(candidate) && candidate === value) {
        return t.id();
      }
    }
    return null;
  }

  triggerHostFor(value: string): HTMLElement | null {
    for (const t of this.#triggers.items()) {
      const candidate = t.value();
      if (!isUnset(candidate) && candidate === value) {
        return t.host;
      }
    }
    return null;
  }

  /** Layout-oriented selectors for indicator positioning. */
  readonly activeTriggerHost = computed<HTMLElement | null>(() => {
    const v = this.value();
    if (v === null) return null;
    for (const t of this.#triggers.items()) {
      const candidate = t.value();
      if (!isUnset(candidate) && candidate === v) return t.host;
    }
    return null;
  });

  /** Currently-active content's host element, if mounted. */
  readonly activeContentHost = computed<HTMLElement | null>(() => {
    const v = this.value();
    if (v === null) return null;
    for (const c of this.#contents.items()) {
      const candidate = c.value();
      if (!isUnset(candidate) && candidate === v) return c.host;
    }
    return null;
  });

  /**
   * `data-motion` direction for the content with the given `value`, so entering and leaving panels
   * shift in the same logical direction like a carousel advancing.
   *
   * - The entering content reflects `from-start` / `from-end`, based on which side the previous
   *   trigger sat on relative to it.
   * - A leaving content reflects `to-start` / `to-end`, frozen at the transition that started its
   *   exit and stable for as long as the panel stays mounted, so overlapping `animate.leave`
   *   transitions never lose a panel's direction.
   * - Anything else returns `null` and the host emits no attribute, including the first open and
   *   last close, where there is no peer to compare against.
   *
   * "Start" and "end" are logical — index 0 in DOM order is start, which is visually on the right
   * under `dir="rtl"` — so keyframes authored with logical CSS flip automatically.
   */
  motionFor(value: string): ForNavigationMenuMotion | null {
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
  #recordMotion(from: string | null, to: string | null): void {
    const next = new Map(this.#motion());
    if (to !== null) {
      const enter = this.#enterMotion(from, to);
      if (enter === null) next.delete(to);
      else next.set(to, enter);
    }
    if (from !== null) {
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
  #enterMotion(from: string | null, to: string): ForNavigationMenuMotion | null {
    if (from === null || from === to) return null;
    const fromIndex = this.#triggerIndexFor(from);
    const toIndex = this.#triggerIndexFor(to);
    if (fromIndex < 0 || toIndex < 0) return null;
    if (fromIndex < toIndex) return 'from-end';
    if (fromIndex > toIndex) return 'from-start';
    return null;
  }

  /** Leaving direction for `from` given the panel `to` that replaced it. */
  #leaveMotion(from: string, to: string | null): ForNavigationMenuMotion | null {
    if (to === null || to === from) return null;
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
      const candidate = triggers[i]!.value();
      if (!isUnset(candidate) && candidate === value) return i;
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
}

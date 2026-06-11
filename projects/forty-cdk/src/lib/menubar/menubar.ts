import {
  booleanAttribute,
  computed,
  DestroyRef,
  Directive,
  inject,
  input,
  model,
  numberAttribute,
  signal,
} from '@angular/core';

import { Collection } from '../_internal/collection/collection';
import { firstEnabledHost } from '../_internal/collection/first-enabled-host';
import {
  type ListNavigationAction,
  moveIndex,
  type WritingDirection,
} from '../_internal/keyboard-navigation/keyboard-navigation';
import type { MenuActivationModality } from '../_internal/menu-overlay/menu-overlay';
import { injectTextDirection } from '../_internal/text-direction/text-direction';
import { injectTypeahead } from '../_internal/typeahead/typeahead';
import { FOR_MENU_CONTEXT } from '../menu/menu-context';
import { MenubarMenuContext } from './menubar-menu-context';
import {
  FOR_MENUBAR_CONTEXT,
  type ForMenubarContext,
  type ForMenubarTriggerHandle,
} from './menubar-context';
import { FOR_MENUBAR_DEFAULTS } from './menubar-defaults';

/**
 * Headless implementation of the
 * [WAI-ARIA Menubar pattern](https://www.w3.org/WAI/ARIA/apg/patterns/menubar/).
 *
 * A horizontal (or vertical) bar of triggers, each opening a dropdown menu.
 * The bar owns "which child menu is open" — opening another implicitly
 * closes the previous. Cross-menu ArrowLeft / ArrowRight navigation,
 * hover-after-first-open (switch siblings instantly, dismiss on hover-leave
 * after `closeDelay`), and roving tabindex among triggers are wired
 * automatically.
 *
 * Surface composition:
 *
 * ```html
 * <div forMenubar [(value)]="open">
 *   <button forMenubarTrigger value="file">File</button>
 *   @if (open() === 'file') {
 *     <div forMenuContent>
 *       <button forMenuItem (select)="newDoc()">New</button>
 *     </div>
 *   }
 *
 *   <button forMenubarTrigger value="edit">Edit</button>
 *   @if (open() === 'edit') {
 *     <div forMenuContent>…</div>
 *   }
 * </div>
 * ```
 *
 * `[forMenuContent]` is the same directive used by `[forDropdownMenu]` /
 * `[forContextMenu]`. The bar provides a multiplexed `ForMenuContext`
 * whose anchor / placement / ids are pulled from whichever trigger is
 * currently active, so the content directive needs no menubar-specific
 * code path.
 */
@Directive({
  selector: '[forMenubar]',
  exportAs: 'forMenubar',
  host: {
    role: 'menubar',
    '[attr.aria-orientation]': 'orientation()',
    '[attr.aria-label]': 'ariaLabel() || null',
    '[attr.aria-disabled]': 'disabled() ? "true" : null',
    '[attr.data-state]': 'value() === "" ? "closed" : "open"',
    '[attr.data-orientation]': 'orientation()',
    '[attr.data-disabled]': 'disabled() ? "" : null',
    '[attr.dir]': 'dir()',
    '(pointerenter)': 'cancelPendingClose()',
    '(pointermove)': 'cancelPendingClose()',
    '(pointerleave)': 'onBarPointerLeave($event)',
  },
  providers: [
    { provide: FOR_MENUBAR_CONTEXT, useExisting: ForMenubar },
    {
      provide: FOR_MENU_CONTEXT,
      useFactory: (m: ForMenubar) => m.menuCtx,
      deps: [ForMenubar],
    },
  ],
})
export class ForMenubar implements ForMenubarContext {
  readonly #defaults = inject(FOR_MENUBAR_DEFAULTS);

  /**
   * Two-way bindable. The value of the open trigger, or `''` when none.
   * The `model()` change emitter (`(valueChange)`) fires only on internal
   * transitions (trigger interaction, item activation, Escape, outside
   * dismissal, cross-menu nav), never on consumer writes via `[(value)]`.
   */
  readonly value = model<string>('');

  readonly orientation = input<'horizontal' | 'vertical'>('horizontal');

  /**
   * Writing direction. When unset (default `null`), the inherited ambient
   * direction is resolved from the nearest ancestor carrying a `dir` attribute
   * (or `<html dir>`), defaulting to `'ltr'`. An explicit `[dir]` always wins.
   * The resolved value is reflected to the host `dir` attribute, swaps
   * cross-menu ArrowLeft / ArrowRight, and is inherited by descendant menus.
   */
  readonly _dirInput = input<WritingDirection | null>(null, { alias: 'dir' });
  readonly dir = injectTextDirection(this._dirInput);
  readonly loop = input(true, { transform: booleanAttribute });
  readonly disabled = input(false, { transform: booleanAttribute });

  /**
   * Whether the open menu closes on Escape, an outside interaction, or the
   * pointer leaving the bar. When `false`, the menu stays open until the
   * consumer flips `value` (or a trigger / item interaction switches it).
   * Matches the dismiss contract of `[forDropdownMenu]` / `[forContextMenu]`.
   * Default `true`.
   */
  readonly dismissible = input(true, { transform: booleanAttribute });

  /** Optional accessible name for the menubar. */
  readonly ariaLabel = input<string | null>(null);

  /**
   * ms before the open menu closes after the pointer leaves the bar (and any
   * open menu). Default `150`. The default is read from
   * `provideForMenubarDefaults` for the surrounding scope.
   */
  readonly closeDelay = input<number>(this.#defaults.closeDelay, { transform: numberAttribute });

  readonly #triggerCollection = new Collection<ForMenubarTriggerHandle>();
  readonly triggers = this.#triggerCollection.items;

  readonly activeTrigger = computed<ForMenubarTriggerHandle | null>(() => {
    const v = this.value();
    if (v === '') {
      return null;
    }
    return this.#triggerCollection.items().find((t) => t.value() === v) ?? null;
  });

  /**
   * The most-recently-active trigger value. Persists past close so the
   * `[forMenuContent]` destroy hook can still target the trigger (by then
   * `value()` is already `''`). Updated synchronously by `openTrigger`
   * and snapshotted in `closeOpen` before clearing `value` — that covers
   * every internal close path (Escape, item activation, outside dismiss).
   */
  readonly #lastValue = signal<string>('');

  /**
   * The most-recently-active trigger host. Persists past close so the
   * multiplexed `[forMenuContent]` destroy hook can still target the trigger
   * (by then `value()` is already `''`). Consumed by {@link MenubarMenuContext}
   * as its return-focus `trigger`.
   */
  readonly lastTriggerHost = computed<HTMLElement | null>(() => {
    const v = this.value() || this.#lastValue();
    if (v === '') {
      return null;
    }
    return this.#triggerCollection.items().find((t) => t.value() === v)?.host ?? null;
  });

  readonly #firstEnabledTriggerHost = computed(() =>
    firstEnabledHost(this.#triggerCollection.items()),
  );

  readonly #focusedTrigger = signal<HTMLElement | null>(null);

  readonly #triggerTypeahead = injectTypeahead();

  #closeTimer: ReturnType<typeof setTimeout> | null = null;
  #detachContentPointerFn: (() => void) | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.#clearCloseTimer();
      this.detachContentPointer();
    });
  }

  // -- Multiplexed ForMenuContext for the currently-active menu -------------

  /**
   * Single `ForMenuContext` provided to descendant `[forMenuContent]` and
   * items, implemented by the dedicated {@link MenubarMenuContext} class. Its
   * open / anchor / side / ids fields are derived from `activeTrigger`, so the
   * same context shape transparently covers whichever trigger's menu is
   * mounted. The bar's menu-item navigation reuses the shared `MenuItemList`
   * (the same mechanics that back `MenuOverlay`), so the multiplexing only
   * covers the parts the single-owner overlay can't.
   */
  readonly menuCtx: MenubarMenuContext = new MenubarMenuContext(this);

  // -- ForMenubarContext ----------------------------------------------------

  registerTrigger(handle: ForMenubarTriggerHandle): void {
    this.#triggerCollection.register(handle);
  }
  unregisterTrigger(handle: ForMenubarTriggerHandle): void {
    this.#triggerCollection.unregister(handle);
  }

  triggerFor(value: string): ForMenubarTriggerHandle | null {
    if (value === '') {
      return null;
    }
    return this.#triggerCollection.items().find((t) => t.value() === value) ?? null;
  }

  tabindexFor(el: HTMLElement): 0 | -1 {
    const v = this.value();
    if (v !== '') {
      // While a menu is open, only its trigger is tabbable.
      return this.activeTrigger()?.host === el ? 0 : -1;
    }
    // Otherwise, the most-recently-focused trigger holds the tab stop.
    // Falls back to the first enabled trigger when nothing's been focused.
    const focused = this.#focusedTrigger();
    if (focused) {
      return focused === el ? 0 : -1;
    }
    return this.#firstEnabledTriggerHost() === el ? 0 : -1;
  }

  setFocusedTrigger(el: HTMLElement | null): void {
    this.#focusedTrigger.set(el);
  }

  navigateTriggers(currentTrigger: HTMLElement, action: ListNavigationAction): void {
    if (this.disabled()) {
      return;
    }
    const items = this.#triggerCollection.items();
    if (items.length === 0) {
      return;
    }
    const currentIndex = items.findIndex((t) => t.host === currentTrigger);
    const next = moveIndex(currentIndex < 0 ? 0 : currentIndex, items.length, action, {
      loop: this.loop(),
      isDisabled: (i) => items[i]!.disabled(),
    });
    if (next === null) {
      return;
    }
    items[next]?.host.focus();
  }

  openTrigger(
    value: string,
    initialFocus: 'first' | 'last',
    modality: MenuActivationModality = 'keyboard',
  ): void {
    if (this.disabled()) {
      return;
    }
    const handle = this.triggerFor(value);
    if (!handle || handle.disabled()) {
      return;
    }
    this.menuCtx.prepareOpen(initialFocus, modality);
    this.#lastValue.set(value);
    if (this.value() !== value) {
      this.value.set(value);
    }
  }

  closeOpen(): void {
    const current = this.value();
    if (current === '') {
      return;
    }
    // Snapshot so [forMenuContent]'s destroy hook can return focus to the
    // just-closed trigger via menuCtx.trigger (which falls back to #lastValue
    // once value() is '').
    this.#lastValue.set(current);
    this.value.set('');
  }

  switchToSibling(direction: 'next' | 'prev'): void {
    if (this.disabled()) {
      return;
    }
    const items = this.#triggerCollection.items();
    if (items.length === 0) {
      return;
    }
    const currentValue = this.value();
    const currentIndex = items.findIndex((t) => t.value() === currentValue);
    const next = moveIndex(currentIndex < 0 ? 0 : currentIndex, items.length, direction, {
      loop: this.loop(),
      isDisabled: (i) => items[i]!.disabled(),
    });
    if (next === null) {
      return;
    }
    const target = items[next];
    if (!target) {
      return;
    }
    this.openTrigger(target.value(), 'first');
  }

  pointerEnterTrigger(value: string): void {
    if (this.disabled()) {
      return;
    }
    // Entering any trigger aborts a pending hover-leave close — the pointer
    // is still travelling across the bar, so keep the open menu alive.
    this.#clearCloseTimer();
    // Per Radix: hover-after-open opens siblings instantly; while no menu is
    // open, hover does nothing (first open requires keyboard / click).
    if (this.value() === '' || this.value() === value) {
      return;
    }
    this.openTrigger(value, 'first', 'pointer');
  }

  /**
   * Abort a scheduled hover-leave close, if any. Bound to the bar's
   * `pointerenter` / `pointermove` so re-entering the bar (or its open menu)
   * keeps the menu open. Also called by the multiplexed content's
   * `pointerenter` so travelling from a trigger into its portaled menu does
   * not trip the close timer.
   */
  cancelPendingClose(): void {
    this.#clearCloseTimer();
  }

  /**
   * The pointer left the bar. Schedule a close after `closeDelay`; entering
   * the bar, a trigger, or the open menu again cancels it. No-op while no
   * menu is open or for non-mouse pointers (touch / pen drive open/close via
   * tap, not hover).
   */
  protected onBarPointerLeave(event: PointerEvent): void {
    if (event.pointerType !== '' && event.pointerType !== 'mouse') {
      return;
    }
    this.#scheduleCloseByPointer();
  }

  #scheduleCloseByPointer(): void {
    this.#clearCloseTimer();
    // A non-dismissible menu stays pinned open: hover-leave is held to the
    // same contract as Escape / outside interaction.
    if (this.value() === '' || !this.dismissible()) {
      return;
    }
    const delay = Math.max(0, this.closeDelay());
    if (delay === 0) {
      this.#closeByPointer();
      return;
    }
    this.#closeTimer = setTimeout(() => {
      this.#closeTimer = null;
      this.#closeByPointer();
    }, delay);
  }

  #closeByPointer(): void {
    if (this.value() === '') {
      return;
    }
    this.menuCtx.setLastCloseReason('pointerDownOutside');
    this.closeOpen();
  }

  /**
   * Attach the bar's hover-keepalive listeners to the mounted multiplexed
   * content element so travelling from a trigger into its portaled menu keeps
   * the open chain alive. Called by {@link MenubarMenuContext} on content
   * registration.
   */
  attachContentPointer(el: HTMLElement): void {
    this.detachContentPointer();
    const onEnter = (event: PointerEvent): void => {
      if (event.pointerType !== '' && event.pointerType !== 'mouse') {
        return;
      }
      this.#clearCloseTimer();
    };
    const onLeave = (event: PointerEvent): void => {
      if (event.pointerType !== '' && event.pointerType !== 'mouse') {
        return;
      }
      this.#scheduleCloseByPointer();
    };
    el.addEventListener('pointerenter', onEnter);
    el.addEventListener('pointerleave', onLeave);
    this.#detachContentPointerFn = () => {
      el.removeEventListener('pointerenter', onEnter);
      el.removeEventListener('pointerleave', onLeave);
    };
  }

  /** Detach the bar's hover-keepalive listeners. Called by {@link MenubarMenuContext}. */
  detachContentPointer(): void {
    this.#detachContentPointerFn?.();
    this.#detachContentPointerFn = null;
  }

  #clearCloseTimer(): void {
    if (this.#closeTimer !== null) {
      clearTimeout(this.#closeTimer);
      this.#closeTimer = null;
    }
  }

  handleTriggerTypeahead(event: KeyboardEvent): void {
    if (!this.#triggerTypeahead.handle(event)) {
      return;
    }
    const buffer = this.#triggerTypeahead.buffer().toLowerCase();
    if (!buffer) {
      return;
    }
    const items = this.#triggerCollection.items();
    const match = items.find((t) => {
      if (t.disabled()) {
        return false;
      }
      const text = t.host.textContent ?? '';
      return text.trim().toLowerCase().startsWith(buffer);
    });
    match?.host.focus();
  }
}

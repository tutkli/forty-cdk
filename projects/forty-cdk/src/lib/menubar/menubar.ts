import { booleanAttribute, computed, Directive, input, model, signal } from '@angular/core';
import type { ReferenceElement } from '@floating-ui/dom';

import { Collection } from '../_internal/collection/collection';
import { firstEnabledHost } from '../_internal/collection/first-enabled-host';
import {
  type ListNavigationAction,
  moveIndex,
  type WritingDirection,
} from '../_internal/keyboard-navigation/keyboard-navigation';
import { injectTypeahead } from '../_internal/typeahead/typeahead';
import {
  FOR_MENU_CONTEXT,
  type ForMenuCloseReason,
  type ForMenuContext,
  type ForMenuItemHandle,
} from '../menu/menu-context';
import {
  FOR_MENUBAR_CONTEXT,
  type ForMenubarContext,
  type ForMenubarTriggerHandle,
} from './menubar-context';

/**
 * Headless implementation of the
 * [WAI-ARIA Menubar pattern](https://www.w3.org/WAI/ARIA/apg/patterns/menubar/).
 *
 * A horizontal (or vertical) bar of triggers, each opening a dropdown menu.
 * The bar owns "which child menu is open" — opening another implicitly
 * closes the previous. Cross-menu ArrowLeft / ArrowRight navigation,
 * hover-after-first-open (skip-delay), and roving tabindex among triggers
 * are wired automatically.
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
    '[attr.dir]': 'dir() === "rtl" ? "rtl" : null',
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
  /**
   * Two-way bindable. The value of the open trigger, or `''` when none.
   * The `model()` change emitter (`(valueChange)`) fires only on internal
   * transitions (trigger interaction, item activation, Escape, outside
   * dismissal, cross-menu nav), never on consumer writes via `[(value)]`.
   */
  readonly value = model<string>('');

  readonly orientation = input<'horizontal' | 'vertical'>('horizontal');
  readonly dir = input<WritingDirection>('ltr');
  readonly loop = input(true, { transform: booleanAttribute });
  readonly disabled = input(false, { transform: booleanAttribute });

  /** Optional accessible name for the menubar. */
  readonly ariaLabel = input<string | null>(null);

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
  readonly #lastTriggerHost = computed<HTMLElement | null>(() => {
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

  // -- Multiplexed ForMenuContext for the currently-active menu -------------

  readonly #menuItems = new Collection<ForMenuItemHandle>();
  readonly #menuItemTypeahead = injectTypeahead();
  readonly #menuContentEl = signal<HTMLElement | null>(null);
  readonly #menuInitialFocus = signal<'first' | 'last'>('first');

  /**
   * Single `ForMenuContext` provided to descendant `[forMenuContent]` and
   * items. Its open / anchor / side / ids fields are derived from
   * `activeTrigger`, so the same context shape transparently covers
   * whichever trigger's menu is mounted.
   */
  readonly menuCtx: ForMenuContext = {
    open: computed(() => this.value() !== ''),
    disabled: this.disabled,
    dismissible: signal(true),
    returnFocus: signal(true),
    dir: this.dir,
    side: computed(() => this.activeTrigger()?.side()),
    align: computed(() => this.activeTrigger()?.align()),
    sideOffset: computed(() => this.activeTrigger()?.sideOffset() ?? 4),
    alignOffset: computed(() => this.activeTrigger()?.alignOffset() ?? 0),
    avoidCollisions: computed(() => this.activeTrigger()?.avoidCollisions() ?? true),
    collisionPadding: computed(() => this.activeTrigger()?.collisionPadding() ?? 8),
    arrowPadding: computed(() => this.activeTrigger()?.arrowPadding() ?? 0),
    sticky: computed(() => this.activeTrigger()?.sticky() ?? 'partial'),
    hideWhenDetached: computed(() => this.activeTrigger()?.hideWhenDetached() ?? false),
    loop: this.loop,
    initialFocus: this.#menuInitialFocus.asReadonly(),
    setInitialFocus: (target) => this.#menuInitialFocus.set(target),
    triggerId: computed(() => this.activeTrigger()?.triggerId() ?? ''),
    contentId: computed(() => this.activeTrigger()?.contentId() ?? ''),
    ariaLabel: computed(() => this.activeTrigger()?.ariaLabel() ?? null),
    anchor: computed<ReferenceElement | null>(() => this.activeTrigger()?.host ?? null),
    trigger: this.#lastTriggerHost,
    registerTrigger: () => {
      // Triggers register with the menubar itself (registerTrigger below),
      // not with the multiplexed menu context.
    },
    unregisterTrigger: () => {},
    content: this.#menuContentEl.asReadonly(),
    registerContent: (el) => this.#menuContentEl.set(el),
    unregisterContent: (el) => {
      if (this.#menuContentEl() === el) {
        this.#menuContentEl.set(null);
      }
    },
    parentMenu: null,
    menubar: this,
    /**
     * Exempt every menubar trigger element so clicking another trigger
     * doesn't fire `pointerDownOutside` (the trigger's own click handler
     * routes the close + open).
     */
    dismissableExemptions: computed(() => this.#triggerCollection.items().map((t) => t.host)),
    registerItem: (h) => this.#menuItems.register(h),
    unregisterItem: (h) => this.#menuItems.unregister(h),
    navigate: (current, action) => this.#navigateMenuItems(current, action),
    handleTypeahead: (event) => this.#handleMenuItemTypeahead(event),
    focusFirstEnabledItem: () => this.#focusFirstEnabledMenuItem(),
    focusLastEnabledItem: () => this.#focusLastEnabledMenuItem(),
    toggle: () => {
      // Without a specific trigger value, toggle from the menubar context
      // can only close. Triggers themselves drive the open path.
      if (this.value() !== '') {
        this.closeOpen();
      }
    },
    openMenu: () => {
      // Open requires a trigger value — see openTrigger.
    },
    closeMenu: (_reason: ForMenuCloseReason) => {
      this.closeOpen();
    },
    emitEscapeKeyDown: (event) => {
      if (!event.defaultPrevented) {
        event.stopPropagation();
        this.closeOpen();
      }
    },
    emitPointerDownOutside: () => {},
    emitFocusOutside: () => {},
    emitInteractOutside: (event) => {
      if (!event.defaultPrevented) {
        this.closeOpen();
      }
    },
    // Menubar doesn't expose `(autoFocusOnOpen)` / `(autoFocusOnClose)` as
    // public outputs — bar-level menus default to APG-prescribed focus
    // movement and the multiplexed context has no per-trigger output to
    // route through. No-op stubs so [forMenuContent] can call them
    // unconditionally regardless of which root provided the context.
    emitAutoFocusOnOpen: () => false,
    emitAutoFocusOnClose: () => false,
  };

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

  openTrigger(value: string, initialFocus: 'first' | 'last'): void {
    if (this.disabled()) {
      return;
    }
    const handle = this.triggerFor(value);
    if (!handle || handle.disabled()) {
      return;
    }
    this.#menuInitialFocus.set(initialFocus);
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
    // Per Radix: hover-after-open opens siblings instantly; while no menu is
    // open, hover does nothing (first open requires keyboard / click).
    if (this.value() === '' || this.value() === value) {
      return;
    }
    this.openTrigger(value, 'first');
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

  // -- Internal: menu-item navigation / typeahead / focus -------------------

  #navigateMenuItems(currentItem: HTMLElement, action: ListNavigationAction): void {
    const items = this.#menuItems.items();
    if (items.length === 0) {
      return;
    }
    const currentIndex = items.findIndex((i) => i.host === currentItem);
    const next = moveIndex(currentIndex < 0 ? 0 : currentIndex, items.length, action, {
      loop: this.loop(),
      isDisabled: (i) => items[i]!.disabled(),
    });
    if (next === null) {
      return;
    }
    items[next]?.host.focus();
  }

  #handleMenuItemTypeahead(event: KeyboardEvent): void {
    if (!this.#menuItemTypeahead.handle(event)) {
      return;
    }
    const buffer = this.#menuItemTypeahead.buffer().toLowerCase();
    if (!buffer) {
      return;
    }
    const items = this.#menuItems.items();
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

  #focusFirstEnabledMenuItem(): boolean {
    const target = this.#menuItems.items().find((i) => !i.disabled());
    if (!target) {
      return false;
    }
    target.host.focus();
    return true;
  }

  #focusLastEnabledMenuItem(): boolean {
    const items = this.#menuItems.items();
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

import {
  booleanAttribute,
  computed,
  Directive,
  inject,
  input,
  model,
  output,
  signal,
} from '@angular/core';

import {
  Collection,
  firstEnabledHost,
  findTypeaheadMatch,
  type ListNavigationAction,
  type WritingDirection,
  nextEnabledHandle,
  type MenuActivationModality,
  RovingTabindex,
  injectTextDirection,
  injectTypeahead,
  FOR_MENU_CONTEXT,
  type VetoableEvent,
  type VetoableNativeEvent,
  hostAriaLabel,
} from 'forty-cdk/core';
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
 * hover-after-first-open (switch siblings instantly), and roving tabindex
 * among triggers are wired automatically. Per the APG Menubar pattern the
 * pointer leaving the bar does not dismiss the open menu.
 *
 * Surface composition:
 *
 * ```html
 * <div forMenubar [(value)]="open">
 *   <button forMenubarTrigger value="file">File</button>
 *   @if (open() === 'file') {
 *     <div forMenuContent>
 *       <button forMenuItem (activate)="newDoc()">New</button>
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
    '[attr.aria-label]': 'resolvedAriaLabel()',
    '[attr.aria-disabled]': 'disabled() ? "true" : null',
    '[attr.data-state]': 'value() === null ? "closed" : "open"',
    '[attr.data-orientation]': 'orientation()',
    '[attr.data-disabled]': 'disabled() ? "" : null',
    '[attr.dir]': 'dir()',
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
   * Two-way bindable. The value of the open trigger, or `null` when none.
   * The `model()` change emitter (`(valueChange)`) fires only on internal
   * transitions (trigger interaction, item activation, Escape, outside
   * dismissal, cross-menu nav), never on consumer writes via `[(value)]`.
   */
  readonly value = model<string | null>(null);

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
   * Whether the open menu closes on Escape or an outside interaction. When
   * `false`, the menu stays open until the consumer flips `value` (or a
   * trigger / item interaction switches it). Matches the dismiss contract of
   * `[forDropdownMenu]` / `[forContextMenu]`. Default `true`.
   */
  readonly dismissible = input(true, { transform: booleanAttribute });

  /** Optional accessible name for the menubar. */
  readonly ariaLabel = input<string | null>(null);

  protected readonly resolvedAriaLabel = hostAriaLabel(() => this.ariaLabel() || null);

  /**
   * Fires when Escape is pressed while one of the bar's menus is the topmost
   * dismissible layer, just before it closes. Call `preventDefault()` on the
   * emitted veto to keep the menu open and suppress the Escape-driven close.
   * Bar-level: the same output covers whichever trigger's menu is open.
   */
  readonly escapeKeyDown = output<VetoableNativeEvent<KeyboardEvent>>();

  /**
   * Fires on a pointer-down outside the open menu and outside every menubar
   * trigger, just before the menu closes. Call `preventDefault()` on the veto
   * to keep it open.
   */
  readonly pointerDownOutside = output<VetoableNativeEvent<PointerEvent>>();

  /**
   * Fires when focus moves outside the open menu and outside every menubar
   * trigger, just before the menu closes. Call `preventDefault()` on the veto
   * to keep it open.
   */
  readonly focusOutside = output<VetoableNativeEvent<FocusEvent>>();

  /**
   * Composite outside-interaction channel: fires for either a
   * pointer-down-outside or a focus-outside, just before the menu closes, and
   * shares the veto state of the specific channel. Call `preventDefault()` on
   * the veto to keep the menu open regardless of which interaction fired.
   */
  readonly interactOutside = output<VetoableNativeEvent<PointerEvent | FocusEvent>>();

  /**
   * Fires just before an opening menu sends focus to its first / last enabled
   * item on mount. Call `preventDefault()` on the emitted veto to skip the
   * imperative focus move. Also fires on a hover-switch between sibling
   * triggers, since that remounts the content.
   */
  readonly autoFocusOnOpen = output<VetoableEvent>();

  /**
   * Fires just before focus returns to the trigger on unmount. Call
   * `preventDefault()` on the veto to suppress the return-focus. Not fired
   * when the close already moved focus on purpose (Tab, or an outside
   * pointer-down / focus).
   */
  readonly autoFocusOnClose = output<VetoableEvent>();

  readonly #triggerCollection = new Collection<ForMenubarTriggerHandle>();
  readonly triggers = this.#triggerCollection.items;

  readonly activeTrigger = computed<ForMenubarTriggerHandle | null>(() => {
    const v = this.value();
    if (v === null) {
      return null;
    }
    return this.#triggerCollection.items().find((t) => t.value() === v) ?? null;
  });

  /**
   * The most-recently-active trigger value. Persists past close so the
   * `[forMenuContent]` destroy hook can still target the trigger (by then
   * `value()` is already `null`). Updated synchronously by `openTrigger`
   * and snapshotted in `closeOpen` before clearing `value` — that covers
   * every internal close path (Escape, item activation, outside dismiss).
   */
  readonly #lastValue = signal<string | null>(null);

  /**
   * The most-recently-active trigger host. Persists past close so the
   * multiplexed `[forMenuContent]` destroy hook can still target the trigger
   * (by then `value()` is already `null`). Consumed by {@link MenubarMenuContext}
   * as its return-focus `trigger`.
   */
  readonly lastTriggerHost = computed<HTMLElement | null>(() => {
    const v = this.value() ?? this.#lastValue();
    if (v === null) {
      return null;
    }
    return this.#triggerCollection.items().find((t) => t.value() === v)?.host ?? null;
  });

  readonly #firstEnabledTriggerHost = computed(() =>
    firstEnabledHost(this.#triggerCollection.items()),
  );

  /**
   * Roving-tabindex tracker shared by every menubar trigger, mirroring
   * `ForToolbar` / `ForTabs`. Triggers promote themselves to active on
   * `(focus)` (via {@link setFocusedTrigger}) and read `active()` through
   * {@link tabindexFor}, so re-entry restores the last focused trigger. Before
   * any focus — and on every close — `active()` is `null`/stale and the tab
   * stop falls back to the first enabled trigger. The active pointer is
   * self-healing (a detached / disabled trigger no longer owns the stop).
   */
  readonly roving = new RovingTabindex(() => this.#triggerCollection.items());

  readonly #triggerTypeahead = injectTypeahead();

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
  readonly menuCtx: MenubarMenuContext = new MenubarMenuContext(this, this.#defaults);

  // -- ForMenubarContext ----------------------------------------------------

  registerTrigger(handle: ForMenubarTriggerHandle): void {
    this.#triggerCollection.register(handle);
  }
  unregisterTrigger(handle: ForMenubarTriggerHandle): void {
    this.#triggerCollection.unregister(handle);
    this.roving.unregister(handle.host);
  }

  triggerFor(value: string): ForMenubarTriggerHandle | null {
    return this.#triggerCollection.items().find((t) => t.value() === value) ?? null;
  }

  tabindexFor(el: HTMLElement): 0 | -1 {
    const v = this.value();
    if (v !== null) {
      // While a menu is open, only its trigger is tabbable.
      return this.activeTrigger()?.host === el ? 0 : -1;
    }
    // Otherwise the roving tracker (promoted by trigger `(focus)`) holds the
    // tab stop, falling back to the first enabled trigger when nothing has
    // been focused yet or the active trigger went stale.
    if (this.roving.hasActive()) {
      return this.roving.tabindexFor(el);
    }
    return this.#firstEnabledTriggerHost() === el ? 0 : -1;
  }

  setFocusedTrigger(el: HTMLElement | null): void {
    this.roving.setActive(el);
  }

  navigateTriggers(currentTrigger: HTMLElement, action: ListNavigationAction): void {
    if (this.disabled()) {
      return;
    }
    const target = nextEnabledHandle(this.#triggerCollection.items(), currentTrigger, action, {
      loop: this.loop(),
    });
    target?.host.focus();
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
    if (this.value() === value) {
      this.menuCtx.focusInitialEnabledItem(initialFocus);
      return;
    }
    this.value.set(value);
  }

  closeOpen(): void {
    const current = this.value();
    if (current === null) {
      return;
    }
    // Snapshot so [forMenuContent]'s destroy hook can return focus to the
    // just-closed trigger via menuCtx.trigger (which falls back to #lastValue
    // once value() is null).
    this.#lastValue.set(current);
    this.value.set(null);
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
    const target = nextEnabledHandle(items, currentIndex < 0 ? 0 : currentIndex, direction, {
      loop: this.loop(),
    });
    if (target === null) {
      return;
    }
    this.openTrigger(target.value(), 'first');
  }

  pointerEnterTrigger(value: string): void {
    if (this.disabled()) {
      return;
    }
    // Hover-after-open opens siblings instantly; while no menu is
    // open, hover does nothing (first open requires keyboard / click).
    if (this.value() === null || this.value() === value) {
      return;
    }
    this.openTrigger(value, 'first', 'pointer');
  }

  handleTriggerTypeahead(event: KeyboardEvent): void {
    if (!this.#triggerTypeahead.handle(event)) {
      return;
    }
    const items = this.#triggerCollection.items();
    const currentIndex = items.findIndex((t) => t.host === event.target);
    const match = findTypeaheadMatch(
      items,
      {
        buffer: this.#triggerTypeahead.buffer(),
        repeated: this.#triggerTypeahead.isRepeatedChar(),
        anchorIndex: currentIndex,
      },
      (t) => t.host.textContent ?? '',
      (t) => t.disabled(),
    );
    match?.host.focus();
  }
}

import {
  booleanAttribute,
  computed,
  Directive,
  inject,
  input,
  model,
  numberAttribute,
  output,
  signal,
} from '@angular/core';
import type { ReferenceElement } from '@floating-ui/dom';

import { Collection } from '../_internal/collection/collection';
import type { FloatingAlign, FloatingSide } from '../_internal/floating/floating';
import { IdGenerator } from '../_internal/id-generator/id-generator';
import {
  type ListNavigationAction,
  moveIndex,
  type WritingDirection,
} from '../_internal/keyboard-navigation/keyboard-navigation';
import { injectTypeahead } from '../_internal/typeahead/typeahead';
import {
  createVetoableNativeEvent,
  emitVetoableEvent,
  emitVetoableNativeEvent,
  type VetoableEvent,
  type VetoableNativeEvent,
} from '../_internal/vetoable-event/vetoable-event';
import {
  FOR_MENU_CONTEXT,
  type ForMenuCloseReason,
  type ForMenuContext,
  type ForMenuItemHandle,
} from '../menu/menu-context';
import { FOR_DROPDOWN_MENU_DEFAULTS } from './dropdown-menu-defaults';

/**
 * Headless implementation of the [WAI-ARIA Menu Button pattern](https://www.w3.org/WAI/ARIA/apg/patterns/menu-button/).
 * Apply on a wrapper that contains the trigger and the `@if`-mounted
 * `[forMenuContent]`. The directive owns open state, ids, and the registries
 * that wire trigger / content / items together.
 *
 * Mount/unmount of the visible menu is the consumer's responsibility — wrap
 * `[forMenuContent]` with `@if (open())` so `animate.enter` / `animate.leave`
 * fire on the natural mount cycle:
 *
 * ```html
 * <div forDropdownMenu [(open)]="open">
 *   <button forDropdownMenuTrigger>Options</button>
 *   @if (open()) {
 *     <div forMenuContent (close)="open.set(false)">…</div>
 *   }
 * </div>
 * ```
 *
 * Selecting a `[forMenuItem]` closes the menu (call `event.preventDefault()`
 * on the item's `(select)` event to keep it open). Escape, pointer-down
 * outside, and focus-outside also close — each emits a vetoable event.
 */
@Directive({
  selector: '[forDropdownMenu]',
  exportAs: 'forDropdownMenu',
  host: {
    '[attr.data-state]': 'open() ? "open" : "closed"',
    '[attr.data-disabled]': 'disabled() ? "" : null',
  },
  providers: [{ provide: FOR_MENU_CONTEXT, useExisting: ForDropdownMenu }],
})
export class ForDropdownMenu implements ForMenuContext {
  readonly #idGen = inject(IdGenerator);
  readonly #typeahead = injectTypeahead();
  readonly #items = new Collection<ForMenuItemHandle>();
  readonly #defaults = inject(FOR_DROPDOWN_MENU_DEFAULTS);

  /**
   * Two-way bindable. Whether the menu is currently shown. The `model()`
   * change emitter (`(openChange)`) fires only on internal transitions
   * (trigger toggle, Escape, outside dismissal, item selection), never on
   * consumer writes via `[(open)]`.
   */
  readonly open = model<boolean>(false);

  /**
   * Side the menu is anchored to. Defaults to `'bottom'`. Pair with
   * `align` for the full positioning API.
   */
  readonly side = input<FloatingSide | undefined>('bottom');

  /** Alignment along the chosen `side`. Defaults to `'start'`. */
  readonly align = input<FloatingAlign | undefined>('start');

  /**
   * Gap (px) between trigger and menu along the main axis. Default `4`.
   * Mirrors Radix's `sideOffset`. The default is read from
   * `provideForDropdownMenuDefaults` for the surrounding scope.
   */
  readonly sideOffset = input(this.#defaults.sideOffset, { transform: numberAttribute });

  /** Gap (px) along the cross axis. Default `0`. */
  readonly alignOffset = input(0, { transform: numberAttribute });

  /** When `true` (default), `flip` and `shift` keep the menu inside the viewport. */
  readonly avoidCollisions = input(true, { transform: booleanAttribute });

  /**
   * Padding (px) applied uniformly to flip / shift / size. Default `8`.
   * The default is read from `provideForDropdownMenuDefaults` for the
   * surrounding scope.
   */
  readonly collisionPadding = input(this.#defaults.collisionPadding, {
    transform: numberAttribute,
  });

  /** Padding (px) for the `arrow` middleware. Default `0`. */
  readonly arrowPadding = input(0, { transform: numberAttribute });

  /** Stickiness behaviour for `shift`. Default `'partial'`. */
  readonly sticky = input<'partial' | 'always' | false>('partial');

  /** When `true`, sets `data-detached=""` while the trigger is scrolled off-screen. */
  readonly hideWhenDetached = input(false, { transform: booleanAttribute });

  readonly loop = input(true, { transform: booleanAttribute });

  /**
   * Writing direction. Drives ArrowLeft / ArrowRight semantics on submenu
   * triggers and items underneath this menu (in RTL, ArrowLeft opens a submenu
   * and ArrowRight closes it back). Default `'ltr'`.
   */
  readonly dir = input<WritingDirection>('ltr');

  /**
   * When true, trigger interaction is ignored and any open menu stays open
   * until the consumer flips `open` themselves. The trigger reflects
   * `data-disabled`; the items keep their per-item disabled semantics.
   */
  readonly disabled = input(false, { transform: booleanAttribute });

  /** When true (default), Escape, pointer-down outside, and focus outside close the menu. */
  readonly dismissible = input(true, { transform: booleanAttribute });

  /** When true (default), focus returns to the trigger on close. */
  readonly returnFocus = input(true, { transform: booleanAttribute });

  /** Manual `aria-label` on `[forMenuContent]`. Use when the trigger isn't a meaningful name. */
  readonly ariaLabel = input<string | null>(null);

  readonly escapeKeyDown = output<VetoableNativeEvent<KeyboardEvent>>();
  readonly pointerDownOutside = output<VetoableNativeEvent<PointerEvent>>();
  readonly focusOutside = output<VetoableNativeEvent<FocusEvent>>();
  readonly interactOutside = output<VetoableNativeEvent<PointerEvent | FocusEvent>>();

  /**
   * Fires just before the menu sends focus to its first / last enabled
   * item on mount. Call `preventDefault()` on the emitted veto to skip
   * the imperative focus move — useful when opening a menu from an
   * input you want to keep focused.
   */
  readonly autoFocusOnOpen = output<VetoableEvent>();

  /**
   * Fires just before focus returns to the trigger on unmount. Call
   * `preventDefault()` on the veto to suppress the return-focus.
   */
  readonly autoFocusOnClose = output<VetoableEvent>();

  readonly triggerId = signal(this.#idGen.next('for-dropdown-menu-trigger'));
  readonly contentId = signal(this.#idGen.next('for-dropdown-menu-content'));

  readonly #initialFocus = signal<'first' | 'last'>('first');
  readonly initialFocus = this.#initialFocus.asReadonly();

  readonly #triggerEl = signal<HTMLElement | null>(null);
  readonly trigger = this.#triggerEl.asReadonly();
  readonly anchor = computed<ReferenceElement | null>(() => this.#triggerEl());
  readonly dismissableExemptions = computed<readonly HTMLElement[]>(() => {
    const t = this.#triggerEl();
    return t ? [t] : [];
  });

  readonly #contentEl = signal<HTMLElement | null>(null);
  readonly content = this.#contentEl.asReadonly();

  /** Top-level: no parent menu. */
  readonly parentMenu = null;

  setInitialFocus(target: 'first' | 'last'): void {
    this.#initialFocus.set(target);
  }

  registerTrigger(el: HTMLElement): void {
    this.#triggerEl.set(el);
  }
  unregisterTrigger(el: HTMLElement): void {
    if (this.#triggerEl() === el) {
      this.#triggerEl.set(null);
    }
  }

  registerContent(el: HTMLElement): void {
    this.#contentEl.set(el);
  }
  unregisterContent(el: HTMLElement): void {
    if (this.#contentEl() === el) {
      this.#contentEl.set(null);
    }
  }

  registerItem(handle: ForMenuItemHandle): void {
    this.#items.register(handle);
  }
  unregisterItem(handle: ForMenuItemHandle): void {
    this.#items.unregister(handle);
  }

  navigate(currentItem: HTMLElement, action: ListNavigationAction): void {
    const items = this.#items.items();
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

  handleTypeahead(event: KeyboardEvent): void {
    if (!this.#typeahead.handle(event)) {
      return;
    }
    const buffer = this.#typeahead.buffer().toLowerCase();
    if (!buffer) {
      return;
    }
    const items = this.#items.items();
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

  focusFirstEnabledItem(): boolean {
    const target = this.#items.items().find((i) => !i.disabled());
    if (!target) {
      return false;
    }
    target.host.focus();
    return true;
  }

  focusLastEnabledItem(): boolean {
    const items = this.#items.items();
    for (let i = items.length - 1; i >= 0; i--) {
      const item = items[i];
      if (item && !item.disabled()) {
        item.host.focus();
        return true;
      }
    }
    return false;
  }

  toggle(initialFocus: 'first' | 'last' = 'first'): void {
    if (this.disabled()) {
      return;
    }
    if (this.open()) {
      this.closeMenu('programmatic');
    } else {
      this.openMenu(initialFocus);
    }
  }

  openMenu(initialFocus: 'first' | 'last' = 'first'): void {
    if (this.disabled()) {
      return;
    }
    this.#initialFocus.set(initialFocus);
    this.open.set(true);
  }

  closeMenu(_reason: ForMenuCloseReason): void {
    this.open.set(false);
  }

  // Shared veto wrapper between `pointerDownOutside` / `focusOutside` and
  // the composite `interactOutside`. The dismissable layer always invokes
  // the specific listener before the composite one for the same physical
  // event, so a `preventDefault()` in either handler vetoes the close.
  #pendingOutsideVeto: VetoableNativeEvent<PointerEvent | FocusEvent> | null = null;

  emitEscapeKeyDown(event: KeyboardEvent): void {
    const vetoed = emitVetoableNativeEvent(this.escapeKeyDown, event);
    if (!vetoed && this.dismissible()) {
      event.stopPropagation();
      this.closeMenu('escape');
    }
  }

  emitPointerDownOutside(event: PointerEvent): void {
    this.#pendingOutsideVeto = createVetoableNativeEvent<PointerEvent | FocusEvent>(event);
    this.pointerDownOutside.emit(this.#pendingOutsideVeto as VetoableNativeEvent<PointerEvent>);
  }

  emitFocusOutside(event: FocusEvent): void {
    this.#pendingOutsideVeto = createVetoableNativeEvent<PointerEvent | FocusEvent>(event);
    this.focusOutside.emit(this.#pendingOutsideVeto as VetoableNativeEvent<FocusEvent>);
  }

  emitInteractOutside(event: PointerEvent | FocusEvent): void {
    const veto =
      this.#pendingOutsideVeto ?? createVetoableNativeEvent<PointerEvent | FocusEvent>(event);
    this.#pendingOutsideVeto = null;
    this.interactOutside.emit(veto);
    if (!veto.defaultPrevented && this.dismissible()) {
      this.closeMenu('pointerDownOutside');
    }
  }

  emitAutoFocusOnOpen(): boolean {
    return emitVetoableEvent(this.autoFocusOnOpen);
  }

  emitAutoFocusOnClose(): boolean {
    return emitVetoableEvent(this.autoFocusOnClose);
  }
}

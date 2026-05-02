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
import type { Placement, ReferenceElement } from '@floating-ui/dom';

import { Collection } from '../_internal/collection/collection';
import { IdGenerator } from '../_internal/id-generator/id-generator';
import {
  type ListNavigationAction,
  moveIndex,
} from '../_internal/keyboard-navigation/keyboard-navigation';
import { injectTypeahead } from '../_internal/typeahead/typeahead';
import {
  FOR_MENU_CONTEXT,
  type ForMenuCloseReason,
  type ForMenuContext,
  type ForMenuItemHandle,
} from '../menu/menu-context';

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

  /**
   * Two-way bindable. Whether the menu is currently shown. The `model()`
   * change emitter (`(openChange)`) fires only on internal transitions
   * (trigger toggle, Escape, outside dismissal, item selection), never on
   * consumer writes via `[(open)]`.
   */
  readonly open = model<boolean>(false);

  readonly placement = input<Placement>('bottom-start');
  readonly offset = input<number>(4);
  readonly loop = input(true, { transform: booleanAttribute });

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

  readonly escapeKeyDown = output<KeyboardEvent>();
  readonly pointerDownOutside = output<PointerEvent>();
  readonly focusOutside = output<FocusEvent>();
  readonly interactOutside = output<PointerEvent | FocusEvent>();

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
      const text = (i.host.textContent ?? '').trim().toLowerCase();
      return text.startsWith(buffer);
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

  emitEscapeKeyDown(event: KeyboardEvent): void {
    this.escapeKeyDown.emit(event);
    if (!event.defaultPrevented && this.dismissible()) {
      event.stopPropagation();
      this.closeMenu('escape');
    }
  }

  emitPointerDownOutside(event: PointerEvent): void {
    this.pointerDownOutside.emit(event);
  }

  emitFocusOutside(event: FocusEvent): void {
    this.focusOutside.emit(event);
  }

  emitInteractOutside(event: PointerEvent | FocusEvent): void {
    this.interactOutside.emit(event);
    if (!event.defaultPrevented && this.dismissible()) {
      this.closeMenu('pointerDownOutside');
    }
  }
}

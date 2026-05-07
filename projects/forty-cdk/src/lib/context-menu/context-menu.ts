import {
  booleanAttribute,
  Directive,
  inject,
  input,
  model,
  numberAttribute,
  output,
  signal,
} from '@angular/core';
import type { Placement, ReferenceElement, VirtualElement } from '@floating-ui/dom';

import {
  emitAutoFocusOnClose,
  emitAutoFocusOnOpen,
} from '../_internal/auto-focus-event/auto-focus-event';
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
  FOR_MENU_CONTEXT,
  type ForMenuCloseReason,
  type ForMenuContext,
  type ForMenuItemHandle,
} from '../menu/menu-context';

/**
 * Headless implementation of a right-click / `Shift+F10` menu (variant of
 * the [WAI-ARIA Menu pattern](https://www.w3.org/WAI/ARIA/apg/patterns/menubar/)).
 * Apply on a wrapper that contains a `[forContextMenuTrigger]` and an
 * `@if`-mounted `[forMenuContent]`.
 *
 * The menu is positioned at the pointer location at the time of the
 * `contextmenu` event — implemented via floating-ui's virtual element so
 * placement / flip / shift middleware still apply normally. Selecting an
 * item, Escape, or any outside interaction closes.
 *
 * ```html
 * <div forContextMenu [(open)]="open">
 *   <div forContextMenuTrigger class="region">Right-click here</div>
 *   @if (open()) {
 *     <div forMenuContent (close)="open.set(false)">…</div>
 *   }
 * </div>
 * ```
 */
@Directive({
  selector: '[forContextMenu]',
  exportAs: 'forContextMenu',
  host: {
    '[attr.data-state]': 'open() ? "open" : "closed"',
    '[attr.data-disabled]': 'disabled() ? "" : null',
  },
  providers: [{ provide: FOR_MENU_CONTEXT, useExisting: ForContextMenu }],
})
export class ForContextMenu implements ForMenuContext {
  readonly #idGen = inject(IdGenerator);
  readonly #typeahead = injectTypeahead();
  readonly #items = new Collection<ForMenuItemHandle>();

  readonly open = model<boolean>(false);

  /**
   * Floating-ui placement relative to the pointer. Default `'bottom-start'`
   * (right-of, below). Legacy API — new code should prefer `side` + `align`.
   */
  readonly placement = input<Placement>('bottom-start');

  /**
   * Side the menu is anchored to relative to the pointer. When set, takes
   * precedence over `placement`.
   */
  readonly side = input<FloatingSide | undefined>(undefined);

  /** Alignment along the chosen `side`. Defaults to `'center'`. */
  readonly align = input<FloatingAlign | undefined>(undefined);

  /** Gap (px) along the main axis. Default `0`. Legacy alias for `sideOffset`. */
  readonly offset = input<number>(0);

  /** Gap (px) along the main axis. When set, overrides the legacy `offset`. */
  readonly sideOffset = input(undefined, {
    transform: (v: unknown): number | undefined => (v == null ? undefined : numberAttribute(v)),
  });

  /** Gap (px) along the cross axis. Default `0`. */
  readonly alignOffset = input(0, { transform: numberAttribute });

  /** When `true` (default), `flip` and `shift` keep the menu inside the viewport. */
  readonly avoidCollisions = input(true, { transform: booleanAttribute });

  /** Padding (px) applied uniformly to flip / shift / size. Default `8`. */
  readonly collisionPadding = input(8, { transform: numberAttribute });

  /** Padding (px) for the `arrow` middleware. Default `0`. */
  readonly arrowPadding = input(0, { transform: numberAttribute });

  /** Stickiness behaviour for `shift`. Default `'partial'`. */
  readonly sticky = input<'partial' | 'always' | false>('partial');

  /** When `true`, sets `data-detached=""` while the virtual anchor is off-screen. */
  readonly hideWhenDetached = input(false, { transform: booleanAttribute });

  readonly loop = input(true, { transform: booleanAttribute });

  /**
   * Writing direction. Drives ArrowLeft / ArrowRight semantics on submenu
   * triggers and items underneath this menu (in RTL, ArrowLeft opens a submenu
   * and ArrowRight closes it back). Default `'ltr'`.
   */
  readonly dir = input<WritingDirection>('ltr');

  /**
   * When true, the contextmenu event is allowed to fall through to the
   * native browser menu. Useful for letting the OS-provided context menu
   * appear on certain regions while keeping the directive mounted.
   */
  readonly disabled = input(false, { transform: booleanAttribute });

  readonly dismissible = input(true, { transform: booleanAttribute });
  readonly returnFocus = input(true, { transform: booleanAttribute });
  readonly ariaLabel = input<string | null>(null);

  readonly escapeKeyDown = output<KeyboardEvent>();
  readonly pointerDownOutside = output<PointerEvent>();
  readonly focusOutside = output<FocusEvent>();
  readonly interactOutside = output<PointerEvent | FocusEvent>();

  /**
   * Fires just before the menu sends focus to its first / last enabled
   * item on mount. Call `event.preventDefault()` to skip the imperative
   * focus move.
   */
  readonly autoFocusOnOpen = output<CustomEvent>();

  /**
   * Fires just before focus returns to the trigger on unmount.
   * `preventDefault()` suppresses the return-focus.
   */
  readonly autoFocusOnClose = output<CustomEvent>();

  readonly triggerId = signal(this.#idGen.next('for-context-menu-trigger'));
  readonly contentId = signal(this.#idGen.next('for-context-menu-content'));

  readonly #initialFocus = signal<'first' | 'last'>('first');
  readonly initialFocus = this.#initialFocus.asReadonly();

  readonly #triggerEl = signal<HTMLElement | null>(null);
  readonly trigger = this.#triggerEl.asReadonly();

  readonly #anchor = signal<ReferenceElement | null>(null);
  readonly anchor = this.#anchor.asReadonly();

  /**
   * ContextMenu exempts nothing — a left-click on the right-click region
   * while the menu is open should close it like any other outside click.
   */
  readonly dismissableExemptions = signal<readonly HTMLElement[]>([]).asReadonly();

  readonly #contentEl = signal<HTMLElement | null>(null);
  readonly content = this.#contentEl.asReadonly();

  /** Top-level: no parent menu. */
  readonly parentMenu = null;

  setInitialFocus(target: 'first' | 'last'): void {
    this.#initialFocus.set(target);
  }

  /** Updates the virtual anchor to a 0×0 rect at (`x`, `y`) in viewport coordinates. */
  setVirtualAnchor(x: number, y: number): void {
    const virtual: VirtualElement = {
      getBoundingClientRect: () => ({
        x,
        y,
        width: 0,
        height: 0,
        top: y,
        left: x,
        right: x,
        bottom: y,
        toJSON() {
          return this;
        },
      }),
    };
    this.#anchor.set(virtual);
  }

  /**
   * Updates the virtual anchor to a snapshot of `rect`. Used by the keyboard
   * activators (`Shift+F10`, `ContextMenu` key) so the menu floats off the
   * focused element instead of the pointer position. The rect is captured
   * by value, so subsequent layout changes don't shift the anchor.
   */
  setVirtualAnchorFromRect(rect: DOMRect): void {
    const { x, y, width, height, top, left, right, bottom } = rect;
    const virtual: VirtualElement = {
      getBoundingClientRect: () => ({
        x,
        y,
        width,
        height,
        top,
        left,
        right,
        bottom,
        toJSON() {
          return this;
        },
      }),
    };
    this.#anchor.set(virtual);
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

  emitAutoFocusOnOpen(): boolean {
    return emitAutoFocusOnOpen(this.autoFocusOnOpen);
  }

  emitAutoFocusOnClose(): boolean {
    return emitAutoFocusOnClose(this.autoFocusOnClose);
  }
}

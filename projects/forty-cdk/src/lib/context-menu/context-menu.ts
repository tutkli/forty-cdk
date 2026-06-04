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
import type { ReferenceElement, VirtualElement } from '@floating-ui/dom';

import type { FloatingAlign, FloatingSide } from '../_internal/floating/floating';
import type { WritingDirection } from '../_internal/keyboard-navigation/keyboard-navigation';
import { createMenuOverlay } from '../_internal/menu-overlay/menu-overlay';
import { injectTextDirection } from '../_internal/text-direction/text-direction';
import type { VetoableEvent, VetoableNativeEvent } from '../_internal/vetoable-event/vetoable-event';
import { FOR_MENU_CONTEXT, type ForMenuContext } from '../menu/menu-context';
import { FOR_CONTEXT_MENU_DEFAULTS } from './context-menu-defaults';

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
 *
 * Most of the directive's body (id generation, item collection, typeahead,
 * navigate / focus helpers, escape / outside-click veto plumbing) is owned
 * by the shared `_internal/menu-overlay` helper. The directive contributes
 * the inputs / outputs / model that make up the public surface, the
 * pointer-driven `VirtualElement` anchor (`setVirtualAnchor` /
 * `setVirtualAnchorFromRect`), and the contextmenu-specific dismissable
 * semantics (no exemption — a left-click on the right-click region while
 * the menu is open should close it).
 */
@Directive({
  selector: '[forContextMenu]',
  exportAs: 'forContextMenu',
  host: {
    '[attr.data-state]': 'open() ? "open" : "closed"',
    '[attr.data-disabled]': 'disabled() ? "" : null',
    '[attr.dir]': 'dir()',
  },
  providers: [{ provide: FOR_MENU_CONTEXT, useExisting: ForContextMenu }],
})
export class ForContextMenu implements ForMenuContext {
  readonly #defaults = inject(FOR_CONTEXT_MENU_DEFAULTS);

  readonly open = model<boolean>(false);

  /**
   * Side the menu is anchored to relative to the pointer. Defaults to
   * `'bottom'`. Pair with `align` for the full positioning API.
   */
  readonly side = input<FloatingSide | undefined>('bottom');

  /** Alignment along the chosen `side`. Defaults to `'start'`. */
  readonly align = input<FloatingAlign | undefined>('start');

  /**
   * Gap (px) along the main axis. Default `0`. The default is read from
   * `provideForContextMenuDefaults` for the surrounding scope.
   */
  readonly sideOffset = input(this.#defaults.sideOffset, { transform: numberAttribute });

  /** Gap (px) along the cross axis. Default `0`. */
  readonly alignOffset = input(0, { transform: numberAttribute });

  /** When `true` (default), `flip` and `shift` keep the menu inside the viewport. */
  readonly avoidCollisions = input(true, { transform: booleanAttribute });

  /**
   * Padding (px) applied uniformly to flip / shift / size. Default `8`.
   * The default is read from `provideForContextMenuDefaults` for the
   * surrounding scope.
   */
  readonly collisionPadding = input(this.#defaults.collisionPadding, {
    transform: numberAttribute,
  });

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
   * and ArrowRight closes it back). When unset (default `null`), the inherited
   * ambient direction is resolved from the nearest ancestor carrying a `dir`
   * attribute (or `<html dir>`), defaulting to `'ltr'`. An explicit `[dir]`
   * always wins, the resolved value is reflected to the host `dir` attribute,
   * and it is inherited by descendant submenus.
   */
  readonly _dirInput = input<WritingDirection | null>(null, { alias: 'dir' });
  readonly dir = injectTextDirection(this._dirInput);

  /**
   * When true, the contextmenu event is allowed to fall through to the
   * native browser menu. Useful for letting the OS-provided context menu
   * appear on certain regions while keeping the directive mounted.
   */
  readonly disabled = input(false, { transform: booleanAttribute });

  readonly dismissible = input(true, { transform: booleanAttribute });
  readonly returnFocus = input(true, { transform: booleanAttribute });
  readonly ariaLabel = input<string | null>(null);

  readonly escapeKeyDown = output<VetoableNativeEvent<KeyboardEvent>>();
  readonly pointerDownOutside = output<VetoableNativeEvent<PointerEvent>>();
  readonly focusOutside = output<VetoableNativeEvent<FocusEvent>>();
  readonly interactOutside = output<VetoableNativeEvent<PointerEvent | FocusEvent>>();

  /**
   * Fires just before the menu sends focus to its first / last enabled
   * item on mount. Call `preventDefault()` on the emitted veto to skip
   * the imperative focus move.
   */
  readonly autoFocusOnOpen = output<VetoableEvent>();

  /**
   * Fires just before focus returns to the trigger on unmount. Call
   * `preventDefault()` on the veto to suppress the return-focus.
   */
  readonly autoFocusOnClose = output<VetoableEvent>();

  readonly #overlay = createMenuOverlay('for-context-menu', {
    open: this.open,
    disabled: this.disabled,
    dismissible: this.dismissible,
    loop: this.loop,
    escapeKeyDown: this.escapeKeyDown,
    pointerDownOutside: this.pointerDownOutside,
    focusOutside: this.focusOutside,
    interactOutside: this.interactOutside,
    autoFocusOnOpen: this.autoFocusOnOpen,
    autoFocusOnClose: this.autoFocusOnClose,
  });

  readonly triggerId = this.#overlay.triggerId;
  readonly contentId = this.#overlay.contentId;
  readonly initialFocus = this.#overlay.initialFocus;
  readonly lastCloseReason = this.#overlay.lastCloseReason;
  readonly trigger = this.#overlay.trigger;
  readonly content = this.#overlay.content;

  readonly #anchor = signal<ReferenceElement | null>(null);
  readonly anchor = this.#anchor.asReadonly();

  /**
   * ContextMenu exempts nothing — a left-click on the right-click region
   * while the menu is open should close it like any other outside click.
   */
  readonly dismissableExemptions = signal<readonly HTMLElement[]>([]).asReadonly();

  /** Top-level: no parent menu. */
  readonly parentMenu = null;

  setInitialFocus = this.#overlay.setInitialFocus.bind(this.#overlay);
  registerTrigger = this.#overlay.registerTrigger.bind(this.#overlay);
  unregisterTrigger = this.#overlay.unregisterTrigger.bind(this.#overlay);
  registerContent = this.#overlay.registerContent.bind(this.#overlay);
  unregisterContent = this.#overlay.unregisterContent.bind(this.#overlay);
  registerItem = this.#overlay.registerItem.bind(this.#overlay);
  unregisterItem = this.#overlay.unregisterItem.bind(this.#overlay);
  navigate = this.#overlay.navigate.bind(this.#overlay);
  handleTypeahead = this.#overlay.handleTypeahead.bind(this.#overlay);
  focusFirstEnabledItem = this.#overlay.focusFirstEnabledItem.bind(this.#overlay);
  focusLastEnabledItem = this.#overlay.focusLastEnabledItem.bind(this.#overlay);
  toggle = this.#overlay.toggle.bind(this.#overlay);
  openMenu = this.#overlay.openMenu.bind(this.#overlay);
  closeMenu = this.#overlay.closeMenu.bind(this.#overlay);
  emitEscapeKeyDown = this.#overlay.emitEscapeKeyDown.bind(this.#overlay);
  emitPointerDownOutside = this.#overlay.emitPointerDownOutside.bind(this.#overlay);
  emitFocusOutside = this.#overlay.emitFocusOutside.bind(this.#overlay);
  emitInteractOutside = this.#overlay.emitInteractOutside.bind(this.#overlay);
  emitAutoFocusOnOpen = this.#overlay.emitAutoFocusOnOpen.bind(this.#overlay);
  emitAutoFocusOnClose = this.#overlay.emitAutoFocusOnClose.bind(this.#overlay);

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
}

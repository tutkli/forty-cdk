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

import {
  type FloatingAlign,
  type FloatingFallbackAxisSideDirection,
  type FloatingSide,
  type WritingDirection,
  createMenuOverlay,
  MenuOverlayHost,
  MENU_POSITIONING_DEFAULTS,
  injectTextDirection,
  type VetoableEvent,
  type VetoableNativeEvent,
  FOR_MENU_CONTEXT,
  type ForMenuContext,
} from 'forty-cdk/core';
import { FOR_CONTEXT_MENU_CONTEXT, type ForContextMenuContext } from './context-menu-context';
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
 *     <div forMenuContent>…</div>
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
  providers: [
    { provide: FOR_MENU_CONTEXT, useExisting: ForContextMenu },
    { provide: FOR_CONTEXT_MENU_CONTEXT, useExisting: ForContextMenu },
  ],
})
export class ForContextMenu
  extends MenuOverlayHost
  implements ForMenuContext, ForContextMenuContext
{
  readonly #defaults = inject(FOR_CONTEXT_MENU_DEFAULTS);

  readonly open = model<boolean>(false);

  /**
   * Side the menu is anchored to relative to the pointer. Defaults to
   * `'bottom'`. Pair with `align` for the full positioning API.
   *
   * One of the floating-ui positioning inputs shared verbatim across the
   * three menu roots — their non-seed defaults come from the single
   * `MENU_POSITIONING_DEFAULTS` source and `menu-positioning-inputs.spec.ts`
   * guards the three roots against drift.
   */
  readonly side = input<FloatingSide | undefined>(MENU_POSITIONING_DEFAULTS.side);

  /** Alignment along the chosen `side`. Defaults to `'start'`. */
  readonly align = input<FloatingAlign | undefined>(MENU_POSITIONING_DEFAULTS.align);

  /**
   * Gap (px) along the main axis. Default `0`. The default is read from
   * `provideForContextMenuDefaults` for the surrounding scope.
   */
  readonly sideOffset = input(this.#defaults.sideOffset, { transform: numberAttribute });

  /** Gap (px) along the cross axis. Default `0`. */
  readonly alignOffset = input(MENU_POSITIONING_DEFAULTS.alignOffset, {
    transform: numberAttribute,
  });

  /** When `true` (default), `flip` and `shift` keep the menu inside the viewport. */
  readonly avoidCollisions = input(MENU_POSITIONING_DEFAULTS.avoidCollisions, {
    transform: booleanAttribute,
  });

  /**
   * Direction `flip` falls back to on the perpendicular axis when both sides of
   * the preferred axis overflow. `'none'` (default) keeps only the opposite
   * same-axis placement; `'start'` / `'end'` let the menu drop to a
   * perpendicular side on a narrow viewport. Only consulted when
   * `avoidCollisions` is on.
   */
  readonly fallbackAxisSideDirection = input<FloatingFallbackAxisSideDirection>(
    MENU_POSITIONING_DEFAULTS.fallbackAxisSideDirection,
  );

  /**
   * Padding (px) applied uniformly to flip / shift / size. Default `8`.
   * The default is read from `provideForContextMenuDefaults` for the
   * surrounding scope.
   */
  readonly collisionPadding = input(this.#defaults.collisionPadding, {
    transform: numberAttribute,
  });

  /** Padding (px) for the `arrow` middleware. Default `0`. */
  readonly arrowPadding = input(MENU_POSITIONING_DEFAULTS.arrowPadding, {
    transform: numberAttribute,
  });

  /** Stickiness behaviour for `shift`. Default `'partial'`. */
  readonly sticky = input<'partial' | 'always' | false>(MENU_POSITIONING_DEFAULTS.sticky);

  /** When `true`, sets `data-detached=""` while the virtual anchor is off-screen. */
  readonly hideWhenDetached = input(MENU_POSITIONING_DEFAULTS.hideWhenDetached, {
    transform: booleanAttribute,
  });

  /**
   * When `true` (default), the menu is clipped until floating-ui resolves
   * its first position, preventing a flash at the viewport corner. Set to
   * `false` so a dramatic `animate.enter` plays from its first frame.
   */
  readonly clipUntilPositioned = input(MENU_POSITIONING_DEFAULTS.clipUntilPositioned, {
    transform: booleanAttribute,
  });

  /**
   * When `true` (default), arrow-key navigation wraps from the last enabled
   * item back to the first (and vice versa). When `false`, navigation stops
   * at the ends.
   */
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

  /** When true (default), Escape, pointer-down outside, and focus outside close the menu. */
  readonly dismissible = input(true, { transform: booleanAttribute });

  /** When true (default), focus returns to the right-click target on close. */
  readonly returnFocus = input(true, { transform: booleanAttribute });

  /** Manual `aria-label` on `[forMenuContent]`. Use when there is no meaningful labelling element. */
  readonly ariaLabel = input<string | null>(null);

  /**
   * Fires when Escape is pressed while the menu is open, just before it
   * closes. Call `preventDefault()` on the emitted veto to keep the menu
   * open and suppress the Escape-driven close.
   */
  readonly escapeKeyDown = output<VetoableNativeEvent<KeyboardEvent>>();

  /**
   * Fires on a pointer-down outside the menu, just before it closes. Call
   * `preventDefault()` on the veto to keep the menu open.
   */
  readonly pointerDownOutside = output<VetoableNativeEvent<PointerEvent>>();

  /**
   * Fires when focus moves outside the menu, just before it closes. Call
   * `preventDefault()` on the veto to keep the menu open.
   */
  readonly focusOutside = output<VetoableNativeEvent<FocusEvent>>();

  /**
   * Composite outside-interaction channel: fires for either a
   * pointer-down-outside or a focus-outside, just before the menu closes.
   * Call `preventDefault()` on the veto to keep the menu open regardless of
   * which interaction triggered it.
   */
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

  protected readonly _overlay = createMenuOverlay('for-context-menu', {
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

  readonly #anchor = signal<ReferenceElement | null>(null);
  readonly anchor = this.#anchor.asReadonly();

  /**
   * ContextMenu exempts nothing — a left-click on the right-click region
   * while the menu is open should close it like any other outside click.
   */
  readonly dismissableExemptions = signal<readonly HTMLElement[]>([]).asReadonly();

  /** Top-level: no parent menu. */
  readonly parentMenu = null;

  /** Updates the virtual anchor to a 0×0 rect at (`x`, `y`) in viewport coordinates. */
  setVirtualAnchor(x: number, y: number): void {
    this.#anchor.set(this.#virtualAnchor(x, y, 0, 0));
  }

  /**
   * Updates the virtual anchor to a snapshot of `rect`. Used by the keyboard
   * activators (`Shift+F10`, `ContextMenu` key) so the menu floats off the
   * focused element instead of the pointer position. The rect is captured
   * by value, so subsequent layout changes don't shift the anchor.
   */
  setVirtualAnchorFromRect(rect: DOMRect): void {
    this.#anchor.set(this.#virtualAnchor(rect.x, rect.y, rect.width, rect.height));
  }

  #virtualAnchor(x: number, y: number, width: number, height: number): VirtualElement {
    return {
      getBoundingClientRect: () => ({
        x,
        y,
        width,
        height,
        top: y,
        left: x,
        right: x + width,
        bottom: y + height,
        toJSON() {
          return this;
        },
      }),
    };
  }
}

import { booleanAttribute, Directive, inject, input, model, output, signal } from '@angular/core';

import {
  type WritingDirection,
  injectTextDirection,
  type VetoableEvent,
  type VetoableNativeEvent,
} from 'forty-cdk/core';
import {
  type AnchoredPositioningOverride,
  type FloatingFallbackAxisSideDirection,
  createMenuOverlay,
  MenuOverlayHost,
  FOR_MENU_CONTEXT,
  type ForMenuContext,
} from 'forty-cdk/core-overlay';
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
 * `setVirtualAnchorFromRect`), and the contextmenu-specific dismissible
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
  protected readonly positioningDefaults = inject(FOR_CONTEXT_MENU_DEFAULTS);

  /**
   * Two-way bindable. Whether the menu is currently shown. The `model()` change emitter fires only
   * when the primitive itself opens or closes the menu, never on consumer writes through
   * `[(open)]`.
   */
  readonly open = model<boolean>(false);

  /**
   * Direction `flip` falls back to on the perpendicular axis when both sides of
   * the preferred axis overflow. `'none'` (default) keeps only the opposite
   * same-axis placement; `'start'` / `'end'` let the menu drop to a
   * perpendicular side on a narrow viewport. Only consulted when
   * `avoidCollisions` is on. The default is read from
   * `provideForContextMenuDefaults` for the surrounding scope, since dropping to
   * a perpendicular side is a design-system-wide viewport-degradation policy
   * rather than a per-menu one.
   */
  readonly fallbackAxisSideDirection = input<FloatingFallbackAxisSideDirection>(
    this.positioningDefaults.fallbackAxisSideDirection,
  );

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

  /**
   * Accessible name reflected as `aria-label` on `[forMenuContent]`. This is
   * the only name hook the root exposes for a context menu: the right-click
   * region is never used as an `aria-labelledby` target, so with no
   * `ariaLabel` (and no consumer-set static `aria-labelledby` on the content)
   * the surface exposes no accessible name at all.
   */
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

  /**
   * Virtual-anchor only: a context menu with no recorded pointer / rect position
   * stays unanchored rather than falling back to its whole right-click region.
   */
  readonly anchor = this._overlay.openerVirtualAnchor;

  /**
   * The region's own `[menuPositioning]` override, resolved by the base ahead
   * of this root's `[side]` / `[align]` / `[sideOffset]` / `[alignOffset]`. It
   * runs through the opener registry so a trigger carries the same override
   * here as it does under a shared `[forMenu]` root; with no override the four
   * values are this root's inputs verbatim.
   */
  protected override positioningOverride(): AnchoredPositioningOverride | null {
    return this._overlay.openerPositioning();
  }

  /**
   * ContextMenu exempts nothing — a left-click on the right-click region
   * while the menu is open should close it like any other outside click. The
   * right-click region registers without asking for an exemption, so the shared
   * opener registry resolves this to an empty list rather than a second source.
   */
  readonly dismissibleExemptions = this._overlay.openerExemptions;

  /**
   * The right-click region is not a labelling element, so `[forMenuContent]`
   * emits no `aria-labelledby` fallback for this flavor — pointing the menu's
   * name at the region would announce its entire text. Name the menu with
   * `[ariaLabel]` instead.
   *
   * Constant: this root's only opener flavour is the region, so unlike
   * `[forMenu]` it has nothing to resolve per opener.
   */
  readonly triggerLabelsMenu = signal(false).asReadonly();

  /** Top-level: no parent menu. */
  readonly parentMenu = null;

  /**
   * Updates the virtual anchor to a 0×0 rect at (`x`, `y`) in viewport
   * coordinates. Widens the shared base's protected pass-through to the public
   * `ForContextMenuContext` member `[forContextMenuTrigger]` calls.
   */
  override setVirtualAnchor(x: number, y: number): void {
    super.setVirtualAnchor(x, y);
  }

  /**
   * Updates the virtual anchor to a snapshot of `rect`. Used by the keyboard
   * activators (`Shift+F10`, `ContextMenu` key) so the menu floats off the
   * focused element instead of the pointer position. The rect is captured
   * by value, so subsequent layout changes don't shift the anchor.
   */
  override setVirtualAnchorFromRect(rect: DOMRect): void {
    super.setVirtualAnchorFromRect(rect);
  }
}

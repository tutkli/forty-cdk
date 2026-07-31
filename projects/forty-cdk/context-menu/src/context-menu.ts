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
  readonly _sideInput = input<FloatingSide | undefined>(MENU_POSITIONING_DEFAULTS.side, {
    alias: 'side',
  });

  /** Alignment along the chosen `side`. Defaults to `'start'`. */
  readonly _alignInput = input<FloatingAlign | undefined>(MENU_POSITIONING_DEFAULTS.align, {
    alias: 'align',
  });

  /**
   * Gap (px) along the main axis. Default `0`. The default is read from
   * `provideForContextMenuDefaults` for the surrounding scope.
   */
  readonly _sideOffsetInput = input(this.#defaults.sideOffset, {
    transform: numberAttribute,
    alias: 'sideOffset',
  });

  /** Gap (px) along the cross axis. Default `0`. */
  readonly _alignOffsetInput = input(MENU_POSITIONING_DEFAULTS.alignOffset, {
    transform: numberAttribute,
    alias: 'alignOffset',
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
   * Side the surface is anchored to: the region's own `[menuPositioning]`
   * override when it declared one, else this root's `[side]`. The four
   * placement values resolve through the opener registry so a trigger carries
   * the same override here as it does under a shared `[forMenu]` root (#1574);
   * with no override the value is this root's input verbatim.
   */
  readonly side = computed(() => this._overlay.openerPositioning()?.side ?? this._sideInput());

  /** Alignment: the region's `[menuPositioning]` override, else this root's `[align]`. */
  readonly align = computed(() => this._overlay.openerPositioning()?.align ?? this._alignInput());

  /** Main-axis gap: the region's `[menuPositioning]` override, else this root's `[sideOffset]`. */
  readonly sideOffset = computed(
    () => this._overlay.openerPositioning()?.sideOffset ?? this._sideOffsetInput(),
  );

  /** Cross-axis gap: the region's `[menuPositioning]` override, else this root's `[alignOffset]`. */
  readonly alignOffset = computed(
    () => this._overlay.openerPositioning()?.alignOffset ?? this._alignOffsetInput(),
  );

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

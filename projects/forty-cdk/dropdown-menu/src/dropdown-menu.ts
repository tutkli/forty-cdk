import {
  booleanAttribute,
  computed,
  Directive,
  inject,
  input,
  model,
  numberAttribute,
  output,
} from '@angular/core';
import type { ReferenceElement } from '@floating-ui/dom';

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
 *     <div forMenuContent>…</div>
 *   }
 * </div>
 * ```
 *
 * Selecting a `[forMenuItem]` closes the menu (call `event.preventDefault()`
 * on the item's `(activate)` event to keep it open). Escape, pointer-down
 * outside, and focus-outside also close — each emits a vetoable event.
 *
 * Most of the directive's body (id generation, item collection, typeahead,
 * navigate / focus helpers, escape / outside-click veto plumbing) is owned
 * by the shared `_internal/menu-overlay` helper. The directive contributes
 * the inputs / outputs / model that make up the public surface, the
 * trigger-anchored `anchor` and `dismissableExemptions`, and the
 * `aria-haspopup="menu"` / return-focus semantics specific to the
 * Menu Button pattern.
 */
@Directive({
  selector: '[forDropdownMenu]',
  exportAs: 'forDropdownMenu',
  host: {
    '[attr.data-state]': 'open() ? "open" : "closed"',
    '[attr.data-disabled]': 'disabled() ? "" : null',
    '[attr.dir]': 'dir()',
  },
  providers: [{ provide: FOR_MENU_CONTEXT, useExisting: ForDropdownMenu }],
})
export class ForDropdownMenu extends MenuOverlayHost implements ForMenuContext {
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
   * Gap (px) between trigger and menu along the main axis. Default `4`.
   * The default is read from
   * `provideForDropdownMenuDefaults` for the surrounding scope.
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
   * The default is read from `provideForDropdownMenuDefaults` for the
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

  /** When `true`, sets `data-detached=""` while the trigger is scrolled off-screen. */
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

  /**
   * Fires when Escape is pressed while the menu is open, just before it
   * closes. Call `preventDefault()` on the emitted veto to keep the menu
   * open and suppress the Escape-driven close.
   */
  readonly escapeKeyDown = output<VetoableNativeEvent<KeyboardEvent>>();

  /**
   * Fires on a pointer-down outside the menu (and outside the exempt
   * trigger), just before it closes. Call `preventDefault()` on the veto to
   * keep the menu open.
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
   * the imperative focus move — useful when opening a menu from an
   * input you want to keep focused.
   */
  readonly autoFocusOnOpen = output<VetoableEvent>();

  /**
   * Fires just before focus returns to the trigger on unmount. Call
   * `preventDefault()` on the veto to suppress the return-focus.
   */
  readonly autoFocusOnClose = output<VetoableEvent>();

  protected readonly _overlay = createMenuOverlay('for-dropdown-menu', {
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

  readonly anchor = computed<ReferenceElement | null>(() => this._overlay.trigger());
  readonly dismissableExemptions = computed<readonly HTMLElement[]>(() => {
    const t = this._overlay.trigger();
    return t ? [t] : [];
  });

  /** Top-level: no parent menu. */
  readonly parentMenu = null;
}

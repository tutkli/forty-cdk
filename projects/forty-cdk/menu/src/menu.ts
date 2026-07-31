import {
  booleanAttribute,
  Directive,
  inject,
  input,
  model,
  numberAttribute,
  output,
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
import { FOR_MENU_DEFAULTS } from './menu-defaults';

/**
 * Opener-agnostic menu root: one `[forMenuContent]` definition that any number
 * of heterogeneous openers can drive. Implements the same
 * [WAI-ARIA Menu Button / Menu semantics](https://www.w3.org/WAI/ARIA/apg/patterns/menu-button/)
 * as `[forDropdownMenu]` and `[forContextMenu]`, which stay as its single-opener
 * presets.
 *
 * Reach for it when the same actions must be reachable two ways — the canonical
 * case being a table row with a kebab button *and* a right-click region, where
 * the two presets would each need their own root and therefore their own copy of
 * every item:
 *
 * ```html
 * <tr forMenu #row="forMenu" [(open)]="open" ariaLabel="Row actions">
 *   <td [forContextMenuTrigger]="row">…cells…</td>
 *   <td><button [forDropdownMenuTrigger]="row">⋮</button></td>
 *
 *   @if (open()) {
 *     <div forMenuContent>
 *       <button forMenuItem (activate)="edit()">Edit</button>
 *       <button forMenuItem (activate)="remove()">Delete</button>
 *     </div>
 *   }
 * </tr>
 * ```
 *
 * Exactly one instance is open at a time, and everything the mounted surface
 * resolves follows the **active opener** — the one that fired: return-focus lands
 * on it, and the floating-ui anchor is its element for a button opener or its
 * recorded pointer / rect position for a right-click opener. Each opener carries
 * its own `id`, so two of them never emit the same one.
 *
 * `[forDropdownMenuTrigger]` resolves this root through DI like any menu piece.
 * `[forContextMenuTrigger]` resolves `FOR_CONTEXT_MENU_CONTEXT`, which this root
 * deliberately does not provide (`forty-cdk/menu` must not depend on
 * `forty-cdk/context-menu`), so bind it explicitly —
 * `[forContextMenuTrigger]="row"` with `#row="forMenu"`.
 *
 * Accessible name: the labelling policy follows the active opener too. A button
 * opener is a discrete labelling control, so the surface falls back to
 * `aria-labelledby="<openerId>"` for it; a right-click region is not — pointing
 * the menu's name at a whole row would announce the entire row — so nothing is
 * emitted for that one. `[ariaLabel]` wins over both, and a shared menu with any
 * region opener still wants it.
 *
 * Positioning is shared by every opener (per-opener overrides are out of scope
 * for now), and seeded from `provideForMenuDefaults` — `sideOffset` defaults to
 * `0`, flush against the anchor, which is what a pointer-anchored open wants. A
 * button-only shared menu typically sets `[sideOffset]="4"` to match
 * `[forDropdownMenu]`.
 */
@Directive({
  selector: '[forMenu]',
  exportAs: 'forMenu',
  host: {
    '[attr.data-state]': 'open() ? "open" : "closed"',
    '[attr.data-disabled]': 'disabled() ? "" : null',
    '[attr.dir]': 'dir()',
  },
  providers: [{ provide: FOR_MENU_CONTEXT, useExisting: ForMenu }],
})
export class ForMenu extends MenuOverlayHost implements ForMenuContext {
  readonly #defaults = inject(FOR_MENU_DEFAULTS);

  /**
   * Two-way bindable. Whether the menu is currently shown. The `model()`
   * change emitter (`(openChange)`) fires only on internal transitions
   * (an opener activating, Escape, outside dismissal, item selection), never on
   * consumer writes via `[(open)]`.
   */
  readonly open = model<boolean>(false);

  /**
   * Side the menu is anchored to. Defaults to `'bottom'`. Pair with
   * `align` for the full positioning API.
   *
   * One of the floating-ui positioning inputs shared verbatim across the
   * menu roots — their non-seed defaults come from the single
   * `MENU_POSITIONING_DEFAULTS` source and `menu-positioning-inputs.spec.ts`
   * guards the roots against drift.
   */
  readonly side = input<FloatingSide | undefined>(MENU_POSITIONING_DEFAULTS.side);

  /** Alignment along the chosen `side`. Defaults to `'start'`. */
  readonly align = input<FloatingAlign | undefined>(MENU_POSITIONING_DEFAULTS.align);

  /**
   * Gap (px) between the active opener's anchor and the menu along the main
   * axis. Default `0`. The default is read from `provideForMenuDefaults` for the
   * surrounding scope.
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
   * The default is read from `provideForMenuDefaults` for the surrounding scope.
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

  /** When `true`, sets `data-detached=""` while the active anchor is scrolled off-screen. */
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
   * When true, every opener is ignored and any open menu stays open until the
   * consumer flips `open` themselves. Each opener reflects `data-disabled`; the
   * items keep their per-item disabled semantics.
   */
  readonly disabled = input(false, { transform: booleanAttribute });

  /** When true (default), Escape, pointer-down outside, and focus outside close the menu. */
  readonly dismissible = input(true, { transform: booleanAttribute });

  /** When true (default), focus returns to the opener that opened the menu on close. */
  readonly returnFocus = input(true, { transform: booleanAttribute });

  /**
   * Accessible name reflected as `aria-label` on `[forMenuContent]`. It wins over
   * the per-opener `aria-labelledby="<openerId>"` fallback for every opener, so
   * set it when the menu needs one name regardless of how it was opened.
   *
   * Without it the surface names itself after the **active** opener when that
   * opener is a labelling control (a `[forDropdownMenuTrigger]` button) and
   * exposes no accessible name when it is not (a `[forContextMenuTrigger]`
   * region, whose whole text would otherwise be announced as the menu's name) —
   * so a shared menu with any region opener still wants an `ariaLabel`.
   */
  readonly ariaLabel = input<string | null>(null);

  /**
   * Fires when Escape is pressed while the menu is open, just before it
   * closes. Call `preventDefault()` on the emitted veto to keep the menu
   * open and suppress the Escape-driven close.
   */
  readonly escapeKeyDown = output<VetoableNativeEvent<KeyboardEvent>>();

  /**
   * Fires on a pointer-down outside the menu (and outside any exempt opener),
   * just before it closes. Call `preventDefault()` on the veto to keep the menu
   * open.
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
   * Fires just before focus returns to the active opener on unmount. Call
   * `preventDefault()` on the veto to suppress the return-focus.
   */
  readonly autoFocusOnClose = output<VetoableEvent>();

  protected readonly _overlay = createMenuOverlay('for-menu', {
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
   * The active opener's anchor: its recorded pointer / rect position when it set
   * one, otherwise its own element.
   */
  readonly anchor = this._overlay.openerAnchor;

  /**
   * Only the openers that asked to count as "inside" — a toggle-style button
   * opener, whose own click already toggles and would otherwise double-close. A
   * right-click region opts out, so a left-click on it closes the menu.
   */
  readonly dismissibleExemptions = this._overlay.openerExemptions;

  /**
   * Resolved against the **active** opener, because a shared menu's openers are
   * heterogeneous: a `[forDropdownMenuTrigger]` button is a discrete labelling
   * control, a `[forContextMenuTrigger]` region is not. So `[forMenuContent]`
   * falls back to `aria-labelledby="<openerId>"` for a button-opened instance and
   * emits nothing for a region-opened one — and flips as the menu is reopened
   * from the other opener. `false` while no single opener is resolvable.
   */
  readonly triggerLabelsMenu = this._overlay.openerLabelsMenu;

  /** Top-level: no parent menu. */
  readonly parentMenu = null;

  /**
   * Anchors the active opener's next open at a 0×0 rect at (`x`, `y`) in viewport
   * coordinates. Widens the shared base's protected pass-through so a
   * pointer-driven opener can reach it through this root's exported reference.
   */
  override setVirtualAnchor(x: number, y: number): void {
    super.setVirtualAnchor(x, y);
  }

  /**
   * Anchors the active opener's next open at a by-value snapshot of `rect`, so
   * later layout changes don't shift it. Used by the keyboard activators of a
   * pointer-driven opener (`Shift+F10`, the `ContextMenu` key).
   */
  override setVirtualAnchorFromRect(rect: DOMRect): void {
    super.setVirtualAnchorFromRect(rect);
  }
}

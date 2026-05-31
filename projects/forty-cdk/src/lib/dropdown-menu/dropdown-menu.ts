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

import type { FloatingAlign, FloatingSide } from '../_internal/floating/floating';
import type { WritingDirection } from '../_internal/keyboard-navigation/keyboard-navigation';
import { createMenuOverlay } from '../_internal/menu-overlay/menu-overlay';
import type { VetoableEvent, VetoableNativeEvent } from '../_internal/vetoable-event/vetoable-event';
import { FOR_MENU_CONTEXT, type ForMenuContext } from '../menu/menu-context';
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
export class ForDropdownMenu implements ForMenuContext {
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

  readonly #overlay = createMenuOverlay('for-dropdown-menu', {
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
  readonly trigger = this.#overlay.trigger;
  readonly content = this.#overlay.content;
  readonly anchor = computed<ReferenceElement | null>(() => this.#overlay.trigger());
  readonly dismissableExemptions = computed<readonly HTMLElement[]>(() => {
    const t = this.#overlay.trigger();
    return t ? [t] : [];
  });

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
}

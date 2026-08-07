import { isPlatformBrowser } from '@angular/common';
import {
  booleanAttribute,
  computed,
  DestroyRef,
  Directive,
  inject,
  input,
  model,
  numberAttribute,
  output,
  PLATFORM_ID,
} from '@angular/core';
import type { ReferenceElement } from '@floating-ui/dom';

import {
  type FloatingAlign,
  type FloatingFallbackAxisSideDirection,
  type FloatingSide,
  createDebouncedAction,
  type WritingDirection,
  createMenuOverlay,
  MenuOverlayHost,
  MENU_POSITIONING_DEFAULTS,
  attachPointerGrace,
  buildSubmenuGracePolygon,
  type Point,
  resolveGraceSide,
  isHoverCapablePointer,
  emitVetoableEvent,
  type VetoableEvent,
  type VetoableNativeEvent,
  FOR_MENU_CONTEXT,
  type ForMenuCloseReason,
  type ForMenuContext,
} from 'forty-cdk/core';
import { FOR_MENU_DEFAULTS } from './menu-defaults';

/**
 * Root for a nested submenu inside a parent `[forDropdownMenu]` /
 * `[forContextMenu]` (or another `[forMenuSub]`). Owns its own open
 * state, ids, and item collection — items inside the submenu register
 * here, not in the parent.
 *
 * The shared item-collection / typeahead / navigate / focus / id /
 * outside-veto logic is owned by the `_internal/menu-overlay` helper (the
 * same one `[forDropdownMenu]` / `[forContextMenu]` compose). The submenu
 * contributes only its genuine differences on top: pointer-driven (hover)
 * open/close scheduling, the autofocus vetoes that keep hover from stealing /
 * returning focus, and the reason-dependent upward `closeMenu` propagation.
 * The pointer paths run through the overlay's own `openMenu` / `closeMenu`
 * (with `{ suppressFocusMoves: true }`, closing with reason `'hover'`), so all
 * three concerns are wired through the `onOpen` / `onClose` lifecycle hooks and
 * `lastCloseReason` / the initial-focus state stay correct on every transition.
 *
 * The parent menu's content is added to this submenu's dismissible
 * exemptions so a click on a parent menu item doesn't fire the
 * submenu's outside-handler (the parent item's own click flow closes
 * everything via propagated `closeMenu`).
 *
 * Closing this submenu propagates `closeMenu` upward for every reason
 * except `'escape'`, `'hover'` and `'programmatic'` — Escape inside a submenu
 * and a hover-leave close only that level, while activating an item or
 * clicking outside everything tears down the entire chain.
 *
 * ```html
 * <div forDropdownMenu [(open)]="open">
 *   <button forDropdownMenuTrigger>Options</button>
 *   @if (open()) {
 *     <div forMenuContent>
 *       <button forMenuItem>Cut</button>
 *       <div forMenuSub [(open)]="moreOpen">
 *         <button forMenuSubTrigger>More</button>
 *         @if (moreOpen()) {
 *           <div forMenuSubContent>
 *             <button forMenuItem>Advanced</button>
 *           </div>
 *         }
 *       </div>
 *     </div>
 *   }
 * </div>
 * ```
 */
@Directive({
  selector: '[forMenuSub]',
  exportAs: 'forMenuSub',
  host: {
    '[attr.data-state]': 'open() ? "open" : "closed"',
    '[attr.data-disabled]': 'disabled() ? "" : null',
  },
  providers: [{ provide: FOR_MENU_CONTEXT, useExisting: ForMenuSub }],
})
export class ForMenuSub extends MenuOverlayHost implements ForMenuContext {
  readonly #defaults = inject(FOR_MENU_DEFAULTS);
  readonly #isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  /** The enclosing menu — required (orphan throws). */
  readonly parentMenu: ForMenuContext;

  /**
   * Two-way bindable. Whether the submenu is currently shown. The `model()` change emitter fires
   * only when the primitive itself opens or closes the submenu, never on consumer writes through
   * `[(open)]`.
   */
  readonly open = model<boolean>(false);

  /**
   * Writing direction. When unset, inherits from the enclosing menu — set
   * `[dir]` once on the top-level `[forDropdownMenu]` / `[forContextMenu]`
   * and every nested submenu picks it up. Override per-submenu only when
   * a specific submenu needs to render against the opposite direction.
   *
   * The input is aliased to `dir`; consumers bind `[dir]="..."` and read
   * the effective value via the public `dir` computed below.
   */
  readonly _dirInput = input<WritingDirection | null>(null, { alias: 'dir' });
  readonly dir = computed<WritingDirection>(() => this._dirInput() ?? this.parentMenu.dir());

  /**
   * Side the submenu opens on. When unset, defaults to `'right'` in LTR
   * and `'left'` in RTL (per `dir`). Set explicitly to pin a side
   * regardless of writing direction.
   *
   * The input is aliased to `side`; consumers bind `[side]="..."` and read
   * the effective value via the public `side` computed below.
   */
  readonly _sideInput = input<FloatingSide | undefined>(undefined, { alias: 'side' });
  readonly side = computed<FloatingSide>(
    () => this._sideInput() ?? (this.dir() === 'rtl' ? 'left' : 'right'),
  );

  /**
   * Gap (px) along the main axis. Defaults to `0` from `provideForMenuDefaults`
   * — a submenu sits flush against its parent item. Now read from the defaults
   * provider (like `[forDropdownMenu]` / `[forContextMenu]`) rather than
   * hardcoded, so it can't drift.
   */
  readonly sideOffset = input(this.#defaults.sideOffset, { transform: numberAttribute });

  /**
   * Alignment along the chosen `side`. Defaults to `'start'`.
   *
   * Shares the single `MENU_POSITIONING_DEFAULTS` source with the two
   * top-level roots; `menu-positioning-inputs.spec.ts` guards the three roots
   * against drift.
   */
  readonly align = input<FloatingAlign | undefined>(MENU_POSITIONING_DEFAULTS.align);

  /** Gap (px) along the cross axis. Default `0`. */
  readonly alignOffset = input(MENU_POSITIONING_DEFAULTS.alignOffset, {
    transform: numberAttribute,
  });

  /** When `true` (default), `flip` and `shift` keep the submenu inside the viewport. */
  readonly avoidCollisions = input(MENU_POSITIONING_DEFAULTS.avoidCollisions, {
    transform: booleanAttribute,
  });

  /**
   * Direction `flip` falls back to on the perpendicular axis when both sides of
   * the preferred axis overflow. `'none'` (default) keeps only the opposite
   * same-axis placement; `'start'` / `'end'` let the submenu drop to a vertical
   * side (`top` / `bottom`) when both horizontal sides are blocked — the
   * graceful-degradation lever for a submenu clipped on a narrow viewport. Only
   * consulted when `avoidCollisions` is on.
   *
   * The default is read from `provideForMenuDefaults` for the surrounding scope,
   * since dropping to a vertical side is a design-system-wide
   * viewport-degradation policy rather than a per-submenu one;
   * `menu-positioning-inputs.spec.ts` guards the roots against drift.
   */
  readonly fallbackAxisSideDirection = input<FloatingFallbackAxisSideDirection>(
    this.#defaults.fallbackAxisSideDirection,
  );

  /**
   * Padding (px) applied uniformly to flip / shift / size. Defaults to `8`
   * from `provideForMenuDefaults` for the surrounding scope.
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

  /** When `true`, sets `data-detached=""` while the parent item is scrolled off-screen. */
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
   * When true, the sub-trigger interaction is ignored and any open submenu
   * stays open until the consumer flips `open`. Layered on top of the parent
   * menu's own `disabled`.
   */
  readonly disabled = input(false, { transform: booleanAttribute });

  /** When true (default), Escape, pointer-down outside, and focus outside close the submenu. */
  readonly dismissible = input(true, { transform: booleanAttribute });

  /** When true (default), focus returns to the sub-trigger on close. */
  readonly returnFocus = input(true, { transform: booleanAttribute });

  /** Manual `aria-label` on `[forMenuSubContent]`. Use when the sub-trigger isn't a meaningful name. */
  readonly ariaLabel = input<string | null>(null);

  /**
   * Fires when Escape is pressed while the submenu is open, just before it
   * closes. Call `preventDefault()` on the emitted veto to keep the submenu
   * open and suppress the Escape-driven close.
   */
  readonly escapeKeyDown = output<VetoableNativeEvent<KeyboardEvent>>();

  /**
   * Fires on a pointer-down outside the submenu (and outside its exempt
   * parent content), just before it closes. Call `preventDefault()` on the
   * veto to keep the submenu open.
   */
  readonly pointerDownOutside = output<VetoableNativeEvent<PointerEvent>>();

  /**
   * Fires when focus moves outside the submenu, just before it closes. Call
   * `preventDefault()` on the veto to keep the submenu open.
   */
  readonly focusOutside = output<VetoableNativeEvent<FocusEvent>>();

  /**
   * Composite outside-interaction channel: fires for either a
   * pointer-down-outside or a focus-outside, just before the submenu closes.
   * Call `preventDefault()` on the veto to keep the submenu open regardless of
   * which interaction triggered it.
   */
  readonly interactOutside = output<VetoableNativeEvent<PointerEvent | FocusEvent>>();

  /**
   * Fires just before the submenu sends focus to its first / last
   * enabled item on mount. Call `preventDefault()` on the emitted veto
   * to skip the imperative focus move.
   */
  readonly autoFocusOnOpen = output<VetoableEvent>();

  /**
   * Fires just before focus returns to the parent item on unmount. Call
   * `preventDefault()` on the veto to suppress the return-focus.
   */
  readonly autoFocusOnClose = output<VetoableEvent>();

  protected readonly _overlay = createMenuOverlay('for-menu-sub', {
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
    onOpen: (_initialFocus, options) => {
      this.#cancelPointerScheduling();
      this.#suppressOpenFocus = options.suppressFocusMoves ?? false;
      this.#suppressCloseFocus = false;
    },
    onClose: (reason, options) => {
      this.#cancelPointerScheduling();
      this.#suppressOpenFocus = false;
      this.#suppressCloseFocus = options.suppressFocusMoves ?? false;
      if (reason !== 'escape' && reason !== 'hover' && reason !== 'programmatic') {
        this.parentMenu.closeMenu(reason);
      }
    },
  });

  readonly anchor = computed<ReferenceElement | null>(() => this._overlay.trigger());

  // --- Pointer-driven (hover) open/close state. Additive to click/keyboard. ---
  readonly #openAction = createDebouncedAction(() => this.#openByPointer());
  readonly #closeAction = createDebouncedAction(() => this.#closeByPointer());
  #graceTimer: ReturnType<typeof setTimeout> | null = null;
  #detachGrace: (() => void) | null = null;
  #detachContentPointer: (() => void) | null = null;
  #suppressOpenFocus = false;
  #suppressCloseFocus = false;

  /**
   * Submenus exempt the parent menu's content. Clicks on parent menu items
   * activate via the item's own click handler (which propagates `closeMenu`
   * upward through the whole chain) instead of firing the submenu's
   * outside-close.
   */
  readonly dismissibleExemptions = computed<readonly HTMLElement[]>(() => {
    const parentContent = this.parentMenu.content();
    return parentContent ? [parentContent] : [];
  });

  constructor() {
    super();
    const parent = inject(FOR_MENU_CONTEXT, { skipSelf: true, optional: true });
    if (!parent) {
      throw new Error(
        '[forty-cdk/menu] [forMenuSub] must be inside a [forDropdownMenu], [forContextMenu], or another [forMenuSub] element.',
      );
    }
    this.parentMenu = parent;

    inject(DestroyRef).onDestroy(() => this.#teardownPointer());
  }

  override registerContent(el: HTMLElement): void {
    this._overlay.registerContent(el);
    this.#attachContentPointer(el);
  }
  override unregisterContent(el: HTMLElement): void {
    if (this._overlay.content() === el) {
      this._overlay.unregisterContent(el);
      this.#detachContentPointer?.();
      this.#detachContentPointer = null;
    }
  }

  override closeMenu(reason: ForMenuCloseReason): void {
    this._overlay.closeMenu(reason);
  }

  // --- Pointer-driven (hover) open/close. Additive to click / keyboard. ---

  /**
   * Schedule a hover-open of the submenu after `subMenuOpenDelay`. Re-entering
   * the trigger also keeps every ancestor menu alive and aborts a pending
   * close. No-op when disabled or already open / scheduled.
   */
  scheduleOpenByPointer(): void {
    if (this.disabled()) {
      return;
    }
    this.#keepChainOpen();
    this.cancelPendingClose();
    if (this.open() || this.#openAction.isPending()) {
      return;
    }
    this.#openAction.schedule(this.#defaults.subMenuOpenDelay);
  }

  /**
   * The pointer left the sub-trigger. Cancels a not-yet-fired hover-open; if
   * the submenu is already open, arms the pointer-grace "safe triangle" toward
   * the content so travelling into the submenu doesn't close it.
   */
  onTriggerPointerLeave(cursor: Point): void {
    this.#clearOpenTimer();
    if (!this.open()) {
      return;
    }
    this.#armPointerGrace(cursor);
  }

  /** Schedule a hover-close of the submenu after `subMenuCloseDelay`. */
  scheduleCloseByPointer(): void {
    this.#clearOpenTimer();
    if (!this.open() || this.#closeAction.isPending()) {
      return;
    }
    this.#closeAction.schedule(this.#defaults.subMenuCloseDelay);
  }

  /** Cancel a pending hover-close and disarm the pointer-grace tracker. */
  cancelPendingClose(): void {
    this.#closeAction.cancel();
    this.#disarmPointerGrace();
  }

  #openByPointer(): void {
    // Hover-open never steals focus — it stays on whatever the user was on.
    this._overlay.openMenu('first', 'pointer', { suppressFocusMoves: true });
  }

  #closeByPointer(): void {
    if (!this.open()) {
      return;
    }
    // Hover-close affects only this level (like Escape / programmatic — no
    // upward propagation) and suppresses the trigger return-focus.
    this._overlay.closeMenu('hover', { suppressFocusMoves: true });
  }

  #armPointerGrace(cursor: Point): void {
    const content = this._overlay.content();
    if (!this.#isBrowser || !content) {
      this.scheduleCloseByPointer();
      return;
    }
    const rect = content.getBoundingClientRect();
    const trigger = this.trigger();
    const side = trigger ? resolveGraceSide(trigger.getBoundingClientRect(), rect) : this.side();
    const polygon = buildSubmenuGracePolygon(cursor, rect, side);
    this.#disarmPointerGrace();
    this.#detachGrace = attachPointerGrace(content.ownerDocument, polygon, () => {
      this.#disarmPointerGrace();
      this.scheduleCloseByPointer();
    });
    this.#graceTimer = setTimeout(
      () => {
        this.#graceTimer = null;
        this.#detachGrace?.();
        this.#detachGrace = null;
        this.scheduleCloseByPointer();
      },
      Math.max(0, this.#defaults.subMenuPointerGraceDuration),
    );
  }

  #disarmPointerGrace(): void {
    if (this.#detachGrace) {
      this.#detachGrace();
      this.#detachGrace = null;
    }
    if (this.#graceTimer !== null) {
      clearTimeout(this.#graceTimer);
      this.#graceTimer = null;
    }
  }

  #onContentPointerEnter(): void {
    // Arrived at (or moving within) the content — keep it and every ancestor
    // submenu open.
    this.cancelPendingClose();
    this.#keepChainOpen();
  }

  #onContentPointerLeave(): void {
    this.scheduleCloseByPointer();
  }

  /** Abort pending hover-closes on this submenu and every ancestor menu. */
  #keepChainOpen(): void {
    let parent: ForMenuContext | null = this.parentMenu;
    while (parent) {
      parent.cancelPendingClose?.();
      parent = parent.parentMenu;
    }
  }

  #cancelPointerScheduling(): void {
    this.#clearOpenTimer();
    this.cancelPendingClose();
  }

  #clearOpenTimer(): void {
    this.#openAction.cancel();
  }

  #attachContentPointer(el: HTMLElement): void {
    this.#detachContentPointer?.();
    const onEnter = (event: PointerEvent): void => {
      if (!isHoverCapablePointer(event)) {
        return;
      }
      this.#onContentPointerEnter();
    };
    const onLeave = (event: PointerEvent): void => {
      if (!isHoverCapablePointer(event)) {
        return;
      }
      this.#onContentPointerLeave();
    };
    const controller = new AbortController();
    const options = { signal: controller.signal };
    el.addEventListener('pointerenter', onEnter, options);
    el.addEventListener('pointerleave', onLeave, options);
    this.#detachContentPointer = () => controller.abort();
  }

  #teardownPointer(): void {
    this.#clearOpenTimer();
    this.#closeAction.cancel();
    this.#disarmPointerGrace();
    this.#detachContentPointer?.();
    this.#detachContentPointer = null;
  }

  override emitAutoFocusOnOpen(): boolean {
    // Hover-open leaves focus where it is — only keyboard / click moves it in.
    if (this.#suppressOpenFocus) {
      this.#suppressOpenFocus = false;
      return true;
    }
    return emitVetoableEvent(this.autoFocusOnOpen);
  }

  override emitAutoFocusOnClose(): boolean {
    // Hover-close must not yank focus back to the trigger.
    if (this.#suppressCloseFocus) {
      this.#suppressCloseFocus = false;
      return true;
    }
    return emitVetoableEvent(this.autoFocusOnClose);
  }
}

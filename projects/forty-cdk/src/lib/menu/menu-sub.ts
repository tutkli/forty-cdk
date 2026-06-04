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

import type { FloatingAlign, FloatingSide } from '../_internal/floating/floating';
import type { WritingDirection } from '../_internal/keyboard-navigation/keyboard-navigation';
import { createMenuOverlay } from '../_internal/menu-overlay/menu-overlay';
import {
  attachPointerGrace,
  buildSubmenuGracePolygon,
  type Point,
} from '../_internal/pointer-grace/pointer-grace';
import {
  emitVetoableEvent,
  type VetoableEvent,
  type VetoableNativeEvent,
} from '../_internal/vetoable-event/vetoable-event';
import { FOR_MENU_CONTEXT, type ForMenuCloseReason, type ForMenuContext } from './menu-context';
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
 * open/close scheduling, the `#suppressFocusMoves` autofocus vetoes that
 * keep hover from stealing / returning focus, and the reason-dependent
 * upward `closeMenu` propagation — the latter two wired through the
 * overlay's `onOpen` / `onClose` lifecycle hooks.
 *
 * The parent menu's content is added to this submenu's dismissable
 * exemptions so a click on a parent menu item doesn't fire the
 * submenu's outside-handler (the parent item's own click flow closes
 * everything via propagated `closeMenu`).
 *
 * Closing this submenu propagates `closeMenu` upward for every reason
 * except `'escape'` and `'programmatic'` — Escape inside a submenu
 * closes only that level, while activating an item or clicking outside
 * everything tears down the entire chain.
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
export class ForMenuSub implements ForMenuContext {
  readonly #defaults = inject(FOR_MENU_DEFAULTS);
  readonly #isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  /** The enclosing menu — required (orphan throws). */
  readonly parentMenu: ForMenuContext;

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
  readonly _dirInput = input<WritingDirection | undefined>(undefined, { alias: 'dir' });
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

  /** Alignment along the chosen `side`. Defaults to `'start'`. */
  readonly align = input<FloatingAlign | undefined>('start');

  /** Gap (px) along the main axis. Default `0`. */
  readonly sideOffset = input(0, { transform: numberAttribute });

  /** Gap (px) along the cross axis. Default `0`. */
  readonly alignOffset = input(0, { transform: numberAttribute });

  /** When `true` (default), `flip` and `shift` keep the submenu inside the viewport. */
  readonly avoidCollisions = input(true, { transform: booleanAttribute });

  /** Padding (px) applied uniformly to flip / shift / size. Default `8`. */
  readonly collisionPadding = input(8, { transform: numberAttribute });

  /** Padding (px) for the `arrow` middleware. Default `0`. */
  readonly arrowPadding = input(0, { transform: numberAttribute });

  /** Stickiness behaviour for `shift`. Default `'partial'`. */
  readonly sticky = input<'partial' | 'always' | false>('partial');

  /** When `true`, sets `data-detached=""` while the parent item is scrolled off-screen. */
  readonly hideWhenDetached = input(false, { transform: booleanAttribute });

  readonly loop = input(true, { transform: booleanAttribute });
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly dismissible = input(true, { transform: booleanAttribute });
  readonly returnFocus = input(true, { transform: booleanAttribute });
  readonly ariaLabel = input<string | null>(null);

  readonly escapeKeyDown = output<VetoableNativeEvent<KeyboardEvent>>();
  readonly pointerDownOutside = output<VetoableNativeEvent<PointerEvent>>();
  readonly focusOutside = output<VetoableNativeEvent<FocusEvent>>();
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

  readonly #overlay = createMenuOverlay('for-menu-sub', {
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
    // A keyboard / click open supersedes any in-flight hover scheduling and
    // moves focus into the submenu (unlike the pointer path).
    onOpen: () => {
      this.#cancelPointerScheduling();
      this.#suppressFocusMoves = false;
    },
    // Propagate up so item activation, Tab, and outside-pointer collapse
    // the entire menu chain. `'escape'` collapses only this level (per APG);
    // `'programmatic'` is the consumer's own write — no propagation either.
    onClose: (reason) => {
      this.#cancelPointerScheduling();
      this.#suppressFocusMoves = false;
      if (reason !== 'escape' && reason !== 'programmatic') {
        this.parentMenu.closeMenu(reason);
      }
    },
  });

  readonly triggerId = this.#overlay.triggerId;
  readonly contentId = this.#overlay.contentId;
  readonly initialFocus = this.#overlay.initialFocus;
  readonly trigger = this.#overlay.trigger;
  readonly anchor = computed<ReferenceElement | null>(() => this.#overlay.trigger());

  readonly content = this.#overlay.content;

  // --- Pointer-driven (hover) open/close state. Additive to click/keyboard. ---
  #openTimer: ReturnType<typeof setTimeout> | null = null;
  #closeTimer: ReturnType<typeof setTimeout> | null = null;
  #graceTimer: ReturnType<typeof setTimeout> | null = null;
  #detachGrace: (() => void) | null = null;
  #detachContentPointer: (() => void) | null = null;
  /**
   * True while the current open/close transition is pointer-driven, so the
   * shared content's auto-focus-on-open and return-focus-on-close are vetoed:
   * hovering must never steal focus into the submenu nor yank it back to the
   * trigger. Reset to `false` by every keyboard / click / programmatic path.
   */
  #suppressFocusMoves = false;

  /**
   * Submenus exempt the parent menu's content. Clicks on parent menu items
   * activate via the item's own click handler (which propagates `closeMenu`
   * upward through the whole chain) instead of firing the submenu's
   * outside-close.
   */
  readonly dismissableExemptions = computed<readonly HTMLElement[]>(() => {
    const parentContent = this.parentMenu.content();
    return parentContent ? [parentContent] : [];
  });

  setInitialFocus = this.#overlay.setInitialFocus.bind(this.#overlay);
  registerTrigger = this.#overlay.registerTrigger.bind(this.#overlay);
  unregisterTrigger = this.#overlay.unregisterTrigger.bind(this.#overlay);
  registerItem = this.#overlay.registerItem.bind(this.#overlay);
  unregisterItem = this.#overlay.unregisterItem.bind(this.#overlay);
  navigate = this.#overlay.navigate.bind(this.#overlay);
  handleTypeahead = this.#overlay.handleTypeahead.bind(this.#overlay);
  focusFirstEnabledItem = this.#overlay.focusFirstEnabledItem.bind(this.#overlay);
  focusLastEnabledItem = this.#overlay.focusLastEnabledItem.bind(this.#overlay);
  toggle = this.#overlay.toggle.bind(this.#overlay);
  openMenu = this.#overlay.openMenu.bind(this.#overlay);
  emitEscapeKeyDown = this.#overlay.emitEscapeKeyDown.bind(this.#overlay);
  emitPointerDownOutside = this.#overlay.emitPointerDownOutside.bind(this.#overlay);
  emitFocusOutside = this.#overlay.emitFocusOutside.bind(this.#overlay);
  emitInteractOutside = this.#overlay.emitInteractOutside.bind(this.#overlay);

  constructor() {
    const parent = inject(FOR_MENU_CONTEXT, { skipSelf: true, optional: true });
    if (!parent) {
      throw new Error(
        '[forty-cdk/menu] [forMenuSub] must be inside a [forDropdownMenu], [forContextMenu], or another [forMenuSub] element.',
      );
    }
    this.parentMenu = parent;

    inject(DestroyRef).onDestroy(() => this.#teardownPointer());
  }

  registerContent(el: HTMLElement): void {
    this.#overlay.registerContent(el);
    this.#attachContentPointer(el);
  }
  unregisterContent(el: HTMLElement): void {
    if (this.#overlay.content() === el) {
      this.#overlay.unregisterContent(el);
      this.#detachContentPointer?.();
      this.#detachContentPointer = null;
    }
  }

  closeMenu(reason: ForMenuCloseReason): void {
    this.#overlay.closeMenu(reason);
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
    if (this.open() || this.#openTimer !== null) {
      return;
    }
    const delay = Math.max(0, this.#defaults.subMenuOpenDelay);
    if (delay === 0) {
      this.#openByPointer();
      return;
    }
    this.#openTimer = setTimeout(() => {
      this.#openTimer = null;
      this.#openByPointer();
    }, delay);
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
    if (!this.open() || this.#closeTimer !== null) {
      return;
    }
    const delay = Math.max(0, this.#defaults.subMenuCloseDelay);
    if (delay === 0) {
      this.#closeByPointer();
      return;
    }
    this.#closeTimer = setTimeout(() => {
      this.#closeTimer = null;
      this.#closeByPointer();
    }, delay);
  }

  /** Cancel a pending hover-close and disarm the pointer-grace tracker. */
  cancelPendingClose(): void {
    this.#clearCloseTimer();
    this.#disarmPointerGrace();
  }

  #openByPointer(): void {
    if (this.disabled()) {
      return;
    }
    this.cancelPendingClose();
    // Hover-open never steals focus — it stays on whatever the user was on.
    this.#suppressFocusMoves = true;
    this.open.set(true);
  }

  #closeByPointer(): void {
    this.#disarmPointerGrace();
    this.#clearCloseTimer();
    // Hover-close affects only this level (like Escape / programmatic — no
    // upward propagation) and suppresses the trigger return-focus.
    this.#suppressFocusMoves = true;
    this.open.set(false);
  }

  #armPointerGrace(cursor: Point): void {
    const content = this.#overlay.content();
    if (!this.#isBrowser || !content) {
      this.scheduleCloseByPointer();
      return;
    }
    const rect = content.getBoundingClientRect();
    const side = (content.dataset['side'] as FloatingSide | undefined) ?? this.side();
    const polygon = buildSubmenuGracePolygon(cursor, rect, side);
    this.#disarmPointerGrace();
    this.#detachGrace = attachPointerGrace(content.ownerDocument, polygon, () => {
      this.#disarmPointerGrace();
      this.scheduleCloseByPointer();
    });
    this.#graceTimer = setTimeout(() => {
      this.#graceTimer = null;
      this.#detachGrace?.();
      this.#detachGrace = null;
      this.scheduleCloseByPointer();
    }, Math.max(0, this.#defaults.subMenuPointerGraceDuration));
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
    if (this.#openTimer !== null) {
      clearTimeout(this.#openTimer);
      this.#openTimer = null;
    }
  }

  #clearCloseTimer(): void {
    if (this.#closeTimer !== null) {
      clearTimeout(this.#closeTimer);
      this.#closeTimer = null;
    }
  }

  #attachContentPointer(el: HTMLElement): void {
    this.#detachContentPointer?.();
    const onEnter = (event: PointerEvent): void => {
      if (event.pointerType !== '' && event.pointerType !== 'mouse') {
        return;
      }
      this.#onContentPointerEnter();
    };
    const onLeave = (event: PointerEvent): void => {
      if (event.pointerType !== '' && event.pointerType !== 'mouse') {
        return;
      }
      this.#onContentPointerLeave();
    };
    el.addEventListener('pointerenter', onEnter);
    el.addEventListener('pointerleave', onLeave);
    this.#detachContentPointer = () => {
      el.removeEventListener('pointerenter', onEnter);
      el.removeEventListener('pointerleave', onLeave);
    };
  }

  #teardownPointer(): void {
    this.#clearOpenTimer();
    this.#clearCloseTimer();
    this.#disarmPointerGrace();
    this.#detachContentPointer?.();
    this.#detachContentPointer = null;
  }

  emitAutoFocusOnOpen(): boolean {
    // Hover-open leaves focus where it is — only keyboard / click moves it in.
    if (this.#suppressFocusMoves) {
      return true;
    }
    return emitVetoableEvent(this.autoFocusOnOpen);
  }

  emitAutoFocusOnClose(): boolean {
    // Hover-close must not yank focus back to the trigger.
    if (this.#suppressFocusMoves) {
      return true;
    }
    return emitVetoableEvent(this.autoFocusOnClose);
  }
}

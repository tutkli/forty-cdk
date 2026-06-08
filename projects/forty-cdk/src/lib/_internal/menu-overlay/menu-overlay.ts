import { inject, type ModelSignal, type OutputEmitterRef, type Signal, signal } from '@angular/core';

import { IdGenerator } from '../id-generator/id-generator';
import type { ListNavigationAction } from '../keyboard-navigation/keyboard-navigation';
import {
  emitVetoableEvent,
  emitVetoableNativeEvent,
  type VetoableEvent,
  type VetoableNativeEvent,
} from '../vetoable-event/vetoable-event';
import { createMenuItemList, type MenuItemHandle, type MenuItemList } from './menu-item-list';

/**
 * Reason a menu requested close. Mirrors `ForMenuCloseReason` from
 * `menu/menu-context.ts` structurally so primitives can pass either type
 * across the helper boundary without re-declaration.
 */
export type MenuOverlayCloseReason =
  | 'escape'
  | 'pointerDownOutside'
  | 'focusOutside'
  | 'select'
  | 'tab'
  | 'programmatic';

/**
 * Item handle the helper's item list registers. Re-exported alias of the
 * shared `MenuItemHandle` — structurally compatible with primitives'
 * `ForMenuItemHandle` and kept under this name for backward compatibility
 * with the helper's existing consumers / specs.
 */
export type MenuOverlayItemHandle = MenuItemHandle;

/**
 * Wiring the directive forwards into the helper. Inputs / outputs / models
 * stay declared on the directive (Angular needs them as fields for template
 * binding); the helper reads them through these references so the close
 * decisions, navigation, and veto plumbing live in one place.
 */
export interface MenuOverlayHooks {
  readonly open: ModelSignal<boolean>;
  readonly disabled: Signal<boolean>;
  readonly dismissible: Signal<boolean>;
  readonly loop: Signal<boolean>;
  readonly escapeKeyDown: OutputEmitterRef<VetoableNativeEvent<KeyboardEvent>>;
  readonly pointerDownOutside: OutputEmitterRef<VetoableNativeEvent<PointerEvent>>;
  readonly focusOutside: OutputEmitterRef<VetoableNativeEvent<FocusEvent>>;
  readonly interactOutside: OutputEmitterRef<VetoableNativeEvent<PointerEvent | FocusEvent>>;
  readonly autoFocusOnOpen: OutputEmitterRef<VetoableEvent>;
  readonly autoFocusOnClose: OutputEmitterRef<VetoableEvent>;

  /**
   * Optional side effect run after `openMenu` flips `open` to `true`,
   * receiving the resolved initial-focus target. `[forMenuSub]` uses it to
   * cancel in-flight hover scheduling and reset its focus-suppression flag
   * (a keyboard / click open supersedes hover). Top-level roots
   * (`[forDropdownMenu]` / `[forContextMenu]`) pass neither hook.
   */
  readonly onOpen?: (initialFocus: 'first' | 'last') => void;

  /**
   * Optional side effect run after `closeMenu` flips `open` to `false`,
   * receiving the close reason. `[forMenuSub]` uses it to cancel in-flight
   * hover scheduling, reset its focus-suppression flag, and propagate the
   * close upward through the menu chain for every reason except `'escape'`
   * / `'programmatic'`. Top-level roots pass neither hook.
   */
  readonly onClose?: (reason: MenuOverlayCloseReason) => void;
}

/**
 * Shared coordination behaviour between `ForDropdownMenu` and `ForContextMenu`
 * (and any future menu overlay root with the same item-collection / typeahead /
 * navigate / dismissable shape — Menubar's per-bar menu, a future free-floating
 * SubMenu).
 *
 * The helper owns:
 *
 * - id generation for trigger / content,
 * - the item list (`MenuItemList`: the item `Collection` + typeahead +
 *   `navigate` / `handleTypeahead` / `focusFirst/LastEnabledItem`), shared
 *   with `[forMenubar]`'s multiplexed menu context,
 * - trigger / content / initial-focus signals,
 * - `toggle` / `openMenu` / `closeMenu` (honouring `disabled`),
 * - the consumer-owned Escape close (`emitEscapeKeyDown`) and the
 *   `requestClose` the shell invokes after an un-vetoed outside interaction.
 *   The shared `#pendingOutsideVeto` reuse between the specific outside
 *   listeners and the composite `interactOutside` lives in
 *   `injectOverlayShell`, not here,
 * - the `(autoFocusOnOpen)` / `(autoFocusOnClose)` veto pass-throughs.
 *
 * It deliberately does NOT own:
 *
 * - the `anchor` signal — DropdownMenu derives it from the trigger element,
 *   ContextMenu drives it via a `VirtualElement`,
 * - `dismissableExemptions` — DropdownMenu exempts the trigger button so the
 *   trigger's click toggle doesn't double-fire as a pointer-down-outside;
 *   ContextMenu exempts nothing,
 * - the `input()` / `output()` / `model()` declarations — they remain on the
 *   directive class because Angular's template binding system reads inputs /
 *   outputs off the directive's compiled metadata.
 *
 * Class form (rather than a function-based factory) is deliberate: the
 * helper has private mutable state (the trigger / content signals, the
 * initial-focus signal) that maps cleanly to instance fields, and the
 * directives read several of its fields back through getter
 * forwarding. Encapsulating that as a class keeps the directive's surface
 * obvious at the call site and matches the Angular idiom for cross-cutting
 * mutable state co-located with DI.
 *
 * Construct via `createMenuOverlay` from a directive's field initializer so
 * the helper's `inject()` calls (id generator, typeahead destroyRef hookup)
 * resolve through the directive's injector.
 */
export class MenuOverlay<H extends MenuOverlayItemHandle = MenuOverlayItemHandle> {
  readonly #idGen = inject(IdGenerator);
  readonly #itemList: MenuItemList<H>;
  readonly #hooks: MenuOverlayHooks;

  /** Unique id for the trigger element. Stable across the menu's lifetime. */
  readonly triggerId: Signal<string>;

  /** Unique id for the content element. Stable across the menu's lifetime. */
  readonly contentId: Signal<string>;

  readonly #initialFocus = signal<'first' | 'last'>('first');

  /** Where focus should land when the menu mounts. Set by triggers before flipping `open`. */
  readonly initialFocus = this.#initialFocus.asReadonly();

  readonly #lastCloseReason = signal<MenuOverlayCloseReason | null>(null);

  /**
   * Reason of the most recent close, or `null` while the menu is open / has
   * never closed. Reset to `null` on every open. The shared `[forMenuContent]`
   * reads this to skip its return-focus on `'tab'` so Tab can advance focus
   * out of the menu instead of snapping back to the trigger.
   */
  readonly lastCloseReason = this.#lastCloseReason.asReadonly();

  readonly #triggerEl = signal<HTMLElement | null>(null);

  /** The focusable element the menu should return focus to on close. */
  readonly trigger = this.#triggerEl.asReadonly();

  readonly #contentEl = signal<HTMLElement | null>(null);

  /** The mounted `[forMenuContent]` element, or `null` while the menu is closed. */
  readonly content = this.#contentEl.asReadonly();

  constructor(idPrefix: string, hooks: MenuOverlayHooks) {
    this.#hooks = hooks;
    this.#itemList = createMenuItemList<H>(() => hooks.loop());
    this.triggerId = signal(this.#idGen.next(`${idPrefix}-trigger`));
    this.contentId = signal(this.#idGen.next(`${idPrefix}-content`));
  }

  setInitialFocus(target: 'first' | 'last'): void {
    this.#initialFocus.set(target);
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

  registerItem(handle: H): void {
    this.#itemList.registerItem(handle);
  }

  unregisterItem(handle: H): void {
    this.#itemList.unregisterItem(handle);
  }

  /** Items registered with the menu, in DOM order. Exposed for tests / sub-menu wiring. */
  items(): readonly H[] {
    return this.#itemList.items();
  }

  navigate(currentItem: HTMLElement, action: ListNavigationAction): void {
    this.#itemList.navigate(currentItem, action);
  }

  handleTypeahead(event: KeyboardEvent): void {
    this.#itemList.handleTypeahead(event);
  }

  focusFirstEnabledItem(): boolean {
    return this.#itemList.focusFirstEnabledItem();
  }

  focusLastEnabledItem(): boolean {
    return this.#itemList.focusLastEnabledItem();
  }

  /**
   * Toggle the menu open/closed from the trigger. The close branch reuses the
   * `'programmatic'` close reason by design — there is no distinct `'trigger'`
   * reason for the user-initiated toggle-close path.
   */
  toggle(initialFocus: 'first' | 'last' = 'first'): void {
    if (this.#hooks.disabled()) {
      return;
    }
    if (this.#hooks.open()) {
      this.closeMenu('programmatic');
    } else {
      this.openMenu(initialFocus);
    }
  }

  openMenu(initialFocus: 'first' | 'last' = 'first'): void {
    if (this.#hooks.disabled()) {
      return;
    }
    this.#initialFocus.set(initialFocus);
    this.#lastCloseReason.set(null);
    this.#hooks.open.set(true);
    this.#hooks.onOpen?.(initialFocus);
  }

  closeMenu(reason: MenuOverlayCloseReason): void {
    this.#lastCloseReason.set(reason);
    this.#hooks.open.set(false);
    this.#hooks.onClose?.(reason);
  }

  emitEscapeKeyDown(event: KeyboardEvent): void {
    const vetoed = emitVetoableNativeEvent(this.#hooks.escapeKeyDown, event);
    if (!vetoed && this.#hooks.dismissible()) {
      // Load-bearing, not redundant: the bubble-phase Escape handler stops the
      // same keydown from reaching an *ancestor* overlay's keydown listener,
      // which is how nested overlays close one layer per Escape (see the
      // listener-phase note in `_internal/dismissable-layer/dismissable-layer.ts`).
      event.stopPropagation();
      this.closeMenu('escape');
    }
  }

  /**
   * Outside-interaction emit forwarders. The shared `#pendingOutsideVeto`
   * reuse between the specific outside channels and the composite
   * `interactOutside` lives in `injectOverlayShell`; these only fire the
   * matching output with the veto the shell built.
   */
  emitPointerDownOutside(veto: VetoableNativeEvent<PointerEvent>): void {
    this.#hooks.pointerDownOutside.emit(veto);
  }
  emitFocusOutside(veto: VetoableNativeEvent<FocusEvent>): void {
    this.#hooks.focusOutside.emit(veto);
  }
  emitInteractOutside(veto: VetoableNativeEvent<PointerEvent | FocusEvent>): void {
    this.#hooks.interactOutside.emit(veto);
  }

  /**
   * Implicit close requested by `injectOverlayShell` after an un-vetoed
   * outside interaction. The shell owns the shared `#pendingOutsideVeto`
   * reuse between the specific outside channels and the composite
   * `interactOutside`; this helper only owns the close. The `open()` guard
   * keeps a stale event from re-closing an already-closed menu and clobbering
   * its `lastCloseReason` (e.g. a `'tab'` close must survive so the content
   * skips its return-focus).
   */
  requestClose(reason: 'pointerDownOutside' | 'focusOutside'): void {
    if (!this.#hooks.open()) {
      return;
    }
    this.closeMenu(reason);
  }

  emitAutoFocusOnOpen(): boolean {
    return emitVetoableEvent(this.#hooks.autoFocusOnOpen);
  }

  emitAutoFocusOnClose(): boolean {
    return emitVetoableEvent(this.#hooks.autoFocusOnClose);
  }
}

/**
 * Creates a `MenuOverlay` from a directive field initializer. `idPrefix`
 * is the namespace fed to the shared `IdGenerator` (e.g.
 * `'for-dropdown-menu'`, `'for-context-menu'`); the helper generates
 * `<idPrefix>-trigger` and `<idPrefix>-content` ids off it.
 */
export function createMenuOverlay<H extends MenuOverlayItemHandle = MenuOverlayItemHandle>(
  idPrefix: string,
  hooks: MenuOverlayHooks,
): MenuOverlay<H> {
  return new MenuOverlay<H>(idPrefix, hooks);
}

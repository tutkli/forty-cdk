import { type Signal } from '@angular/core';

import type { ListNavigationAction } from '../keyboard-navigation/keyboard-navigation';
import type { VetoableNativeEvent } from '../vetoable-event/vetoable-event';
import type {
  MenuActivationModality,
  MenuOverlay,
  MenuOverlayCloseReason,
  MenuOverlayItemHandle,
} from './menu-overlay';

/**
 * Abstract base that forwards the `MenuOverlay` coordination slice every menu
 * root re-exposes — `[forDropdownMenu]`, `[forContextMenu]`, and `[forMenuSub]`
 * all extend it. Each subclass owns its own `MenuOverlay` instance (created
 * with its own id prefix and lifecycle hooks) and exposes it through the
 * abstract `_overlay` accessor; the base implements the trigger / content /
 * item registration, navigation, open/close, and veto pass-throughs once.
 *
 * This is the single place to add a member that is a pure pass-through to
 * `MenuOverlay`: declaring it here gives all three directives the method
 * without hand-written `.bind()` forwarding in each. Subclasses override only
 * the members that need extra behaviour (e.g. `[forMenuSub]` wraps
 * `registerContent` to attach pointer listeners and overrides the auto-focus
 * emitters to honour its hover focus-suppression flag).
 *
 * Kept generic over the item handle so the subclass's `MenuOverlay<H>` flows
 * through `registerItem` / `unregisterItem` without a cast.
 */
export abstract class MenuOverlayHost<H extends MenuOverlayItemHandle = MenuOverlayItemHandle> {
  /** The subclass's `MenuOverlay` instance the base forwards to. */
  protected abstract readonly _overlay: MenuOverlay<H>;

  get triggerId(): Signal<string> {
    return this._overlay.triggerId;
  }

  get contentId(): Signal<string> {
    return this._overlay.contentId;
  }

  get initialFocus(): Signal<'first' | 'last'> {
    return this._overlay.initialFocus;
  }

  get lastCloseReason(): Signal<MenuOverlayCloseReason | null> {
    return this._overlay.lastCloseReason;
  }

  get trigger(): Signal<HTMLElement | null> {
    return this._overlay.trigger;
  }

  get content(): Signal<HTMLElement | null> {
    return this._overlay.content;
  }

  setInitialFocus(target: 'first' | 'last'): void {
    this._overlay.setInitialFocus(target);
  }

  registerTrigger(el: HTMLElement): void {
    this._overlay.registerTrigger(el);
  }

  unregisterTrigger(el: HTMLElement): void {
    this._overlay.unregisterTrigger(el);
  }

  registerContent(el: HTMLElement): void {
    this._overlay.registerContent(el);
  }

  unregisterContent(el: HTMLElement): void {
    this._overlay.unregisterContent(el);
  }

  registerItem(handle: H): void {
    this._overlay.registerItem(handle);
  }

  unregisterItem(handle: H): void {
    this._overlay.unregisterItem(handle);
  }

  navigate(currentItem: HTMLElement, action: ListNavigationAction): void {
    this._overlay.navigate(currentItem, action);
  }

  handleTypeahead(event: KeyboardEvent): boolean {
    return this._overlay.handleTypeahead(event);
  }

  clearItemHighlights(): void {
    this._overlay.clearItemHighlights();
  }

  focusFirstEnabledItem(): boolean {
    return this._overlay.focusFirstEnabledItem();
  }

  focusLastEnabledItem(): boolean {
    return this._overlay.focusLastEnabledItem();
  }

  toggle(
    initialFocus: 'first' | 'last' = 'first',
    modality: MenuActivationModality = 'keyboard',
  ): void {
    this._overlay.toggle(initialFocus, modality);
  }

  openMenu(
    initialFocus: 'first' | 'last' = 'first',
    modality: MenuActivationModality = 'keyboard',
  ): void {
    this._overlay.openMenu(initialFocus, modality);
  }

  closeMenu(reason: MenuOverlayCloseReason): void {
    this._overlay.closeMenu(reason);
  }

  requestClose(reason: 'pointerDownOutside' | 'focusOutside'): void {
    this._overlay.requestClose(reason);
  }

  emitEscapeKeyDown(event: KeyboardEvent): void {
    this._overlay.emitEscapeKeyDown(event);
  }

  emitPointerDownOutside(veto: VetoableNativeEvent<PointerEvent>): void {
    this._overlay.emitPointerDownOutside(veto);
  }

  emitFocusOutside(veto: VetoableNativeEvent<FocusEvent>): void {
    this._overlay.emitFocusOutside(veto);
  }

  emitInteractOutside(veto: VetoableNativeEvent<PointerEvent | FocusEvent>): void {
    this._overlay.emitInteractOutside(veto);
  }

  emitAutoFocusOnOpen(): boolean {
    return this._overlay.emitAutoFocusOnOpen();
  }

  emitAutoFocusOnClose(): boolean {
    return this._overlay.emitAutoFocusOnClose();
  }
}

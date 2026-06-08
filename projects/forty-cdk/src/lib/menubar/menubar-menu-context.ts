import { computed, type ModelSignal, type Signal, signal } from '@angular/core';
import type { ReferenceElement } from '@floating-ui/dom';

import { createMenuItemList } from '../_internal/menu-overlay/menu-item-list';
import type { ListNavigationAction } from '../_internal/keyboard-navigation/keyboard-navigation';
import type {
  ForMenuCloseReason,
  ForMenuContext,
  ForMenuItemHandle,
  MenuSiblingNavigator,
} from '../menu/menu-context';
import type { ForMenubarTriggerHandle } from './menubar-context';

/**
 * The slice of `[forMenubar]` the multiplexed `ForMenuContext` reads. Passed to
 * {@link MenubarMenuContext} so the context implementation stays a plain class
 * (testable, no `inject()`) while still reading the bar's reactive state.
 */
export interface MenubarMenuHost extends MenuSiblingNavigator {
  readonly value: ModelSignal<string>;
  readonly disabled: Signal<boolean>;
  readonly dismissible: Signal<boolean>;
  readonly dir: ForMenuContext['dir'];
  readonly loop: Signal<boolean>;
  /** Currently-open trigger handle, or `null` when no menu is open. */
  readonly activeTrigger: Signal<ForMenubarTriggerHandle | null>;
  /** All registered triggers in DOM order; their hosts are the dismissable exemptions. */
  readonly triggers: Signal<readonly ForMenubarTriggerHandle[]>;
  /**
   * The most-recently-active trigger host — survives past close so the
   * content's destroy hook can still return focus to the trigger.
   */
  readonly lastTriggerHost: Signal<HTMLElement | null>;
  /** Close the currently-open menu (clears `value`, snapshots the last trigger). */
  closeOpen(): void;
  /** Attach the bar's hover-keepalive listeners to a mounted content element. */
  attachContentPointer(el: HTMLElement): void;
  /** Detach the bar's hover-keepalive listeners from the content element. */
  detachContentPointer(): void;
}

/**
 * Single concrete `ForMenuContext` the `[forMenubar]` root provides to its
 * descendant `[forMenuContent]` and items. It is the one place the bar's
 * "which trigger's menu is open" multiplexing lives: open / anchor / side /
 * ids / placement are all derived from the host's `activeTrigger`, so the same
 * context shape transparently covers whichever trigger's menu is mounted.
 *
 * Item navigation reuses the shared `MenuItemList` (the same item-collection /
 * typeahead / navigate / focus mechanics that back `MenuOverlay`), so this only
 * has to cover the parts the single-owner overlay can't.
 *
 * A bar-level menu has no per-trigger dismiss / auto-focus outputs and no
 * per-context trigger registration (triggers register with the bar directly),
 * so the corresponding `ForMenuContext` members are deliberately inert here:
 * the outside-interaction emit forwarders have nowhere to surface (the implicit
 * close runs through {@link requestClose}), the auto-focus emitters never veto
 * (bar menus follow APG-prescribed focus movement), and trigger
 * register/unregister are owned by the bar. They stay as documented members of
 * this one implementation rather than scattered no-op literals.
 */
export class MenubarMenuContext implements ForMenuContext {
  readonly #host: MenubarMenuHost;
  readonly #itemList = createMenuItemList<ForMenuItemHandle>(() => this.#host.loop());
  readonly #contentEl = signal<HTMLElement | null>(null);
  readonly #initialFocus = signal<'first' | 'last'>('first');
  readonly #lastCloseReason = signal<ForMenuCloseReason | null>(null);

  readonly open = computed(() => this.#host.value() !== '');
  readonly disabled: Signal<boolean>;
  readonly dismissible: Signal<boolean>;
  readonly returnFocus = signal(true).asReadonly();
  readonly dir: ForMenuContext['dir'];
  readonly side = computed(() => this.#host.activeTrigger()?.side());
  readonly align = computed(() => this.#host.activeTrigger()?.align());
  readonly sideOffset = computed(() => this.#host.activeTrigger()?.sideOffset() ?? 4);
  readonly alignOffset = computed(() => this.#host.activeTrigger()?.alignOffset() ?? 0);
  readonly avoidCollisions = computed(() => this.#host.activeTrigger()?.avoidCollisions() ?? true);
  readonly collisionPadding = computed(() => this.#host.activeTrigger()?.collisionPadding() ?? 8);
  readonly arrowPadding = computed(() => this.#host.activeTrigger()?.arrowPadding() ?? 0);
  readonly sticky = computed(() => this.#host.activeTrigger()?.sticky() ?? 'partial');
  readonly hideWhenDetached = computed(() => this.#host.activeTrigger()?.hideWhenDetached() ?? false);
  readonly loop: Signal<boolean>;
  readonly initialFocus = this.#initialFocus.asReadonly();
  readonly lastCloseReason = this.#lastCloseReason.asReadonly();
  readonly triggerId = computed(() => this.#host.activeTrigger()?.triggerId() ?? '');
  readonly contentId = computed(() => this.#host.activeTrigger()?.contentId() ?? '');
  readonly ariaLabel = computed(() => this.#host.activeTrigger()?.ariaLabel() ?? null);
  readonly anchor = computed<ReferenceElement | null>(() => this.#host.activeTrigger()?.host ?? null);
  readonly trigger: Signal<HTMLElement | null>;
  readonly content = this.#contentEl.asReadonly();
  readonly parentMenu = null;
  readonly menubar: MenuSiblingNavigator;

  /**
   * Exempt every menubar trigger element so clicking another trigger doesn't
   * fire `pointerDownOutside` (the trigger's own click handler routes the
   * close + open).
   */
  readonly dismissableExemptions = computed<readonly HTMLElement[]>(() =>
    this.#host.triggers().map((t) => t.host),
  );

  constructor(host: MenubarMenuHost) {
    this.#host = host;
    this.disabled = host.disabled;
    this.dismissible = host.dismissible;
    this.dir = host.dir;
    this.loop = host.loop;
    this.trigger = host.lastTriggerHost;
    this.menubar = host;
  }

  setInitialFocus(target: 'first' | 'last'): void {
    this.#initialFocus.set(target);
  }

  /**
   * Read by the bar's `openTrigger` so the next open seeds the resolved
   * initial-focus target and clears the prior close reason.
   */
  prepareOpen(initialFocus: 'first' | 'last'): void {
    this.#initialFocus.set(initialFocus);
    this.#lastCloseReason.set(null);
  }

  /** Read by the bar's pointer-driven close so the content skips its return-focus. */
  setLastCloseReason(reason: ForMenuCloseReason): void {
    this.#lastCloseReason.set(reason);
  }

  registerTrigger(): void {
    // Triggers register with the menubar itself, not with this menu context.
  }
  unregisterTrigger(): void {}

  registerContent(el: HTMLElement): void {
    this.#contentEl.set(el);
    this.#host.attachContentPointer(el);
  }
  unregisterContent(el: HTMLElement): void {
    if (this.#contentEl() === el) {
      this.#contentEl.set(null);
    }
    this.#host.detachContentPointer();
  }

  registerItem(handle: ForMenuItemHandle): void {
    this.#itemList.registerItem(handle);
  }
  unregisterItem(handle: ForMenuItemHandle): void {
    this.#itemList.unregisterItem(handle);
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

  toggle(): void {
    // Without a specific trigger value, toggle from the bar context can only
    // close. Triggers themselves drive the open path via the bar's openTrigger.
    if (this.#host.value() !== '') {
      this.#host.closeOpen();
    }
  }

  openMenu(): void {
    // Open requires a trigger value — see the bar's openTrigger.
  }

  closeMenu(reason: ForMenuCloseReason): void {
    this.#lastCloseReason.set(reason);
    this.#host.closeOpen();
  }

  emitEscapeKeyDown(event: KeyboardEvent): void {
    if (!event.defaultPrevented && this.#host.dismissible()) {
      event.stopPropagation();
      this.#lastCloseReason.set('escape');
      this.#host.closeOpen();
    }
  }

  // The menubar has no per-trigger `(pointerDownOutside)` / `(focusOutside)` /
  // `(interactOutside)` outputs, so these emit forwarders have nowhere to
  // surface; the implicit close runs through `requestClose` below.
  emitPointerDownOutside(): void {}
  emitFocusOutside(): void {}
  emitInteractOutside(): void {}

  requestClose(reason: 'pointerDownOutside' | 'focusOutside'): void {
    if (this.#host.value() === '') {
      return;
    }
    this.#lastCloseReason.set(reason);
    this.#host.closeOpen();
  }

  // Bar-level menus follow APG-prescribed focus movement and expose no
  // `(autoFocusOnOpen)` / `(autoFocusOnClose)` outputs, so the vetoes never
  // fire — the content's focus moves always run.
  emitAutoFocusOnOpen(): boolean {
    return false;
  }
  emitAutoFocusOnClose(): boolean {
    return false;
  }
}

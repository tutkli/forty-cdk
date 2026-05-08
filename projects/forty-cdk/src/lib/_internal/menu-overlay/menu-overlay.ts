import { inject, type ModelSignal, type OutputEmitterRef, type Signal, signal } from '@angular/core';

import { Collection, type CollectionHandle } from '../collection/collection';
import { IdGenerator } from '../id-generator/id-generator';
import {
  type ListNavigationAction,
  moveIndex,
} from '../keyboard-navigation/keyboard-navigation';
import { injectTypeahead } from '../typeahead/typeahead';
import {
  createVetoableNativeEvent,
  emitVetoableEvent,
  emitVetoableNativeEvent,
  type VetoableEvent,
  type VetoableNativeEvent,
} from '../vetoable-event/vetoable-event';

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
 * Item handle the helper's `Collection` registers. Structurally compatible
 * with primitives' `ForMenuItemHandle` — typing is generic so the helper
 * stays orthogonal to `menu/menu-context.ts` (no cycle into a primitive).
 */
export interface MenuOverlayItemHandle extends CollectionHandle {
  readonly disabled: Signal<boolean>;
  readonly textValue?: Signal<string>;
}

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
 * - the item `Collection` + typeahead instance,
 * - trigger / content / initial-focus signals,
 * - `navigate`, `handleTypeahead`, `focusFirst/LastEnabledItem`,
 * - `toggle` / `openMenu` / `closeMenu` (honouring `disabled`),
 * - the `(escapeKeyDown)` / `(pointerDownOutside)` / `(focusOutside)` /
 *   `(interactOutside)` veto plumbing (including the shared
 *   `#pendingOutsideVeto` so the specific outside listener and the composite
 *   `interactOutside` see the same veto wrapper for one physical event),
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
 * helper has private mutable state (`#pendingOutsideVeto`, the trigger /
 * content signals, the initial-focus signal) that maps cleanly to instance
 * fields, and the directives read several of its fields back through getter
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
  readonly #typeahead = injectTypeahead();
  readonly #items = new Collection<H>();
  readonly #hooks: MenuOverlayHooks;

  /** Unique id for the trigger element. Stable across the menu's lifetime. */
  readonly triggerId: Signal<string>;

  /** Unique id for the content element. Stable across the menu's lifetime. */
  readonly contentId: Signal<string>;

  readonly #initialFocus = signal<'first' | 'last'>('first');

  /** Where focus should land when the menu mounts. Set by triggers before flipping `open`. */
  readonly initialFocus = this.#initialFocus.asReadonly();

  readonly #triggerEl = signal<HTMLElement | null>(null);

  /** The focusable element the menu should return focus to on close. */
  readonly trigger = this.#triggerEl.asReadonly();

  readonly #contentEl = signal<HTMLElement | null>(null);

  /** The mounted `[forMenuContent]` element, or `null` while the menu is closed. */
  readonly content = this.#contentEl.asReadonly();

  /**
   * Shared veto wrapper between `pointerDownOutside` / `focusOutside` and
   * the composite `interactOutside`. The dismissable layer always invokes
   * the specific listener before the composite one for the same physical
   * event, so a `preventDefault()` in either handler vetoes the close.
   */
  #pendingOutsideVeto: VetoableNativeEvent<PointerEvent | FocusEvent> | null = null;

  constructor(idPrefix: string, hooks: MenuOverlayHooks) {
    this.#hooks = hooks;
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
    this.#items.register(handle);
  }

  unregisterItem(handle: H): void {
    this.#items.unregister(handle);
  }

  /** Items registered with the menu, in DOM order. Exposed for tests / sub-menu wiring. */
  items(): readonly H[] {
    return this.#items.items();
  }

  navigate(currentItem: HTMLElement, action: ListNavigationAction): void {
    const items = this.#items.items();
    if (items.length === 0) {
      return;
    }
    const currentIndex = items.findIndex((i) => i.host === currentItem);
    const next = moveIndex(currentIndex < 0 ? 0 : currentIndex, items.length, action, {
      loop: this.#hooks.loop(),
      isDisabled: (i) => items[i]!.disabled(),
    });
    if (next === null) {
      return;
    }
    items[next]?.host.focus();
  }

  handleTypeahead(event: KeyboardEvent): void {
    if (!this.#typeahead.handle(event)) {
      return;
    }
    const buffer = this.#typeahead.buffer().toLowerCase();
    if (!buffer) {
      return;
    }
    const items = this.#items.items();
    const match = items.find((i) => {
      if (i.disabled()) {
        return false;
      }
      const override = i.textValue?.() ?? '';
      const source = override !== '' ? override : (i.host.textContent ?? '');
      return source.trim().toLowerCase().startsWith(buffer);
    });
    match?.host.focus();
  }

  focusFirstEnabledItem(): boolean {
    const target = this.#items.items().find((i) => !i.disabled());
    if (!target) {
      return false;
    }
    target.host.focus();
    return true;
  }

  focusLastEnabledItem(): boolean {
    const items = this.#items.items();
    for (let i = items.length - 1; i >= 0; i--) {
      const item = items[i];
      if (item && !item.disabled()) {
        item.host.focus();
        return true;
      }
    }
    return false;
  }

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
    this.#hooks.open.set(true);
  }

  closeMenu(_reason: MenuOverlayCloseReason): void {
    this.#hooks.open.set(false);
  }

  emitEscapeKeyDown(event: KeyboardEvent): void {
    const vetoed = emitVetoableNativeEvent(this.#hooks.escapeKeyDown, event);
    if (!vetoed && this.#hooks.dismissible()) {
      event.stopPropagation();
      this.closeMenu('escape');
    }
  }

  emitPointerDownOutside(event: PointerEvent): void {
    this.#pendingOutsideVeto = createVetoableNativeEvent<PointerEvent | FocusEvent>(event);
    this.#hooks.pointerDownOutside.emit(
      this.#pendingOutsideVeto as VetoableNativeEvent<PointerEvent>,
    );
  }

  emitFocusOutside(event: FocusEvent): void {
    this.#pendingOutsideVeto = createVetoableNativeEvent<PointerEvent | FocusEvent>(event);
    this.#hooks.focusOutside.emit(this.#pendingOutsideVeto as VetoableNativeEvent<FocusEvent>);
  }

  emitInteractOutside(event: PointerEvent | FocusEvent): void {
    const veto =
      this.#pendingOutsideVeto ?? createVetoableNativeEvent<PointerEvent | FocusEvent>(event);
    this.#pendingOutsideVeto = null;
    this.#hooks.interactOutside.emit(veto);
    if (!veto.defaultPrevented && this.#hooks.dismissible()) {
      this.closeMenu('pointerDownOutside');
    }
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

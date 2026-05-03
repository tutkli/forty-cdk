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
import type { Placement, ReferenceElement } from '@floating-ui/dom';

import { Collection } from '../_internal/collection/collection';
import type { FloatingAlign, FloatingSide } from '../_internal/floating/floating';
import { IdGenerator } from '../_internal/id-generator/id-generator';
import {
  type ListNavigationAction,
  moveIndex,
} from '../_internal/keyboard-navigation/keyboard-navigation';
import { injectTypeahead } from '../_internal/typeahead/typeahead';
import {
  FOR_MENU_CONTEXT,
  type ForMenuCloseReason,
  type ForMenuContext,
  type ForMenuItemHandle,
} from './menu-context';

/**
 * Root for a nested submenu inside a parent `[forDropdownMenu]` /
 * `[forContextMenu]` (or another `[forMenuSub]`). Owns its own open
 * state, ids, and item collection — items inside the submenu register
 * here, not in the parent.
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
  readonly #idGen = inject(IdGenerator);
  readonly #typeahead = injectTypeahead();
  readonly #items = new Collection<ForMenuItemHandle>();

  /** The enclosing menu — required (orphan throws). */
  readonly parentMenu: ForMenuContext;

  readonly open = model<boolean>(false);

  /**
   * Floating-ui placement relative to the parent item. Default
   * `'right-start'`. Legacy API — new code should prefer `side` + `align`.
   */
  readonly placement = input<Placement>('right-start');

  /**
   * Side the submenu opens on. When set, takes precedence over `placement`.
   */
  readonly side = input<FloatingSide | undefined>(undefined);

  /** Alignment along the chosen `side`. Defaults to `'center'`. */
  readonly align = input<FloatingAlign | undefined>(undefined);

  /** Gap (px) along the main axis. Default `0`. Legacy alias for `sideOffset`. */
  readonly offset = input<number>(0);

  /** Gap (px) along the main axis. When set, overrides the legacy `offset`. */
  readonly sideOffset = input(undefined, {
    transform: (v: unknown): number | undefined => (v == null ? undefined : numberAttribute(v)),
  });

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

  readonly escapeKeyDown = output<KeyboardEvent>();
  readonly pointerDownOutside = output<PointerEvent>();
  readonly focusOutside = output<FocusEvent>();
  readonly interactOutside = output<PointerEvent | FocusEvent>();

  readonly triggerId = signal(this.#idGen.next('for-menu-sub-trigger'));
  readonly contentId = signal(this.#idGen.next('for-menu-sub-content'));

  readonly #initialFocus = signal<'first' | 'last'>('first');
  readonly initialFocus = this.#initialFocus.asReadonly();

  readonly #triggerEl = signal<HTMLElement | null>(null);
  readonly trigger = this.#triggerEl.asReadonly();
  readonly anchor = computed<ReferenceElement | null>(() => this.#triggerEl());

  readonly #contentEl = signal<HTMLElement | null>(null);
  readonly content = this.#contentEl.asReadonly();

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

  constructor() {
    const parent = inject(FOR_MENU_CONTEXT, { skipSelf: true, optional: true });
    if (!parent) {
      throw new Error(
        '[forty-cdk/menu] [forMenuSub] must be inside a [forDropdownMenu], [forContextMenu], or another [forMenuSub] element.',
      );
    }
    this.parentMenu = parent;
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

  registerItem(handle: ForMenuItemHandle): void {
    this.#items.register(handle);
  }
  unregisterItem(handle: ForMenuItemHandle): void {
    this.#items.unregister(handle);
  }

  navigate(currentItem: HTMLElement, action: ListNavigationAction): void {
    const items = this.#items.items();
    if (items.length === 0) {
      return;
    }
    const currentIndex = items.findIndex((i) => i.host === currentItem);
    const next = moveIndex(currentIndex < 0 ? 0 : currentIndex, items.length, action, {
      loop: this.loop(),
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
      const text = (i.host.textContent ?? '').trim().toLowerCase();
      return text.startsWith(buffer);
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
    if (this.disabled()) {
      return;
    }
    if (this.open()) {
      this.closeMenu('programmatic');
    } else {
      this.openMenu(initialFocus);
    }
  }

  openMenu(initialFocus: 'first' | 'last' = 'first'): void {
    if (this.disabled()) {
      return;
    }
    this.#initialFocus.set(initialFocus);
    this.open.set(true);
  }

  closeMenu(reason: ForMenuCloseReason): void {
    this.open.set(false);
    // Propagate up so item activation, Tab, and outside-pointer collapse
    // the entire menu chain. `'escape'` collapses only this level (per APG);
    // `'programmatic'` is the consumer's own write — no propagation either.
    if (reason !== 'escape' && reason !== 'programmatic') {
      this.parentMenu.closeMenu(reason);
    }
  }

  emitEscapeKeyDown(event: KeyboardEvent): void {
    this.escapeKeyDown.emit(event);
    if (!event.defaultPrevented && this.dismissible()) {
      event.stopPropagation();
      this.closeMenu('escape');
    }
  }

  emitPointerDownOutside(event: PointerEvent): void {
    this.pointerDownOutside.emit(event);
  }

  emitFocusOutside(event: FocusEvent): void {
    this.focusOutside.emit(event);
  }

  emitInteractOutside(event: PointerEvent | FocusEvent): void {
    this.interactOutside.emit(event);
    if (!event.defaultPrevented && this.dismissible()) {
      this.closeMenu('pointerDownOutside');
    }
  }
}

import {
  booleanAttribute,
  computed,
  Directive,
  ElementRef,
  inject,
  input,
  signal,
} from '@angular/core';

import {
  fortyError,
  hostButtonType,
  hostId,
  isHoverCapablePointer,
  preventPointerFocus,
  registerHandle,
  resolveListNavigation,
} from 'forty-cdk/core';
import {
  createMenuOpenerHandle,
  type ForMenuContext,
  injectMenuContext,
  MENU_OPENERS,
  type MenuActivationModality,
} from 'forty-cdk/core-anchored';
import { createMenuItemInteraction } from './menu-item-interaction';
import { handleMenuTabOut } from './menu-tab-out';

/**
 * The `menuitem` inside the parent menu that opens its `[forMenuSub]`.
 * Apply on a `<button>` so Space / Enter dispatch native click events that
 * open the submenu via `(click)`.
 *
 * Wires `aria-haspopup="menu"`, `aria-expanded`, and `aria-controls`
 * pointing to the submenu's content. Registers itself as a `menuitem` in
 * the **parent** menu's collection (so parent navigation reaches it),
 * while reading open state from the **submenu**.
 *
 * Keyboard:
 * - **Click / Enter / Space** — open the submenu and focus its first item. On a
 *   submenu that is already open (hover-opened, or opened with its focus move
 *   vetoed) they move focus into it and never close it.
 * - **ArrowRight (LTR) / ArrowLeft (RTL)** — open the submenu and focus its first item.
 * - **ArrowDown / ArrowUp / Home / End** — navigate parent's items.
 * - **ArrowLeft (LTR) / ArrowRight (RTL)** — when the parent menu is itself
 *   a submenu, close the parent (return to grandparent's trigger). No-op at
 *   the top level.
 * - **Tab** — close the entire menu chain.
 * - **Typeahead** — printable keys delegate to parent's typeahead.
 *
 * Highlight: reflects `data-highlighted` like the other menu items while it is
 * the keyboard-focused item or the hovered one, so `[data-highlighted]` plus
 * `[data-state="open"]` style every row of a menu.
 *
 * Pointer (mouse):
 * - **pointermove** — move the parent menu's highlight onto the sub-trigger
 *   without taking focus: hover-open never moves focus.
 * - **pointerenter** — open the submenu after the configured `subMenuOpenDelay`
 *   ({@link provideForMenuDefaults}), without moving focus into it.
 * - **pointerleave** — close after `subMenuCloseDelay`, unless the pointer
 *   travels toward the open submenu through the pointer-grace "safe triangle".
 *
 * Touch / pen never hover, so submenus open by tap (the native click) on those
 * pointer types — the hover listeners are gated to `pointerType === 'mouse'`.
 *
 * Pointer-driven opens (click / tap, detected by the `pointerdown` preceding
 * the click) move focus to the submenu's first item without highlighting it;
 * keyboard activation (Enter / Space / the open arrow) highlights it.
 *
 * A disabled trigger never opens its submenu and never takes focus from a mouse
 * press. Once focused it still answers the navigation keys, Tab and typeahead.
 */
@Directive({
  selector: '[forMenuSubTrigger]',
  exportAs: 'forMenuSubTrigger',
  host: {
    role: 'menuitem',
    '[attr.type]': 'buttonType()',
    tabindex: '-1',
    '[id]': 'id()',
    '[attr.aria-haspopup]': '"menu"',
    '[attr.aria-expanded]': 'submenu.open() ? "true" : "false"',
    '[attr.aria-controls]': 'submenu.open() ? submenu.contentId() : null',
    '[attr.aria-disabled]': 'effectiveDisabled() ? "true" : null',
    '[attr.data-state]': 'submenu.open() ? "open" : "closed"',
    '[attr.data-disabled]': 'effectiveDisabled() ? "" : null',
    '[attr.data-highlighted]': 'highlighted() ? "" : null',
    '(pointerdown)': 'onPointerDown()',
    '(click)': 'onClick()',
    '(keydown)': 'onKeyDown($event)',
    '(focus)': 'interaction.onFocus()',
    '(blur)': 'interaction.onBlur()',
    '(pointerenter)': 'onPointerEnter($event)',
    '(pointerleave)': 'onPointerLeave($event)',
  },
})
export class ForMenuSubTrigger {
  private readonly buttonType = hostButtonType();

  private readonly submenu = injectMenuContext('ForMenuSubTrigger');
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly id = hostId('for-menu-sub-trigger');
  #pointerActivation = false;

  /**
   * Whether the submenu can be opened. A disabled trigger stays focusable and
   * announced. The trigger is also disabled while its `[forMenuSub]` is.
   */
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly effectiveDisabled = computed(() => this.disabled() || this.submenu.disabled());

  private readonly interaction = createMenuItemInteraction({
    ctx: this.#parentMenu(),
    effectiveDisabled: this.effectiveDisabled,
    focusOnHover: false,
  });

  /**
   * True while this sub-trigger is the active keyboard candidate or hovered by
   * the pointer. Reflected as `data-highlighted`.
   */
  readonly highlighted = this.interaction.highlighted;

  constructor() {
    preventPointerFocus(() => this.effectiveDisabled());
    const openers = inject(MENU_OPENERS);
    registerHandle(
      createMenuOpenerHandle(
        this.#host.nativeElement,
        signal<object | null>(this.submenu).asReadonly(),
        { id: this.id, labelsMenu: true },
      ),
      (handle) => openers.add(handle),
      (handle) => openers.remove(handle),
    );
  }

  private onPointerDown(): void {
    this.#pointerActivation = true;
  }

  private onClick(): void {
    const modality: MenuActivationModality = this.#pointerActivation ? 'pointer' : 'keyboard';
    this.#pointerActivation = false;
    if (this.effectiveDisabled()) {
      return;
    }
    this.submenu.openMenu('first', modality);
  }

  private onPointerEnter(event: PointerEvent): void {
    if (!isHoverCapablePointer(event)) {
      return;
    }
    if (this.effectiveDisabled()) {
      return;
    }
    this.submenu.scheduleOpenByPointer?.();
  }

  private onPointerLeave(event: PointerEvent): void {
    if (!isHoverCapablePointer(event)) {
      return;
    }
    this.submenu.onTriggerPointerLeave?.({ x: event.clientX, y: event.clientY });
  }

  #parentMenu(): ForMenuContext {
    const parent = this.submenu.parentMenu;
    if (!parent) {
      throw fortyError({
        code: 'FORCDK-MENU-005',
        message: 'The [forMenuSub] holding this [forMenuSubTrigger] has no parent menu.',
        cause: 'A submenu opens from an item of the menu above it, so it needs an enclosing menu.',
        fix: 'Nest the [forMenuSub] inside a [forDropdownMenu], [forContextMenu], or another [forMenuSub].',
      });
    }
    return parent;
  }

  private onKeyDown(event: KeyboardEvent): void {
    this.#pointerActivation = false;
    const parent = this.submenu.parentMenu!;
    const isRtl = this.submenu.dir() === 'rtl';
    const openKey = isRtl ? 'ArrowLeft' : 'ArrowRight';
    const closeParentKey = isRtl ? 'ArrowRight' : 'ArrowLeft';

    if (event.key === openKey) {
      event.preventDefault();
      if (!this.effectiveDisabled()) {
        this.submenu.openMenu('first');
      }
      return;
    }

    // Close-parent key when the *parent* is itself a submenu: collapse the parent.
    if (event.key === closeParentKey && parent.parentMenu) {
      event.preventDefault();
      parent.closeMenu('escape');
      return;
    }
    // Close-parent key when the *parent* is the top menu of a menubar:
    // switch to the previous / next sibling menu (LTR-ArrowLeft → prev,
    // RTL-ArrowRight → prev). Open-key on the sub-trigger keeps its own
    // meaning (open this submenu) — only the close-direction propagates
    // up to the menubar.
    if (event.key === closeParentKey && parent.menubar) {
      event.preventDefault();
      parent.menubar.switchToSibling('prev');
      return;
    }

    const action = resolveListNavigation(event, { orientation: 'vertical' });
    if (action) {
      event.preventDefault();
      parent.navigate(this.#host.nativeElement, action);
      return;
    }

    if (event.key === 'Tab') {
      handleMenuTabOut(parent);
      return;
    }

    parent.handleTypeahead(event);
  }
}

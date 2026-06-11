import { booleanAttribute, computed, Directive, ElementRef, inject, input } from '@angular/core';

import { registerHandle } from '../_internal/collection/register-handle';
import { resolveListNavigation } from '../_internal/keyboard-navigation/keyboard-navigation';
import type { MenuActivationModality } from '../_internal/menu-overlay/menu-overlay';
import { injectMenuContext } from './menu-context';
import { handleMenuTabOut } from './menu-tab-out';

/**
 * The `menuitem` inside the parent menu that opens its `[forMenuSub]`.
 * Apply on a `<button>` so Space / Enter dispatch native click events that
 * toggle the submenu via `(click)`.
 *
 * Wires `aria-haspopup="menu"`, `aria-expanded`, and `aria-controls`
 * pointing to the submenu's content. Registers itself as a `menuitem` in
 * the **parent** menu's collection (so parent navigation reaches it),
 * while reading open state from the **submenu**.
 *
 * Keyboard:
 * - **Click / Enter / Space** — toggle the submenu (focus first item on open).
 * - **ArrowRight (LTR) / ArrowLeft (RTL)** — open the submenu and focus its first item.
 * - **ArrowDown / ArrowUp / Home / End** — navigate parent's items.
 * - **ArrowLeft (LTR) / ArrowRight (RTL)** — when the parent menu is itself
 *   a submenu, close the parent (return to grandparent's trigger). No-op at
 *   the top level.
 * - **Tab** — close the entire menu chain.
 * - **Typeahead** — printable keys delegate to parent's typeahead.
 *
 * Pointer (mouse):
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
 */
@Directive({
  selector: '[forMenuSubTrigger]',
  exportAs: 'forMenuSubTrigger',
  host: {
    role: 'menuitem',
    type: 'button',
    tabindex: '-1',
    '[id]': 'submenu.triggerId()',
    '[attr.aria-haspopup]': '"menu"',
    '[attr.aria-expanded]': 'submenu.open() ? "true" : "false"',
    '[attr.aria-controls]': 'submenu.open() ? submenu.contentId() : null',
    '[attr.aria-disabled]': 'effectiveDisabled() ? "true" : null',
    '[attr.data-state]': 'submenu.open() ? "open" : "closed"',
    '[attr.data-disabled]': 'effectiveDisabled() ? "" : null',
    '(pointerdown)': 'onPointerDown()',
    '(click)': 'onClick()',
    '(keydown)': 'onKeyDown($event)',
    '(pointerenter)': 'onPointerEnter($event)',
    '(pointerleave)': 'onPointerLeave($event)',
  },
})
export class ForMenuSubTrigger {
  protected readonly submenu = injectMenuContext('ForMenuSubTrigger');
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);
  #pointerActivation = false;

  readonly disabled = input(false, { transform: booleanAttribute });
  readonly effectiveDisabled = computed(() => this.disabled() || this.submenu.disabled());

  constructor() {
    if (!this.submenu.parentMenu) {
      throw new Error(
        '[forty-cdk/menu] [forMenuSubTrigger] must be inside a [forMenuSub] inside a parent menu.',
      );
    }
    const parent = this.submenu.parentMenu;
    const handle = {
      host: this.#host.nativeElement,
      disabled: this.effectiveDisabled,
    };
    registerHandle(
      handle,
      (h) => parent.registerItem(h),
      (h) => parent.unregisterItem(h),
    );
    registerHandle(
      this.#host.nativeElement,
      (el) => this.submenu.registerTrigger(el),
      (el) => this.submenu.unregisterTrigger(el),
    );
  }

  protected onPointerDown(): void {
    this.#pointerActivation = true;
  }

  protected onClick(): void {
    const modality: MenuActivationModality = this.#pointerActivation ? 'pointer' : 'keyboard';
    this.#pointerActivation = false;
    if (this.effectiveDisabled()) {
      return;
    }
    this.submenu.toggle('first', modality);
  }

  protected onPointerEnter(event: PointerEvent): void {
    // Hover is a mouse affordance; touch / pen open the submenu by tap (click).
    if (event.pointerType !== 'mouse') {
      return;
    }
    if (this.effectiveDisabled()) {
      return;
    }
    this.submenu.scheduleOpenByPointer?.();
  }

  protected onPointerLeave(event: PointerEvent): void {
    if (event.pointerType !== 'mouse') {
      return;
    }
    this.submenu.onTriggerPointerLeave?.({ x: event.clientX, y: event.clientY });
  }

  protected onKeyDown(event: KeyboardEvent): void {
    this.#pointerActivation = false;
    if (this.effectiveDisabled()) {
      return;
    }
    const parent = this.submenu.parentMenu!;
    const isRtl = this.submenu.dir() === 'rtl';
    const openKey = isRtl ? 'ArrowLeft' : 'ArrowRight';
    const closeParentKey = isRtl ? 'ArrowRight' : 'ArrowLeft';

    if (event.key === openKey) {
      event.preventDefault();
      this.submenu.openMenu('first');
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

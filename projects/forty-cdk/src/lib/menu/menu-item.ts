import {
  booleanAttribute,
  computed,
  Directive,
  ElementRef,
  inject,
  input,
  output,
  signal,
} from '@angular/core';

import { registerHandle } from '../_internal/collection/register-handle';
import { resolveListNavigation } from '../_internal/keyboard-navigation/keyboard-navigation';
import { emitVetoableEvent, type VetoableEvent } from '../_internal/vetoable-event/vetoable-event';
import { injectMenuContext } from './menu-context';
import { handleMenuHorizontalArrow } from './menu-horizontal-arrow';
import { handleMenuTabOut } from './menu-tab-out';

/**
 * A single action inside `[forMenuContent]`. Apply on a `<button>` so
 * Space / Enter activation come from native button semantics.
 *
 * Activation emits `(select)` and then closes the menu. To keep the menu
 * open after activation (e.g. the action toggled something the user
 * wants to refine), call `event.preventDefault()` on the emitted event.
 *
 * Disabled items remain in the tab/focus rotation (per APG) so screen
 * readers can announce them — `aria-disabled="true"` rather than the
 * native `disabled` attribute.
 */
@Directive({
  selector: '[forMenuItem]',
  exportAs: 'forMenuItem',
  host: {
    role: 'menuitem',
    type: 'button',
    tabindex: '-1',
    '[attr.aria-disabled]': 'effectiveDisabled() ? "true" : null',
    '[attr.data-disabled]': 'effectiveDisabled() ? "" : null',
    '[attr.data-highlighted]': 'highlighted() ? "" : null',
    '(click)': 'onClick()',
    '(keydown)': 'onKeyDown($event)',
    '(focus)': 'onFocus()',
    '(blur)': 'onBlur()',
    '(pointermove)': 'onPointerMove($event)',
  },
})
export class ForMenuItem {
  protected readonly ctx = injectMenuContext('ForMenuItem');
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Per-item disabled, in addition to the menu's `disabled`. */
  readonly disabled = input(false, { transform: booleanAttribute });

  /**
   * Override the string used for typeahead matching. Defaults to `''`,
   * which falls back to the item's `textContent`. Set this when the item
   * DOM contains icons, kbd hints, or other text that shouldn't bleed
   * into the match — e.g. `<button forMenuItem textValue="New file">…</button>`
   * for an item rendered as `New file ⌘N`.
   */
  readonly textValue = input<string>('');

  readonly effectiveDisabled = computed(() => this.disabled() || this.ctx.disabled());

  readonly #highlighted = signal(false);
  /**
   * True while this item is the active keyboard candidate or hovered by the
   * pointer. Set on keyboard-driven focus and on `pointermove` (hover follows
   * the pointer), cleared on `blur` and when the pointer leaves the surface.
   * The programmatic initial focus of a pointer-driven open lands without a
   * highlight until the pointer moves onto the item or keyboard navigation
   * begins. Reflected as `data-highlighted`.
   */
  readonly highlighted = this.#highlighted.asReadonly();

  #suppressNextFocusHighlight = false;

  /**
   * Fires on click / Enter / Space activation. Call `preventDefault()`
   * on the emitted veto to keep the menu open after activation.
   */
  readonly select = output<VetoableEvent>();

  constructor() {
    const handle = {
      host: this.#host.nativeElement,
      disabled: this.effectiveDisabled,
      textValue: this.textValue,
      suppressHighlightOnNextFocus: () => {
        this.#suppressNextFocusHighlight = true;
      },
      clearHighlight: () => {
        this.#highlighted.set(false);
      },
    };
    registerHandle(
      handle,
      (h) => this.ctx.registerItem(h),
      (h) => this.ctx.unregisterItem(h),
    );
  }

  protected onClick(): void {
    if (this.effectiveDisabled()) {
      return;
    }
    if (!emitVetoableEvent(this.select)) {
      this.ctx.closeMenu('select');
    }
  }

  protected onFocus(): void {
    if (this.#suppressNextFocusHighlight) {
      this.#suppressNextFocusHighlight = false;
      return;
    }
    this.#highlighted.set(true);
  }

  protected onBlur(): void {
    this.#suppressNextFocusHighlight = false;
    this.#highlighted.set(false);
  }

  protected onPointerMove(event: PointerEvent): void {
    if (event.pointerType !== '' && event.pointerType !== 'mouse') {
      return;
    }
    if (this.effectiveDisabled()) {
      return;
    }
    const host = this.#host.nativeElement;
    if (host.ownerDocument.activeElement !== host) {
      host.focus({ preventScroll: true });
    }
    this.#highlighted.set(true);
  }

  protected onKeyDown(event: KeyboardEvent): void {
    if (this.effectiveDisabled()) {
      return;
    }
    // ArrowLeft / ArrowRight: inside a submenu, close-submenu key collapses
    // one level; in the top menu of a menubar, both arrows switch to the
    // previous / next sibling menu.
    if (handleMenuHorizontalArrow(event, this.ctx)) {
      return;
    }
    const action = resolveListNavigation(event, { orientation: 'vertical' });
    if (action) {
      event.preventDefault();
      this.ctx.navigate(this.#host.nativeElement, action);
      return;
    }
    if (event.key === 'Tab') {
      handleMenuTabOut(this.ctx);
      return;
    }
    this.ctx.handleTypeahead(event);
  }
}

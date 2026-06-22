import {
  booleanAttribute,
  computed,
  Directive,
  ElementRef,
  inject,
  InjectionToken,
  input,
  model,
  output,
  signal,
} from '@angular/core';

import {
  registerHandle,
  resolveListNavigation,
  createVetoableEvent,
  emitVetoableEvent,
  type VetoableEvent,
  injectMenuContext,
} from 'forty-cdk/core';
import { handleMenuHorizontalArrow } from './menu-horizontal-arrow';
import { handleMenuTabOut } from './menu-tab-out';

/**
 * Injection key the `[forMenuItemIndicator]` uses to resolve a parent
 * checkbox item, decoupled from the concrete `ForMenuCheckboxItem` class.
 * `ForMenuCheckboxItem` provides itself under this token, so a design system
 * wrapping the item by subclassing re-points it at the subclass with a single
 * provider (`{ provide: FOR_MENU_CHECKBOX_ITEM, useExisting: MtxMenuCheckboxItem }`)
 * and the indicator keeps resolving — see `docs/wrapping-form-primitives.md`.
 */
export const FOR_MENU_CHECKBOX_ITEM = new InjectionToken<ForMenuCheckboxItem>(
  'FOR_MENU_CHECKBOX_ITEM',
);

/**
 * Tri-state-free checkbox item. Click and Enter toggle `checked`, emit
 * `(activate)`, and close the menu — `event.preventDefault()` on the emitted
 * event keeps the menu open. Per APG, **Space** toggles `checked` and
 * emits `(activate)` without closing the menu, so users can flip several
 * options in one open without consumer glue.
 */
@Directive({
  selector: '[forMenuCheckboxItem]',
  exportAs: 'forMenuCheckboxItem',
  providers: [{ provide: FOR_MENU_CHECKBOX_ITEM, useExisting: ForMenuCheckboxItem }],
  host: {
    role: 'menuitemcheckbox',
    type: 'button',
    tabindex: '-1',
    '[attr.aria-checked]': 'checked() ? "true" : "false"',
    '[attr.aria-disabled]': 'effectiveDisabled() ? "true" : null',
    '[attr.data-state]': 'checked() ? "checked" : "unchecked"',
    '[attr.data-disabled]': 'effectiveDisabled() ? "" : null',
    '[attr.data-highlighted]': 'highlighted() ? "" : null',
    '(click)': 'onClick()',
    '(keydown)': 'onKeyDown($event)',
    '(focus)': 'onFocus()',
    '(blur)': 'onBlur()',
    '(pointermove)': 'onPointerMove($event)',
  },
})
export class ForMenuCheckboxItem {
  protected readonly ctx = injectMenuContext('ForMenuCheckboxItem');
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Two-way bindable. */
  readonly checked = model<boolean>(false);
  readonly disabled = input(false, { transform: booleanAttribute });

  /**
   * Override the string used for typeahead matching. Defaults to `''`,
   * which falls back to the item's `textContent`. See `[forMenuItem]`
   * for the rationale.
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
  readonly activate = output<VetoableEvent>();

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
    this.checked.update((v) => !v);
    if (!emitVetoableEvent(this.activate)) {
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
    if (handleMenuHorizontalArrow(event, this.ctx)) {
      return;
    }
    // APG menubar guidance: Space toggles checked without closing the menu
    // (Enter and click still close via native button activation). preventDefault
    // here suppresses the browser-synthesized click so the menu stays open.
    if (event.key === ' ') {
      event.preventDefault();
      this.checked.update((v) => !v);
      this.activate.emit(createVetoableEvent());
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

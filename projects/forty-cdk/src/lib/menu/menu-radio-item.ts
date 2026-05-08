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
import {
  createVetoableEvent,
  emitVetoableEvent,
  type VetoableEvent,
} from '../_internal/vetoable-event/vetoable-event';
import { injectMenuContext } from './menu-context';
import { handleMenuHorizontalArrow } from './menu-horizontal-arrow';
import { injectMenuRadioGroupContext } from './menu-radio-group-context';

/**
 * One radio option inside `[forMenuRadioGroup]`. Click and Enter set the
 * group's `value` to this item's `value`, emit `(select)`, and close the
 * menu — call `event.preventDefault()` on the emitted event to keep the
 * menu open. Per APG, **Space** sets the value and emits `(select)`
 * without closing the menu.
 */
@Directive({
  selector: '[forMenuRadioItem]',
  exportAs: 'forMenuRadioItem',
  host: {
    role: 'menuitemradio',
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
  },
})
export class ForMenuRadioItem {
  protected readonly menu = injectMenuContext('ForMenuRadioItem');
  protected readonly group = injectMenuRadioGroupContext('ForMenuRadioItem');
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Identifier added to / read from the radio group's `value`. Required. */
  readonly value = input.required<string>();
  readonly disabled = input(false, { transform: booleanAttribute });

  /**
   * Override the string used for typeahead matching. Defaults to `''`,
   * which falls back to the item's `textContent`. See `[forMenuItem]`
   * for the rationale.
   */
  readonly textValue = input<string>('');

  readonly checked = computed(() => this.group.isSelected(this.value()));

  readonly effectiveDisabled = computed(() => this.disabled() || this.menu.disabled());

  readonly #highlighted = signal(false);
  /** True while this item has DOM focus. Reflected as `data-highlighted`. */
  readonly highlighted = this.#highlighted.asReadonly();

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
    };
    registerHandle(
      handle,
      (h) => this.menu.registerItem(h),
      (h) => this.menu.unregisterItem(h),
    );
  }

  protected onClick(): void {
    if (this.effectiveDisabled()) {
      return;
    }
    this.group.select(this.value());
    if (!emitVetoableEvent(this.select)) {
      this.menu.closeMenu('select');
    }
  }

  protected onFocus(): void {
    this.#highlighted.set(true);
  }

  protected onBlur(): void {
    this.#highlighted.set(false);
  }

  protected onKeyDown(event: KeyboardEvent): void {
    if (this.effectiveDisabled()) {
      return;
    }
    if (handleMenuHorizontalArrow(event, this.menu)) {
      return;
    }
    // APG menubar guidance: Space sets the group value without closing the
    // menu (Enter and click still close via native button activation).
    // preventDefault here suppresses the browser-synthesized click.
    if (event.key === ' ') {
      event.preventDefault();
      this.group.select(this.value());
      this.select.emit(createVetoableEvent());
      return;
    }
    const action = resolveListNavigation(event, { orientation: 'vertical' });
    if (action) {
      event.preventDefault();
      this.menu.navigate(this.#host.nativeElement, action);
      return;
    }
    if (event.key === 'Tab') {
      event.preventDefault();
      this.menu.closeMenu('tab');
      return;
    }
    this.menu.handleTypeahead(event);
  }
}

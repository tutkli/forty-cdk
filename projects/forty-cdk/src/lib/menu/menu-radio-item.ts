import {
  booleanAttribute,
  computed,
  DestroyRef,
  Directive,
  ElementRef,
  inject,
  input,
  output,
} from '@angular/core';

import { resolveListNavigation } from '../_internal/keyboard-navigation/keyboard-navigation';
import { injectMenuContext } from './menu-context';
import { injectMenuRadioGroupContext } from './menu-radio-group-context';

/**
 * One radio option inside `[forMenuRadioGroup]`. Activation sets the
 * group's `value` to this item's `value`, emits `(select)`, and closes
 * the menu (call `event.preventDefault()` on the emitted event to keep
 * the menu open).
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
    '(click)': 'onClick()',
    '(keydown)': 'onKeyDown($event)',
  },
})
export class ForMenuRadioItem {
  protected readonly menu = injectMenuContext('ForMenuRadioItem');
  protected readonly group = injectMenuRadioGroupContext('ForMenuRadioItem');
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Identifier added to / read from the radio group's `value`. Required. */
  readonly value = input.required<string>();
  readonly disabled = input(false, { transform: booleanAttribute });

  readonly checked = computed(() => this.group.isSelected(this.value()));

  readonly effectiveDisabled = computed(() => this.disabled() || this.menu.disabled());

  readonly select = output<Event>();

  constructor() {
    const handle = {
      host: this.#host.nativeElement,
      disabled: this.effectiveDisabled,
    };
    this.menu.registerItem(handle);
    inject(DestroyRef).onDestroy(() => this.menu.unregisterItem(handle));
  }

  protected onClick(): void {
    if (this.effectiveDisabled()) {
      return;
    }
    this.group.select(this.value());
    const event = new CustomEvent('forMenuItemSelect', { cancelable: true });
    this.select.emit(event);
    if (!event.defaultPrevented) {
      this.menu.closeMenu('select');
    }
  }

  protected onKeyDown(event: KeyboardEvent): void {
    if (this.effectiveDisabled()) {
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

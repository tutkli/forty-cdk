import {
  booleanAttribute,
  computed,
  DestroyRef,
  Directive,
  ElementRef,
  inject,
  input,
  model,
  output,
} from '@angular/core';

import { resolveListNavigation } from '../_internal/keyboard-navigation/keyboard-navigation';
import { injectMenuContext } from './menu-context';

/**
 * Tri-state-free checkbox item. Activation toggles `checked`, then emits
 * `(select)` and closes the menu — `event.preventDefault()` on the emitted
 * event keeps the menu open (useful for "select multiple options before
 * dismissing" flows).
 */
@Directive({
  selector: '[forMenuCheckboxItem]',
  exportAs: 'forMenuCheckboxItem',
  host: {
    role: 'menuitemcheckbox',
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
export class ForMenuCheckboxItem {
  protected readonly ctx = injectMenuContext('ForMenuCheckboxItem');
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Two-way bindable. */
  readonly checked = model<boolean>(false);
  readonly disabled = input(false, { transform: booleanAttribute });

  readonly effectiveDisabled = computed(() => this.disabled() || this.ctx.disabled());

  readonly select = output<Event>();

  constructor() {
    const handle = {
      host: this.#host.nativeElement,
      disabled: this.effectiveDisabled,
    };
    this.ctx.registerItem(handle);
    inject(DestroyRef).onDestroy(() => this.ctx.unregisterItem(handle));
  }

  protected onClick(): void {
    if (this.effectiveDisabled()) {
      return;
    }
    this.checked.update((v) => !v);
    const event = new CustomEvent('forMenuItemSelect', { cancelable: true });
    this.select.emit(event);
    if (!event.defaultPrevented) {
      this.ctx.closeMenu('select');
    }
  }

  protected onKeyDown(event: KeyboardEvent): void {
    if (this.effectiveDisabled()) {
      return;
    }
    const action = resolveListNavigation(event, { orientation: 'vertical' });
    if (action) {
      event.preventDefault();
      this.ctx.navigate(this.#host.nativeElement, action);
      return;
    }
    if (event.key === 'Tab') {
      event.preventDefault();
      this.ctx.closeMenu('tab');
      return;
    }
    this.ctx.handleTypeahead(event);
  }
}

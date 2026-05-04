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
 * Tri-state-free checkbox item. Click and Enter toggle `checked`, emit
 * `(select)`, and close the menu — `event.preventDefault()` on the emitted
 * event keeps the menu open. Per APG, **Space** toggles `checked` and
 * emits `(select)` without closing the menu, so users can flip several
 * options in one open without consumer glue.
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
    if (event.key === 'ArrowLeft' && this.ctx.parentMenu) {
      event.preventDefault();
      this.ctx.closeMenu('escape');
      return;
    }
    // APG menubar guidance: Space toggles checked without closing the menu
    // (Enter and click still close via native button activation). preventDefault
    // here suppresses the browser-synthesized click so the menu stays open.
    if (event.key === ' ') {
      event.preventDefault();
      this.checked.update((v) => !v);
      this.select.emit(new CustomEvent('forMenuItemSelect', { cancelable: true }));
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

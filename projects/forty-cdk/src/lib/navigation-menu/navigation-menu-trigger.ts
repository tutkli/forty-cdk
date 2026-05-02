import {
  computed,
  DestroyRef,
  Directive,
  ElementRef,
  inject,
  Signal,
  signal,
} from '@angular/core';

import { IdGenerator } from '../_internal/id-generator/id-generator';
import { resolveListNavigation } from '../_internal/keyboard-navigation/keyboard-navigation';
import {
  injectNavigationMenuContext,
  injectNavigationMenuItemContext,
} from './navigation-menu-context';

/**
 * Disclosure trigger. Apply on `<button>`. Hover / focus / click open the
 * paired `[forNavigationMenuContent]`; arrow keys move focus across siblings;
 * Escape closes; Enter / Space toggle.
 */
@Directive({
  selector: '[forNavigationMenuTrigger]',
  exportAs: 'forNavigationMenuTrigger',
  host: {
    type: 'button',
    '[id]': 'id()',
    '[attr.aria-expanded]': 'isOpen() ? "true" : "false"',
    '[attr.aria-controls]': 'isOpen() ? contentId() : null',
    '[attr.aria-disabled]': 'disabled() ? "true" : null',
    '[attr.disabled]': 'disabled() ? "" : null',
    '[attr.data-state]': 'isOpen() ? "open" : "closed"',
    '[attr.data-disabled]': 'disabled() ? "" : null',
    '(click)': 'onClick()',
    '(pointerenter)': 'onPointerEnter()',
    '(pointerleave)': 'onPointerLeave()',
    '(focus)': 'onFocus()',
    '(keydown)': 'onKeyDown($event)',
  },
})
export class ForNavigationMenuTrigger {
  protected readonly menu = injectNavigationMenuContext('ForNavigationMenuTrigger');
  readonly #item = injectNavigationMenuItemContext('ForNavigationMenuTrigger');
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly #idGen = inject(IdGenerator);

  readonly id = signal(this.#idGen.next('for-navigation-menu-trigger'));
  protected readonly value: Signal<string> = this.#item.value;
  protected readonly disabled: Signal<boolean> = this.#item.disabled;

  protected readonly isOpen = computed(() => this.menu.isOpen(this.value()));
  protected readonly contentId = computed(() => this.menu.contentIdFor(this.value()) ?? '');

  constructor() {
    const handle = {
      host: this.#host.nativeElement,
      value: this.value,
      disabled: this.disabled,
      id: this.id,
    };
    this.menu.registerTrigger(handle);
    inject(DestroyRef).onDestroy(() => this.menu.unregisterTrigger(handle));
  }

  protected onClick(): void {
    if (this.disabled()) return;
    this.menu.toggle(this.value());
  }

  protected onPointerEnter(): void {
    if (this.disabled()) return;
    this.menu.scheduleOpen(this.value(), 'hover');
  }

  protected onPointerLeave(): void {
    if (this.disabled()) return;
    this.menu.scheduleClose('hover');
  }

  protected onFocus(): void {
    if (this.disabled()) return;
    this.menu.scheduleOpen(this.value(), 'focus');
  }

  protected onKeyDown(event: KeyboardEvent): void {
    if (this.disabled()) return;
    // Activation: Enter / Space toggle the disclosure.
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.menu.toggle(this.value());
      return;
    }
    if (event.key === 'Escape' && this.isOpen()) {
      event.preventDefault();
      event.stopPropagation();
      this.menu.close();
      this.#host.nativeElement.focus();
      return;
    }
    // Cross-axis arrow opens, main-axis arrows navigate.
    const orientation = this.menu.orientation();
    const action = resolveListNavigation(event, {
      orientation,
      dir: this.menu.dir(),
    });
    if (action) {
      event.preventDefault();
      this.menu.navigate(this.#host.nativeElement, action);
      return;
    }
    // ArrowDown (horizontal) / ArrowRight (vertical) opens the disclosure.
    const openKey = orientation === 'horizontal' ? 'ArrowDown' : 'ArrowRight';
    if (event.key === openKey) {
      event.preventDefault();
      this.menu.scheduleOpen(this.value(), 'keyboard');
    }
  }
}

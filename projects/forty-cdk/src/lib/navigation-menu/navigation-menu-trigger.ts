import { computed, Directive, ElementRef, inject, type Signal } from '@angular/core';

import { registerHandle } from '../_internal/collection/register-handle';
import { reflectDisabled } from '../_internal/disabled-reflection/disabled-reflection';
import { hostId } from '../_internal/host-id/host-id';
import { resolveListNavigation } from '../_internal/keyboard-navigation/keyboard-navigation';
import {
  injectNavigationMenuContext,
  injectNavigationMenuItemContext,
} from './navigation-menu-context';

/**
 * Disclosure trigger. Apply on `<button>`. Hover / click open the paired
 * `[forNavigationMenuContent]`; arrow keys move focus across siblings;
 * ArrowDown (horizontal) / ArrowRight (vertical) open; Escape closes;
 * Enter / Space toggle.
 *
 * Per the APG disclosure-navigation pattern this does NOT open on plain
 * focus: Tabbing across the trigger row must not auto-expand panels, and a
 * programmatic return-focus (e.g. after Escape) must not synchronously
 * re-open the panel that just closed.
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
    '[attr.data-state]': 'isOpen() ? "open" : "closed"',
    '[attr.data-disabled]': 'disabled() ? "" : null',
    '(click)': 'onClick()',
    '(pointerenter)': 'onPointerEnter()',
    '(pointerleave)': 'onPointerLeave()',
    '(keydown)': 'onKeyDown($event)',
  },
})
export class ForNavigationMenuTrigger {
  protected readonly menu = injectNavigationMenuContext('ForNavigationMenuTrigger');
  readonly #item = injectNavigationMenuItemContext('ForNavigationMenuTrigger');
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly id = hostId('for-navigation-menu-trigger');
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
    // Defer registration so the parent's `triggerIdFor` / `contentIdFor` /
    // `triggerHostFor` lookups can read `handle.value()` without hitting the
    // not-yet-bound `input.required` throw on the owning `[forNavigationMenuItem]`.
    // `unregisterTrigger` is reference-based, so destroy-before-register is a
    // safe no-op.
    registerHandle(
      handle,
      (h) => this.menu.registerTrigger(h),
      (h) => this.menu.unregisterTrigger(h),
      'afterNextRender',
    );
    reflectDisabled(this.disabled);
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
    this.menu.scheduleClose('hover', this.value());
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

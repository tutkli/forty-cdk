import { Directive, ElementRef, inject } from '@angular/core';

import { registerHandle } from '../_internal/collection/register-handle';
import { injectTooltipContext } from './tooltip-context';

/**
 * Element that activates the tooltip on hover or focus. Apply on a focusable
 * element — preferably a `<button>` so keyboard users can reach it. Receives
 * `aria-describedby` only while the tooltip is open, per APG.
 */
@Directive({
  selector: '[forTooltipTrigger]',
  exportAs: 'forTooltipTrigger',
  host: {
    '[id]': 'ctx.triggerId()',
    '[attr.aria-describedby]': 'ctx.open() ? ctx.contentId() : null',
    '[attr.data-state]': 'ctx.open() ? "open" : "closed"',
    '(pointerenter)': 'onPointerEnter()',
    '(pointerleave)': 'onPointerLeave()',
    '(focus)': 'onFocus()',
    '(blur)': 'onBlur()',
    '(keydown.escape)': 'onEscape($event)',
  },
})
export class ForTooltipTrigger {
  protected readonly ctx = injectTooltipContext('ForTooltipTrigger');
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);

  #hovered = false;
  #focused = false;

  constructor() {
    registerHandle(
      this.#host.nativeElement,
      (el) => this.ctx.registerTrigger(el),
      (el) => this.ctx.unregisterTrigger(el),
    );
  }

  protected onPointerEnter(): void {
    this.#hovered = true;
    this.ctx.scheduleOpen('hover');
  }

  protected onPointerLeave(): void {
    this.#hovered = false;
    this.#scheduleCloseIfInactive('hover');
  }

  protected onFocus(): void {
    this.#focused = true;
    this.ctx.scheduleOpen('focus');
  }

  protected onBlur(): void {
    this.#focused = false;
    this.#scheduleCloseIfInactive('focus');
  }

  #scheduleCloseIfInactive(reason: 'hover' | 'focus'): void {
    if (this.#hovered || this.#focused) {
      return;
    }
    this.ctx.scheduleClose(reason);
  }

  protected onEscape(event: Event): void {
    if (this.ctx.open()) {
      event.preventDefault();
      event.stopPropagation();
      this.ctx.scheduleClose('escape');
    }
  }
}

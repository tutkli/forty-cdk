import { DestroyRef, Directive, ElementRef, inject } from '@angular/core';

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

  constructor() {
    this.ctx.registerTrigger(this.#host.nativeElement);
    inject(DestroyRef).onDestroy(() =>
      this.ctx.unregisterTrigger(this.#host.nativeElement),
    );
  }

  protected onPointerEnter(): void {
    this.ctx.scheduleOpen('hover');
  }

  protected onPointerLeave(): void {
    this.ctx.scheduleClose('hover');
  }

  protected onFocus(): void {
    this.ctx.scheduleOpen('focus');
  }

  protected onBlur(): void {
    this.ctx.scheduleClose('focus');
  }

  protected onEscape(event: Event): void {
    if (this.ctx.open()) {
      event.preventDefault();
      event.stopPropagation();
      this.ctx.scheduleClose('escape');
    }
  }
}

import { DestroyRef, Directive, ElementRef, inject } from '@angular/core';

import { injectHoverCardContext } from './hover-card-context';

/**
 * Element that activates the hover-card on hover or focus. Apply on a link,
 * a button, or any focusable element that already conveys the underlying
 * action (the card adds preview, not meaning).
 *
 * Reflects `data-state` so consumers can style the trigger when its card is
 * open (e.g. an underline that turns solid). No `aria-describedby` is
 * applied — hover-card content is not a description for assistive tech.
 */
@Directive({
  selector: '[forHoverCardTrigger]',
  exportAs: 'forHoverCardTrigger',
  host: {
    '[attr.data-state]': 'ctx.open() ? "open" : "closed"',
    '(pointerenter)': 'onPointerEnter()',
    '(pointerleave)': 'onPointerLeave()',
    '(focus)': 'onFocus()',
    '(blur)': 'onBlur()',
    '(keydown.escape)': 'onEscape($event)',
  },
})
export class ForHoverCardTrigger {
  protected readonly ctx = injectHoverCardContext('ForHoverCardTrigger');
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    this.ctx.registerTrigger(this.#host.nativeElement);
    inject(DestroyRef).onDestroy(() => this.ctx.unregisterTrigger(this.#host.nativeElement));
  }

  protected onPointerEnter(): void {
    this.ctx.scheduleOpen('hover-trigger');
  }

  protected onPointerLeave(): void {
    this.ctx.scheduleClose('hover-trigger');
  }

  protected onFocus(): void {
    this.ctx.scheduleOpen('focus');
  }

  protected onBlur(): void {
    this.ctx.scheduleClose('focus');
  }

  protected onEscape(event: Event): void {
    this.ctx.emitEscapeKeyDown(event as KeyboardEvent);
  }
}

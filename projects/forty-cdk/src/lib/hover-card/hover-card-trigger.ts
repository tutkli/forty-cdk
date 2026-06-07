import { Directive, ElementRef, inject } from '@angular/core';

import { registerHandle } from '../_internal/collection/register-handle';
import { injectHoverCardContext } from './hover-card-context';

/**
 * Element that activates the hover-card on hover or focus. Apply on a link,
 * a button, or any focusable element that already conveys the underlying
 * action (the card adds preview, not meaning).
 *
 * Reflects `data-state` so consumers can style the trigger when its card is
 * open (e.g. an underline that turns solid). No `aria-describedby` is
 * applied — hover-card content is not a description for assistive tech.
 *
 * Escape dismissal is owned by the content's document-level dismissable
 * layer (see `ForHoverCardContent`), so it works from the trigger and from
 * unrelated focus alike — the trigger carries no Escape listener of its own.
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
  },
})
export class ForHoverCardTrigger {
  protected readonly ctx = injectHoverCardContext('ForHoverCardTrigger');
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
    this.ctx.scheduleOpen('hover-trigger');
  }

  protected onPointerLeave(): void {
    this.#hovered = false;
    this.#scheduleCloseIfInactive('hover-trigger');
  }

  protected onFocus(): void {
    this.#focused = true;
    this.ctx.scheduleOpen('focus');
  }

  protected onBlur(): void {
    this.#focused = false;
    this.#scheduleCloseIfInactive('focus');
  }

  #scheduleCloseIfInactive(reason: 'hover-trigger' | 'focus'): void {
    if (this.#hovered || this.#focused) {
      return;
    }
    this.ctx.scheduleClose(reason);
  }
}

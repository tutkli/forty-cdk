import { Directive } from '@angular/core';

import { injectFloating } from '../_internal/floating/floating';
import { injectHoverCardContext } from './hover-card-context';

/**
 * The hover-card surface. Portaled to `document.body` and positioned by
 * floating-ui. Pointer-enter on the content cancels the pending close, so
 * the user can move the cursor from the trigger into the card to interact
 * with its content (links, buttons, copy targets).
 *
 * Mount / unmount via `@if (card.open())` on the consumer side so
 * `animate.enter` / `animate.leave` work natively.
 */
@Directive({
  selector: '[forHoverCardContent]',
  exportAs: 'forHoverCardContent',
  host: {
    '[attr.data-state]': 'ctx.open() ? "open" : "closed"',
    '(pointerenter)': 'onPointerEnter()',
    '(pointerleave)': 'onPointerLeave()',
  },
})
export class ForHoverCardContent {
  protected readonly ctx = injectHoverCardContext('ForHoverCardContent');

  constructor() {
    injectFloating({
      reference: this.ctx.trigger,
      open: this.ctx.open,
      placement: this.ctx.placement,
      side: this.ctx.side,
      align: this.ctx.align,
      offset: this.ctx.offset,
      sideOffset: this.ctx.sideOffset,
      alignOffset: this.ctx.alignOffset,
      avoidCollisions: this.ctx.avoidCollisions,
      collisionPadding: this.ctx.collisionPadding,
      arrowPadding: this.ctx.arrowPadding,
      sticky: this.ctx.sticky,
      hideWhenDetached: this.ctx.hideWhenDetached,
      arrow: this.ctx.arrow,
    });
  }

  protected onPointerEnter(): void {
    // Moving the cursor onto the card cancels any pending close so the
    // user can interact with content inside.
    this.ctx.cancelPending();
  }

  protected onPointerLeave(): void {
    this.ctx.scheduleClose('hover-content');
  }
}

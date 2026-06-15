import { Directive } from '@angular/core';

import { injectOverlayShell } from '../_internal/overlay-shell/overlay-shell';
import { injectHoverCardContext } from './hover-card-context';

/**
 * The hover-card surface. Portaled to `document.body` and positioned by
 * floating-ui (via the shared `injectOverlayShell` helper). Pointer-enter
 * on the content cancels the pending close, so the user can move the
 * cursor from the trigger into the card to interact with its content
 * (links, buttons, copy targets).
 *
 * Mount / unmount via `@if (card.open())` on the consumer side so
 * `animate.enter` / `animate.leave` work natively.
 *
 * Escape is routed through the shared document-level `DismissableLayer`
 * (Escape-only — outside dismissal stays implicit via pointer-leave
 * timing), so it dismisses the card no matter where focus lives when the
 * card was hover-opened. Initial-focus and return-focus bundles are
 * omitted because the surface is informational and never steals focus.
 *
 * **Intentional ARIA exception.** The content carries no role (only
 * `data-state` for styling) and the trigger exposes no ARIA linkage — the
 * card is non-essential supplementary content, mirroring Radix. See
 * `ForHoverCardTrigger` for the full rationale.
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
    injectOverlayShell({
      positioner: {
        kind: 'floating',
        reference: this.ctx.trigger,
        open: this.ctx.open,
        side: this.ctx.side,
        align: this.ctx.align,
        sideOffset: this.ctx.sideOffset,
        alignOffset: this.ctx.alignOffset,
        avoidCollisions: this.ctx.avoidCollisions,
        collisionPadding: this.ctx.collisionPadding,
        arrowPadding: this.ctx.arrowPadding,
        sticky: this.ctx.sticky,
        hideWhenDetached: this.ctx.hideWhenDetached,
        clipUntilPositioned: this.ctx.clipUntilPositioned,
        arrow: this.ctx.arrow,
      },
      dismiss: {
        emitEscapeKeyDown: (event) => this.ctx.emitEscapeKeyDown(event),
      },
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

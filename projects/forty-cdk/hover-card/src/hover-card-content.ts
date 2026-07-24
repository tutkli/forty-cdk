import { DestroyRef, Directive, ElementRef, inject } from '@angular/core';

import { toFloatingPositioner, injectOverlayShell } from 'forty-cdk/core';
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
 * card is non-essential supplementary content. See
 * `ForHoverCardTrigger` for the full rationale.
 */
@Directive({
  selector: '[forHoverCardContent]',
  exportAs: 'forHoverCardContent',
  host: {
    '[attr.data-state]': 'ctx.open() ? "open" : "closed"',
    '[attr.data-reduced-motion]': 'ctx.reducedMotion() ? "" : null',
    '(pointerenter)': 'onPointerEnter()',
    '(pointerleave)': 'onPointerLeave()',
  },
})
export class ForHoverCardContent {
  protected readonly ctx = injectHoverCardContext('ForHoverCardContent');

  constructor() {
    const el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    this.ctx.registerContent(el);
    inject(DestroyRef).onDestroy(() => this.ctx.unregisterContent(el));

    injectOverlayShell({
      positioner: toFloatingPositioner(this.ctx, this.ctx.trigger),
      dismiss: {
        emitEscapeKeyDown: (event) => this.ctx.emitEscapeKeyDown(event),
      },
    });
  }

  protected onPointerEnter(): void {
    this.ctx.pointerEnterContent();
  }

  protected onPointerLeave(): void {
    this.ctx.pointerLeaveContent();
  }
}

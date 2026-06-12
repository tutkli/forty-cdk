import { Directive, ElementRef, inject } from '@angular/core';

import { injectOverlayShell } from '../_internal/overlay-shell/overlay-shell';
import { injectTooltipContext } from './tooltip-context';

/**
 * The tooltip bubble. Carries `role="tooltip"`, is portaled to
 * `document.body`, and is positioned by `@floating-ui/dom` (via the shared
 * `injectOverlayShell` helper) while mounted.
 *
 * Default `pointer-events: none` is applied via host styles so the bubble
 * layers above content without intercepting hover. Override with your own
 * CSS if needed — but per APG, do not put interactive elements inside.
 *
 * The directive does not manage DOM presence — wrap with
 * `@if (tip.open())` (using a template ref on `[forTooltip]`) so the
 * bubble mounts and unmounts with the open state and `animate.enter` /
 * `animate.leave` work natively.
 *
 * Tooltips have no dismissable layer (Escape is a tooltip controller
 * concern, not an outside-pointer/focus one), no initial focus move, and
 * no return focus on destroy — only the floating positioner is wired.
 */
@Directive({
  selector: '[forTooltipContent]',
  exportAs: 'forTooltipContent',
  host: {
    role: 'tooltip',
    '[id]': 'ctx.contentId()',
    '[attr.data-state]': 'ctx.open() ? "open" : "closed"',
    style: 'pointer-events: none;',
  },
})
export class ForTooltipContent {
  protected readonly ctx = injectTooltipContext('ForTooltipContent');

  constructor() {
    this.ctx.adoptContentId(inject<ElementRef<HTMLElement>>(ElementRef).nativeElement);
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
        arrow: this.ctx.arrow,
      },
    });
  }
}

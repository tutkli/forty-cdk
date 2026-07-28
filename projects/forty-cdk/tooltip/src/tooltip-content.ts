import { DestroyRef, Directive, ElementRef, inject } from '@angular/core';

import { toFloatingPositioner, injectOverlayShell } from 'forty-cdk/core';
import { injectTooltipContext } from './tooltip-context';

/**
 * The tooltip bubble. Carries `role="tooltip"`, is portaled to
 * `document.body`, and is positioned by `@floating-ui/dom` (via the shared
 * `injectOverlayShell` helper) while mounted.
 *
 * Default `pointer-events: none` is applied via host styles so the bubble
 * layers above content without intercepting hover. When the root opts in with
 * `hoverableContent`, `pointer-events` is dropped while open so the pointer
 * can rest over the bubble without dismissing it. Override with your own CSS
 * if needed — but per APG, do not put interactive elements inside.
 *
 * The directive does not manage DOM presence — wrap with
 * `@if (tip.open())` (using a template ref on `[forTooltip]`) so the
 * bubble mounts and unmounts with the open state and `animate.enter` /
 * `animate.leave` work natively.
 *
 * Escape is routed through the shared document-level `DismissibleLayer`
 * (Escape-only — outside dismissal stays implicit via hover / focus / scroll
 * timing), so it dismisses the tooltip no matter where focus lives when the
 * tooltip was hover-opened (WCAG 2.1 SC 1.4.13), and a tooltip layered over a
 * dialog is dismissed by the first Escape while the dialog stays open. No
 * initial focus move and no return focus on destroy — the surface is
 * informational and never steals focus.
 */
@Directive({
  selector: '[forTooltipContent]',
  exportAs: 'forTooltipContent',
  host: {
    role: 'tooltip',
    '[id]': 'ctx.contentId()',
    '[attr.data-state]': 'ctx.open() ? "open" : "closed"',
    '[attr.data-reduced-motion]': 'ctx.reducedMotion() ? "" : null',
    '[style.pointer-events]': 'ctx.hoverableContent() ? null : "none"',
    '(pointerenter)': 'ctx.pointerEnterContent()',
    '(pointerleave)': 'ctx.pointerLeaveContent()',
  },
})
export class ForTooltipContent {
  protected readonly ctx = injectTooltipContext('ForTooltipContent');

  constructor() {
    const el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    this.ctx.adoptContentId(el);
    this.ctx.registerContent(el);
    inject(DestroyRef).onDestroy(() => this.ctx.unregisterContent(el));
    injectOverlayShell({
      positioner: toFloatingPositioner(this.ctx, this.ctx.trigger),
      dismiss: {
        emitEscapeKeyDown: (event) => this.ctx.emitEscapeKeyDown(event),
      },
    });
  }
}

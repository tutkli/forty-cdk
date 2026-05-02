import { Directive } from '@angular/core';

import { injectFloating } from '../_internal/floating';
import { injectPresence } from '../_internal/presence';
import { injectTooltipContext } from './tooltip-context';

/**
 * The tooltip bubble. Carries `role="tooltip"`, is portaled to
 * `document.body`, and is positioned by `@floating-ui/dom` (via the shared
 * `injectFloating` helper) while open.
 *
 * Default `pointer-events: none` is applied via host styles so the bubble
 * layers above content without intercepting hover. Override with your own
 * CSS if needed — but per APG, do not put interactive elements inside.
 *
 * Mount/unmount is gated by `Presence`: closing animations on the bubble
 * play to completion before `[hidden]` is reapplied.
 */
@Directive({
  selector: '[forTooltipContent]',
  exportAs: 'forTooltipContent',
  host: {
    role: 'tooltip',
    '[id]': 'ctx.contentId()',
    '[attr.data-state]': 'ctx.open() ? "open" : "closed"',
    '[attr.hidden]': 'present() ? null : ""',
    style: 'pointer-events: none;',
  },
})
export class ForTooltipContent {
  protected readonly ctx = injectTooltipContext('ForTooltipContent');
  protected readonly present;

  constructor() {
    this.present = injectPresence({
      open: this.ctx.open,
      forceMount: this.ctx.forceMount,
    }).present;

    injectFloating({
      reference: this.ctx.trigger,
      open: this.ctx.open,
      placement: this.ctx.placement,
      offset: this.ctx.offset,
      arrow: this.ctx.arrow,
    });
  }
}

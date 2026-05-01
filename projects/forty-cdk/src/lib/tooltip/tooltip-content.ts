import { Directive } from '@angular/core';

import { injectFloating } from '../_internal/floating';
import { injectTooltipContext } from './tooltip-context';

/**
 * The tooltip bubble. Carries `role="tooltip"`, is portaled to
 * `document.body`, and is positioned by `@floating-ui/dom` (via the shared
 * `injectFloating` helper) while open.
 *
 * Default `pointer-events: none` is applied via host styles so the bubble
 * layers above content without intercepting hover. Override with your own
 * CSS if needed — but per APG, do not put interactive elements inside.
 */
@Directive({
  selector: '[forTooltipContent]',
  exportAs: 'forTooltipContent',
  host: {
    role: 'tooltip',
    '[id]': 'ctx.contentId()',
    '[attr.data-state]': 'ctx.open() ? "open" : "closed"',
    '[attr.hidden]': 'ctx.open() ? null : ""',
    style: 'pointer-events: none;',
  },
})
export class ForTooltipContent {
  protected readonly ctx = injectTooltipContext('ForTooltipContent');

  constructor() {
    injectFloating({
      reference: this.ctx.trigger,
      open: this.ctx.open,
      placement: this.ctx.placement,
      offset: this.ctx.offset,
      arrow: this.ctx.arrow,
    });
  }
}

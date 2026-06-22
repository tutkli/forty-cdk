import { computed, Directive } from '@angular/core';

import { injectScrollAreaContext } from './scroll-area-context';

/**
 * Filler in the corner where horizontal and vertical scrollbars meet.
 * Shown when both axes overflow, or unconditionally under `type="always"`
 * (both tracks are permanently present then). Visibility is enforced with an
 * inline `display: none` (which beats any author `display` rule a consumer
 * applies via a class) in addition to the `hidden` attribute that removes it
 * from the a11y tree.
 */
@Directive({
  selector: '[forScrollAreaCorner]',
  exportAs: 'forScrollAreaCorner',
  host: {
    '[hidden]': '!visible()',
    '[style.display]': 'visible() ? null : "none"',
  },
})
export class ForScrollAreaCorner {
  protected readonly ctx = injectScrollAreaContext('ForScrollAreaCorner');

  protected readonly visible = computed<boolean>(() => {
    if (this.ctx.type() === 'always') return true;
    const hOverflow = this.ctx.scrollWidth() - this.ctx.clientWidth() > 1;
    const vOverflow = this.ctx.scrollHeight() - this.ctx.clientHeight() > 1;
    return hOverflow && vOverflow;
  });
}

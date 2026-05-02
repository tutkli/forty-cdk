import { computed, Directive } from '@angular/core';

import { injectScrollAreaContext } from './scroll-area-context';

/**
 * Filler in the corner where horizontal and vertical scrollbars meet.
 * Mounted only when both axes overflow.
 */
@Directive({
  selector: '[forScrollAreaCorner]',
  exportAs: 'forScrollAreaCorner',
  host: {
    '[hidden]': '!visible()',
  },
})
export class ForScrollAreaCorner {
  protected readonly ctx = injectScrollAreaContext('ForScrollAreaCorner');

  protected readonly visible = computed<boolean>(() => {
    const hOverflow = this.ctx.scrollWidth() - this.ctx.clientWidth() > 1;
    const vOverflow = this.ctx.scrollHeight() - this.ctx.clientHeight() > 1;
    return hOverflow && vOverflow;
  });
}

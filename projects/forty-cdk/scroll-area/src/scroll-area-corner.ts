import { computed, Directive } from '@angular/core';

import { injectScrollAreaContext, type ForScrollbarOrientation } from './scroll-area-context';
import { axisOverflows, resolveScrollbarState } from './scrollbar-state';

/**
 * Filler in the corner where horizontal and vertical scrollbars meet.
 * Mounted when both axes overflow, or unconditionally under `type="always"`.
 * Reflects `data-state` (`visible` / `hidden`): `visible` only while both
 * scrollbars resolve `visible`, so a fade keyed off `data-state="hidden"`
 * covers the corner exactly as it covers the bars. Removal is enforced with an
 * inline `display: none` (which beats any author `display` rule a consumer
 * applies via a class) in addition to the `hidden` attribute that removes it
 * from the a11y tree.
 */
@Directive({
  selector: '[forScrollAreaCorner]',
  exportAs: 'forScrollAreaCorner',
  host: {
    '[attr.data-state]': 'state()',
    '[hidden]': '!painted()',
    '[style.display]': 'painted() ? null : "none"',
  },
})
export class ForScrollAreaCorner {
  private readonly ctx = injectScrollAreaContext('ForScrollAreaCorner');

  private readonly painted = computed<boolean>(
    () =>
      this.ctx.type() === 'always' ||
      (axisOverflows(this.ctx, 'horizontal') && axisOverflows(this.ctx, 'vertical')),
  );

  private readonly state = computed<'visible' | 'hidden'>(() =>
    this.#axisState('horizontal') === 'visible' && this.#axisState('vertical') === 'visible'
      ? 'visible'
      : 'hidden',
  );

  #axisState(orientation: ForScrollbarOrientation): 'visible' | 'hidden' {
    return resolveScrollbarState(this.ctx, orientation, this.ctx.scrollbarPinned(orientation));
  }
}

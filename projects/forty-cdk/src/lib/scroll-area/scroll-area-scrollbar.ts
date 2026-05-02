import { computed, Directive, ElementRef, inject, input, signal } from '@angular/core';

import { injectElementSize } from '../_internal/element-size/element-size';
import { injectScrollAreaContext, type ForScrollbarOrientation } from './scroll-area-context';

/**
 * Synthetic scrollbar track. Reflects `data-orientation`, `data-state`
 * (`visible` / `hidden`), and exposes its host element via the orientation
 * input so the thumb can compute geometry.
 *
 * The element is fully removed (`hidden`) when the corresponding axis has
 * no overflow — there is no scrollbar to render.
 */
@Directive({
  selector: '[forScrollAreaScrollbar]',
  exportAs: 'forScrollAreaScrollbar',
  host: {
    '[attr.data-orientation]': 'orientation()',
    '[attr.data-state]': 'state()',
    '[hidden]': '!hasOverflow()',
  },
})
export class ForScrollAreaScrollbar {
  readonly orientation = input.required<ForScrollbarOrientation>();
  readonly ctx = injectScrollAreaContext('ForScrollAreaScrollbar');
  readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  /** Reactive size of the track (so the thumb can recompute on layout changes). */
  readonly #hostRef = signal<HTMLElement | null>(this.host);
  readonly size = injectElementSize(this.#hostRef);

  readonly hasOverflow = computed<boolean>(() => {
    if (this.orientation() === 'horizontal') {
      return this.ctx.scrollWidth() - this.ctx.clientWidth() > 1;
    }
    return this.ctx.scrollHeight() - this.ctx.clientHeight() > 1;
  });

  /** `'visible' | 'hidden'` — combines `type` rules with overflow presence. */
  readonly state = computed<'visible' | 'hidden'>(() => {
    if (!this.hasOverflow()) return 'hidden';
    switch (this.ctx.type()) {
      case 'always':
        return 'visible';
      case 'auto':
        return 'visible';
      case 'hover':
        return this.ctx.hovering() || this.ctx.scrolling() ? 'visible' : 'hidden';
      case 'scroll':
        return this.ctx.scrolling() ? 'visible' : 'hidden';
    }
  });
}

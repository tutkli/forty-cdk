import { computed, Directive, ElementRef, inject, input, signal } from '@angular/core';

import { injectElementSize } from '../_internal/element-size/element-size';
import { injectScrollAreaContext, type ForScrollbarOrientation } from './scroll-area-context';

/**
 * Synthetic scrollbar track. Reflects `data-orientation`, `data-state`
 * (`visible` / `hidden`), and exposes its host element via the orientation
 * input so the thumb can compute geometry.
 *
 * The element is fully removed (`hidden`) when the corresponding axis has
 * no overflow *and* `type` is not `'always'` — there is no scrollbar to
 * render. Under `type="always"` the track stays painted regardless of
 * overflow (Radix parity), so the consumer's reserved gutter is never empty.
 * Visibility is enforced with an inline `display: none` (which beats any
 * author `display` rule a consumer applies via a class) in addition to the
 * `hidden` attribute that removes it from the a11y tree.
 */
@Directive({
  selector: '[forScrollAreaScrollbar]',
  exportAs: 'forScrollAreaScrollbar',
  host: {
    '[attr.data-orientation]': 'orientation()',
    '[attr.data-state]': 'state()',
    '[hidden]': '!painted()',
    '[style.display]': 'painted() ? null : "none"',
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

  /**
   * Whether the track is rendered at all. `'always'` keeps it painted
   * unconditionally (a stable, always-present track — Radix parity); every
   * other `type` paints only the axis that actually overflows. Gates both the
   * `hidden` attribute and the inline `display: none` self-removal.
   */
  readonly painted = computed<boolean>(() => this.ctx.type() === 'always' || this.hasOverflow());

  /**
   * `'visible' | 'hidden'`. `'always'` resolves to `'visible'` regardless of
   * overflow — the track is permanently present. `'auto'` shows whenever the
   * axis overflows; `'hover'` / `'scroll'` additionally gate on the interaction
   * signals. A non-overflowing axis is `'hidden'` for every mode except
   * `'always'`.
   */
  readonly state = computed<'visible' | 'hidden'>(() => {
    switch (this.ctx.type()) {
      case 'always':
        return 'visible';
      case 'auto':
        return this.hasOverflow() ? 'visible' : 'hidden';
      case 'hover':
        return this.hasOverflow() && (this.ctx.hovering() || this.ctx.scrolling())
          ? 'visible'
          : 'hidden';
      case 'scroll':
        return this.hasOverflow() && this.ctx.scrolling() ? 'visible' : 'hidden';
    }
  });
}

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
 * overflow, so the consumer's reserved gutter is never empty.
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

  /**
   * Reactive size of the track itself, measured independently of the viewport.
   * The thumb's size and travel are computed against the *track* length, which
   * the consumer is free to lay out shorter than the viewport (e.g. insets, a
   * reserved corner, padding), so the viewport's reported client dimensions are
   * not a substitute — the track must be observed directly.
   *
   * The target is a constant (`this.host` never changes), so `injectElementSize`'s
   * target-swap branch is dead weight here; it is reused only for its
   * `ResizeObserver` plumbing and change-deduped emission.
   */
  readonly #hostRef = signal<HTMLElement | null>(this.host);
  readonly size = injectElementSize(this.#hostRef);

  readonly #dragging = signal(false);
  /** True while the thumb is being dragged. Pins the track visible / painted. */
  readonly dragging = this.#dragging.asReadonly();

  /**
   * Marks the track as actively dragged so an in-flight drag is never aborted
   * by the scrollbar self-hiding (`type="hover"` / `"scroll"` fading the track,
   * or a consumer `display:none` on `data-state="hidden"`). Called by the thumb
   * on pointer-down / drag-end.
   */
  setDragging(dragging: boolean): void {
    this.#dragging.set(dragging);
  }

  readonly hasOverflow = computed<boolean>(() => {
    if (this.orientation() === 'horizontal') {
      return this.ctx.scrollWidth() - this.ctx.clientWidth() > 1;
    }
    return this.ctx.scrollHeight() - this.ctx.clientHeight() > 1;
  });

  /**
   * Whether the track is rendered at all. `'always'` keeps it painted
   * unconditionally (a stable, always-present track); every
   * other `type` paints only the axis that actually overflows. An in-flight
   * thumb drag also pins it painted so the gesture is never aborted by the
   * track self-removing. Gates both the `hidden` attribute and the inline
   * `display: none` self-removal.
   */
  readonly painted = computed<boolean>(
    () => this.dragging() || this.ctx.type() === 'always' || this.hasOverflow(),
  );

  /**
   * `'visible' | 'hidden'`. An in-flight thumb drag forces `'visible'` so a
   * consumer fade on `data-state="hidden"` can't hide the track mid-gesture.
   * Otherwise: `'always'` resolves to `'visible'` regardless of overflow — the
   * track is permanently present. `'auto'` shows whenever the axis overflows;
   * `'hover'` / `'scroll'` additionally gate on the interaction signals. A
   * non-overflowing axis is `'hidden'` for every mode except `'always'`.
   */
  readonly state = computed<'visible' | 'hidden'>(() => {
    if (this.dragging()) return 'visible';
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

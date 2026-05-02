import { Directive } from '@angular/core';

import { injectSliderContext } from './slider-context';

/**
 * Optional decorative band between the slider's lowest and highest thumbs
 * (or `0 → thumb` for single-thumb sliders). The directive doesn't paint
 * anything — it exposes start / end fractions as CSS variables and `data-*`
 * so the consumer can size and position it from styles.
 *
 * Custom properties on the host:
 * - `--for-slider-range-start` — fraction `[0, 1]`.
 * - `--for-slider-range-end` — fraction `[0, 1]`.
 * - `--for-slider-range-size` — `end - start`, useful for `width` / `height`.
 *
 * The fractions already account for `inverted`, so painting can be blind.
 * Combine with `data-orientation` to pick the right CSS axis.
 */
@Directive({
  selector: '[forSliderRange]',
  exportAs: 'forSliderRange',
  host: {
    '[attr.data-orientation]': 'ctx.orientation()',
    '[attr.data-disabled]': 'ctx.disabled() ? "" : null',
    '[style.--for-slider-range-start]': 'ctx.rangeStart()',
    '[style.--for-slider-range-end]': 'ctx.rangeEnd()',
    '[style.--for-slider-range-size]': 'ctx.rangeEnd() - ctx.rangeStart()',
  },
})
export class ForSliderRange {
  protected readonly ctx = injectSliderContext('ForSliderRange');
}

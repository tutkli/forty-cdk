import { computed, Directive, inject, input } from '@angular/core';

import { ForDateTimeSegmentBase, type SegmentType } from 'forty-cdk/core';
import { injectDateRangeFieldSegmentContext } from './date-range-field-context';
import {
  DEFAULT_DATE_RANGE_FIELD_SEGMENT_LABELS,
  FOR_DATE_RANGE_FIELD_DEFAULTS,
} from './date-range-field-defaults';

/**
 * One editable spinbutton segment of a `[forDateRangeFieldStart]` /
 * `[forDateRangeFieldEnd]` endpoint — the day, month, or year part (and, at
 * `granularity > 'day'`, hour / minute / second / the AM·PM `dayPeriod`). Apply
 * on a focusable element (typically a `<span>`); the directive adds
 * `role="spinbutton"`, the `aria-valuemin` /
 * `aria-valuemax` / `aria-valuenow` / `aria-valuetext` reflection, the roving
 * tabindex (scoped to the surrounding endpoint group), and the full keyboard map
 * (digits, a/p for AM·PM, ArrowUp/Down to step, ArrowLeft/Right to move between
 * segments — mirrored under RTL, Home/End for the bounds, Backspace to delete the
 * last entered digit, Delete to clear the whole segment).
 *
 * All state lives on the root `ForDateRangeField`; the segment only reads its
 * endpoint's coordination surface and forwards intents. The rendered text comes
 * from the endpoint's `segments()` list (`{{ seg.text }}`), so this element
 * carries behavior and ARIA, not content.
 */
@Directive({
  selector: '[forDateRangeFieldSegment]',
  exportAs: 'forDateRangeFieldSegment',
})
export class ForDateRangeFieldSegment extends ForDateTimeSegmentBase {
  protected readonly ctx = injectDateRangeFieldSegmentContext('ForDateRangeFieldSegment');
  readonly #defaults = inject(FOR_DATE_RANGE_FIELD_DEFAULTS);

  /** Which date or time part this segment edits. */
  readonly segment = input.required<SegmentType>();

  /**
   * Accessible name for this segment. Falls back to the scope's localized
   * default label for the part (via `provideForDateRangeFieldDefaults`), which
   * in turn defaults to the part name — and `'AM/PM'` for the `dayPeriod`
   * segment.
   */
  readonly ariaLabel = input<string | null>(null);

  protected override readonly resolvedAriaLabel = computed(() => {
    const type = this.segment();
    return (
      this.ariaLabel() ??
      this.#defaults.segmentLabels[type] ??
      DEFAULT_DATE_RANGE_FIELD_SEGMENT_LABELS[type]
    );
  });

  constructor() {
    super();
    this.registerSegment();
  }
}

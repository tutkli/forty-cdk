import { computed, Directive, inject, input } from '@angular/core';

import { ForDateTimeSegmentBase, type TimeSegmentType } from 'forty-cdk/core';
import { injectTimeRangeFieldSegmentContext } from './time-range-field-context';
import {
  DEFAULT_TIME_RANGE_FIELD_SEGMENT_LABELS,
  FOR_TIME_RANGE_FIELD_DEFAULTS,
} from './time-range-field-defaults';

/**
 * One editable spinbutton segment of a `[forTimeRangeFieldStart]` /
 * `[forTimeRangeFieldEnd]` endpoint — the hour, minute, second, or AM·PM
 * (`dayPeriod`) part. Apply on a focusable element (typically a `<span>`); the
 * directive adds `role="spinbutton"`, the
 * `aria-valuemin` / `aria-valuemax` / `aria-valuenow` / `aria-valuetext`
 * reflection, the roving tabindex (scoped to the surrounding endpoint group),
 * and the full keyboard map (digits, a/p for AM·PM, ArrowUp/Down to step,
 * ArrowLeft/Right to move between segments — mirrored under RTL, Home/End for the
 * bounds, Backspace to delete the last entered digit, Delete to clear the whole
 * segment).
 *
 * All state lives on the root `ForTimeRangeField`; the segment only reads its
 * endpoint's coordination surface and forwards intents. The rendered text comes
 * from the endpoint's `segments()` list (`{{ seg.text }}`), so this element
 * carries behavior and ARIA, not content.
 */
@Directive({
  selector: '[forTimeRangeFieldSegment]',
  exportAs: 'forTimeRangeFieldSegment',
})
export class ForTimeRangeFieldSegment extends ForDateTimeSegmentBase {
  protected readonly ctx = injectTimeRangeFieldSegmentContext('ForTimeRangeFieldSegment');
  readonly #defaults = inject(FOR_TIME_RANGE_FIELD_DEFAULTS);

  /** Which time part this segment edits. */
  readonly segment = input.required<TimeSegmentType>();

  /**
   * Accessible name for this segment. Falls back to the scope's localized
   * default label for the part (via `provideForTimeRangeFieldDefaults`), which
   * in turn defaults to the part name — and `'AM/PM'` for the `dayPeriod`
   * segment.
   */
  readonly ariaLabel = input<string | null>(null);

  protected override readonly resolvedAriaLabel = computed(() => {
    const type = this.segment();
    return (
      this.ariaLabel() ??
      this.#defaults.segmentLabels[type] ??
      DEFAULT_TIME_RANGE_FIELD_SEGMENT_LABELS[type]
    );
  });

  constructor() {
    super();
    this.registerSegment();
  }
}

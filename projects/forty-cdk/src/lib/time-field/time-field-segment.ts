import { computed, Directive, inject, input } from '@angular/core';

import { ForDateTimeSegmentBase } from 'forty-cdk/core';
import type { TimeSegmentType } from './build-time-segments';
import { injectTimeFieldContext } from './time-field-context';
import { DEFAULT_TIME_FIELD_SEGMENT_LABELS, FOR_TIME_FIELD_DEFAULTS } from './time-field-defaults';

/**
 * One editable spinbutton segment of a `[forTimeField]` — the hour, minute,
 * second, or AM/PM (`dayPeriod`) part. Apply on a focusable element (typically
 * a `<span>`); the shared {@link ForDateTimeSegmentBase} adds
 * `role="spinbutton"`, the `aria-valuemin` / `aria-valuemax` / `aria-valuenow` /
 * `aria-valuetext` reflection, the roving tabindex, and the full keyboard map:
 *
 * - **digits** fill a numeric segment and auto-advance to the next when full;
 * - **a / p** set the period on the `dayPeriod` segment;
 * - **ArrowUp / ArrowDown** step the value (hour / minute / second wrap; dayPeriod toggles);
 * - **ArrowLeft / ArrowRight** move between segments (mirrored under RTL, no wrap);
 * - **Home / End** jump to the segment minimum / maximum (dayPeriod → AM / PM);
 * - **Backspace / Delete** clear a numeric segment.
 *
 * All state lives on the root `ForTimeField`; the segment only reads it and
 * forwards intents. The rendered text comes from the root's `segments()` list
 * (`{{ seg.text }}`), so this element carries behavior and ARIA, not content.
 */
@Directive({
  selector: '[forTimeFieldSegment]',
  exportAs: 'forTimeFieldSegment',
})
export class ForTimeFieldSegment extends ForDateTimeSegmentBase {
  protected readonly ctx = injectTimeFieldContext('ForTimeFieldSegment');
  readonly #defaults = inject(FOR_TIME_FIELD_DEFAULTS);

  /** Which time part this segment edits. */
  readonly segment = input.required<TimeSegmentType>();

  /**
   * Accessible name for this segment. Falls back to the scope's localized
   * default label for the part (via `provideForTimeFieldDefaults`), which in
   * turn defaults to the part name — and `'AM/PM'` for the `dayPeriod` segment.
   */
  readonly ariaLabel = input<string | null>(null);

  protected override readonly resolvedAriaLabel = computed(() => {
    const type = this.segment();
    return (
      this.ariaLabel() ??
      this.#defaults.segmentLabels[type] ??
      DEFAULT_TIME_FIELD_SEGMENT_LABELS[type]
    );
  });

  constructor() {
    super();
    this.registerSegment();
  }
}

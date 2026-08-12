import { computed, Directive, inject, input } from '@angular/core';

import { ForDateTimeSegmentBase, type SegmentType } from 'forty-cdk/core';
import { injectDateFieldContext } from './date-field-context';
import { DEFAULT_DATE_FIELD_SEGMENT_LABELS, FOR_DATE_FIELD_DEFAULTS } from './date-field-defaults';

/**
 * One editable spinbutton segment of a `[forDateField]` — the day, month, or
 * year part (and, at `granularity > 'day'`, hour / minute / second / the AM·PM
 * `dayPeriod`). Apply on a focusable element (typically a `<span>`); the
 * directive adds `role="spinbutton"`, the `aria-valuemin` / `aria-valuemax` /
 * `aria-valuenow` / `aria-valuetext` reflection, the roving tabindex, and the
 * full keyboard map:
 *
 * - **digits** fill a numeric segment and auto-advance to the next when full;
 * - **a / p** set the period on the AM/PM (`dayPeriod`) segment;
 * - **ArrowUp / ArrowDown** step the value (day / month / hour / minute / second
 *   wrap, year clamps, dayPeriod toggles);
 * - **ArrowLeft / ArrowRight** move between segments (mirrored under RTL, no wrap);
 * - **Home / End** jump to the segment minimum / maximum (dayPeriod → AM / PM);
 * - **Backspace** deletes the last entered digit of a numeric segment (clearing
 *   it once the last digit is removed); **Delete** clears the whole segment.
 *
 * All state lives on the root `ForDateField`; the segment only reads it and
 * forwards intents. The rendered text comes from the root's `segments()` list
 * (`{{ seg.text }}`), so this element carries behavior and ARIA, not content.
 */
@Directive({
  selector: '[forDateFieldSegment]',
  exportAs: 'forDateFieldSegment',
})
export class ForDateFieldSegment extends ForDateTimeSegmentBase {
  protected readonly ctx = injectDateFieldContext('ForDateFieldSegment');
  readonly #defaults = inject(FOR_DATE_FIELD_DEFAULTS);

  /** Which date or time part this segment edits. */
  readonly segment = input.required<SegmentType>();

  /**
   * Accessible name for this segment. Falls back to the scope's localized
   * default label for the part (via `provideForDateFieldDefaults`), which in
   * turn defaults to the part name — and `'AM/PM'` for the `dayPeriod` segment.
   */
  readonly ariaLabel = input<string | null>(null);

  protected override readonly resolvedAriaLabel = computed(() => {
    const type = this.segment();
    return (
      this.ariaLabel() ??
      this.#defaults.segmentLabels[type] ??
      DEFAULT_DATE_FIELD_SEGMENT_LABELS[type]
    );
  });

  constructor() {
    super();
    this.registerSegment();
  }
}

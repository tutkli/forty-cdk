import { Directive, input } from '@angular/core';

import { ForDateTimeSegmentBase } from '../_internal/datetime/segment-directive';
import type { DateTimeSegmentType } from './build-segments';
import { injectDateFieldContext } from './date-field-context';

/**
 * One editable spinbutton segment of a `[forDateField]` — the day, month, or
 * year part (and, at `granularity > 'day'`, hour / minute / second / the AM·PM
 * `dayPeriod`). Apply on a focusable element (typically a `<span>`); the shared
 * {@link ForDateTimeSegmentBase} adds `role="spinbutton"`, the `aria-valuemin` /
 * `aria-valuemax` / `aria-valuenow` / `aria-valuetext` reflection, the roving
 * tabindex, and the full keyboard map:
 *
 * - **digits** fill a numeric segment and auto-advance to the next when full;
 * - **a / p** set the period on the AM/PM (`dayPeriod`) segment;
 * - **ArrowUp / ArrowDown** step the value (day / month / hour / minute / second
 *   wrap, year clamps, dayPeriod toggles);
 * - **ArrowLeft / ArrowRight** move between segments (mirrored under RTL, no wrap);
 * - **Home / End** jump to the segment minimum / maximum (dayPeriod → AM / PM);
 * - **Backspace / Delete** clear a numeric segment.
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

  /** Which date or time part this segment edits. */
  readonly segment = input.required<DateTimeSegmentType>();

  /** Accessible name for this segment. Falls back to the segment type when unset. */
  readonly ariaLabel = input<string | null>(null);

  constructor() {
    super();
    this.registerSegment();
  }
}

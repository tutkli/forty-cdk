import { computed, Directive, ElementRef, inject, input } from '@angular/core';

import { registerHandle } from '../_internal/collection/register-handle';
import type { DateTimeSegmentType } from './build-segments';
import { injectDateFieldContext } from './date-field-context';

/**
 * One editable spinbutton segment of a `[forDateField]` — the day, month, or
 * year part. Apply on a focusable element (typically a `<span>`); the directive
 * adds `role="spinbutton"`, the `aria-valuemin` / `aria-valuemax` /
 * `aria-valuenow` / `aria-valuetext` reflection, the roving tabindex, and the
 * full keyboard map:
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
  host: {
    role: 'spinbutton',
    '[attr.tabindex]': 'tabindex()',
    '[attr.inputmode]': 'inputmode()',
    '[attr.autocorrect]': '"off"',
    '[attr.spellcheck]': '"false"',
    '[attr.aria-valuemin]': 'ctx.segmentMin(segment())',
    '[attr.aria-valuemax]': 'ctx.segmentMax(segment())',
    '[attr.aria-valuenow]': 'valueNow()',
    '[attr.aria-valuetext]': 'ctx.segmentValueText(segment())',
    '[attr.aria-label]': 'ariaLabel() || segment()',
    '[attr.aria-disabled]': 'ctx.disabled() ? "true" : null',
    '[attr.aria-readonly]': 'ctx.readonly() ? "true" : null',
    '[attr.data-highlighted]': 'highlighted() ? "" : null',
    '[attr.data-placeholder]': 'ctx.isSegmentEmpty(segment()) ? "" : null',
    '[attr.data-disabled]': 'ctx.disabled() ? "" : null',
    '[attr.data-readonly]': 'ctx.readonly() ? "" : null',
    '(keydown)': 'onKeyDown($event)',
    '(focus)': 'onFocus()',
  },
})
export class ForDateFieldSegment {
  protected readonly ctx = injectDateFieldContext('ForDateFieldSegment');
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Which date or time part this segment edits. */
  readonly segment = input.required<DateTimeSegmentType>();

  /** Accessible name for this segment. Falls back to the segment type when unset. */
  readonly ariaLabel = input<string | null>(null);

  protected readonly valueNow = computed(() => this.ctx.segmentValue(this.segment()));

  protected readonly inputmode = computed<'numeric' | null>(() =>
    this.segment() === 'dayPeriod' ? null : 'numeric',
  );

  protected readonly highlighted = computed(
    () => this.ctx.roving.active() === this.#host.nativeElement,
  );

  /**
   * APG tabindex: the user-focused segment owns `tabindex=0` (tracked by the
   * shared `RovingTabindex`). Before any interaction the first segment in the
   * locale order is the field's single tab entry; disabled fields are skipped.
   */
  protected readonly tabindex = computed<-1 | 0>(() => {
    if (this.ctx.disabled()) {
      return -1;
    }
    if (this.ctx.roving.active() !== null) {
      return this.ctx.roving.tabindexFor(this.#host.nativeElement);
    }
    return this.ctx.isFirstSegmentType(this.segment()) ? 0 : -1;
  });

  constructor() {
    const handle = { host: this.#host.nativeElement, type: this.segment };
    registerHandle(
      handle,
      (h) => this.ctx.registerSegment(h),
      (h) => this.ctx.unregisterSegment(h),
      'afterNextRender',
    );
  }

  protected onFocus(): void {
    this.ctx.focusSegment(this.segment());
  }

  protected onKeyDown(event: KeyboardEvent): void {
    if (this.ctx.disabled()) {
      return;
    }
    const type = this.segment();
    const key = event.key;
    if (key.length === 1 && key >= '0' && key <= '9') {
      event.preventDefault();
      this.ctx.typeDigit(type, Number(key));
      return;
    }
    if (type === 'dayPeriod' && (key === 'a' || key === 'A' || key === 'p' || key === 'P')) {
      event.preventDefault();
      this.ctx.setDayPeriod(key === 'a' || key === 'A' ? 'am' : 'pm');
      return;
    }
    const rtl = this.ctx.dir() === 'rtl';
    switch (key) {
      case 'ArrowUp':
        event.preventDefault();
        this.ctx.step(type, 1);
        return;
      case 'ArrowDown':
        event.preventDefault();
        this.ctx.step(type, -1);
        return;
      case 'ArrowRight':
        event.preventDefault();
        this.ctx.focusSibling(type, rtl ? -1 : 1);
        return;
      case 'ArrowLeft':
        event.preventDefault();
        this.ctx.focusSibling(type, rtl ? 1 : -1);
        return;
      case 'Home':
        event.preventDefault();
        this.ctx.goToBound(type, 'min');
        return;
      case 'End':
        event.preventDefault();
        this.ctx.goToBound(type, 'max');
        return;
      case 'Backspace':
      case 'Delete':
        event.preventDefault();
        this.ctx.clear(type);
        return;
      default:
        return;
    }
  }
}

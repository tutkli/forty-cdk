import { computed, Directive, ElementRef, inject, input } from '@angular/core';

import { registerHandle } from 'forty-cdk/core';
import { type ForCalendarYearCellHandle, injectCalendarContext } from './calendar-context';

/**
 * A single year cell (`role="gridcell"`) in the year picker grid. Apply on the
 * `<td>` for each year and bind `[year]` to the year number from `rows()`.
 *
 * Carries the roving tab stop (`tabindex="0"` on the focused year), reflects
 * `aria-selected` (always emitted), `data-today`, `data-selected`,
 * `data-highlighted`, `data-disabled`. Click and `Enter` / `Space` drill down
 * to the month view for that year; arrow / paging keys move the roving cell.
 */
@Directive({
  selector: '[forCalendarYearCell]',
  exportAs: 'forCalendarYearCell',
  host: {
    role: 'gridcell',
    '[attr.tabindex]': 'focused() ? 0 : -1',
    '[attr.aria-selected]': 'selected() ? "true" : "false"',
    '[attr.aria-disabled]': 'disabled() ? "true" : null',
    '[attr.data-selected]': 'selected() ? "" : null',
    '[attr.data-today]': 'today() ? "" : null',
    '[attr.data-highlighted]': 'focused() ? "" : null',
    '[attr.data-disabled]': 'disabled() ? "" : null',
    '(click)': 'ctx.selectYear(year())',
    '(keydown)': 'ctx.handleYearCellKeydown($event, year())',
  },
})
export class ForCalendarYearCell {
  protected readonly ctx = injectCalendarContext('ForCalendarYearCell');
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** The year this cell represents. */
  readonly year = input.required<number>();

  protected readonly selected = computed(() => this.ctx.isYearSelected(this.year()));
  protected readonly today = computed(() => this.ctx.isYearToday(this.year()));
  protected readonly focused = computed(() => this.ctx.isYearFocused(this.year()));
  protected readonly disabled = computed(() => this.ctx.isYearDisabled(this.year()));

  constructor() {
    const handle: ForCalendarYearCellHandle = {
      host: this.#host.nativeElement,
      year: this.year,
    };
    registerHandle(
      handle,
      (h) => this.ctx.registerYearCell(h),
      (h) => this.ctx.unregisterYearCell(h),
    );
  }
}

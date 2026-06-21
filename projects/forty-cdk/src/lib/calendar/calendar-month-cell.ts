import { computed, Directive, ElementRef, inject, input } from '@angular/core';

import { registerHandle } from '../_internal/collection/register-handle';
import { type ForCalendarMonthCellHandle, injectCalendarContext } from './calendar-context';

/**
 * A single month cell (`role="gridcell"`) in the month picker grid. Apply on
 * the `<td>` for each month and bind `[month]` to the month number (1-12) from
 * `rows()`.
 *
 * Carries the roving tab stop (`tabindex="0"` on the focused month), reflects
 * `aria-selected` (always emitted), `data-today`, `data-selected`,
 * `data-highlighted`, `data-disabled`. Click and `Enter` / `Space` drill down
 * to the day view for that month; arrow / paging keys move the roving cell.
 */
@Directive({
  selector: '[forCalendarMonthCell]',
  exportAs: 'forCalendarMonthCell',
  host: {
    role: 'gridcell',
    '[attr.tabindex]': 'focused() ? 0 : -1',
    '[attr.aria-selected]': 'selected() ? "true" : "false"',
    '[attr.aria-disabled]': 'disabled() ? "true" : null',
    '[attr.data-selected]': 'selected() ? "" : null',
    '[attr.data-today]': 'today() ? "" : null',
    '[attr.data-highlighted]': 'focused() ? "" : null',
    '[attr.data-disabled]': 'disabled() ? "" : null',
    '(click)': 'ctx.selectMonth(month())',
    '(keydown)': 'ctx.handleMonthCellKeydown($event, month())',
  },
})
export class ForCalendarMonthCell {
  protected readonly ctx = injectCalendarContext('ForCalendarMonthCell');
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** The month this cell represents, **1-12**. */
  readonly month = input.required<number>();

  protected readonly selected = computed(() => this.ctx.isMonthSelected(this.month()));
  protected readonly today = computed(() => this.ctx.isMonthToday(this.month()));
  protected readonly focused = computed(() => this.ctx.isMonthFocused(this.month()));
  protected readonly disabled = computed(() => this.ctx.isMonthDisabled(this.month()));

  constructor() {
    const handle: ForCalendarMonthCellHandle = {
      host: this.#host.nativeElement,
      month: this.month,
    };
    registerHandle(
      handle,
      (h) => this.ctx.registerMonthCell(h),
      (h) => this.ctx.unregisterMonthCell(h),
    );
  }
}

import { computed, Directive, ElementRef, inject, input, type InputSignal } from '@angular/core';

import { assertInputBound, isUnset, registerHandle, unsetInput, type Unset } from 'forty-cdk/core';
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
    '(click)': 'onClick()',
    '(keydown)': 'onKeyDown($event)',
  },
})
export class ForCalendarMonthCell {
  private readonly ctx = injectCalendarContext('ForCalendarMonthCell');
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);

  /**
   * The month this cell represents, **1-12**. Mandatory — a cell with no binding throws in dev
   * mode.
   */
  readonly month: InputSignal<number | Unset> = input(unsetInput<number>());

  private readonly selected = computed(() => this.#bound((v) => this.ctx.isMonthSelected(v)));
  private readonly today = computed(() => this.#bound((v) => this.ctx.isMonthToday(v)));
  private readonly focused = computed(() => this.#bound((v) => this.ctx.isMonthFocused(v)));
  private readonly disabled = computed(
    () => this.ctx.disabled() || this.#bound((v) => this.ctx.isMonthDisabled(v)),
  );

  constructor() {
    assertInputBound(this.month, 'calendar', '[forCalendarMonthCell]', 'month');
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

  #bound(read: (month: number) => boolean): boolean {
    const month = this.month();
    return isUnset(month) ? false : read(month);
  }

  private onClick(): void {
    const month = this.month();
    if (!isUnset(month)) {
      this.ctx.selectMonth(month);
    }
  }

  private onKeyDown(event: KeyboardEvent): void {
    const month = this.month();
    if (!isUnset(month)) {
      this.ctx.handleMonthCellKeydown(event, month);
    }
  }
}

import { computed, Directive, ElementRef, inject, input, type InputSignal } from '@angular/core';

import { assertInputBound, isUnset, registerHandle, unsetInput, type Unset } from 'forty-cdk/core';
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
    '(click)': 'onClick()',
    '(keydown)': 'onKeyDown($event)',
  },
})
export class ForCalendarYearCell {
  private readonly ctx = injectCalendarContext('ForCalendarYearCell');
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** The year this cell represents. Mandatory — a cell with no binding throws in dev mode. */
  readonly year: InputSignal<number | Unset> = input(unsetInput<number>());

  private readonly selected = computed(() => this.#bound((v) => this.ctx.isYearSelected(v)));
  private readonly today = computed(() => this.#bound((v) => this.ctx.isYearToday(v)));
  private readonly focused = computed(() => this.#bound((v) => this.ctx.isYearFocused(v)));
  private readonly disabled = computed(() => this.#bound((v) => this.ctx.isYearDisabled(v)));

  constructor() {
    assertInputBound(this.year, 'calendar', '[forCalendarYearCell]', 'year');
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

  #bound(read: (year: number) => boolean): boolean {
    const year = this.year();
    return isUnset(year) ? false : read(year);
  }

  private onClick(): void {
    const year = this.year();
    if (!isUnset(year)) {
      this.ctx.selectYear(year);
    }
  }

  private onKeyDown(event: KeyboardEvent): void {
    const year = this.year();
    if (!isUnset(year)) {
      this.ctx.handleYearCellKeydown(event, year);
    }
  }
}

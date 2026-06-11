import { computed, Directive, ElementRef, inject, input } from '@angular/core';

import { registerHandle } from '../_internal/collection/register-handle';
import { type ForCalendarCellHandle, injectCalendarContext } from './calendar-context';

/**
 * A single day cell (`role="gridcell"`). Apply on the `<td>` for each day in
 * the grid and bind `[date]` to the cell's date from `weeks()`.
 *
 * Carries the roving tab stop (`tabindex="0"` only on the focused date), the
 * full accessible date as `aria-label` (the bare day number stays the visible
 * content), `aria-selected` (always emitted), `aria-current="date"` on today,
 * `aria-disabled` on unavailable dates, and the boolean `data-*` styling hooks
 * (`data-selected`, `data-today`, `data-highlighted`, `data-disabled`,
 * `data-outside-month`). Click and `Enter` / `Space` select; arrow / paging
 * keys move the focused date.
 *
 * @typeParam D The adapter's date type (inferred from the bound `[date]`).
 */
@Directive({
  selector: '[forCalendarCell]',
  exportAs: 'forCalendarCell',
  host: {
    role: 'gridcell',
    '[attr.tabindex]': 'focused() ? 0 : -1',
    '[attr.aria-label]': 'dateLabel()',
    '[attr.aria-selected]': 'selected() ? "true" : "false"',
    '[attr.aria-current]': 'isToday() ? "date" : null',
    '[attr.aria-disabled]': 'unavailable() ? "true" : null',
    '[attr.data-selected]': 'selected() ? "" : null',
    '[attr.data-today]': 'isToday() ? "" : null',
    '[attr.data-highlighted]': 'focused() ? "" : null',
    '[attr.data-disabled]': 'unavailable() ? "" : null',
    '[attr.data-outside-month]': 'outsideMonth() ? "" : null',
    '(click)': 'onClick()',
    '(keydown)': 'onKeyDown($event)',
  },
})
export class ForCalendarCell<D> {
  protected readonly ctx = injectCalendarContext('ForCalendarCell');
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** The date this cell represents. */
  readonly date = input.required<D>();

  protected readonly selected = computed(() => this.ctx.isSelected(this.date()));
  protected readonly isToday = computed(() => this.ctx.isToday(this.date()));
  protected readonly focused = computed(() => this.ctx.isFocused(this.date()));
  protected readonly unavailable = computed(() => this.ctx.isUnavailable(this.date()));
  protected readonly outsideMonth = computed(() => this.ctx.isOutsideMonth(this.date()));
  protected readonly dateLabel = computed(() => this.ctx.getDateLabel(this.date()));

  constructor() {
    const handle: ForCalendarCellHandle<unknown> = {
      host: this.#host.nativeElement,
      date: this.date,
    };
    registerHandle(
      handle,
      (h) => this.ctx.registerCell(h),
      (h) => this.ctx.unregisterCell(h),
    );
  }

  protected onClick(): void {
    this.ctx.selectDate(this.date());
  }

  protected onKeyDown(event: KeyboardEvent): void {
    this.ctx.handleCellKeydown(event, this.date());
  }
}

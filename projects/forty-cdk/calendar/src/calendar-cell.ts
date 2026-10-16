import { computed, Directive, ElementRef, inject, input, type InputSignal } from '@angular/core';

import { assertInputBound, isUnset, registerHandle, unsetInput, type Unset } from 'forty-cdk/core';
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
 * `data-outside-month`). In `selectionMode="range"`, also emits
 * `data-range-start`, `data-range-end`, `data-in-range`, and
 * `data-range-preview` (all boolean present/absent). Click and `Enter` /
 * `Space` select; arrow / paging keys move the focused date.
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
    '[attr.data-range-start]': 'rangeStart() ? "" : null',
    '[attr.data-range-end]': 'rangeEnd() ? "" : null',
    '[attr.data-in-range]': 'inRange() ? "" : null',
    '[attr.data-range-preview]': 'rangePreview() ? "" : null',
    '(click)': 'onClick()',
    '(keydown)': 'onKeyDown($event)',
    '(pointerenter)': 'onPointerEnter()',
    '(pointerleave)': 'ctx.setHovered(null)',
  },
})
export class ForCalendarCell<D> {
  private readonly ctx = injectCalendarContext('ForCalendarCell');
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** The date this cell represents. Mandatory — a cell with no binding throws in dev mode. */
  readonly date: InputSignal<D | Unset> = input(unsetInput<D>());

  private readonly selected = computed(() => this.#bound((d) => this.ctx.isSelected(d), false));
  private readonly isToday = computed(() => this.#bound((d) => this.ctx.isToday(d), false));
  private readonly focused = computed(() => this.#bound((d) => this.ctx.isFocused(d), false));
  private readonly unavailable = computed(() =>
    this.#bound((d) => this.ctx.isUnavailable(d), false),
  );
  private readonly outsideMonth = computed(() =>
    this.#bound((d) => this.ctx.isOutsideMonth(d), false),
  );
  private readonly dateLabel = computed(() =>
    this.#bound<string | null>((d) => this.ctx.getDateLabel(d), null),
  );
  private readonly rangeStart = computed(() => this.#bound((d) => this.ctx.isRangeStart(d), false));
  private readonly rangeEnd = computed(() => this.#bound((d) => this.ctx.isRangeEnd(d), false));
  private readonly inRange = computed(() => this.#bound((d) => this.ctx.isInRange(d), false));
  private readonly rangePreview = computed(() =>
    this.#bound((d) => this.ctx.isRangePreview(d), false),
  );

  constructor() {
    assertInputBound(this.date, 'calendar', '[forCalendarCell]', 'date');
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

  #bound<R>(read: (date: D) => R, fallback: R): R {
    const date = this.date();
    return isUnset(date) ? fallback : read(date);
  }

  private onClick(): void {
    const date = this.date();
    if (!isUnset(date)) {
      this.ctx.activateDate(date);
    }
  }

  private onKeyDown(event: KeyboardEvent): void {
    const date = this.date();
    if (!isUnset(date)) {
      this.ctx.handleCellKeydown(event, date);
    }
  }

  private onPointerEnter(): void {
    const date = this.date();
    if (!isUnset(date)) {
      this.ctx.setHovered(date);
    }
  }
}

import { Component, model, provideZonelessChangeDetection, signal, viewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { CalendarDate, CalendarDateTime } from '@internationalized/date';

import {
  compareDateOf,
  type DateAdapter,
  type DateRange,
  type TimeCapableDateAdapter,
} from 'forty-cdk/core';
import { flush, pressKey, renderHost, type RenderResult } from '../../src/test-utils';
import { buildMonthMatrix } from './build-month-matrix';
import { ForCalendar } from './calendar';
import { ForCalendarCell } from './calendar-cell';
import { ForCalendarGrid } from './calendar-grid';
import { ForCalendarGridHeader } from './calendar-grid-header';
import { ForCalendarHeading } from './calendar-heading';
import { ForCalendarNextButton } from './calendar-next-button';
import { ForCalendarPrevButton } from './calendar-prev-button';
import type { CalendarDateLabelFormatter, CalendarView } from './calendar-context';
import { ForCalendarMonthCell } from './calendar-month-cell';
import { ForCalendarMonthGrid } from './calendar-month-grid';
import { ForCalendarMonthSelect } from './calendar-month-select';
import { ForCalendarViewTrigger } from './calendar-view-trigger';
import { ForCalendarYearCell } from './calendar-year-cell';
import { ForCalendarYearGrid } from './calendar-year-grid';
import { ForCalendarYearSelect } from './calendar-year-select';
import {
  InternationalizedDateAdapter,
  InternationalizedDateTimeAdapter,
  provideInternationalizedDateAdapter,
  provideInternationalizedDateTimeAdapter,
} from 'forty-cdk/internationalized-date';
import { NativeDateAdapter, provideNativeDateAdapter } from './native-date-adapter';

const adapter = new NativeDateAdapter();

function keyOf(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

@Component({
  imports: [
    ForCalendar,
    ForCalendarHeading,
    ForCalendarPrevButton,
    ForCalendarNextButton,
    ForCalendarGrid,
    ForCalendarGridHeader,
    ForCalendarCell,
  ],
  providers: [...provideNativeDateAdapter()],
  template: `
    <div
      forCalendar
      [(value)]="value"
      [min]="min()"
      [max]="max()"
      [isDateUnavailable]="unavailable()"
      [disabled]="disabled()"
      [readonly]="readonly()"
      [firstDayOfWeek]="firstDayOfWeek()"
      [dir]="dir()"
    >
      <button forCalendarPrevButton [ariaLabel]="'Previous month'" data-testid="prev">‹</button>
      <h2 forCalendarHeading #heading="forCalendarHeading" data-testid="heading">
        {{ heading.label() }}
      </h2>
      <button forCalendarNextButton [ariaLabel]="'Next month'" data-testid="next">›</button>
      <table forCalendarGrid #grid="forCalendarGrid">
        <thead forCalendarGridHeader>
          <tr>
            @for (day of grid.weekDays(); track day.key) {
              <th scope="col" [attr.aria-label]="day.long" [attr.data-testid]="'col-' + day.key">
                {{ day.short }}
              </th>
            }
          </tr>
        </thead>
        <tbody>
          @for (week of grid.weeks(); track week.key) {
            <tr>
              @for (cell of week.days; track cell.key) {
                <td forCalendarCell [date]="cell.date" [attr.data-testid]="'cell-' + cell.key">
                  {{ cell.label }}
                </td>
              }
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
class CalendarHost {
  readonly calendar = viewChild.required(ForCalendar);
  readonly value = signal<Date | null>(new Date(2026, 5, 15));
  readonly min = signal<Date | null>(null);
  readonly max = signal<Date | null>(null);
  readonly unavailable = signal<(date: Date) => boolean>(() => false);
  readonly disabled = signal(false);
  readonly readonly = signal(false);
  readonly firstDayOfWeek = signal<number | null>(null);
  readonly dir = signal<'ltr' | 'rtl'>('ltr');
}

@Component({
  imports: [ForCalendar, ForCalendarGrid, ForCalendarCell],
  providers: [...provideNativeDateAdapter()],
  template: `
    <div forCalendar [value]="value" [dateLabel]="dateLabel">
      <table forCalendarGrid #grid="forCalendarGrid">
        <tbody>
          @for (week of grid.weeks(); track week.key) {
            <tr>
              @for (cell of week.days; track cell.key) {
                <td forCalendarCell [date]="cell.date" [attr.data-testid]="'cell-' + cell.key"></td>
              }
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
class CustomLabelHost {
  readonly value = new Date(2026, 5, 15);
  readonly dateLabel: CalendarDateLabelFormatter<Date> = (date, { adapter, outsideMonth }) =>
    `${adapter.getDate(date)}${outsideMonth ? ' (other)' : ''}`;
}

@Component({
  imports: [ForCalendar, ForCalendarGrid, ForCalendarCell],
  providers: [...provideNativeDateAdapter()],
  template: `
    <div forCalendar [value]="today">
      <table forCalendarGrid #grid="forCalendarGrid">
        <tbody>
          @for (week of grid.weeks(); track week.key) {
            <tr>
              @for (cell of week.days; track cell.key) {
                <td forCalendarCell [date]="cell.date" [attr.data-testid]="'cell-' + cell.key"></td>
              }
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
class TodayHost {
  readonly today = adapter.today();
}

@Component({
  imports: [ForCalendar, ForCalendarGrid, ForCalendarCell],
  providers: [...provideInternationalizedDateTimeAdapter()],
  template: `
    <div forCalendar [(value)]="value" [min]="min()" [max]="max()">
      <table forCalendarGrid #grid="forCalendarGrid">
        <tbody>
          @for (week of grid.weeks(); track week.key) {
            <tr>
              @for (cell of week.days; track cell.key) {
                <td forCalendarCell [date]="cell.date" [attr.data-testid]="'cell-' + cell.key"></td>
              }
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
class DateTimeCalendarHost {
  readonly value = signal<CalendarDateTime | null>(new CalendarDateTime(2026, 6, 15, 9, 0));
  readonly min = signal<CalendarDateTime | null>(null);
  readonly max = signal<CalendarDateTime | null>(null);
}

@Component({
  imports: [ForCalendar, ForCalendarGrid, ForCalendarCell],
  providers: [...provideInternationalizedDateAdapter()],
  template: `
    <div forCalendar [(value)]="value">
      <table forCalendarGrid #grid="forCalendarGrid">
        <tbody>
          @for (week of grid.weeks(); track week.key) {
            <tr>
              @for (cell of week.days; track cell.key) {
                <td forCalendarCell [date]="cell.date" [attr.data-testid]="'cell-' + cell.key"></td>
              }
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
class DayOnlyCalendarHost {
  readonly value = signal<CalendarDate | null>(new CalendarDate(2026, 6, 15));
}

@Component({
  imports: [ForCalendar, ForCalendarGrid, ForCalendarCell],
  providers: [...provideNativeDateAdapter()],
  template: `
    <div
      forCalendar
      selectionMode="range"
      [(range)]="range"
      [minRangeLength]="minRangeLength()"
      [maxRangeLength]="maxRangeLength()"
      [min]="min()"
      [max]="max()"
      [isDateUnavailable]="unavailable()"
    >
      <table forCalendarGrid #grid="forCalendarGrid">
        <tbody>
          @for (week of grid.weeks(); track week.key) {
            <tr>
              @for (cell of week.days; track cell.key) {
                <td forCalendarCell [date]="cell.date" [attr.data-testid]="'cell-' + cell.key">
                  {{ cell.label }}
                </td>
              }
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
class CalendarRangeHost {
  readonly range = signal<DateRange<Date> | null>(null);
  readonly minRangeLength = signal<number | null>(null);
  readonly maxRangeLength = signal<number | null>(null);
  readonly min = signal<Date | null>(null);
  readonly max = signal<Date | null>(null);
  readonly unavailable = signal<(date: Date) => boolean>(() => false);
}

@Component({
  imports: [ForCalendar, ForCalendarHeading, ForCalendarGrid, ForCalendarCell],
  providers: [...provideNativeDateAdapter()],
  template: `
    <div forCalendar [(value)]="value" [min]="min()" [max]="max()" #cal="forCalendar">
      <select
        data-testid="month-select"
        [value]="cal.visibleMonthNumber()"
        (change)="cal.goToMonth(+selectValue($event))"
      >
        @for (m of cal.monthOptions(); track m.value) {
          <option
            [value]="m.value"
            [disabled]="m.disabled"
            [attr.data-testid]="'month-opt-' + m.value"
          >
            {{ m.label }}
          </option>
        }
      </select>
      <select
        data-testid="year-select"
        [value]="cal.visibleYear()"
        (change)="cal.goToYear(+selectValue($event))"
      >
        @for (y of years; track y) {
          <option
            [value]="y"
            [disabled]="cal.isYearDisabled(y)"
            [attr.data-testid]="'year-opt-' + y"
          >
            {{ y }}
          </option>
        }
      </select>
      <h2 forCalendarHeading #heading="forCalendarHeading" data-testid="heading">
        {{ heading.label() }}
      </h2>
      <table forCalendarGrid #grid="forCalendarGrid">
        <tbody>
          @for (week of grid.weeks(); track week.key) {
            <tr>
              @for (c of week.days; track c.key) {
                <td forCalendarCell [date]="c.date" [attr.data-testid]="'cell-' + c.key">
                  {{ c.label }}
                </td>
              }
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
class CalendarDropdownsHost {
  readonly calendar = viewChild.required(ForCalendar);
  readonly value = signal<Date | null>(new Date(2026, 5, 15));
  readonly min = signal<Date | null>(null);
  readonly max = signal<Date | null>(null);
  readonly years = [2024, 2025, 2026, 2027, 2028];
  selectValue(event: Event): string {
    return (event.target as HTMLSelectElement).value;
  }
}

@Component({
  imports: [
    ForCalendar,
    ForCalendarHeading,
    ForCalendarPrevButton,
    ForCalendarNextButton,
    ForCalendarGrid,
    ForCalendarGridHeader,
    ForCalendarCell,
    ForCalendarViewTrigger,
    ForCalendarMonthGrid,
    ForCalendarMonthCell,
    ForCalendarYearGrid,
    ForCalendarYearCell,
  ],
  providers: [...provideNativeDateAdapter()],
  template: `
    <div
      forCalendar
      [(value)]="value"
      [(view)]="view"
      [min]="min()"
      [max]="max()"
      [disabled]="disabled()"
      [readonly]="readonly()"
      #cal="forCalendar"
    >
      <button forCalendarPrevButton [ariaLabel]="'Previous'" data-testid="prev">‹</button>
      <button forCalendarViewTrigger #vt="forCalendarViewTrigger" data-testid="view-trigger">
        {{ vt.label() }}
      </button>
      <button forCalendarNextButton [ariaLabel]="'Next'" data-testid="next">›</button>
      <h2 forCalendarHeading #heading="forCalendarHeading" data-testid="heading">
        {{ heading.label() }}
      </h2>
      @switch (cal.view()) {
        @case ('day') {
          <table forCalendarGrid #grid="forCalendarGrid">
            <thead forCalendarGridHeader>
              <tr>
                @for (day of grid.weekDays(); track day.key) {
                  <th scope="col">{{ day.short }}</th>
                }
              </tr>
            </thead>
            <tbody>
              @for (week of grid.weeks(); track week.key) {
                <tr>
                  @for (c of week.days; track c.key) {
                    <td forCalendarCell [date]="c.date" [attr.data-testid]="'cell-' + c.key">
                      {{ c.label }}
                    </td>
                  }
                </tr>
              }
            </tbody>
          </table>
        }
        @case ('month') {
          <table forCalendarMonthGrid #mg="forCalendarMonthGrid">
            <tbody>
              @for (row of mg.rows(); track row.key) {
                <tr>
                  @for (m of row.months; track m.value) {
                    <td
                      forCalendarMonthCell
                      [month]="m.value"
                      [attr.data-testid]="'month-cell-' + m.value"
                    >
                      {{ m.label }}
                    </td>
                  }
                </tr>
              }
            </tbody>
          </table>
        }
        @case ('year') {
          <table forCalendarYearGrid #yg="forCalendarYearGrid">
            <tbody>
              @for (row of yg.rows(); track row.key) {
                <tr>
                  @for (y of row.years; track y.value) {
                    <td
                      forCalendarYearCell
                      [year]="y.value"
                      [attr.data-testid]="'year-cell-' + y.value"
                    >
                      {{ y.value }}
                    </td>
                  }
                </tr>
              }
            </tbody>
          </table>
        }
      }
    </div>
  `,
})
class CalendarViewsHost {
  readonly calendar = viewChild.required(ForCalendar);
  readonly value = signal<Date | null>(new Date(2026, 5, 15));
  readonly view = model<CalendarView>('day');
  readonly min = signal<Date | null>(null);
  readonly max = signal<Date | null>(null);
  readonly disabled = signal(false);
  readonly readonly = signal(false);
}

@Component({
  imports: [
    ForCalendar,
    ForCalendarMonthSelect,
    ForCalendarYearSelect,
    ForCalendarHeading,
    ForCalendarGrid,
    ForCalendarCell,
  ],
  providers: [...provideNativeDateAdapter()],
  template: `
    <div
      forCalendar
      [(value)]="value"
      [min]="min()"
      [max]="max()"
      [disabled]="disabled()"
      #cal="forCalendar"
    >
      <select forCalendarMonthSelect #m="forCalendarMonthSelect" data-testid="month-select">
        @for (opt of m.options(); track opt.value) {
          <option
            [value]="opt.value"
            [disabled]="opt.disabled"
            [attr.data-testid]="'month-opt-' + opt.value"
          >
            {{ opt.label }}
          </option>
        }
      </select>
      <select
        forCalendarYearSelect
        #y="forCalendarYearSelect"
        [minYear]="minYear()"
        [maxYear]="maxYear()"
        data-testid="year-select"
      >
        @for (opt of y.years(); track opt.value) {
          <option
            [value]="opt.value"
            [disabled]="opt.disabled"
            [attr.data-testid]="'year-opt-' + opt.value"
          >
            {{ opt.value }}
          </option>
        }
      </select>
      <h2 forCalendarHeading #heading="forCalendarHeading" data-testid="heading">
        {{ heading.label() }}
      </h2>
      <table forCalendarGrid #grid="forCalendarGrid">
        <tbody>
          @for (week of grid.weeks(); track week.key) {
            <tr>
              @for (c of week.days; track c.key) {
                <td forCalendarCell [date]="c.date" [attr.data-testid]="'cell-' + c.key">
                  {{ c.label }}
                </td>
              }
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
class CalendarSelectDirectivesHost {
  readonly calendar = viewChild.required(ForCalendar);
  readonly value = signal<Date | null>(new Date(2026, 5, 15));
  readonly min = signal<Date | null>(null);
  readonly max = signal<Date | null>(null);
  readonly disabled = signal(false);
  readonly minYear = signal<number | null>(2024);
  readonly maxYear = signal<number | null>(2028);
}

const root = (r: RenderResult<unknown>) => r.query('[forCalendar]')!;
const cell = (r: RenderResult<unknown>, date: Date) =>
  r.query(`[data-testid="cell-${keyOf(date)}"]`)!;
const tabbableCells = (r: RenderResult<unknown>) => r.queryAll('[role="gridcell"][tabindex="0"]');
const focusedCell = (r: RenderResult<unknown>) => tabbableCells(r)[0]!;

const JUN_15 = new Date(2026, 5, 15);

describe('ForCalendar', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 5, 15));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  describe('structure & ARIA', () => {
    it('renders grid / columnheader roles and labels the grid by the heading', () => {
      const r = renderHost(CalendarHost);
      const grid = r.query('[forCalendarGrid]')!;
      const heading = r.query('[data-testid="heading"]')!;

      expect(grid.getAttribute('role')).toBe('grid');
      expect(r.queryAll('th[scope="col"]').length).toBe(7);
      expect(r.queryAll('[role="gridcell"]').length).toBeGreaterThanOrEqual(28);

      expect(heading.id).toBeTruthy();
      expect(grid.getAttribute('aria-labelledby')).toBe(heading.id);
      expect(heading.textContent).toContain('2026');
    });

    it('reflects role="rowgroup" on the grid header', () => {
      const r = renderHost(CalendarHost);
      const header = r.query('[forCalendarGridHeader]')!;
      expect(header.getAttribute('role')).toBe('rowgroup');
    });

    it('does not make the heading a live region (announcement uses a separate region)', () => {
      const r = renderHost(CalendarHost);
      const heading = r.query('[data-testid="heading"]')!;
      expect(heading.hasAttribute('aria-live')).toBe(false);
    });

    it('keeps exactly one tabbable cell — the focused date', () => {
      const r = renderHost(CalendarHost);
      const tabbable = tabbableCells(r);
      expect(tabbable.length).toBe(1);
      expect(tabbable[0]).toBe(cell(r, JUN_15));
    });

    it('emits aria-selected on every cell (true/false) and reflects data-selected only when selected', () => {
      const r = renderHost(CalendarHost);
      expect(cell(r, JUN_15).getAttribute('aria-selected')).toBe('true');
      expect(cell(r, JUN_15).getAttribute('data-selected')).toBe('');

      const other = cell(r, new Date(2026, 5, 16));
      expect(other.getAttribute('aria-selected')).toBe('false');
      expect(other.hasAttribute('data-selected')).toBe(false);
    });

    it('does not emit aria-disabled on available cells (truthy-only)', () => {
      const r = renderHost(CalendarHost);
      expect(cell(r, new Date(2026, 5, 16)).hasAttribute('aria-disabled')).toBe(false);
      expect(cell(r, new Date(2026, 5, 16)).hasAttribute('data-disabled')).toBe(false);
    });

    it('marks today with aria-current="date" on exactly one cell', () => {
      const r = renderHost(TodayHost);
      const todayCell = cell(r, adapter.today());
      expect(todayCell.getAttribute('aria-current')).toBe('date');
      expect(r.queryAll('[aria-current="date"]').length).toBe(1);
    });

    it('re-reads today() so aria-current follows the clock across a re-render (#1150)', async () => {
      const r = renderHost(CalendarHost);
      r.instance.value.set(new Date(2026, 5, 10));
      await flush(r.fixture);
      expect(cell(r, JUN_15).getAttribute('aria-current')).toBe('date');

      vi.setSystemTime(new Date(2026, 5, 16));
      r.instance.value.set(new Date(2026, 5, 11));
      await flush(r.fixture);

      expect(cell(r, new Date(2026, 5, 16)).getAttribute('aria-current')).toBe('date');
      expect(cell(r, JUN_15).hasAttribute('aria-current')).toBe(false);
    });

    it('marks outside-month padding days with data-outside-month', () => {
      const r = renderHost(CalendarHost);
      expect(cell(r, JUN_15).hasAttribute('data-outside-month')).toBe(false);
      const cells = r.queryAll('[data-outside-month]');
      expect(cells.length).toBeGreaterThan(0);
    });

    it('exposes the full localized date as aria-label on every gridcell', () => {
      const r = renderHost(CalendarHost);
      const label = cell(r, JUN_15).getAttribute('aria-label');
      expect(label).toBe(
        adapter.format(JUN_15, {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        }),
      );
      expect(label).toContain('15');
      expect(label).toContain('2026');
      expect(r.queryAll('[role="gridcell"]:not([aria-label])').length).toBe(0);
    });

    it('distinguishes outside-month cells in the default aria-label', () => {
      const r = renderHost(CalendarHost);
      const outside = r.queryAll('[data-outside-month]');
      expect(outside.length).toBeGreaterThan(0);
      for (const td of outside) {
        expect(td.getAttribute('aria-label')).toContain('(outside month)');
      }
      expect(cell(r, JUN_15).getAttribute('aria-label')).not.toContain('(outside month)');
    });

    it('lets consumers override the aria-label via the dateLabel input', () => {
      const r = renderHost(CustomLabelHost);
      expect(cell(r, JUN_15).getAttribute('aria-label')).toBe('15');
      const outside = r.queryAll('[data-outside-month]');
      expect(outside.length).toBeGreaterThan(0);
      for (const td of outside) {
        expect(td.getAttribute('aria-label')).toContain('(other)');
      }
    });
  });

  describe('keyboard navigation', () => {
    it('moves the focused date with arrows (day / week), preventing default', async () => {
      const r = renderHost(CalendarHost);

      const ev = pressKey(focusedCell(r), 'ArrowRight');
      await flush(r.fixture);
      expect(ev.defaultPrevented).toBe(true);
      expect(tabbableCells(r).length).toBe(1);
      expect(focusedCell(r)).toBe(cell(r, new Date(2026, 5, 16)));

      pressKey(focusedCell(r), 'ArrowDown');
      await flush(r.fixture);
      expect(focusedCell(r)).toBe(cell(r, new Date(2026, 5, 23)));

      pressKey(focusedCell(r), 'ArrowUp');
      await flush(r.fixture);
      expect(focusedCell(r)).toBe(cell(r, new Date(2026, 5, 16)));

      pressKey(focusedCell(r), 'ArrowLeft');
      await flush(r.fixture);
      expect(focusedCell(r)).toBe(cell(r, JUN_15));
    });

    it('Home / End move to the bounds of the focused week', async () => {
      const r = renderHost(CalendarHost);
      const offset = (adapter.getDayOfWeek(JUN_15) - 0 + 7) % 7;
      const startOfWeek = adapter.addDays(JUN_15, -offset);
      const endOfWeek = adapter.addDays(startOfWeek, 6);

      pressKey(focusedCell(r), 'Home');
      await flush(r.fixture);
      expect(focusedCell(r)).toBe(cell(r, startOfWeek));

      pressKey(focusedCell(r), 'End');
      await flush(r.fixture);
      expect(focusedCell(r)).toBe(cell(r, endOfWeek));
    });

    it('PageDown / PageUp page by a month and keep the focused day in view', async () => {
      const r = renderHost(CalendarHost);

      pressKey(focusedCell(r), 'PageDown');
      await flush(r.fixture);
      expect(focusedCell(r)).toBe(cell(r, new Date(2026, 6, 15)));
      expect(r.query('[data-testid="heading"]')!.textContent).toContain('2026');

      pressKey(focusedCell(r), 'PageUp');
      await flush(r.fixture);
      expect(focusedCell(r)).toBe(cell(r, JUN_15));
    });

    it('Shift+PageDown / Shift+PageUp page by a year', async () => {
      const r = renderHost(CalendarHost);

      pressKey(focusedCell(r), 'PageDown', { shiftKey: true });
      await flush(r.fixture);
      expect(focusedCell(r)).toBe(cell(r, new Date(2027, 5, 15)));

      pressKey(focusedCell(r), 'PageUp', { shiftKey: true });
      await flush(r.fixture);
      expect(focusedCell(r)).toBe(cell(r, JUN_15));
    });

    it('Enter and Space select the focused date', async () => {
      const r = renderHost(CalendarHost);

      pressKey(focusedCell(r), 'ArrowRight');
      await flush(r.fixture);
      pressKey(focusedCell(r), 'Enter');
      await flush(r.fixture);
      expect(cell(r, new Date(2026, 5, 16)).getAttribute('aria-selected')).toBe('true');
      expect(cell(r, JUN_15).getAttribute('aria-selected')).toBe('false');

      pressKey(focusedCell(r), 'ArrowRight');
      await flush(r.fixture);
      pressKey(focusedCell(r), ' ');
      await flush(r.fixture);
      expect(cell(r, new Date(2026, 5, 17)).getAttribute('aria-selected')).toBe('true');
    });

    it('mirrors ArrowLeft / ArrowRight under dir="rtl"', async () => {
      const r = renderHost(CalendarHost);
      r.instance.dir.set('rtl');
      await flush(r.fixture);
      expect(root(r).getAttribute('dir')).toBe('rtl');

      pressKey(focusedCell(r), 'ArrowLeft');
      await flush(r.fixture);
      expect(focusedCell(r)).toBe(cell(r, new Date(2026, 5, 16)));

      pressKey(focusedCell(r), 'ArrowRight');
      await flush(r.fixture);
      expect(focusedCell(r)).toBe(cell(r, JUN_15));
    });

    it('restores the intended day-of-month when paging back onto a longer month (#590 F4)', async () => {
      const r = renderHost(CalendarHost);
      r.instance.value.set(new Date(2026, 0, 31));
      await flush(r.fixture);
      expect(focusedCell(r)).toBe(cell(r, new Date(2026, 0, 31)));

      pressKey(focusedCell(r), 'PageDown');
      await flush(r.fixture);
      expect(focusedCell(r)).toBe(cell(r, new Date(2026, 1, 28)));

      pressKey(focusedCell(r), 'PageDown');
      await flush(r.fixture);
      expect(focusedCell(r)).toBe(cell(r, new Date(2026, 2, 31)));
    });

    it('resets the intended day after an external value write between paging (#590 F4)', async () => {
      const r = renderHost(CalendarHost);
      r.instance.value.set(new Date(2026, 0, 31));
      await flush(r.fixture);

      pressKey(focusedCell(r), 'PageDown');
      await flush(r.fixture);
      expect(focusedCell(r)).toBe(cell(r, new Date(2026, 1, 28)));

      r.instance.value.set(new Date(2026, 0, 10));
      await flush(r.fixture);
      pressKey(focusedCell(r), 'PageDown');
      await flush(r.fixture);
      expect(focusedCell(r)).toBe(cell(r, new Date(2026, 1, 10)));
    });
  });

  describe('focusActiveCell', () => {
    it('moves DOM focus to the roving cell and reports success', () => {
      const r = renderHost(CalendarHost);

      const moved = r.instance.calendar().focusActiveCell();

      expect(moved).toBe(true);
      expect(document.activeElement).toBe(focusedCell(r));
      expect(document.activeElement).toBe(cell(r, JUN_15));
    });

    it('follows the focused date after keyboard navigation', async () => {
      const r = renderHost(CalendarHost);

      pressKey(focusedCell(r), 'ArrowRight');
      await flush(r.fixture);

      const moved = r.instance.calendar().focusActiveCell();

      expect(moved).toBe(true);
      expect(document.activeElement).toBe(cell(r, new Date(2026, 5, 16)));
    });
  });

  describe('availability', () => {
    it('marks dates before min / after max as aria-disabled and blocks selection', async () => {
      const r = renderHost(CalendarHost);
      r.instance.min.set(new Date(2026, 5, 10));
      await flush(r.fixture);

      const early = cell(r, new Date(2026, 5, 5));
      expect(early.getAttribute('aria-disabled')).toBe('true');
      expect(early.getAttribute('data-disabled')).toBe('');

      early.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await flush(r.fixture);
      expect(early.getAttribute('aria-selected')).toBe('false');
      expect(cell(r, JUN_15).getAttribute('aria-selected')).toBe('true');
    });

    it('honours the isDateUnavailable predicate', async () => {
      const r = renderHost(CalendarHost);
      r.instance.unavailable.set((date) => date.getDate() === 20);
      await flush(r.fixture);

      const blocked = cell(r, new Date(2026, 5, 20));
      expect(blocked.getAttribute('aria-disabled')).toBe('true');

      blocked.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await flush(r.fixture);
      expect(blocked.getAttribute('aria-selected')).toBe('false');
    });

    it('selects on click for available dates', async () => {
      const r = renderHost(CalendarHost);
      const target = cell(r, new Date(2026, 5, 20));

      target.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await flush(r.fixture);
      expect(target.getAttribute('aria-selected')).toBe('true');
      expect(cell(r, JUN_15).getAttribute('aria-selected')).toBe('false');
    });
  });

  describe('disabled & readonly', () => {
    it('disabled: reflects data-disabled, marks cells aria-disabled, blocks keyboard and click', async () => {
      const r = renderHost(CalendarHost);
      r.instance.disabled.set(true);
      await flush(r.fixture);

      expect(root(r).getAttribute('data-disabled')).toBe('');
      expect(cell(r, new Date(2026, 5, 16)).getAttribute('aria-disabled')).toBe('true');

      pressKey(cell(r, JUN_15), 'ArrowRight');
      await flush(r.fixture);
      expect(focusedCell(r)).toBe(cell(r, JUN_15));

      cell(r, new Date(2026, 5, 16)).dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await flush(r.fixture);
      expect(cell(r, new Date(2026, 5, 16)).getAttribute('aria-selected')).toBe('false');
    });

    it('readonly: reflects data-readonly, allows navigation, blocks selection', async () => {
      const r = renderHost(CalendarHost);
      r.instance.readonly.set(true);
      await flush(r.fixture);

      expect(root(r).getAttribute('data-readonly')).toBe('');
      expect(cell(r, new Date(2026, 5, 16)).hasAttribute('aria-disabled')).toBe(false);

      pressKey(focusedCell(r), 'ArrowRight');
      await flush(r.fixture);
      expect(focusedCell(r)).toBe(cell(r, new Date(2026, 5, 16)));

      focusedCell(r).dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await flush(r.fixture);
      expect(cell(r, new Date(2026, 5, 16)).getAttribute('aria-selected')).toBe('false');
      expect(cell(r, JUN_15).getAttribute('aria-selected')).toBe('true');
    });
  });

  describe('month navigation buttons', () => {
    it('prev / next page the visible month', async () => {
      const r = renderHost(CalendarHost);

      r.query('[data-testid="prev"]')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await flush(r.fixture);
      expect(cell(r, new Date(2026, 4, 15))).toBeTruthy();

      r.query('[data-testid="next"]')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await flush(r.fixture);
      expect(cell(r, JUN_15)).toBeTruthy();
    });

    it('announces the new period via a separate off-screen live region when paging', async () => {
      const r = renderHost(CalendarHost);
      const liveRegion = () =>
        Array.from(document.body.querySelectorAll('[aria-live="polite"]')).find(
          (el) => !el.closest('[forCalendar]'),
        );

      expect(liveRegion()?.textContent ?? '').toBe('');

      r.query('[data-testid="next"]')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await flush(r.fixture);

      const heading = r.query('[data-testid="heading"]')!;
      expect(liveRegion()?.textContent).toBe(heading.textContent?.trim());
      expect(liveRegion()?.textContent).toContain('2026');
    });

    it('does not announce when the visible month changes from an external value write (#590 F3)', async () => {
      const r = renderHost(CalendarHost);
      const liveRegion = () =>
        Array.from(document.body.querySelectorAll('[aria-live="polite"]')).find(
          (el) => !el.closest('[forCalendar]'),
        );

      r.instance.value.set(new Date(2026, 8, 15));
      await flush(r.fixture);

      expect(r.query('[data-testid="heading"]')!.textContent).toContain('2026');
      expect(liveRegion()?.textContent ?? '').toBe('');
    });

    it('disables prev / next at the min / max bounds', async () => {
      const r = renderHost(CalendarHost);
      r.instance.min.set(new Date(2026, 5, 1));
      r.instance.max.set(new Date(2026, 5, 30));
      await flush(r.fixture);

      const prev = r.query('[data-testid="prev"]')!;
      const next = r.query('[data-testid="next"]')!;
      expect(prev.hasAttribute('disabled')).toBe(true);
      expect(prev.getAttribute('aria-disabled')).toBe('true');
      expect(next.hasAttribute('disabled')).toBe(true);
      expect(next.getAttribute('aria-disabled')).toBe('true');
    });

    it('clamps the focused date into [min, max] when paging lands before min', async () => {
      const r = renderHost(CalendarHost);
      r.instance.min.set(new Date(2026, 5, 3));
      r.instance.value.set(new Date(2026, 6, 1));
      await flush(r.fixture);
      expect(focusedCell(r)).toBe(cell(r, new Date(2026, 6, 1)));

      r.query('[data-testid="prev"]')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await flush(r.fixture);

      expect(focusedCell(r)).toBe(cell(r, new Date(2026, 5, 3)));
      expect(cell(r, new Date(2026, 5, 1)).hasAttribute('data-highlighted')).toBe(false);
      expect(cell(r, new Date(2026, 5, 3)).getAttribute('data-highlighted')).toBe('');
    });

    it('clamps the focused date into [min, max] when paging by keyboard (PageUp)', async () => {
      const r = renderHost(CalendarHost);
      r.instance.min.set(new Date(2026, 5, 3));
      r.instance.value.set(new Date(2026, 6, 1));
      await flush(r.fixture);

      pressKey(focusedCell(r), 'PageUp');
      await flush(r.fixture);
      expect(focusedCell(r)).toBe(cell(r, new Date(2026, 5, 3)));
    });

    it('clamps flat arrow / Home moves at min so focus never leaves [min, max] (#1150)', async () => {
      const r = renderHost(CalendarHost);
      r.instance.min.set(JUN_15);
      r.instance.value.set(JUN_15);
      await flush(r.fixture);
      expect(focusedCell(r)).toBe(cell(r, JUN_15));

      pressKey(focusedCell(r), 'ArrowLeft');
      await flush(r.fixture);
      expect(focusedCell(r)).toBe(cell(r, JUN_15));

      pressKey(focusedCell(r), 'ArrowUp');
      await flush(r.fixture);
      expect(focusedCell(r)).toBe(cell(r, JUN_15));

      pressKey(focusedCell(r), 'Home');
      await flush(r.fixture);
      expect(focusedCell(r)).toBe(cell(r, JUN_15));
    });

    it('clamps flat arrow / End moves at max so focus never leaves [min, max] (#1150)', async () => {
      const r = renderHost(CalendarHost);
      r.instance.max.set(JUN_15);
      r.instance.value.set(JUN_15);
      await flush(r.fixture);

      pressKey(focusedCell(r), 'ArrowRight');
      await flush(r.fixture);
      expect(focusedCell(r)).toBe(cell(r, JUN_15));

      pressKey(focusedCell(r), 'ArrowDown');
      await flush(r.fixture);
      expect(focusedCell(r)).toBe(cell(r, JUN_15));

      pressKey(focusedCell(r), 'End');
      await flush(r.fixture);
      expect(focusedCell(r)).toBe(cell(r, JUN_15));
    });
  });

  describe('zoneless reactivity', () => {
    it('re-renders the grid when value changes under provideZonelessChangeDetection', async () => {
      const r = renderHost(CalendarHost);

      r.instance.value.set(new Date(2026, 0, 10));
      await flush(r.fixture);

      const janCell = cell(r, new Date(2026, 0, 10));
      expect(janCell).toBeTruthy();
      expect(janCell.getAttribute('aria-selected')).toBe('true');
      expect(tabbableCells(r)[0]).toBe(janCell);
    });
  });

  describe('range mode', () => {
    const rangeCell = (r: RenderResult<CalendarRangeHost>, date: Date) =>
      r.query<HTMLElement>(`[data-testid="cell-${keyOf(date)}"]`)!;

    const click = (el: HTMLElement) => el.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    const JUN_10 = new Date(2026, 5, 10);
    const JUN_15 = new Date(2026, 5, 15);
    const JUN_20 = new Date(2026, 5, 20);

    it('anchor → commit: sets range, emits data-range-start/end/in-range', async () => {
      const r = renderHost(CalendarRangeHost);

      click(rangeCell(r, JUN_10));
      await flush(r.fixture);
      expect(r.instance.range()).toBeNull();
      expect(rangeCell(r, JUN_10).hasAttribute('data-range-start')).toBe(true);

      click(rangeCell(r, JUN_15));
      await flush(r.fixture);

      const range = r.instance.range();
      expect(range).not.toBeNull();
      expect(adapter.isSameDay(range!.start, JUN_10)).toBe(true);
      expect(adapter.isSameDay(range!.end, JUN_15)).toBe(true);
      expect(compareDateOf(adapter, range!.start, range!.end)).toBeLessThanOrEqual(0);

      expect(rangeCell(r, JUN_10).hasAttribute('data-range-start')).toBe(true);
      expect(rangeCell(r, JUN_15).hasAttribute('data-range-end')).toBe(true);
      expect(rangeCell(r, new Date(2026, 5, 12)).hasAttribute('data-in-range')).toBe(true);
      expect(rangeCell(r, JUN_10).hasAttribute('data-in-range')).toBe(true);
      expect(rangeCell(r, JUN_15).hasAttribute('data-in-range')).toBe(true);
    });

    it('committed range: aria-selected is true across the band', async () => {
      const r = renderHost(CalendarRangeHost);

      click(rangeCell(r, JUN_10));
      await flush(r.fixture);
      click(rangeCell(r, JUN_15));
      await flush(r.fixture);

      for (let d = 10; d <= 15; d++) {
        const c = rangeCell(r, new Date(2026, 5, d));
        expect(c.getAttribute('aria-selected')).toBe('true');
      }
      expect(rangeCell(r, new Date(2026, 5, 9)).getAttribute('aria-selected')).toBe('false');
      expect(rangeCell(r, new Date(2026, 5, 16)).getAttribute('aria-selected')).toBe('false');
    });

    it('hover preview: data-range-preview spans anchor→hovered inclusive while selecting', async () => {
      const r = renderHost(CalendarRangeHost);

      click(rangeCell(r, JUN_10));
      await flush(r.fixture);

      rangeCell(r, JUN_20).dispatchEvent(new PointerEvent('pointerenter', { bubbles: true }));
      await flush(r.fixture);

      expect(rangeCell(r, JUN_10).hasAttribute('data-range-preview')).toBe(true);
      expect(rangeCell(r, new Date(2026, 5, 15)).hasAttribute('data-range-preview')).toBe(true);
      expect(rangeCell(r, JUN_20).hasAttribute('data-range-preview')).toBe(true);
      expect(rangeCell(r, JUN_10).hasAttribute('data-in-range')).toBe(false);

      rangeCell(r, JUN_20).dispatchEvent(new PointerEvent('pointerleave', { bubbles: true }));
      await flush(r.fixture);
      expect(rangeCell(r, JUN_20).hasAttribute('data-range-preview')).toBe(false);
    });

    it('hover preview before the anchor paints the inverted band [hovered, anchor]', async () => {
      const r = renderHost(CalendarRangeHost);

      click(rangeCell(r, JUN_15));
      await flush(r.fixture);
      rangeCell(r, JUN_10).dispatchEvent(new PointerEvent('pointerenter', { bubbles: true }));
      await flush(r.fixture);

      expect(rangeCell(r, JUN_10).hasAttribute('data-range-preview')).toBe(true);
      expect(rangeCell(r, new Date(2026, 5, 12)).hasAttribute('data-range-preview')).toBe(true);
      expect(rangeCell(r, JUN_15).hasAttribute('data-range-preview')).toBe(true);
      expect(rangeCell(r, JUN_10).hasAttribute('data-range-start')).toBe(true);
      expect(rangeCell(r, JUN_15).hasAttribute('data-range-end')).toBe(true);
    });

    it('data-in-range and data-range-preview are mutually exclusive', async () => {
      const r = renderHost(CalendarRangeHost);

      click(rangeCell(r, JUN_10));
      await flush(r.fixture);
      rangeCell(r, JUN_15).dispatchEvent(new PointerEvent('pointerenter', { bubbles: true }));
      await flush(r.fixture);

      const mid = rangeCell(r, new Date(2026, 5, 12));
      expect(mid.hasAttribute('data-range-preview')).toBe(true);
      expect(mid.hasAttribute('data-in-range')).toBe(false);

      click(rangeCell(r, JUN_15));
      await flush(r.fixture);
      expect(mid.hasAttribute('data-range-preview')).toBe(false);
      expect(mid.hasAttribute('data-in-range')).toBe(true);
    });

    it('commit inverted range: clicking before the anchor commits [click, anchor]', async () => {
      const r = renderHost(CalendarRangeHost);

      click(rangeCell(r, JUN_15));
      await flush(r.fixture);
      click(rangeCell(r, JUN_10));
      await flush(r.fixture);

      const range = r.instance.range();
      expect(adapter.isSameDay(range!.start, JUN_10)).toBe(true);
      expect(adapter.isSameDay(range!.end, JUN_15)).toBe(true);
      expect(rangeCell(r, JUN_10).hasAttribute('data-range-start')).toBe(true);
      expect(rangeCell(r, JUN_15).hasAttribute('data-range-end')).toBe(true);
      expect(rangeCell(r, new Date(2026, 5, 12)).hasAttribute('data-in-range')).toBe(true);
    });

    it('keyboard: Enter sets anchor, arrows move preview, Enter commits', async () => {
      const r = renderHost(CalendarRangeHost);

      const startCell = rangeCell(r, JUN_10);
      pressKey(startCell, 'Enter');
      await flush(r.fixture);
      expect(r.instance.range()).toBeNull();
      expect(startCell.hasAttribute('data-range-start')).toBe(true);

      pressKey(startCell, 'ArrowRight');
      await flush(r.fixture);
      pressKey(rangeCell(r, new Date(2026, 5, 11)), 'ArrowRight');
      await flush(r.fixture);

      const endCell = rangeCell(r, new Date(2026, 5, 12));
      pressKey(endCell, 'Enter');
      await flush(r.fixture);

      const range = r.instance.range();
      expect(range).not.toBeNull();
      expect(adapter.isSameDay(range!.start, JUN_10)).toBe(true);
      expect(adapter.isSameDay(range!.end, new Date(2026, 5, 12))).toBe(true);
    });

    it('keyboard: navigating before the anchor commits the inverted range', async () => {
      const r = renderHost(CalendarRangeHost);

      pressKey(rangeCell(r, JUN_15), 'Enter');
      await flush(r.fixture);
      pressKey(rangeCell(r, JUN_15), 'ArrowLeft');
      await flush(r.fixture);
      pressKey(rangeCell(r, new Date(2026, 5, 14)), 'ArrowLeft');
      await flush(r.fixture);
      pressKey(rangeCell(r, new Date(2026, 5, 13)), 'Enter');
      await flush(r.fixture);

      const range = r.instance.range();
      expect(adapter.isSameDay(range!.start, new Date(2026, 5, 13))).toBe(true);
      expect(adapter.isSameDay(range!.end, JUN_15)).toBe(true);
    });

    it('maxRangeLength: clicking past the limit is a no-op, anchor is preserved', async () => {
      const r = renderHost(CalendarRangeHost);
      r.instance.maxRangeLength.set(3);
      await flush(r.fixture);

      click(rangeCell(r, JUN_10));
      await flush(r.fixture);
      click(rangeCell(r, new Date(2026, 5, 15)));
      await flush(r.fixture);

      expect(r.instance.range()).toBeNull();
      expect(rangeCell(r, JUN_10).hasAttribute('data-range-start')).toBe(true);
    });

    it('maxRangeLength: a valid-length click commits', async () => {
      const r = renderHost(CalendarRangeHost);
      r.instance.maxRangeLength.set(3);
      await flush(r.fixture);

      click(rangeCell(r, JUN_10));
      await flush(r.fixture);
      click(rangeCell(r, new Date(2026, 5, 12)));
      await flush(r.fixture);

      const range = r.instance.range();
      expect(range).not.toBeNull();
      expect(adapter.isSameDay(range!.start, JUN_10)).toBe(true);
      expect(adapter.isSameDay(range!.end, new Date(2026, 5, 12))).toBe(true);
    });

    it('minRangeLength: clicking too close to anchor is a no-op', async () => {
      const r = renderHost(CalendarRangeHost);
      r.instance.minRangeLength.set(5);
      await flush(r.fixture);

      click(rangeCell(r, JUN_10));
      await flush(r.fixture);
      click(rangeCell(r, new Date(2026, 5, 11)));
      await flush(r.fixture);

      expect(r.instance.range()).toBeNull();
      expect(rangeCell(r, JUN_10).hasAttribute('data-range-start')).toBe(true);
    });

    it('minRangeLength: a sufficient-length click commits', async () => {
      const r = renderHost(CalendarRangeHost);
      r.instance.minRangeLength.set(3);
      await flush(r.fixture);

      click(rangeCell(r, JUN_10));
      await flush(r.fixture);
      click(rangeCell(r, new Date(2026, 5, 12)));
      await flush(r.fixture);

      expect(r.instance.range()).not.toBeNull();
    });

    it('unavailable date cannot be an anchor', async () => {
      const r = renderHost(CalendarRangeHost);
      r.instance.unavailable.set((d) => adapter.isSameDay(d, JUN_15));
      await flush(r.fixture);

      click(rangeCell(r, JUN_15));
      await flush(r.fixture);

      expect(r.instance.range()).toBeNull();
      expect(rangeCell(r, JUN_15).hasAttribute('data-range-start')).toBe(false);
    });

    it('out-of-bounds date (min) cannot be an anchor', async () => {
      const r = renderHost(CalendarRangeHost);
      r.instance.min.set(JUN_15);
      await flush(r.fixture);

      click(rangeCell(r, JUN_10));
      await flush(r.fixture);

      expect(r.instance.range()).toBeNull();
      expect(rangeCell(r, JUN_10).hasAttribute('data-range-start')).toBe(false);
    });

    describe('zoneless', () => {
      it('range selection works under provideZonelessChangeDetection', async () => {
        const r = renderHost(CalendarRangeHost);

        click(rangeCell(r, JUN_10));
        await flush(r.fixture);
        click(rangeCell(r, JUN_15));
        await flush(r.fixture);

        const range = r.instance.range();
        expect(range).not.toBeNull();
        expect(adapter.isSameDay(range!.start, JUN_10)).toBe(true);
        expect(adapter.isSameDay(range!.end, JUN_15)).toBe(true);
        expect(rangeCell(r, JUN_10).hasAttribute('data-range-start')).toBe(true);
        expect(rangeCell(r, JUN_15).hasAttribute('data-range-end')).toBe(true);
      });
    });
  });

  describe('single mode unchanged (regression)', () => {
    it('range facets are absent in default single mode', () => {
      const r = renderHost(CalendarHost);
      const all = r.queryAll('[role="gridcell"]');
      for (const td of all) {
        expect(td.hasAttribute('data-range-start')).toBe(false);
        expect(td.hasAttribute('data-range-end')).toBe(false);
        expect(td.hasAttribute('data-in-range')).toBe(false);
        expect(td.hasAttribute('data-range-preview')).toBe(false);
      }
    });

    it('single-mode value and data-selected are unchanged', async () => {
      const r = renderHost(CalendarHost);
      const JUN_15 = new Date(2026, 5, 15);
      const target = cell(r, new Date(2026, 5, 20));

      target.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await flush(r.fixture);

      expect(target.getAttribute('aria-selected')).toBe('true');
      expect(cell(r, JUN_15).getAttribute('aria-selected')).toBe('false');
      expect(target.hasAttribute('data-selected')).toBe(true);
    });
  });

  describe('month / year navigation (#767)', () => {
    const selectMonth = (r: RenderResult<CalendarDropdownsHost>, month: number) => {
      const sel = r.query<HTMLSelectElement>('[data-testid="month-select"]')!;
      sel.value = String(month);
      sel.dispatchEvent(new Event('change', { bubbles: true }));
    };
    const selectYear = (r: RenderResult<CalendarDropdownsHost>, year: number) => {
      const sel = r.query<HTMLSelectElement>('[data-testid="year-select"]')!;
      sel.value = String(year);
      sel.dispatchEvent(new Event('change', { bubbles: true }));
    };
    const dcell = (r: RenderResult<CalendarDropdownsHost>, date: Date) =>
      r.query<HTMLElement>(`[data-testid="cell-${keyOf(date)}"]`)!;
    const dFocused = (r: RenderResult<CalendarDropdownsHost>) =>
      r.queryAll('[role="gridcell"][tabindex="0"]')[0]!;
    const monthOpt = (r: RenderResult<CalendarDropdownsHost>, m: number) =>
      r.query<HTMLOptionElement>(`[data-testid="month-opt-${m}"]`)!;
    const yearOpt = (r: RenderResult<CalendarDropdownsHost>, y: number) =>
      r.query<HTMLOptionElement>(`[data-testid="year-opt-${y}"]`)!;

    it('goToMonth re-pages the grid and leaves value untouched', async () => {
      const r = renderHost(CalendarDropdownsHost);
      selectMonth(r, 1);
      await flush(r.fixture);
      const heading = r.query('[data-testid="heading"]')!.textContent!;
      expect(heading).toContain('2026');
      expect(heading).toContain(adapter.format(new Date(2026, 0, 1), { month: 'long' }));
      expect(dFocused(r)).toBe(dcell(r, new Date(2026, 0, 15)));
      expect(r.instance.value()!.getMonth()).toBe(5);
      expect(r.instance.value()!.getDate()).toBe(15);
    });

    it('goToYear keeps the month and re-pages', async () => {
      const r = renderHost(CalendarDropdownsHost);
      selectYear(r, 2028);
      await flush(r.fixture);
      const heading = r.query('[data-testid="heading"]')!.textContent!;
      expect(heading).toContain('2028');
      expect(heading).toContain(adapter.format(new Date(2026, 5, 1), { month: 'long' }));
      expect(r.instance.value()!.getFullYear()).toBe(2026);
    });

    it('intended day is preserved and clamped when crossing a short month', async () => {
      const r = renderHost(CalendarDropdownsHost);
      r.instance.value.set(new Date(2026, 0, 31));
      await flush(r.fixture);
      selectMonth(r, 2);
      await flush(r.fixture);
      expect(dFocused(r)).toBe(dcell(r, new Date(2026, 1, 28)));
    });

    it('monthOptions produces 12 localized entries', async () => {
      const r = renderHost(CalendarDropdownsHost);
      const opts = r.queryAll('[data-testid^="month-opt-"]');
      expect(opts.length).toBe(12);
      const junLabel = monthOpt(r, 6).textContent!.trim();
      expect(junLabel).toBe(adapter.format(new Date(2026, 5, 1), { month: 'long' }));
    });

    it('out-of-bounds months and years are disabled', async () => {
      const r = renderHost(CalendarDropdownsHost);
      r.instance.min.set(new Date(2026, 1, 1));
      r.instance.max.set(new Date(2027, 10, 30));
      await flush(r.fixture);
      expect(monthOpt(r, 1).disabled).toBe(true);
      expect(monthOpt(r, 6).disabled).toBe(false);
      expect(yearOpt(r, 2024).disabled).toBe(true);
      expect(yearOpt(r, 2025).disabled).toBe(true);
      expect(yearOpt(r, 2026).disabled).toBe(false);
      expect(yearOpt(r, 2027).disabled).toBe(false);
      expect(yearOpt(r, 2028).disabled).toBe(true);
    });

    it('[min, max] clamps navigation via goToYear', async () => {
      const r = renderHost(CalendarDropdownsHost);
      r.instance.max.set(new Date(2026, 7, 31));
      await flush(r.fixture);
      r.instance.calendar().goToYear(2030);
      await flush(r.fixture);
      const heading = r.query('[data-testid="heading"]')!.textContent!;
      expect(heading).toContain('2026');
      expect(heading).toContain(adapter.format(new Date(2026, 7, 1), { month: 'long' }));
    });

    it('announces on month change when the month changes', async () => {
      const r = renderHost(CalendarDropdownsHost);
      const liveRegion = () =>
        Array.from(document.body.querySelectorAll('[aria-live="polite"]')).find(
          (el) => !el.closest('[forCalendar]'),
        );
      selectMonth(r, 1);
      await flush(r.fixture);
      expect(liveRegion()?.textContent).toContain('2026');
      expect(liveRegion()?.textContent).toContain(
        adapter.format(new Date(2026, 0, 1), { month: 'long' }),
      );
    });

    it('does not announce when navigating to the already-visible month', async () => {
      const r = renderHost(CalendarDropdownsHost);
      const liveRegion = () =>
        Array.from(document.body.querySelectorAll('[aria-live="polite"]')).find(
          (el) => !el.closest('[forCalendar]'),
        );
      selectMonth(r, 6);
      await flush(r.fixture);
      expect(liveRegion()?.textContent ?? '').toBe('');
    });

    describe('zoneless', () => {
      it('goToMonth renders correctly under provideZonelessChangeDetection', async () => {
        const r = renderHost(CalendarDropdownsHost);
        selectMonth(r, 1);
        await flush(r.fixture);
        expect(dcell(r, new Date(2026, 0, 15))).toBeTruthy();
        expect(dFocused(r)).toBe(dcell(r, new Date(2026, 0, 15)));
      });
    });
  });

  describe('select convenience directives (#789)', () => {
    const monthSelect = (r: RenderResult<CalendarSelectDirectivesHost>) =>
      r.query<HTMLSelectElement>('[data-testid="month-select"]')!;
    const yearSelect = (r: RenderResult<CalendarSelectDirectivesHost>) =>
      r.query<HTMLSelectElement>('[data-testid="year-select"]')!;
    const fireMonth = (r: RenderResult<CalendarSelectDirectivesHost>, m: number) => {
      const s = monthSelect(r);
      s.value = String(m);
      s.dispatchEvent(new Event('change', { bubbles: true }));
    };
    const fireYear = (r: RenderResult<CalendarSelectDirectivesHost>, y: number) => {
      const s = yearSelect(r);
      s.value = String(y);
      s.dispatchEvent(new Event('change', { bubbles: true }));
    };
    const dcell = (r: RenderResult<CalendarSelectDirectivesHost>, date: Date) =>
      r.query<HTMLElement>(`[data-testid="cell-${keyOf(date)}"]`)!;
    const yearOpt = (r: RenderResult<CalendarSelectDirectivesHost>, y: number) =>
      r.query<HTMLOptionElement>(`[data-testid="year-opt-${y}"]`);
    const monthOpt = (r: RenderResult<CalendarSelectDirectivesHost>, m: number) =>
      r.query<HTMLOptionElement>(`[data-testid="month-opt-${m}"]`)!;

    it('month select reflects the visible month and navigating re-pages, value untouched', async () => {
      const r = renderHost(CalendarSelectDirectivesHost);
      expect(monthSelect(r).value).toBe('6');
      fireMonth(r, 1);
      await flush(r.fixture);
      const heading = r.query('[data-testid="heading"]')!.textContent!;
      expect(heading).toContain('2026');
      expect(heading).toContain(adapter.format(new Date(2026, 0, 1), { month: 'long' }));
      expect(r.instance.value()!.getMonth()).toBe(5);
      expect(r.instance.value()!.getDate()).toBe(15);
    });

    it('options() exposes 12 month entries', () => {
      const r = renderHost(CalendarSelectDirectivesHost);
      expect(r.queryAll('[data-testid^="month-opt-"]').length).toBe(12);
    });

    it('year select reflects the visible year and navigating re-pages, value untouched', async () => {
      const r = renderHost(CalendarSelectDirectivesHost);
      expect(yearSelect(r).value).toBe('2026');
      fireYear(r, 2027);
      await flush(r.fixture);
      const heading = r.query('[data-testid="heading"]')!.textContent!;
      expect(heading).toContain('2027');
      expect(heading).toContain(adapter.format(new Date(2026, 5, 1), { month: 'long' }));
      expect(r.instance.value()!.getFullYear()).toBe(2026);
    });

    it('years() spans [minYear, maxYear] and disables out-of-range', async () => {
      const r = renderHost(CalendarSelectDirectivesHost);
      r.instance.min.set(new Date(2026, 1, 1));
      r.instance.max.set(new Date(2027, 10, 30));
      await flush(r.fixture);
      expect(monthOpt(r, 1).disabled).toBe(true);
      expect(monthOpt(r, 6).disabled).toBe(false);
      expect(yearOpt(r, 2024)!.disabled).toBe(true);
      expect(yearOpt(r, 2025)!.disabled).toBe(true);
      expect(yearOpt(r, 2026)!.disabled).toBe(false);
      expect(yearOpt(r, 2027)!.disabled).toBe(false);
      expect(yearOpt(r, 2028)!.disabled).toBe(true);
      expect(r.queryAll('[data-testid^="year-opt-"]').length).toBe(5);
    });

    it('years() defaults to a current-year-anchored window when minYear/maxYear are null', async () => {
      const r = renderHost(CalendarSelectDirectivesHost);
      r.instance.minYear.set(null);
      r.instance.maxYear.set(null);
      await flush(r.fixture);
      const cy = new Date().getFullYear();
      expect(yearOpt(r, cy)).toBeTruthy();
      expect(yearOpt(r, cy - 100)).toBeTruthy();
      expect(yearOpt(r, cy + 10)).toBeTruthy();
      expect(yearOpt(r, cy - 101)).toBeNull();
      expect(yearOpt(r, cy + 11)).toBeNull();
    });

    it('a disabled calendar disables both selects', async () => {
      const r = renderHost(CalendarSelectDirectivesHost);
      r.instance.disabled.set(true);
      await flush(r.fixture);
      expect(monthSelect(r).disabled).toBe(true);
      expect(yearSelect(r).disabled).toBe(true);
    });

    describe('zoneless', () => {
      it('fireMonth updates the grid under provideZonelessChangeDetection', async () => {
        const r = renderHost(CalendarSelectDirectivesHost);
        fireMonth(r, 1);
        await flush(r.fixture);
        expect(dcell(r, new Date(2026, 0, 15))).toBeTruthy();
        expect(r.queryAll('[role="gridcell"][tabindex="0"]')[0]).toBe(
          dcell(r, new Date(2026, 0, 15)),
        );
      });
    });
  });

  describe('date adapters', () => {
    it('native and internationalized adapters produce identical month matrices', () => {
      const native = new NativeDateAdapter();
      const intl = new InternationalizedDateAdapter();

      const nativeMatrix = buildMonthMatrix(native, native.createDate(2026, 2, 1), 0).map((week) =>
        week.map((d) => `${native.getYear(d)}-${native.getMonth(d)}-${native.getDate(d)}`),
      );
      const intlMatrix = buildMonthMatrix(intl, intl.createDate(2026, 2, 1), 0).map((week) =>
        week.map((d) => `${intl.getYear(d)}-${intl.getMonth(d)}-${intl.getDate(d)}`),
      );

      expect(nativeMatrix).toEqual(intlMatrix);
      expect(nativeMatrix[0]!.length).toBe(7);
    });

    it('getDayOfWeek returns the absolute Sunday=0 index, agreeing across adapters (#397)', () => {
      const native = new NativeDateAdapter();
      const intl = new InternationalizedDateAdapter();
      const dateTime = new InternationalizedDateTimeAdapter();

      expect(native.getDayOfWeek(new Date(2026, 5, 14))).toBe(0);
      expect(intl.getDayOfWeek(intl.createDate(2026, 6, 14))).toBe(0);
      expect(dateTime.getDayOfWeek(new CalendarDateTime(2026, 6, 14, 9, 0))).toBe(0);

      expect(native.getDayOfWeek(new Date(2026, 5, 17))).toBe(3);
      expect(intl.getDayOfWeek(intl.createDate(2026, 6, 17))).toBe(3);
      expect(dateTime.getDayOfWeek(new CalendarDateTime(2026, 6, 17, 9, 0))).toBe(3);
    });

    it('firstDayOfWeek shifts the first column', () => {
      const sundayFirst = buildMonthMatrix(adapter, adapter.createDate(2026, 2, 1), 0);
      const mondayFirst = buildMonthMatrix(adapter, adapter.createDate(2026, 2, 1), 1);

      expect(adapter.getDayOfWeek(sundayFirst[0]![0]!)).toBe(0);
      expect(adapter.getDayOfWeek(mondayFirst[0]![0]!)).toBe(1);
    });

    it('addMonths / addYears constrain the day of month (native matches internationalized)', () => {
      const native = new NativeDateAdapter();
      const intl = new InternationalizedDateAdapter();

      const nativeFeb = native.addMonths(native.createDate(2026, 1, 31), 1);
      expect(native.getMonth(nativeFeb)).toBe(2);
      expect(native.getDate(nativeFeb)).toBe(28);

      const intlFeb = intl.addMonths(intl.createDate(2026, 1, 31), 1);
      expect(intl.getMonth(intlFeb)).toBe(2);
      expect(intl.getDate(intlFeb)).toBe(28);

      const nativeLeap = native.addYears(native.createDate(2024, 2, 29), 1);
      expect(native.getMonth(nativeLeap)).toBe(2);
      expect(native.getDate(nativeLeap)).toBe(28);
    });

    it('compareDateOf ignores the time component on every adapter (#370, #501)', () => {
      const native = new NativeDateAdapter();
      const dateTime = new InternationalizedDateTimeAdapter();

      const nativeMidnight = new Date(2026, 5, 20, 0, 0);
      const nativeMin = new Date(2026, 5, 20, 9, 0);
      expect(native.compare(nativeMidnight, nativeMin)).toBeLessThan(0);
      expect(compareDateOf(native, nativeMidnight, nativeMin)).toBe(0);

      const dtMidnight = new CalendarDateTime(2026, 6, 20, 0, 0);
      const dtMin = new CalendarDateTime(2026, 6, 20, 9, 0);
      expect(dateTime.compare(dtMidnight, dtMin)).toBeLessThan(0);
      expect(compareDateOf(dateTime, dtMidnight, dtMin)).toBe(0);
    });

    it('compare orders by the full instant on every time-capable adapter (#501)', () => {
      const native = new NativeDateAdapter();
      const dateTime = new InternationalizedDateTimeAdapter();

      const nativeEarly = new Date(2026, 5, 20, 9, 0);
      const nativeLate = new Date(2026, 5, 20, 17, 0);
      const dtEarly = new CalendarDateTime(2026, 6, 20, 9, 0);
      const dtLate = new CalendarDateTime(2026, 6, 20, 17, 0);

      expect(Math.sign(native.compare(nativeEarly, nativeLate))).toBe(
        Math.sign(dateTime.compare(dtEarly, dtLate)),
      );
      expect(native.compare(nativeEarly, nativeLate)).toBeLessThan(0);
    });

    it('compareDateOf falls back to the y/m/d getters when an adapter omits compareDate (#501)', () => {
      const native: DateAdapter<Date> = new NativeDateAdapter();
      expect(native.compareDate).toBeUndefined();

      const sameDay = compareDateOf(
        native,
        new Date(2026, 5, 20, 0, 0),
        new Date(2026, 5, 20, 23, 0),
      );
      expect(sameDay).toBe(0);

      const earlierDay = compareDateOf(
        native,
        new Date(2026, 5, 19, 23, 0),
        new Date(2026, 5, 20, 0, 0),
      );
      expect(earlierDay).toBeLessThan(0);
    });

    describe('cross-adapter contract (#1150)', () => {
      function assertYearsBelow100<D>(dateAdapter: DateAdapter<D>): void {
        expect(dateAdapter.getYear(dateAdapter.createDate(50, 6, 15))).toBe(50);
        expect(dateAdapter.getYear(dateAdapter.createDate(7, 1, 1))).toBe(7);

        const addedYears = dateAdapter.addYears(dateAdapter.createDate(99, 6, 15), 2);
        expect(dateAdapter.getYear(addedYears)).toBe(101);

        const backBelow = dateAdapter.addYears(dateAdapter.createDate(101, 6, 15), -2);
        expect(dateAdapter.getYear(backBelow)).toBe(99);

        const addedMonths = dateAdapter.addMonths(dateAdapter.createDate(50, 12, 1), 1);
        expect(dateAdapter.getYear(addedMonths)).toBe(51);
        expect(dateAdapter.getMonth(addedMonths)).toBe(1);
      }

      function assertAddPreservesTime<D>(dateAdapter: TimeCapableDateAdapter<D>): void {
        const seed = dateAdapter.setTime(dateAdapter.createDate(2026, 6, 15), 14, 30, 45);
        for (const advanced of [
          dateAdapter.addDays(seed, 3),
          dateAdapter.addMonths(seed, 2),
          dateAdapter.addYears(seed, 1),
        ]) {
          expect(dateAdapter.getHours(advanced)).toBe(14);
          expect(dateAdapter.getMinutes(advanced)).toBe(30);
          expect(dateAdapter.getSeconds(advanced)).toBe(45);
        }
      }

      it('maps years 1-99 to the literal year, never the 1901-1999 legacy offset', () => {
        assertYearsBelow100(new NativeDateAdapter());
        assertYearsBelow100(new InternationalizedDateAdapter());
        assertYearsBelow100(new InternationalizedDateTimeAdapter());
      });

      it('add* preserves the wall-clock time on every time-capable adapter', () => {
        assertAddPreservesTime(new NativeDateAdapter());
        assertAddPreservesTime(new InternationalizedDateTimeAdapter());
      });
    });
  });

  describe('date-time min/max boundary day (#370)', () => {
    it('keeps the day of a non-midnight min selectable in the grid', async () => {
      const r = renderHost(DateTimeCalendarHost);
      r.instance.min.set(new CalendarDateTime(2026, 6, 20, 9, 0));
      await flush(r.fixture);

      const boundary = r.query('[data-testid="cell-2026-6-20"]')!;
      expect(boundary.hasAttribute('aria-disabled')).toBe(false);

      boundary.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await flush(r.fixture);
      expect(boundary.getAttribute('aria-selected')).toBe('true');
      expect(r.instance.value()!.day).toBe(20);
    });

    it('keeps the day of a non-midnight max selectable in the grid', async () => {
      const r = renderHost(DateTimeCalendarHost);
      r.instance.max.set(new CalendarDateTime(2026, 6, 20, 9, 0));
      await flush(r.fixture);

      const boundary = r.query('[data-testid="cell-2026-6-20"]')!;
      expect(boundary.hasAttribute('aria-disabled')).toBe(false);

      boundary.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await flush(r.fixture);
      expect(boundary.getAttribute('aria-selected')).toBe('true');
      expect(r.instance.value()!.day).toBe(20);
    });

    it('marks the day before a non-midnight min as unavailable', async () => {
      const r = renderHost(DateTimeCalendarHost);
      r.instance.min.set(new CalendarDateTime(2026, 6, 20, 9, 0));
      await flush(r.fixture);

      const before = r.query('[data-testid="cell-2026-6-19"]')!;
      expect(before.getAttribute('aria-disabled')).toBe('true');
    });

    it('matches NativeDateAdapter behavior for a non-midnight min boundary day', () => {
      const native = new NativeDateAdapter();
      const dateTime = new InternationalizedDateTimeAdapter();

      const nativeCell = new Date(2026, 5, 20, 0, 0);
      const nativeMin = new Date(2026, 5, 20, 9, 0);
      const dtCell = new CalendarDateTime(2026, 6, 20, 0, 0);
      const dtMin = new CalendarDateTime(2026, 6, 20, 9, 0);

      const nativeAvailable = compareDateOf(native, nativeCell, nativeMin) >= 0;
      const dtAvailable = compareDateOf(dateTime, dtCell, dtMin) >= 0;
      expect(nativeAvailable).toBe(true);
      expect(dtAvailable).toBe(true);
      expect(nativeAvailable).toBe(dtAvailable);
    });
  });

  describe('time preservation on selection (#500)', () => {
    it('preserves the bound time when selecting a cell with a date-time adapter', async () => {
      const r = renderHost(DateTimeCalendarHost);
      r.instance.value.set(new CalendarDateTime(2026, 6, 15, 14, 30, 45));
      await flush(r.fixture);

      const target = r.query('[data-testid="cell-2026-6-20"]')!;
      target.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await flush(r.fixture);

      const selected = r.instance.value()!;
      expect(selected.day).toBe(20);
      expect(selected.hour).toBe(14);
      expect(selected.minute).toBe(30);
      expect(selected.second).toBe(45);
    });

    it('preserves the bound time when selecting via the keyboard', async () => {
      const r = renderHost(DateTimeCalendarHost);
      r.instance.value.set(new CalendarDateTime(2026, 6, 15, 8, 5, 0));
      await flush(r.fixture);

      const focused = r.query('[data-testid="cell-2026-6-15"]')!;
      pressKey(focused, 'Enter');
      await flush(r.fixture);

      const selected = r.instance.value()!;
      expect(selected.day).toBe(15);
      expect(selected.hour).toBe(8);
      expect(selected.minute).toBe(5);
    });

    it('uses midnight when selecting against a null date-time value', async () => {
      const r = renderHost(DateTimeCalendarHost);
      r.instance.value.set(null);
      await flush(r.fixture);

      const target = r.query('[data-testid="cell-2026-6-20"]')!;
      target.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await flush(r.fixture);

      const selected = r.instance.value()!;
      expect(selected.day).toBe(20);
      expect(selected.hour).toBe(0);
      expect(selected.minute).toBe(0);
      expect(selected.second).toBe(0);
    });

    it('preserves the bound time on the time-capable native adapter', async () => {
      const r = renderHost(CalendarHost);
      r.instance.value.set(new Date(2026, 5, 15, 14, 30, 45));
      await flush(r.fixture);

      cell(r, new Date(2026, 5, 20)).dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await flush(r.fixture);

      const selected = r.instance.value()!;
      expect(selected.getDate()).toBe(20);
      expect(selected.getHours()).toBe(14);
      expect(selected.getMinutes()).toBe(30);
      expect(selected.getSeconds()).toBe(45);
    });

    it('leaves a day-only adapter selection at the midnight cell value', async () => {
      const r = renderHost(DayOnlyCalendarHost);
      r.instance.value.set(new CalendarDate(2026, 6, 15));
      await flush(r.fixture);

      const target = r.query('[data-testid="cell-2026-6-20"]')!;
      target.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await flush(r.fixture);

      const selected = r.instance.value()!;
      expect(selected.day).toBe(20);
      expect('hour' in selected).toBe(false);
    });
  });

  describe('view switching (#768)', () => {
    const viewRoot = (r: RenderResult<CalendarViewsHost>) => r.query('[forCalendar]')!;
    const trigger = (r: RenderResult<CalendarViewsHost>) =>
      r.query<HTMLElement>('[data-testid="view-trigger"]')!;
    const prevBtn = (r: RenderResult<CalendarViewsHost>) =>
      r.query<HTMLElement>('[data-testid="prev"]')!;
    const nextBtn = (r: RenderResult<CalendarViewsHost>) =>
      r.query<HTMLElement>('[data-testid="next"]')!;
    const monthCell = (r: RenderResult<CalendarViewsHost>, m: number) =>
      r.query<HTMLElement>(`[data-testid="month-cell-${m}"]`)!;
    const yearCell = (r: RenderResult<CalendarViewsHost>, y: number) =>
      r.query<HTMLElement>(`[data-testid="year-cell-${y}"]`)!;
    const click = (el: HTMLElement) => el.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    it('view trigger cycles day → month → year and clamps at year', async () => {
      const r = renderHost(CalendarViewsHost);
      expect(viewRoot(r).getAttribute('data-view')).toBe('day');

      click(trigger(r));
      await flush(r.fixture);
      expect(viewRoot(r).getAttribute('data-view')).toBe('month');
      expect(trigger(r).getAttribute('data-view')).toBe('month');

      click(trigger(r));
      await flush(r.fixture);
      expect(viewRoot(r).getAttribute('data-view')).toBe('year');
      expect(trigger(r).getAttribute('data-view')).toBe('year');

      click(trigger(r));
      await flush(r.fixture);
      expect(viewRoot(r).getAttribute('data-view')).toBe('year');
    });

    it('view trigger label reflects the active view', async () => {
      const r = renderHost(CalendarViewsHost);

      click(trigger(r));
      await flush(r.fixture);
      expect(trigger(r).textContent!.trim()).toBe(String(2026));

      click(trigger(r));
      await flush(r.fixture);
      const blockStart = Math.floor(2026 / 12) * 12;
      expect(trigger(r).textContent!.trim()).toBe(`${blockStart} – ${blockStart + 11}`);
    });

    it('month grid has role="grid" and data-view="month" with 12 cells', async () => {
      const r = renderHost(CalendarViewsHost);
      r.instance.view.set('month');
      await flush(r.fixture);

      const grid = r.query('[forCalendarMonthGrid]')!;
      expect(grid.getAttribute('role')).toBe('grid');
      expect(grid.getAttribute('data-view')).toBe('month');
      expect(r.queryAll('[forCalendarMonthCell]').length).toBe(12);
    });

    it('month grid has exactly one tabindex="0" cell (the visible month)', async () => {
      const r = renderHost(CalendarViewsHost);
      r.instance.view.set('month');
      await flush(r.fixture);

      const tabbable = r.queryAll('[forCalendarMonthCell][tabindex="0"]');
      expect(tabbable.length).toBe(1);
      expect(tabbable[0]).toBe(monthCell(r, 6));
    });

    it('month cells emit aria-selected (always) and data-today for today month', async () => {
      const r = renderHost(CalendarViewsHost);
      r.instance.view.set('month');
      await flush(r.fixture);

      const jun = monthCell(r, 6);
      expect(jun.getAttribute('aria-selected')).toBe('true');
      expect(jun.getAttribute('data-selected')).toBe('');

      const jul = monthCell(r, 7);
      expect(jul.getAttribute('aria-selected')).toBe('false');
      expect(jul.hasAttribute('data-selected')).toBe(false);
    });

    it('ArrowRight moves the roving month cell', async () => {
      const r = renderHost(CalendarViewsHost);
      r.instance.view.set('month');
      await flush(r.fixture);

      pressKey(monthCell(r, 6), 'ArrowRight');
      await flush(r.fixture);

      expect(monthCell(r, 7).getAttribute('tabindex')).toBe('0');
      expect(monthCell(r, 7).hasAttribute('data-highlighted')).toBe(true);
      expect(monthCell(r, 6).getAttribute('tabindex')).toBe('-1');
    });

    it('ArrowDown moves roving cell by 3 (one row)', async () => {
      const r = renderHost(CalendarViewsHost);
      r.instance.view.set('month');
      await flush(r.fixture);

      pressKey(monthCell(r, 6), 'ArrowDown');
      await flush(r.fixture);

      expect(monthCell(r, 9).getAttribute('tabindex')).toBe('0');
    });

    it('ArrowRight from December rolls to January of the next year and trigger shows next year', async () => {
      const r = renderHost(CalendarViewsHost);
      r.instance.view.set('month');
      await flush(r.fixture);

      r.instance.calendar().goToMonth(12);
      await flush(r.fixture);
      expect(r.queryAll('[forCalendarMonthCell][tabindex="0"]')[0]).toBe(monthCell(r, 12));

      pressKey(monthCell(r, 12), 'ArrowRight');
      await flush(r.fixture);

      expect(trigger(r).textContent!.trim()).toBe(String(2027));
      expect(r.queryAll('[forCalendarMonthCell][tabindex="0"]').length).toBe(1);
    });

    it('clamps flat month-grid moves so focus never leaves [min, max] (#1150)', async () => {
      const r = renderHost(CalendarViewsHost);
      r.instance.min.set(new Date(2026, 5, 1));
      r.instance.view.set('month');
      await flush(r.fixture);
      expect(monthCell(r, 6).hasAttribute('data-highlighted')).toBe(true);

      pressKey(monthCell(r, 6), 'ArrowLeft');
      await flush(r.fixture);

      expect(monthCell(r, 6).hasAttribute('data-highlighted')).toBe(true);
      expect(trigger(r).textContent!.trim()).toBe(String(2026));
    });

    it('clamps flat year-grid moves so focus never leaves [min, max] (#1150)', async () => {
      const r = renderHost(CalendarViewsHost);
      r.instance.min.set(new Date(2026, 0, 1));
      r.instance.view.set('year');
      await flush(r.fixture);
      expect(yearCell(r, 2026).hasAttribute('data-highlighted')).toBe(true);

      pressKey(yearCell(r, 2026), 'ArrowLeft');
      await flush(r.fixture);

      expect(yearCell(r, 2026).hasAttribute('data-highlighted')).toBe(true);
    });

    it('clicking a month cell drills to day view and shows that month, value unchanged', async () => {
      const r = renderHost(CalendarViewsHost);
      r.instance.view.set('month');
      await flush(r.fixture);

      click(monthCell(r, 3));
      await flush(r.fixture);

      expect(viewRoot(r).getAttribute('data-view')).toBe('day');
      expect(r.instance.value()!.getMonth() + 1).toBe(6);
      expect(r.query('[data-testid^="cell-2026-3-"]')).toBeTruthy();
    });

    it('Enter on a month cell drills to day view', async () => {
      const r = renderHost(CalendarViewsHost);
      r.instance.view.set('month');
      await flush(r.fixture);

      pressKey(monthCell(r, 4), 'Enter');
      await flush(r.fixture);

      expect(viewRoot(r).getAttribute('data-view')).toBe('day');
    });

    it('year grid has data-view="year" and yearBlockSize cells (default 12)', async () => {
      const r = renderHost(CalendarViewsHost);
      r.instance.view.set('year');
      await flush(r.fixture);

      const grid = r.query('[forCalendarYearGrid]')!;
      expect(grid.getAttribute('data-view')).toBe('year');
      expect(r.queryAll('[forCalendarYearCell]').length).toBe(12);
    });

    it('year block is aligned: first cell = floor(visibleYear/12)*12', async () => {
      const r = renderHost(CalendarViewsHost);
      r.instance.view.set('year');
      await flush(r.fixture);

      const blockStart = Math.floor(2026 / 12) * 12;
      expect(r.queryAll('[forCalendarYearCell]')[0]!.getAttribute('data-testid')).toBe(
        `year-cell-${blockStart}`,
      );
    });

    it('highlighted year cell is the visible year', async () => {
      const r = renderHost(CalendarViewsHost);
      r.instance.view.set('year');
      await flush(r.fixture);

      const highlighted = r.queryAll('[forCalendarYearCell][data-highlighted]');
      expect(highlighted.length).toBe(1);
      expect(highlighted[0]).toBe(yearCell(r, 2026));
    });

    it('clicking a year cell drills to month view', async () => {
      const r = renderHost(CalendarViewsHost);
      r.instance.view.set('year');
      await flush(r.fixture);

      click(yearCell(r, 2025));
      await flush(r.fixture);

      expect(viewRoot(r).getAttribute('data-view')).toBe('month');
      expect(trigger(r).textContent!.trim()).toBe(String(2025));
    });

    it('next button in month view pages by year', async () => {
      const r = renderHost(CalendarViewsHost);
      r.instance.view.set('month');
      await flush(r.fixture);

      click(nextBtn(r));
      await flush(r.fixture);

      expect(trigger(r).textContent!.trim()).toBe(String(2027));
    });

    it('next button in year view pages by a block', async () => {
      const r = renderHost(CalendarViewsHost);
      r.instance.view.set('year');
      await flush(r.fixture);

      const blockStart = Math.floor(2026 / 12) * 12;
      click(nextBtn(r));
      await flush(r.fixture);

      const firstCell = r.queryAll('[forCalendarYearCell]')[0]!;
      expect(firstCell.getAttribute('data-testid')).toBe(`year-cell-${blockStart + 12}`);
    });

    it('prev button in month view pages backward by year', async () => {
      const r = renderHost(CalendarViewsHost);
      r.instance.view.set('month');
      await flush(r.fixture);

      click(prevBtn(r));
      await flush(r.fixture);

      expect(trigger(r).textContent!.trim()).toBe(String(2025));
    });

    it('out-of-bounds month cell reflects data-disabled + aria-disabled, click is no-op', async () => {
      const r = renderHost(CalendarViewsHost);
      r.instance.min.set(new Date(2026, 5, 1));
      r.instance.max.set(new Date(2026, 9, 31));
      r.instance.view.set('month');
      await flush(r.fixture);

      const disabled = monthCell(r, 1);
      expect(disabled.getAttribute('aria-disabled')).toBe('true');
      expect(disabled.hasAttribute('data-disabled')).toBe(true);

      const viewBefore = r.instance.view();
      click(disabled);
      await flush(r.fixture);
      expect(r.instance.view()).toBe(viewBefore);
    });

    it('out-of-bounds year cell reflects data-disabled + aria-disabled, click is no-op', async () => {
      const r = renderHost(CalendarViewsHost);
      r.instance.min.set(new Date(2026, 0, 1));
      r.instance.max.set(new Date(2027, 11, 31));
      r.instance.view.set('year');
      await flush(r.fixture);

      const blockStart = Math.floor(2026 / 12) * 12;
      const disabledYear = yearCell(r, blockStart);
      expect(disabledYear.getAttribute('aria-disabled')).toBe('true');

      click(disabledYear);
      await flush(r.fixture);
      expect(r.instance.view()).toBe('year');
    });

    it('prev button disabled at view bound (month view, all previous years out-of-bounds)', async () => {
      const r = renderHost(CalendarViewsHost);
      r.instance.min.set(new Date(2026, 0, 1));
      r.instance.view.set('month');
      await flush(r.fixture);

      expect(prevBtn(r).getAttribute('aria-disabled')).toBe('true');
    });

    it('next button disabled at view bound (year view, next block out-of-bounds)', async () => {
      const r = renderHost(CalendarViewsHost);
      const blockStart = Math.floor(2026 / 12) * 12;
      r.instance.max.set(new Date(blockStart + 11, 11, 31));
      r.instance.view.set('year');
      await flush(r.fixture);

      expect(nextBtn(r).getAttribute('aria-disabled')).toBe('true');
    });

    it('focusActiveCell in month view focuses the highlighted month cell', async () => {
      const r = renderHost(CalendarViewsHost);
      r.instance.view.set('month');
      await flush(r.fixture);

      const moved = r.instance.calendar().focusActiveCell();
      expect(moved).toBe(true);
      expect(document.activeElement).toBe(monthCell(r, 6));
    });

    it('focusActiveCell in year view focuses the highlighted year cell', async () => {
      const r = renderHost(CalendarViewsHost);
      r.instance.view.set('year');
      await flush(r.fixture);

      const moved = r.instance.calendar().focusActiveCell();
      expect(moved).toBe(true);
      expect(document.activeElement).toBe(yearCell(r, 2026));
    });

    it('focus moves to the active cell after a view switch via the trigger', async () => {
      const r = renderHost(CalendarViewsHost);

      click(trigger(r));
      await flush(r.fixture);

      expect(document.activeElement).toBe(monthCell(r, 6));
    });

    describe('zoneless', () => {
      it('cycleView renders month grid and roving cell under provideZonelessChangeDetection', async () => {
        const fixture = TestBed.configureTestingModule({
          providers: [provideZonelessChangeDetection()],
          imports: [CalendarViewsHost],
        }).createComponent(CalendarViewsHost);
        fixture.detectChanges();
        await flush(fixture);

        click(fixture.nativeElement.querySelector('[data-testid="view-trigger"]')!);
        fixture.detectChanges();
        await flush(fixture);

        expect(fixture.nativeElement.querySelector('[forCalendarMonthGrid]')).toBeTruthy();
        expect(
          fixture.nativeElement.querySelectorAll('[forCalendarMonthCell][tabindex="0"]').length,
        ).toBe(1);
      });
    });
  });
});

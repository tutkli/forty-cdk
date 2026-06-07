import { Component, signal, viewChild } from '@angular/core';
import { CalendarDate, CalendarDateTime } from '@internationalized/date';

import { flush, pressKey, renderHost, type RenderResult } from '../../test-utils';
import { buildMonthMatrix } from './build-month-matrix';
import { compareDateOf, type DateAdapter } from './date-adapter';
import { ForCalendar } from './calendar';
import { ForCalendarCell } from './calendar-cell';
import { ForCalendarGrid } from './calendar-grid';
import { ForCalendarGridHeader } from './calendar-grid-header';
import { ForCalendarHeading } from './calendar-heading';
import { ForCalendarNextButton } from './calendar-next-button';
import { ForCalendarPrevButton } from './calendar-prev-button';
import type { CalendarDateLabelFormatter } from './calendar-context';
import {
  InternationalizedDateAdapter,
  provideInternationalizedDateAdapter,
} from './internationalized-date-adapter';
import {
  InternationalizedDateTimeAdapter,
  provideInternationalizedDateTimeAdapter,
} from './internationalized-date-time-adapter';
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
                <td
                  forCalendarCell
                  [date]="cell.date"
                  [attr.data-testid]="'cell-' + cell.key"
                ></td>
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
                <td
                  forCalendarCell
                  [date]="cell.date"
                  [attr.data-testid]="'cell-' + cell.key"
                ></td>
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

const root = (r: RenderResult<unknown>) => r.query('[forCalendar]')!;
const cell = (r: RenderResult<unknown>, date: Date) => r.query(`[data-testid="cell-${keyOf(date)}"]`)!;
const tabbableCells = (r: RenderResult<unknown>) =>
  r.queryAll('[role="gridcell"][tabindex="0"]');
const focusedCell = (r: RenderResult<unknown>) => tabbableCells(r)[0]!;

const JUN_15 = new Date(2026, 5, 15);

describe('ForCalendar', () => {
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

      const sameDay = compareDateOf(native, new Date(2026, 5, 20, 0, 0), new Date(2026, 5, 20, 23, 0));
      expect(sameDay).toBe(0);

      const earlierDay = compareDateOf(native, new Date(2026, 5, 19, 23, 0), new Date(2026, 5, 20, 0, 0));
      expect(earlierDay).toBeLessThan(0);
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
});

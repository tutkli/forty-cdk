import { Component, signal } from '@angular/core';

import { NativeDateAdapter, provideNativeDateAdapter } from 'forty-cdk/date-adapter';
import { ForDateField, ForDateFieldLiteral, ForDateFieldSegment } from 'forty-cdk/date-field';
import { pressKey } from 'forty-cdk/testing';
import { ForTimeField, ForTimeFieldLiteral, ForTimeFieldSegment } from 'forty-cdk/time-field';
import { flush, renderHost } from '../../src/test-utils';
import { ForCalendar } from './calendar';
import { ForCalendarCell } from './calendar-cell';
import type { CalendarView } from './calendar-context';
import { ForCalendarGrid } from './calendar-grid';
import { ForCalendarHeading } from './calendar-heading';
import { ForCalendarYearCell } from './calendar-year-cell';
import { ForCalendarYearGrid } from './calendar-year-grid';
import { ForCalendarYearSelect } from './calendar-year-select';

const adapter = new NativeDateAdapter();
const ARABIC_INDIC = /[٠-٩]/;
const LATIN = /[0-9]/;

@Component({
  imports: [
    ForCalendar,
    ForCalendarHeading,
    ForCalendarGrid,
    ForCalendarCell,
    ForCalendarYearGrid,
    ForCalendarYearCell,
    ForCalendarYearSelect,
  ],
  providers: [...provideNativeDateAdapter()],
  host: { 'data-fixture': 'numerals-calendar' },
  template: `
    <div forCalendar [(value)]="value" [(view)]="view" [locale]="'ar-EG'">
      <h2 forCalendarHeading #heading="forCalendarHeading" data-testid="heading">
        {{ heading.label() }}
      </h2>
      <select forCalendarYearSelect #y="forCalendarYearSelect" [minYear]="2026" [maxYear]="2026">
        @for (opt of y.years(); track opt.value) {
          <option [value]="opt.value" data-testid="year-option">{{ opt.label }}</option>
        }
      </select>
      @if (view() === 'day') {
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
      } @else if (view() === 'year') {
        <table forCalendarYearGrid #years="forCalendarYearGrid">
          <tbody>
            @for (row of years.rows(); track row.key) {
              <tr>
                @for (yr of row.years; track yr.value) {
                  <td forCalendarYearCell [year]="yr.value" [attr.data-testid]="'year-' + yr.value">
                    {{ yr.label }}
                  </td>
                }
              </tr>
            }
          </tbody>
        </table>
      }
    </div>
  `,
})
class CalendarHost {
  readonly value = signal<Date | null>(new Date(2026, 10, 5));
  readonly view = signal<CalendarView>('day');
}

@Component({
  imports: [ForDateField, ForDateFieldSegment, ForDateFieldLiteral],
  providers: [...provideNativeDateAdapter()],
  host: { 'data-fixture': 'numerals-date-field' },
  template: `
    <div forDateField [(value)]="value" [locale]="'ar-EG'" ariaLabel="Date" #field="forDateField">
      @for (seg of field.segments(); track seg.id) {
        @if (seg.isLiteral) {
          <span forDateFieldLiteral>{{ seg.text }}</span>
        } @else {
          <span forDateFieldSegment [segment]="seg.type!" [attr.data-testid]="seg.type">{{
            seg.text
          }}</span>
        }
      }
    </div>
  `,
})
class DateFieldHost {
  readonly value = signal<Date | null>(new Date(2026, 10, 5));
}

@Component({
  imports: [ForTimeField, ForTimeFieldSegment, ForTimeFieldLiteral],
  providers: [...provideNativeDateAdapter()],
  host: { 'data-fixture': 'numerals-time-field' },
  template: `
    <div
      forTimeField
      [(value)]="value"
      [locale]="'ar-EG'"
      [hourCycle]="24"
      ariaLabel="Time"
      #field="forTimeField"
    >
      @for (seg of field.segments(); track seg.id) {
        @if (seg.isLiteral) {
          <span forTimeFieldLiteral>{{ seg.text }}</span>
        } @else {
          <span forTimeFieldSegment [segment]="seg.type!" [attr.data-testid]="seg.type">{{
            seg.text
          }}</span>
        }
      }
    </div>
  `,
})
class TimeFieldHost {
  readonly value = signal<Date | null>(new Date(2026, 10, 5, 10, 30));
}

function text(r: { query(selector: string): Element | null }, testid: string): string {
  return r.query(`[data-testid="${testid}"]`)!.textContent!.trim();
}

describe('locale numerals parity', () => {
  it('precondition: the adapter renders ar-EG with Arabic-Indic digits', () => {
    const heading = adapter.format(
      new Date(2026, 10, 1),
      { month: 'long', year: 'numeric' },
      'ar-EG',
    );

    expect(ARABIC_INDIC.test(heading), heading).toBe(true);
  });

  it('numbers the calendar day cells in the same numbering system as the heading', async () => {
    const r = renderHost(CalendarHost);
    await flush(r.fixture);

    expect(ARABIC_INDIC.test(text(r, 'heading'))).toBe(true);
    expect(text(r, 'cell-2026-11-5')).toBe('٥');
    expect(text(r, 'cell-2026-11-30')).toBe('٣٠');
  });

  it('renders the month and year view headings, the year cells and the year options in locale digits', async () => {
    const r = renderHost(CalendarHost);
    await flush(r.fixture);
    expect(text(r, 'year-option')).toBe('٢٠٢٦');

    r.fixture.componentInstance.view.set('month');
    await flush(r.fixture);
    expect(text(r, 'heading')).toBe('٢٠٢٦');

    r.fixture.componentInstance.view.set('year');
    await flush(r.fixture);
    expect(LATIN.test(text(r, 'heading')), text(r, 'heading')).toBe(false);
    expect(text(r, 'heading')).toMatch(/^[٠-٩]{4} – [٠-٩]{4}$/);
    expect(text(r, 'year-2026')).toBe('٢٠٢٦');
  });

  it('renders date field segments in the numbering system the adapter formats with', async () => {
    const r = renderHost(DateFieldHost);
    await flush(r.fixture);

    expect([text(r, 'day'), text(r, 'month'), text(r, 'year')]).toEqual(['٠٥', '١١', '٢٠٢٦']);
    expect(r.query('[data-testid="year"]')!.getAttribute('aria-valuenow')).toBe('2026');
  });

  it('renders time field segments in locale digits while keeping a Latin aria-valuenow', async () => {
    const r = renderHost(TimeFieldHost);
    await flush(r.fixture);

    expect([text(r, 'hour'), text(r, 'minute')]).toEqual(['١٠', '٣٠']);
    expect(r.query('[data-testid="minute"]')!.getAttribute('aria-valuenow')).toBe('30');
  });

  it('accepts Latin and locale digits as input, and echoes either in locale digits', async () => {
    const r = renderHost(DateFieldHost);
    await flush(r.fixture);
    const day = r.query<HTMLElement>('[data-testid="day"]')!;

    day.focus();
    pressKey(day, '1');
    await flush(r.fixture);
    expect(text(r, 'day')).toBe('١');

    pressKey(day, '٢');
    await flush(r.fixture);
    expect(r.fixture.componentInstance.value()!.getDate()).toBe(12);
    expect(text(r, 'day')).toBe('١٢');
  });
});

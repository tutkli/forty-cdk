import { Component, signal } from '@angular/core';

import { NativeDateAdapter, provideNativeDateAdapter } from 'forty-cdk/date-adapter';
import { ForDateField, ForDateFieldLiteral, ForDateFieldSegment } from 'forty-cdk/date-field';
import { flush, renderHost } from '../../src/test-utils';
import { ForCalendar } from './calendar';
import type { CalendarView } from './calendar-context';
import { ForCalendarHeading } from './calendar-heading';
import { ForCalendarMonthCell } from './calendar-month-cell';
import { ForCalendarMonthGrid } from './calendar-month-grid';

const NOVEMBER = new Date(2026, 10, 15);

function gregorian(locale: string, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat(locale, { ...options, calendar: 'gregory' }).format(NOVEMBER);
}

@Component({
  imports: [ForCalendar, ForCalendarHeading, ForCalendarMonthGrid, ForCalendarMonthCell],
  providers: [...provideNativeDateAdapter()],
  host: { 'data-fixture': 'gregorian-calendar' },
  template: `
    <div forCalendar [(value)]="value" [(view)]="view" [locale]="locale()">
      <h2 forCalendarHeading #heading="forCalendarHeading" data-testid="heading">
        {{ heading.label() }}
      </h2>
      @if (view() === 'month') {
        <table forCalendarMonthGrid #grid="forCalendarMonthGrid">
          <tbody>
            @for (row of grid.rows(); track row.key) {
              <tr>
                @for (m of row.months; track m.value) {
                  <td
                    forCalendarMonthCell
                    [month]="m.value"
                    [attr.data-testid]="'month-' + m.value"
                  >
                    {{ m.label }}
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
  readonly value = signal<Date | null>(NOVEMBER);
  readonly view = signal<CalendarView>('day');
  readonly locale = signal<string | null>('th-TH');
}

@Component({
  imports: [ForDateField, ForDateFieldSegment, ForDateFieldLiteral],
  providers: [...provideNativeDateAdapter()],
  host: { 'data-fixture': 'gregorian-date-field' },
  template: `
    <div forDateField [(value)]="value" [locale]="locale()" ariaLabel="Date" #field="forDateField">
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
class FieldHost {
  readonly value = signal<Date | null>(NOVEMBER);
  readonly locale = signal('fa-IR');
}

function text(r: { query(selector: string): Element | null }, testid: string): string {
  return r.query(`[data-testid="${testid}"]`)!.textContent!.trim();
}

describe('Gregorian formatting under locales whose default calendar is not Gregorian', () => {
  it('precondition: th-TH and fa-IR do not default to the Gregorian calendar', () => {
    for (const locale of ['th-TH', 'fa-IR']) {
      expect(new Intl.DateTimeFormat(locale).resolvedOptions().calendar, locale).not.toBe(
        'gregory',
      );
    }
  });

  it('names the Gregorian month from NativeDateAdapter.format under fa-IR', () => {
    const adapter = new NativeDateAdapter();

    expect(adapter.format(NOVEMBER, { month: 'long' }, 'fa-IR')).toBe(
      gregorian('fa-IR', { month: 'long' }),
    );
  });

  it('agrees on the Gregorian year across the day, month and year view headings under th-TH', async () => {
    const r = renderHost(CalendarHost);
    await flush(r.fixture);

    expect(text(r, 'heading')).toBe(gregorian('th-TH', { month: 'long', year: 'numeric' }));
    expect(text(r, 'heading')).toContain('2026');

    r.fixture.componentInstance.view.set('month');
    await flush(r.fixture);
    expect(text(r, 'heading')).toBe('2026');

    r.fixture.componentInstance.view.set('year');
    await flush(r.fixture);
    expect(text(r, 'heading')).toMatch(/^\d{4} – \d{4}$/);
    const [start, end] = text(r, 'heading').split(' – ').map(Number);
    expect(start! <= 2026 && 2026 <= end!).toBe(true);
  });

  it('lists Gregorian month names in the month picker under fa-IR and ar-SA', async () => {
    const r = renderHost(CalendarHost);
    r.fixture.componentInstance.view.set('month');
    for (const locale of ['fa-IR', 'ar-SA']) {
      r.fixture.componentInstance.locale.set(locale);
      await flush(r.fixture);

      expect(text(r, 'month-11'), locale).toBe(gregorian(locale, { month: 'long' }));
    }
  });

  it('announces the Gregorian month name on a date field month segment under fa-IR', async () => {
    const r = renderHost(FieldHost);
    await flush(r.fixture);

    expect(r.query('[data-testid="month"]')!.getAttribute('aria-valuetext')).toBe(
      gregorian('fa-IR', { month: 'long' }),
    );
    expect(text(r, 'year')).toBe(gregorian('fa-IR', { year: 'numeric' }));
  });
});

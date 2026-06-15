import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
  ForCalendar,
  ForCalendarCell,
  ForCalendarGrid,
  ForCalendarGridHeader,
  ForCalendarHeading,
  ForCalendarMonthCell,
  ForCalendarMonthGrid,
  ForCalendarMonthSelect,
  ForCalendarNextButton,
  ForCalendarPrevButton,
  ForCalendarViewTrigger,
  ForCalendarYearCell,
  ForCalendarYearGrid,
  ForCalendarYearSelect,
  provideNativeDateAdapter,
  type CalendarDateRange,
} from 'forty-cdk';

import { queryFlag } from './_query-flag';

@Component({
  selector: 'app-calendar-fixture',
  changeDetection: ChangeDetectionStrategy.OnPush,
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
    ForCalendarMonthSelect,
    ForCalendarYearSelect,
  ],
  providers: [...provideNativeDateAdapter()],
  template: `
    <input data-testid="before" placeholder="before-calendar" />

    @if (isViews) {
      <div forCalendar [(value)]="value" #cal="forCalendar">
        <header>
          <button forCalendarPrevButton [ariaLabel]="'Previous'" data-testid="prev">‹</button>
          <button forCalendarViewTrigger #vt="forCalendarViewTrigger" data-testid="view-trigger">
            {{ vt.label() }}
          </button>
          <button forCalendarNextButton [ariaLabel]="'Next'" data-testid="next">›</button>
          <h2 forCalendarHeading #heading="forCalendarHeading" data-testid="heading">
            {{ heading.label() }}
          </h2>
        </header>
        @switch (cal.view()) {
          @case ('day') {
            <table forCalendarGrid #grid="forCalendarGrid">
              <thead forCalendarGridHeader>
                <tr>
                  @for (day of grid.weekDays(); track day.key) {
                    <th scope="col" [attr.aria-label]="day.long">{{ day.short }}</th>
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
    } @else if (isDropdowns) {
      <div forCalendar [(value)]="dropdownValue" [min]="dropdownMin" [max]="dropdownMax" [dir]="dir">
        <header>
          <button forCalendarPrevButton [ariaLabel]="'Previous month'" data-testid="prev">‹</button>
          <select forCalendarMonthSelect #m="forCalendarMonthSelect" data-testid="month-select">
            @for (opt of m.options(); track opt.value) {
              <option [value]="opt.value" [disabled]="opt.disabled" [attr.data-testid]="'month-opt-' + opt.value">
                {{ opt.label }}
              </option>
            }
          </select>
          <select forCalendarYearSelect #y="forCalendarYearSelect" [minYear]="2024" [maxYear]="2028" data-testid="year-select">
            @for (opt of y.years(); track opt.value) {
              <option [value]="opt.value" [disabled]="opt.disabled" [attr.data-testid]="'year-opt-' + opt.value">
                {{ opt.value }}
              </option>
            }
          </select>
          <button forCalendarNextButton [ariaLabel]="'Next month'" data-testid="next">›</button>
          <h2 forCalendarHeading #heading="forCalendarHeading" data-testid="heading">{{ heading.label() }}</h2>
        </header>

        <table forCalendarGrid #grid="forCalendarGrid">
          <thead forCalendarGridHeader>
            <tr>
              @for (day of grid.weekDays(); track day.key) {
                <th scope="col" [attr.aria-label]="day.long">{{ day.short }}</th>
              }
            </tr>
          </thead>
          <tbody>
            @for (week of grid.weeks(); track week.key) {
              <tr>
                @for (c of week.days; track c.key) {
                  <td forCalendarCell [date]="c.date" [attr.data-testid]="'cell-' + c.key">{{ c.label }}</td>
                }
              </tr>
            }
          </tbody>
        </table>
      </div>
    } @else if (isRange) {
      <div forCalendar selectionMode="range" [(range)]="range" [dir]="dir">
        <header>
          <button forCalendarPrevButton [ariaLabel]="'Previous month'" data-testid="prev">‹</button>
          <h2 forCalendarHeading #heading="forCalendarHeading" data-testid="heading">
            {{ heading.label() }}
          </h2>
          <button forCalendarNextButton [ariaLabel]="'Next month'" data-testid="next">›</button>
        </header>

        <table forCalendarGrid #grid="forCalendarGrid">
          <thead forCalendarGridHeader>
            <tr>
              @for (day of grid.weekDays(); track day.key) {
                <th scope="col" [attr.aria-label]="day.long">{{ day.short }}</th>
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
      </div>
    } @else {
      <div forCalendar [(value)]="value" [dir]="dir">
        <header>
          <button forCalendarPrevButton [ariaLabel]="'Previous month'" data-testid="prev">‹</button>
          <h2 forCalendarHeading #heading="forCalendarHeading" data-testid="heading">
            {{ heading.label() }}
          </h2>
          <button forCalendarNextButton [ariaLabel]="'Next month'" data-testid="next">›</button>
        </header>

        <table forCalendarGrid #grid="forCalendarGrid">
          <thead forCalendarGridHeader>
            <tr>
              @for (day of grid.weekDays(); track day.key) {
                <th scope="col" [attr.aria-label]="day.long">{{ day.short }}</th>
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
      </div>
    }

    <input data-testid="after" placeholder="after-calendar" />
  `,
})
export class CalendarFixture {
  protected readonly value = signal<Date | null>(new Date(2026, 5, 15));
  protected readonly range = signal<CalendarDateRange<Date> | null>({
    start: new Date(2026, 5, 10),
    end: new Date(2026, 5, 15),
  });
  protected readonly dropdownValue = signal<Date | null>(new Date(2026, 5, 15));
  protected readonly dropdownMin = new Date(2026, 1, 1);
  protected readonly dropdownMax = new Date(2027, 10, 30);
  protected readonly dir: 'ltr' | 'rtl' = queryFlag('rtl') ? 'rtl' : 'ltr';
  protected readonly isRange = queryFlag('range');
  protected readonly isDropdowns = queryFlag('dropdowns');
  protected readonly isViews = queryFlag('views');
}

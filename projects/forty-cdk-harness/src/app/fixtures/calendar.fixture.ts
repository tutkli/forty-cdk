import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
  ForCalendar,
  ForCalendarCell,
  ForCalendarGrid,
  ForCalendarGridHeader,
  ForCalendarHeading,
  ForCalendarNextButton,
  ForCalendarPrevButton,
  provideNativeDateAdapter,
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
  ],
  providers: [...provideNativeDateAdapter()],
  template: `
    <input data-testid="before" placeholder="before-calendar" />

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

    <input data-testid="after" placeholder="after-calendar" />
  `,
})
export class CalendarFixture {
  protected readonly value = signal<Date | null>(new Date(2026, 5, 15));
  protected readonly dir: 'ltr' | 'rtl' = queryFlag('rtl') ? 'rtl' : 'ltr';
}

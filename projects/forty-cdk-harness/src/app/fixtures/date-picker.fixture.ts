import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
  ForCalendar,
  ForCalendarCell,
  ForCalendarGrid,
  ForCalendarGridHeader,
  ForCalendarHeading,
  ForCalendarNextButton,
  ForCalendarPrevButton,
  ForDatePicker,
  ForDatePickerContent,
  ForDatePickerTrigger,
  ForDatePickerValue,
  provideNativeDateAdapter,
  type CalendarDateRange,
  type VetoableEvent,
} from 'forty-cdk';

import { queryFlag } from './_query-flag';

@Component({
  selector: 'app-date-picker-fixture',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ForDatePicker,
    ForDatePickerTrigger,
    ForDatePickerValue,
    ForDatePickerContent,
    ForCalendar,
    ForCalendarHeading,
    ForCalendarPrevButton,
    ForCalendarNextButton,
    ForCalendarGrid,
    ForCalendarGridHeader,
    ForCalendarCell,
  ],
  providers: [...provideNativeDateAdapter()],
  styles: [
    `
      [forDatePickerContent] {
        background: white;
        border: 1px solid #ccc;
        padding: 8px;
      }
      [forCalendarCell] {
        cursor: pointer;
      }
    `,
  ],
  template: `
    <input data-testid="before" placeholder="before-trigger" />

    @if (isRange) {
      <div
        forDatePicker
        selectionMode="range"
        [(range)]="range"
        [(open)]="open"
        [ariaLabel]="'Choose date range'"
      >
        <button data-testid="trigger" forDatePickerTrigger>
          <span forDatePickerValue [placeholder]="'Pick a range'"></span>
        </button>

        @if (open()) {
          <div forDatePickerContent data-testid="content">
            <div forCalendar selectionMode="range" [(range)]="range">
              <header>
                <button forCalendarPrevButton [ariaLabel]="'Previous month'" data-testid="prev">
                  ‹
                </button>
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
          </div>
        }
      </div>
    } @else {
      <div
        forDatePicker
        [(value)]="value"
        [(open)]="open"
        [modal]="modal"
        [closeOnSelect]="closeOnSelect"
        [dir]="dir"
        [ariaLabel]="'Choose date'"
        (autoFocusOnOpen)="onAutoOpen($event)"
        (autoFocusOnClose)="onAutoClose($event)"
      >
        <button data-testid="trigger" forDatePickerTrigger>
          <span forDatePickerValue [placeholder]="'Pick a date'"></span>
        </button>

        @if (open()) {
          <div forDatePickerContent data-testid="content">
            <div forCalendar [(value)]="value" [dir]="dir">
              <header>
                <button forCalendarPrevButton [ariaLabel]="'Previous month'" data-testid="prev">
                  ‹
                </button>
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
          </div>
        }
      </div>
    }

    <input data-testid="after" placeholder="after-trigger" />
  `,
})
export class DatePickerFixture {
  protected readonly value = signal<Date | null>(new Date(2026, 5, 15));
  protected readonly range = signal<CalendarDateRange<Date> | null>({
    start: new Date(2026, 5, 10),
    end: new Date(2026, 5, 15),
  });
  protected readonly open = signal(false);
  protected readonly modal = queryFlag('modal');
  protected readonly closeOnSelect = !queryFlag('noClose');
  protected readonly dir: 'ltr' | 'rtl' = queryFlag('rtl') ? 'rtl' : 'ltr';
  protected readonly isRange = queryFlag('range');

  private readonly vetoOpen = queryFlag('vetoOpen');
  private readonly vetoClose = queryFlag('vetoClose');

  protected onAutoOpen(event: VetoableEvent): void {
    if (this.vetoOpen) event.preventDefault();
  }

  protected onAutoClose(event: VetoableEvent): void {
    if (this.vetoClose) event.preventDefault();
  }
}

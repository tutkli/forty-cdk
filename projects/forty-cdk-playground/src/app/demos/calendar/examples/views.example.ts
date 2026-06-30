import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { CalendarDate, getLocalTimeZone, today } from '@internationalized/date';
import {
  ForCalendar,
  ForCalendarCell,
  ForCalendarGrid,
  ForCalendarGridHeader,
  ForCalendarHeading,
  ForCalendarMonthCell,
  ForCalendarMonthGrid,
  ForCalendarNextButton,
  ForCalendarPrevButton,
  ForCalendarViewTrigger,
  ForCalendarYearCell,
  ForCalendarYearGrid,
} from 'forty-cdk/calendar';
import { provideInternationalizedDateAdapter } from 'forty-cdk/internationalized-date';

@Component({
  selector: 'app-calendar-view-switching-example',
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
  ],
  providers: [...provideInternationalizedDateAdapter()],
  template: `
    <div
      forCalendar
      class="calendar"
      [(value)]="value"
      [min]="min"
      [max]="max"
      [yearBlockSize]="12"
      #cal="forCalendar"
    >
      <header class="calendar-header">
        <button forCalendarPrevButton class="calendar-nav" [ariaLabel]="'Previous'">‹</button>
        <button
          forCalendarViewTrigger
          #vt="forCalendarViewTrigger"
          class="calendar-title calendar-view-btn"
        >
          {{ vt.label() }}
        </button>
        <button forCalendarNextButton class="calendar-nav" [ariaLabel]="'Next'">›</button>
        <h2 forCalendarHeading #heading="forCalendarHeading" class="calendar-sr-only">
          {{ heading.label() }}
        </h2>
      </header>

      @switch (cal.view()) {
        @case ('day') {
          <table forCalendarGrid #grid="forCalendarGrid" class="calendar-grid">
            <thead forCalendarGridHeader>
              <tr>
                @for (day of grid.weekDays(); track day.key) {
                  <th scope="col" class="calendar-weekday" [attr.aria-label]="day.long">
                    {{ day.narrow }}
                  </th>
                }
              </tr>
            </thead>
            <tbody>
              @for (week of grid.weeks(); track week.key) {
                <tr>
                  @for (cell of week.days; track cell.key) {
                    <td forCalendarCell class="calendar-cell" [date]="cell.date">
                      {{ cell.label }}
                    </td>
                  }
                </tr>
              }
            </tbody>
          </table>
        }
        @case ('month') {
          <table forCalendarMonthGrid #mg="forCalendarMonthGrid" class="calendar-grid">
            <tbody>
              @for (row of mg.rows(); track row.key) {
                <tr>
                  @for (m of row.months; track m.value) {
                    <td
                      forCalendarMonthCell
                      [month]="m.value"
                      class="calendar-cell calendar-cell--pick"
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
          <table forCalendarYearGrid #yg="forCalendarYearGrid" class="calendar-grid">
            <tbody>
              @for (row of yg.rows(); track row.key) {
                <tr>
                  @for (y of row.years; track y.value) {
                    <td
                      forCalendarYearCell
                      [year]="y.value"
                      class="calendar-cell calendar-cell--pick"
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
  styles: `
    :host {
      display: contents;
    }

    .calendar {
      width: 280px;
      padding: 1rem;
      background: var(--pg-surface);
      border: 1px solid var(--pg-border);
      border-radius: var(--pg-radius);
    }

    .calendar-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
      margin-bottom: 0.75rem;
    }

    .calendar-view-btn {
      flex: 1 1 auto;
      min-width: 0;
      font-size: 0.95rem;
      font-weight: 600;
      letter-spacing: -0.01em;
      background: transparent;
      border: 1px solid transparent;
      border-radius: var(--pg-radius-sm);
      padding: 0.2rem 0.4rem;
      color: var(--pg-text);
      cursor: pointer;
      transition:
        background 0.15s ease,
        border-color 0.15s ease;
    }

    .calendar-view-btn:hover {
      background: var(--pg-surface-2);
      border-color: var(--pg-border);
    }

    .calendar-nav {
      appearance: none;
      flex: none;
      width: 32px;
      height: 32px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: var(--pg-radius-sm);
      border: 1px solid var(--pg-border-strong);
      background: var(--pg-surface);
      color: var(--pg-text);
      font-size: 1.1rem;
      line-height: 1;
      cursor: pointer;
      transition: background 0.15s ease;
    }

    .calendar-nav:hover:not([disabled]) {
      background: var(--pg-surface-2);
    }

    .calendar-nav[disabled] {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .calendar-sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border-width: 0;
    }

    .calendar-grid {
      width: 100%;
      table-layout: fixed;
      border-collapse: collapse;
    }

    .calendar-weekday {
      padding: 0.35rem 0;
      font-size: 0.68rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--pg-text-muted);
    }

    .calendar-cell {
      height: 36px;
      text-align: center;
      vertical-align: middle;
      font-size: 0.85rem;
      border-radius: var(--pg-radius-sm);
      cursor: pointer;
      user-select: none;
      transition: background 0.12s ease;
    }

    .calendar-cell--pick {
      height: 52px;
      font-size: 0.9rem;
    }

    .calendar-cell:hover:not([aria-disabled]) {
      background: var(--pg-surface-2);
    }

    .calendar-cell[data-today] {
      box-shadow: inset 0 0 0 1px var(--pg-border-strong);
    }

    .calendar-cell[data-selected] {
      background: var(--pg-primary);
      color: var(--pg-primary-contrast);
      font-weight: 600;
    }

    .calendar-cell[data-outside-month] {
      color: var(--pg-text-muted);
      opacity: 0.5;
    }

    .calendar-grid:focus-within .calendar-cell[data-highlighted],
    .calendar-cell:focus-visible {
      outline: 2px solid var(--pg-primary);
      outline-offset: -2px;
    }

    .calendar-cell[aria-disabled] {
      color: var(--pg-text-muted);
      opacity: 0.4;
      cursor: not-allowed;
      text-decoration: line-through;
    }

    @media (prefers-reduced-motion: reduce) {
      .calendar-nav,
      .calendar-view-btn,
      .calendar-cell {
        transition: none;
      }
    }
  `,
})
export class CalendarViewSwitchingExample {
  readonly #todayDate = today(getLocalTimeZone());
  protected readonly value = signal<CalendarDate | null>(this.#todayDate);
  protected readonly min = new CalendarDate(this.#todayDate.year - 1, 4, 1);
  protected readonly max = new CalendarDate(this.#todayDate.year + 1, 9, 30);
}

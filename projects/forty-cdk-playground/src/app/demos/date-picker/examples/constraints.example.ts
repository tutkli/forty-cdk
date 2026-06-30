import { ChangeDetectionStrategy, Component, ViewEncapsulation, signal } from '@angular/core';
import { type CalendarDate, getDayOfWeek, getLocalTimeZone, today } from '@internationalized/date';
import {
  ForCalendar,
  ForCalendarCell,
  ForCalendarGrid,
  ForCalendarGridHeader,
  ForCalendarHeading,
  ForCalendarNextButton,
  ForCalendarPrevButton,
} from 'forty-cdk/calendar';
import {
  ForDatePicker,
  ForDatePickerContent,
  ForDatePickerTrigger,
  ForDatePickerValue,
} from 'forty-cdk/date-picker';
import { provideInternationalizedDateAdapter } from 'forty-cdk/internationalized-date';

@Component({
  selector: 'app-date-picker-constraints-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
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
  providers: [...provideInternationalizedDateAdapter()],
  template: `
    <div
      forDatePicker
      #picker="forDatePicker"
      [(value)]="date"
      [minDate]="minDate"
      [isDateUnavailable]="isWeekendUnavailable"
      placeholder="Book a weekday"
      ariaLabel="Booking date"
    >
      <button forDatePickerTrigger type="button" class="dp-constraints-trigger">
        <span forDatePickerValue class="dp-constraints-value"></span>
        <svg class="dp-constraints-chevron" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="m19.5 8.25-7.5 7.5-7.5-7.5"
            fill="none"
            stroke="currentColor"
            stroke-width="1.75"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>

      @if (picker.open()) {
        <div
          forDatePickerContent
          class="dp-constraints-popover"
          animate.enter="dp-constraints-pop-in"
        >
          <div
            forCalendar
            class="dp-constraints-cal"
            [(value)]="date"
            [min]="minDate"
            [isDateUnavailable]="isWeekendUnavailable"
          >
            <header class="dp-constraints-head">
              <button
                forCalendarPrevButton
                class="dp-constraints-nav"
                [ariaLabel]="'Previous month'"
              >
                ‹
              </button>
              <h2 forCalendarHeading #heading="forCalendarHeading" class="dp-constraints-title">
                {{ heading.label() }}
              </h2>
              <button forCalendarNextButton class="dp-constraints-nav" [ariaLabel]="'Next month'">
                ›
              </button>
            </header>

            <table forCalendarGrid #grid="forCalendarGrid" class="dp-constraints-grid">
              <thead forCalendarGridHeader>
                <tr>
                  @for (day of grid.weekDays(); track day.key) {
                    <th scope="col" class="dp-constraints-weekday" [attr.aria-label]="day.long">
                      {{ day.narrow }}
                    </th>
                  }
                </tr>
              </thead>
              <tbody>
                @for (week of grid.weeks(); track week.key) {
                  <tr>
                    @for (cell of week.days; track cell.key) {
                      <td forCalendarCell class="dp-constraints-cell" [date]="cell.date">
                        {{ cell.label }}
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
  `,
  styles: `
    app-date-picker-constraints-example {
      display: contents;
    }

    .dp-constraints-trigger {
      display: inline-flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      min-width: 14rem;
      font: inherit;
      font-size: 0.9rem;
      padding: 0.55rem 0.75rem;
      border-radius: var(--pg-radius-sm);
      border: 1px solid var(--pg-border-strong);
      background: var(--pg-surface);
      color: var(--pg-text);
      cursor: pointer;
    }

    .dp-constraints-trigger:hover:not([disabled]) {
      background: var(--pg-surface-2);
    }

    .dp-constraints-value[data-placeholder] {
      color: var(--pg-text-muted);
    }

    .dp-constraints-chevron {
      flex: none;
      width: 14px;
      height: 14px;
      color: var(--pg-text-muted);
      transition: transform 0.15s ease;
    }

    .dp-constraints-trigger[aria-expanded='true'] .dp-constraints-chevron {
      transform: rotate(180deg);
    }

    .dp-constraints-popover {
      z-index: 60;
      width: min(280px, calc(100vw - 1.5rem));
      padding: 0.85rem;
      background: var(--pg-surface);
      color: var(--pg-text);
      border: 1px solid var(--pg-border);
      border-radius: var(--pg-radius);
      box-shadow: var(--pg-shadow);
    }

    .dp-constraints-cal {
      width: 100%;
    }

    .dp-constraints-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
      margin-bottom: 0.6rem;
    }

    .dp-constraints-title {
      margin: 0;
      font-size: 0.9rem;
      font-weight: 600;
      letter-spacing: -0.01em;
    }

    .dp-constraints-nav {
      appearance: none;
      flex: none;
      width: 30px;
      height: 30px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: var(--pg-radius-sm);
      border: 1px solid var(--pg-border-strong);
      background: var(--pg-surface);
      color: var(--pg-text);
      font-size: 1.05rem;
      line-height: 1;
      cursor: pointer;
      transition: background 0.15s ease;
    }

    .dp-constraints-nav:hover:not([disabled]) {
      background: var(--pg-surface-2);
    }

    .dp-constraints-nav[disabled] {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .dp-constraints-grid {
      width: 100%;
      table-layout: fixed;
      border-collapse: collapse;
    }

    .dp-constraints-weekday {
      padding: 0.3rem 0;
      font-size: 0.65rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--pg-text-muted);
    }

    .dp-constraints-cell {
      height: 34px;
      text-align: center;
      vertical-align: middle;
      font-size: 0.82rem;
      border-radius: var(--pg-radius-sm);
      cursor: pointer;
      user-select: none;
      transition: background 0.12s ease;
    }

    .dp-constraints-cell:hover:not([aria-disabled]) {
      background: var(--pg-surface-2);
    }

    .dp-constraints-cell[data-outside-month] {
      color: var(--pg-text-muted);
      opacity: 0.5;
    }

    .dp-constraints-cell[data-today] {
      box-shadow: inset 0 0 0 1px var(--pg-border-strong);
    }

    .dp-constraints-cell[data-selected] {
      background: var(--pg-primary);
      color: var(--pg-primary-contrast);
      font-weight: 600;
    }

    .dp-constraints-grid:focus-within .dp-constraints-cell[data-highlighted],
    .dp-constraints-cell:focus-visible {
      outline: 2px solid var(--pg-primary);
      outline-offset: -2px;
    }

    .dp-constraints-cell[aria-disabled] {
      color: var(--pg-text-muted);
      opacity: 0.4;
      cursor: not-allowed;
      text-decoration: line-through;
    }

    .dp-constraints-pop-in {
      transform-origin: var(--for-content-transform-origin, center);
      animation: dp-constraints-pop-in 0.2s var(--pg-ease-spring) both;
    }

    @keyframes dp-constraints-pop-in {
      from {
        opacity: 0;
        scale: 0.9;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .dp-constraints-chevron,
      .dp-constraints-nav,
      .dp-constraints-cell {
        transition: none;
      }

      .dp-constraints-pop-in {
        animation-duration: 0.01ms;
      }
    }
  `,
})
export class DatePickerConstraintsExample {
  protected readonly date = signal<CalendarDate | null>(null);
  protected readonly minDate = today(getLocalTimeZone());

  protected readonly isWeekendUnavailable = (date: CalendarDate): boolean => {
    const dayOfWeek = getDayOfWeek(date, 'en-US');
    return dayOfWeek === 0 || dayOfWeek === 6;
  };
}

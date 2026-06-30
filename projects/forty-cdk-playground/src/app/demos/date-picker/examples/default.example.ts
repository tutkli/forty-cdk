import { ChangeDetectionStrategy, Component, ViewEncapsulation, signal } from '@angular/core';
import { type CalendarDate } from '@internationalized/date';
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
  selector: 'app-date-picker-default-example',
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
      placeholder="Pick a date"
      ariaLabel="Choose a date"
    >
      <button forDatePickerTrigger type="button" class="date-picker-trigger">
        <span forDatePickerValue class="date-picker-value"></span>
        <svg class="date-picker-chevron" viewBox="0 0 24 24" aria-hidden="true">
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
        <div forDatePickerContent class="date-picker-popover" animate.enter="date-picker-pop-in">
          <div forCalendar class="date-picker-cal" [(value)]="date">
            <header class="date-picker-head">
              <button forCalendarPrevButton class="date-picker-nav" [ariaLabel]="'Previous month'">
                ‹
              </button>
              <h2 forCalendarHeading #heading="forCalendarHeading" class="date-picker-title">
                {{ heading.label() }}
              </h2>
              <button forCalendarNextButton class="date-picker-nav" [ariaLabel]="'Next month'">
                ›
              </button>
            </header>

            <table forCalendarGrid #grid="forCalendarGrid" class="date-picker-grid">
              <thead forCalendarGridHeader>
                <tr>
                  @for (day of grid.weekDays(); track day.key) {
                    <th scope="col" class="date-picker-weekday" [attr.aria-label]="day.long">
                      {{ day.narrow }}
                    </th>
                  }
                </tr>
              </thead>
              <tbody>
                @for (week of grid.weeks(); track week.key) {
                  <tr>
                    @for (cell of week.days; track cell.key) {
                      <td forCalendarCell class="date-picker-cell" [date]="cell.date">
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
    app-date-picker-default-example {
      display: contents;
    }

    .date-picker-trigger {
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

    .date-picker-trigger:hover:not([disabled]) {
      background: var(--pg-surface-2);
    }

    .date-picker-trigger[disabled] {
      opacity: 0.55;
      cursor: not-allowed;
    }

    .date-picker-value[data-placeholder] {
      color: var(--pg-text-muted);
    }

    .date-picker-chevron {
      flex: none;
      width: 14px;
      height: 14px;
      color: var(--pg-text-muted);
      transition: transform 0.15s ease;
    }

    .date-picker-trigger[aria-expanded='true'] .date-picker-chevron {
      transform: rotate(180deg);
    }

    .date-picker-popover {
      z-index: 60;
      width: min(280px, calc(100vw - 1.5rem));
      padding: 0.85rem;
      background: var(--pg-surface);
      color: var(--pg-text);
      border: 1px solid var(--pg-border);
      border-radius: var(--pg-radius);
      box-shadow: var(--pg-shadow);
    }

    .date-picker-cal {
      width: 100%;
    }

    .date-picker-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
      margin-bottom: 0.6rem;
    }

    .date-picker-title {
      margin: 0;
      font-size: 0.9rem;
      font-weight: 600;
      letter-spacing: -0.01em;
    }

    .date-picker-nav {
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

    .date-picker-nav:hover:not([disabled]) {
      background: var(--pg-surface-2);
    }

    .date-picker-nav[disabled] {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .date-picker-grid {
      width: 100%;
      table-layout: fixed;
      border-collapse: collapse;
    }

    .date-picker-weekday {
      padding: 0.3rem 0;
      font-size: 0.65rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--pg-text-muted);
    }

    .date-picker-cell {
      height: 34px;
      text-align: center;
      vertical-align: middle;
      font-size: 0.82rem;
      border-radius: var(--pg-radius-sm);
      cursor: pointer;
      user-select: none;
      transition: background 0.12s ease;
    }

    .date-picker-cell:hover:not([aria-disabled]):not([data-in-range]):not([data-range-preview]) {
      background: var(--pg-surface-2);
    }

    .date-picker-cell[data-outside-month] {
      color: var(--pg-text-muted);
      opacity: 0.5;
    }

    .date-picker-cell[data-today] {
      box-shadow: inset 0 0 0 1px var(--pg-border-strong);
    }

    .date-picker-cell[data-selected] {
      background: var(--pg-primary);
      color: var(--pg-primary-contrast);
      font-weight: 600;
    }

    .date-picker-grid:focus-within .date-picker-cell[data-highlighted],
    .date-picker-cell:focus-visible {
      outline: 2px solid var(--pg-primary);
      outline-offset: -2px;
    }

    .date-picker-cell[aria-disabled] {
      color: var(--pg-text-muted);
      opacity: 0.4;
      cursor: not-allowed;
      text-decoration: line-through;
    }

    .date-picker-pop-in {
      transform-origin: var(--for-content-transform-origin, center);
      animation: date-picker-pop-in 0.2s var(--pg-ease-spring) both;
    }

    @keyframes date-picker-pop-in {
      from {
        opacity: 0;
        scale: 0.9;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .date-picker-chevron,
      .date-picker-nav,
      .date-picker-cell {
        transition: none;
      }

      .date-picker-pop-in {
        animation-duration: 0.01ms;
      }
    }
  `,
})
export class DatePickerDefaultExample {
  protected readonly date = signal<CalendarDate | null>(null);
}

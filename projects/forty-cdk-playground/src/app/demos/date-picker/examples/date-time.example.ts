import { ChangeDetectionStrategy, Component, ViewEncapsulation, signal } from '@angular/core';
import { CalendarDateTime } from '@internationalized/date';
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
import { ForTimeField, ForTimeFieldLiteral, ForTimeFieldSegment } from 'forty-cdk/time-field';
import { provideInternationalizedDateTimeAdapter } from 'forty-cdk/internationalized-date';

@Component({
  selector: 'app-date-picker-date-time-example',
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
    ForTimeField,
    ForTimeFieldSegment,
    ForTimeFieldLiteral,
  ],
  providers: [...provideInternationalizedDateTimeAdapter()],
  template: `
    <div
      forDatePicker
      #picker="forDatePicker"
      [(value)]="value"
      granularity="minute"
      [hourCycle]="hourCycle"
      [minDate]="min"
      [maxDate]="max"
      [formatOptions]="formatOptions"
      placeholder="Pick a date & time"
      ariaLabel="Choose a date and time"
    >
      <button forDatePickerTrigger type="button" class="dp-date-time-trigger">
        <span forDatePickerValue class="dp-date-time-value"></span>
        <svg class="dp-date-time-chevron" viewBox="0 0 24 24" aria-hidden="true">
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
        <div forDatePickerContent class="dp-date-time-popover" animate.enter="dp-date-time-pop-in">
          <div
            forCalendar
            class="dp-date-time-cal"
            [value]="picker.value()"
            [min]="min"
            [max]="max"
          >
            <header class="dp-date-time-head">
              <button forCalendarPrevButton class="dp-date-time-nav" [ariaLabel]="'Previous month'">
                ‹
              </button>
              <h2 forCalendarHeading #heading="forCalendarHeading" class="dp-date-time-title">
                {{ heading.label() }}
              </h2>
              <button forCalendarNextButton class="dp-date-time-nav" [ariaLabel]="'Next month'">
                ›
              </button>
            </header>

            <table forCalendarGrid #grid="forCalendarGrid" class="dp-date-time-grid">
              <thead forCalendarGridHeader>
                <tr>
                  @for (day of grid.weekDays(); track day.key) {
                    <th scope="col" class="dp-date-time-weekday" [attr.aria-label]="day.long">
                      {{ day.narrow }}
                    </th>
                  }
                </tr>
              </thead>
              <tbody>
                @for (week of grid.weeks(); track week.key) {
                  <tr>
                    @for (cell of week.days; track cell.key) {
                      <td forCalendarCell class="dp-date-time-cell" [date]="cell.date">
                        {{ cell.label }}
                      </td>
                    }
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <div class="dp-date-time-time">
            <span class="dp-date-time-time-label">Time</span>
            <div
              forTimeField
              #tf="forTimeField"
              class="dp-date-time-seg-field"
              [value]="picker.value()"
              [hourCycle]="hourCycle"
              ariaLabel="Time"
            >
              @for (seg of tf.segments(); track seg.id) {
                @if (seg.isLiteral) {
                  <span forTimeFieldLiteral class="dp-date-time-seg-literal">{{ seg.text }}</span>
                } @else {
                  <span forTimeFieldSegment class="dp-date-time-seg" [segment]="seg.type!">
                    {{ seg.text }}
                  </span>
                }
              }
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: `
    app-date-picker-date-time-example {
      display: contents;
    }

    .dp-date-time-trigger {
      display: inline-flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      min-width: 16rem;
      font: inherit;
      font-size: 0.9rem;
      padding: 0.55rem 0.75rem;
      border-radius: var(--pg-radius-sm);
      border: 1px solid var(--pg-border-strong);
      background: var(--pg-surface);
      color: var(--pg-text);
      cursor: pointer;
    }

    .dp-date-time-trigger:hover:not([disabled]) {
      background: var(--pg-surface-2);
    }

    .dp-date-time-value[data-placeholder] {
      color: var(--pg-text-muted);
    }

    .dp-date-time-chevron {
      flex: none;
      width: 14px;
      height: 14px;
      color: var(--pg-text-muted);
      transition: transform 0.15s ease;
    }

    .dp-date-time-trigger[aria-expanded='true'] .dp-date-time-chevron {
      transform: rotate(180deg);
    }

    .dp-date-time-popover {
      z-index: 60;
      width: min(280px, calc(100vw - 1.5rem));
      padding: 0.85rem;
      background: var(--pg-surface);
      color: var(--pg-text);
      border: 1px solid var(--pg-border);
      border-radius: var(--pg-radius);
      box-shadow: var(--pg-shadow);
    }

    .dp-date-time-cal {
      width: 100%;
    }

    .dp-date-time-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
      margin-bottom: 0.6rem;
    }

    .dp-date-time-title {
      margin: 0;
      font-size: 0.9rem;
      font-weight: 600;
      letter-spacing: -0.01em;
    }

    .dp-date-time-nav {
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

    .dp-date-time-nav:hover:not([disabled]) {
      background: var(--pg-surface-2);
    }

    .dp-date-time-nav[disabled] {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .dp-date-time-grid {
      width: 100%;
      table-layout: fixed;
      border-collapse: collapse;
    }

    .dp-date-time-weekday {
      padding: 0.3rem 0;
      font-size: 0.65rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--pg-text-muted);
    }

    .dp-date-time-cell {
      height: 34px;
      text-align: center;
      vertical-align: middle;
      font-size: 0.82rem;
      border-radius: var(--pg-radius-sm);
      cursor: pointer;
      user-select: none;
      transition: background 0.12s ease;
    }

    .dp-date-time-cell:hover:not([aria-disabled]) {
      background: var(--pg-surface-2);
    }

    .dp-date-time-cell[data-outside-month] {
      color: var(--pg-text-muted);
      opacity: 0.5;
    }

    .dp-date-time-cell[data-today] {
      box-shadow: inset 0 0 0 1px var(--pg-border-strong);
    }

    .dp-date-time-cell[data-selected] {
      background: var(--pg-primary);
      color: var(--pg-primary-contrast);
      font-weight: 600;
    }

    .dp-date-time-grid:focus-within .dp-date-time-cell[data-highlighted],
    .dp-date-time-cell:focus-visible {
      outline: 2px solid var(--pg-primary);
      outline-offset: -2px;
    }

    .dp-date-time-cell[aria-disabled] {
      color: var(--pg-text-muted);
      opacity: 0.4;
      cursor: not-allowed;
      text-decoration: line-through;
    }

    .dp-date-time-time {
      margin-top: 0.85rem;
      padding-top: 0.85rem;
      border-top: 1px solid var(--pg-border);
      display: flex;
      align-items: center;
      gap: 0.65rem;
    }

    .dp-date-time-time-label {
      font-size: 0.78rem;
      font-weight: 600;
      color: var(--pg-text-muted);
    }

    .dp-date-time-seg-field {
      display: inline-flex;
      align-items: center;
      font-size: 1rem;
      font-variant-numeric: tabular-nums;
      padding: 0.5rem 0.7rem;
      border: 1px solid var(--pg-border-strong);
      border-radius: var(--pg-radius-sm);
      background: var(--pg-surface);
      color: var(--pg-text);
      transition:
        border-color 0.15s ease,
        box-shadow 0.15s ease;
    }

    .dp-date-time-seg-field:focus-within {
      border-color: var(--pg-primary);
      box-shadow: 0 0 0 1px var(--pg-primary);
    }

    .dp-date-time-seg {
      padding: 0.05rem 0.15rem;
      border-radius: 4px;
      outline: none;
    }

    .dp-date-time-seg[data-placeholder] {
      color: var(--pg-text-muted);
    }

    .dp-date-time-seg[data-highlighted],
    .dp-date-time-seg:focus {
      background: var(--pg-primary);
      color: var(--pg-primary-contrast);
    }

    .dp-date-time-seg-literal {
      padding: 0 0.05rem;
      color: var(--pg-text-muted);
    }

    .dp-date-time-pop-in {
      transform-origin: var(--for-floating-content-transform-origin, center);
      animation: dp-date-time-pop-in 0.2s var(--pg-ease-spring) both;
    }

    @keyframes dp-date-time-pop-in {
      from {
        opacity: 0;
        scale: 0.9;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .dp-date-time-chevron,
      .dp-date-time-nav,
      .dp-date-time-cell,
      .dp-date-time-seg-field {
        transition: none;
      }

      .dp-date-time-pop-in {
        animation-duration: 0.01ms;
      }
    }
  `,
})
export class DatePickerDateTimeExample {
  protected readonly value = signal<CalendarDateTime | null>(
    new CalendarDateTime(2024, 6, 15, 9, 30),
  );
  protected readonly hourCycle: 12 | 24 = 24;

  protected readonly min = new CalendarDateTime(2024, 6, 10, 8, 0);
  protected readonly max = new CalendarDateTime(2024, 6, 25, 20, 0);

  protected readonly formatOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  };
}

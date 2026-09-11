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
      <button forDatePickerTrigger type="button" class="dpdt-trigger">
        <span forDatePickerValue class="dpdt-value"></span>
        <svg class="dpdt-chevron" viewBox="0 0 24 24" aria-hidden="true">
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
        <div forDatePickerContent class="dpdt-popover" animate.enter="dpdt-pop-in">
          <div forCalendar [value]="picker.value()" [min]="min" [max]="max">
            <header class="dpdt-head">
              <button forCalendarPrevButton class="dpdt-nav" [ariaLabel]="'Previous month'">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="m15.75 19.5-7.5-7.5 7.5-7.5"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.75"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </button>
              <h2 forCalendarHeading #heading="forCalendarHeading" class="dpdt-title">
                {{ heading.label() }}
              </h2>
              <button forCalendarNextButton class="dpdt-nav" [ariaLabel]="'Next month'">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="m8.25 4.5 7.5 7.5-7.5 7.5"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.75"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </button>
            </header>

            <table forCalendarGrid #grid="forCalendarGrid" class="dpdt-grid">
              <thead forCalendarGridHeader>
                <tr>
                  @for (day of grid.weekDays(); track day.key) {
                    <th scope="col" class="dpdt-weekday" [attr.aria-label]="day.long">
                      {{ day.narrow }}
                    </th>
                  }
                </tr>
              </thead>
              <tbody>
                @for (week of grid.weeks(); track week.key) {
                  <tr>
                    @for (cell of week.days; track cell.key) {
                      <td forCalendarCell class="dpdt-cell" [date]="cell.date">
                        {{ cell.label }}
                      </td>
                    }
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <div class="dpdt-time">
            <span class="dpdt-time-label">Time</span>
            <div
              forTimeField
              #tf="forTimeField"
              class="dpdt-seg-field"
              [value]="picker.value()"
              [hourCycle]="hourCycle"
              ariaLabel="Time"
            >
              @for (seg of tf.segments(); track seg.id) {
                @if (seg.isLiteral) {
                  <span forTimeFieldLiteral class="dpdt-seg-literal">{{ seg.text }}</span>
                } @else {
                  <span forTimeFieldSegment class="dpdt-seg" [segment]="seg.type!">
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

    .dpdt-trigger {
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

    .dpdt-value[data-placeholder],
    .dpdt-seg[data-placeholder] {
      color: var(--pg-text-muted);
    }

    .dpdt-chevron {
      flex: none;
      width: 14px;
      height: 14px;
      color: var(--pg-text-muted);
      transition: transform 0.15s ease;
    }

    .dpdt-trigger[aria-expanded='true'] .dpdt-chevron {
      transform: rotate(180deg);
    }

    .dpdt-popover {
      z-index: 60;
      width: min(280px, calc(100vw - 1.5rem));
      padding: 0.85rem;
      background: var(--pg-surface);
      color: var(--pg-text);
      border: 1px solid var(--pg-border);
      border-radius: var(--pg-radius);
      corner-shape: squircle;
      box-shadow: var(--pg-shadow);
    }

    .dpdt-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
      margin-bottom: 0.6rem;
    }

    .dpdt-title {
      margin: 0;
      font-size: 0.9rem;
      font-weight: 600;
      letter-spacing: -0.01em;
    }

    .dpdt-nav {
      appearance: none;
      padding: 0;
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

    .dpdt-nav svg {
      width: 1em;
      height: 1em;
    }

    .dpdt-nav[disabled] {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .dpdt-grid {
      width: 100%;
      table-layout: fixed;
      border-collapse: collapse;
    }

    .dpdt-weekday {
      padding: 0.3rem 0;
      font-size: 0.65rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--pg-text-muted);
    }

    .dpdt-cell {
      height: 34px;
      text-align: center;
      vertical-align: middle;
      font-size: 0.82rem;
      border-radius: var(--pg-radius-sm);
      cursor: pointer;
      user-select: none;
      transition: background 0.12s ease;
    }

    .dpdt-trigger:hover:not([disabled]),
    .dpdt-nav:hover:not([disabled]),
    .dpdt-cell:hover:not([aria-disabled]):not([data-selected]) {
      background: var(--pg-surface-2);
    }

    .dpdt-cell[data-outside-month] {
      color: var(--pg-text-muted);
      opacity: 0.5;
    }

    .dpdt-cell[data-today] {
      box-shadow: inset 0 0 0 1px var(--pg-border-strong);
    }

    .dpdt-cell[data-selected] {
      background: var(--pg-primary);
      color: var(--pg-primary-contrast);
      font-weight: 600;
    }

    .dpdt-cell[data-selected]:hover:not([aria-disabled]) {
      background: var(--pg-primary-hover);
    }

    .dpdt-grid:focus-within .dpdt-cell[data-highlighted],
    .dpdt-cell:focus-visible {
      outline: 2px solid var(--pg-primary);
      outline-offset: -2px;
    }

    .dpdt-cell[aria-disabled] {
      color: var(--pg-text-muted);
      opacity: 0.4;
      cursor: not-allowed;
      text-decoration: line-through;
    }

    .dpdt-time {
      margin-top: 0.85rem;
      padding-top: 0.85rem;
      border-top: 1px solid var(--pg-border);
      display: flex;
      align-items: center;
      gap: 0.65rem;
    }

    .dpdt-time-label {
      font-size: 0.78rem;
      font-weight: 600;
      color: var(--pg-text-muted);
    }

    .dpdt-seg-field {
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

    .dpdt-seg-field:focus-within {
      border-color: var(--pg-primary);
      box-shadow: 0 0 0 1px var(--pg-primary);
    }

    .dpdt-seg {
      padding: 0.05rem 0.15rem;
      border-radius: 4px;
      outline: none;
    }

    .dpdt-seg[data-highlighted],
    .dpdt-seg:focus {
      background: var(--pg-primary);
      color: var(--pg-primary-contrast);
    }

    .dpdt-seg-literal {
      padding: 0 0.05rem;
      color: var(--pg-text-muted);
    }

    .dpdt-pop-in {
      transform-origin: var(--for-floating-content-transform-origin, center);
      animation: dpdt-pop-in 0.2s var(--pg-ease-spring) both;
    }

    @keyframes dpdt-pop-in {
      from {
        opacity: 0;
        scale: 0.9;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .dpdt-chevron,
      .dpdt-nav,
      .dpdt-cell,
      .dpdt-seg-field {
        transition: none;
      }

      .dpdt-pop-in {
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

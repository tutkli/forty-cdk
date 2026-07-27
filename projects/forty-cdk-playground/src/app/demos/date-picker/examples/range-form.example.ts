import { ChangeDetectionStrategy, Component, ViewEncapsulation, signal } from '@angular/core';
import { form, FormField, required } from '@angular/forms/signals';
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
import { type DateRange } from 'forty-cdk/shared';
import {
  ForDatePickerContent,
  ForDatePickerTrigger,
  ForDatePickerValue,
  ForDateRangePicker,
} from 'forty-cdk/date-picker';
import { provideInternationalizedDateAdapter } from 'forty-cdk/internationalized-date';

interface Booking {
  readonly stay: DateRange<CalendarDate> | null;
}

@Component({
  selector: 'app-date-picker-range-form-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [
    FormField,
    ForDateRangePicker,
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
    <div class="dp-range-form-field">
      <div
        forDateRangePicker
        #picker="forDateRangePicker"
        [formField]="bookingForm.stay"
        ariaLabel="Choose a date range"
      >
        <button forDatePickerTrigger type="button" class="dp-range-form-trigger">
          <span forDatePickerValue class="dp-range-form-value" placeholder="Pick a range"></span>
          <svg class="dp-range-form-chevron" viewBox="0 0 24 24" aria-hidden="true">
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
            class="dp-range-form-popover"
            animate.enter="dp-range-form-pop-in"
          >
            <div
              forCalendar
              class="dp-range-form-cal"
              selectionMode="range"
              [(range)]="picker.value"
            >
              <header class="dp-range-form-head">
                <button
                  forCalendarPrevButton
                  class="dp-range-form-nav"
                  [ariaLabel]="'Previous month'"
                >
                  ‹
                </button>
                <h2 forCalendarHeading #heading="forCalendarHeading" class="dp-range-form-title">
                  {{ heading.label() }}
                </h2>
                <button forCalendarNextButton class="dp-range-form-nav" [ariaLabel]="'Next month'">
                  ›
                </button>
              </header>

              <table forCalendarGrid #grid="forCalendarGrid" class="dp-range-form-grid">
                <thead forCalendarGridHeader>
                  <tr>
                    @for (day of grid.weekDays(); track day.key) {
                      <th scope="col" class="dp-range-form-weekday" [attr.aria-label]="day.long">
                        {{ day.narrow }}
                      </th>
                    }
                  </tr>
                </thead>
                <tbody>
                  @for (week of grid.weeks(); track week.key) {
                    <tr>
                      @for (cell of week.days; track cell.key) {
                        <td forCalendarCell class="dp-range-form-cell" [date]="cell.date">
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

      @if (bookingForm.stay().touched() && !bookingForm.stay().valid()) {
        <p class="dp-range-form-error">Choose both a start and an end date.</p>
      }
    </div>
  `,
  styles: `
    app-date-picker-range-form-example {
      display: contents;
    }

    .dp-range-form-field {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      align-items: flex-start;
    }

    .dp-range-form-error {
      margin: 0;
      font-size: 0.85rem;
      color: #ef4444;
    }

    .dp-range-form-trigger {
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

    .dp-range-form-trigger:hover:not([disabled]) {
      background: var(--pg-surface-2);
    }

    .dp-range-form-value[data-placeholder] {
      color: var(--pg-text-muted);
    }

    .dp-range-form-chevron {
      flex: none;
      width: 14px;
      height: 14px;
      color: var(--pg-text-muted);
      transition: transform 0.15s ease;
    }

    .dp-range-form-trigger[aria-expanded='true'] .dp-range-form-chevron {
      transform: rotate(180deg);
    }

    .dp-range-form-popover {
      z-index: 60;
      width: min(280px, calc(100vw - 1.5rem));
      padding: 0.85rem;
      background: var(--pg-surface);
      color: var(--pg-text);
      border: 1px solid var(--pg-border);
      border-radius: var(--pg-radius);
      box-shadow: var(--pg-shadow);
    }

    .dp-range-form-cal {
      width: 100%;
    }

    .dp-range-form-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
      margin-bottom: 0.6rem;
    }

    .dp-range-form-title {
      margin: 0;
      font-size: 0.9rem;
      font-weight: 600;
      letter-spacing: -0.01em;
    }

    .dp-range-form-nav {
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

    .dp-range-form-nav:hover:not([disabled]) {
      background: var(--pg-surface-2);
    }

    .dp-range-form-nav[disabled] {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .dp-range-form-grid {
      width: 100%;
      table-layout: fixed;
      border-collapse: collapse;
    }

    .dp-range-form-weekday {
      padding: 0.3rem 0;
      font-size: 0.65rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--pg-text-muted);
    }

    .dp-range-form-cell {
      height: 34px;
      text-align: center;
      vertical-align: middle;
      font-size: 0.82rem;
      border-radius: var(--pg-radius-sm);
      cursor: pointer;
      user-select: none;
      transition: background 0.12s ease;
    }

    .dp-range-form-cell:hover:not([aria-disabled]):not([data-in-range]):not([data-range-preview]) {
      background: var(--pg-surface-2);
    }

    .dp-range-form-cell[data-outside-month] {
      color: var(--pg-text-muted);
      opacity: 0.5;
    }

    .dp-range-form-cell[data-today] {
      box-shadow: inset 0 0 0 1px var(--pg-border-strong);
    }

    .dp-range-form-cell[data-selected] {
      background: var(--pg-primary);
      color: var(--pg-primary-contrast);
      font-weight: 600;
    }

    .dp-range-form-grid:focus-within .dp-range-form-cell[data-highlighted],
    .dp-range-form-cell:focus-visible {
      outline: 2px solid var(--pg-primary);
      outline-offset: -2px;
    }

    .dp-range-form-cell[aria-disabled] {
      color: var(--pg-text-muted);
      opacity: 0.4;
      cursor: not-allowed;
      text-decoration: line-through;
    }

    .dp-range-form-cell[data-in-range] {
      background: color-mix(in srgb, var(--pg-primary) 15%, var(--pg-surface));
      border-radius: 0;
    }

    .dp-range-form-cell[data-range-start],
    .dp-range-form-cell[data-range-end] {
      background: var(--pg-primary);
      color: var(--pg-primary-contrast);
      font-weight: 600;
    }

    .dp-range-form-cell[data-range-preview] {
      background: color-mix(in srgb, var(--pg-primary) 8%, var(--pg-surface));
      border-radius: 0;
    }

    .dp-range-form-cell[data-range-start]:not([data-range-end]) {
      border-radius: 999px 0 0 999px;
    }

    .dp-range-form-cell[data-range-end]:not([data-range-start]) {
      border-radius: 0 999px 999px 0;
    }

    .dp-range-form-pop-in {
      transform-origin: var(--for-content-transform-origin, center);
      animation: dp-range-form-pop-in 0.2s var(--pg-ease-spring) both;
    }

    @keyframes dp-range-form-pop-in {
      from {
        opacity: 0;
        scale: 0.9;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .dp-range-form-chevron,
      .dp-range-form-nav,
      .dp-range-form-cell {
        transition: none;
      }

      .dp-range-form-pop-in {
        animation-duration: 0.01ms;
      }
    }
  `,
})
export class DatePickerRangeFormExample {
  protected readonly model = signal<Booking>({ stay: null });
  protected readonly bookingForm = form(this.model, (path) => {
    required(path.stay, { message: 'A date range is required' });
  });
}

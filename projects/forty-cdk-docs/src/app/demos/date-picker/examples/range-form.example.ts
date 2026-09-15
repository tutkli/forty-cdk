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
                <h2 forCalendarHeading #heading="forCalendarHeading" class="dp-range-form-title">
                  {{ heading.label() }}
                </h2>
                <button forCalendarNextButton class="dp-range-form-nav" [ariaLabel]="'Next month'">
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
      border-radius: var(--ex-radius-sm, 14px);
      border: 1px solid var(--ex-border-strong, #d0c9bc);
      background: var(--ex-surface, #ffffff);
      color: var(--ex-text, #17191c);
      cursor: pointer;
    }

    .dp-range-form-trigger:hover:not([disabled]) {
      background: var(--ex-surface-2, #f2eee6);
    }

    .dp-range-form-value[data-placeholder] {
      color: var(--ex-muted, #585d66);
    }

    .dp-range-form-chevron {
      flex: none;
      width: 14px;
      height: 14px;
      color: var(--ex-muted, #585d66);
      transition: transform 0.15s ease;
    }

    .dp-range-form-trigger[aria-expanded='true'] .dp-range-form-chevron {
      transform: rotate(180deg);
    }

    .dp-range-form-popover {
      z-index: 60;
      width: min(280px, calc(100vw - 1.5rem));
      padding: 0.85rem;
      background: var(--ex-surface, #ffffff);
      color: var(--ex-text, #17191c);
      border: 1px solid var(--ex-border, #e5e0d6);
      border-radius: var(--ex-radius, 22px);
      corner-shape: squircle;
      box-shadow: var(
        --ex-shadow,
        0 2px 4px rgba(0, 0, 0, 0.04),
        0 20px 40px -18px rgba(0, 0, 0, 0.2)
      );
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
      padding: 0;
      flex: none;
      width: 30px;
      height: 30px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: var(--ex-radius-sm, 14px);
      border: 1px solid var(--ex-border-strong, #d0c9bc);
      background: var(--ex-surface, #ffffff);
      color: var(--ex-text, #17191c);
      font-size: 1.05rem;
      line-height: 1;
      cursor: pointer;
      transition: background 0.15s ease;
    }

    .dp-range-form-nav svg {
      width: 1em;
      height: 1em;
    }

    .dp-range-form-nav:hover:not([disabled]) {
      background: var(--ex-surface-2, #f2eee6);
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
      color: var(--ex-muted, #585d66);
    }

    .dp-range-form-cell {
      height: 34px;
      text-align: center;
      vertical-align: middle;
      font-size: 0.82rem;
      border-radius: var(--ex-radius-sm, 14px);
      cursor: pointer;
      user-select: none;
      transition: background 0.12s ease;
    }

    .dp-range-form-cell:hover:not([aria-disabled]):not([data-in-range]):not([data-range-preview]) {
      background: var(--ex-surface-2, #f2eee6);
    }

    .dp-range-form-cell[data-outside-month] {
      color: var(--ex-muted, #585d66);
      opacity: 0.5;
    }

    .dp-range-form-cell[data-today] {
      box-shadow: inset 0 0 0 1px var(--ex-border-strong, #d0c9bc);
    }

    .dp-range-form-cell[data-selected] {
      background: var(--ex-accent, #0e7c6b);
      color: var(--ex-accent-contrast, #ffffff);
      font-weight: 600;
    }

    .dp-range-form-grid:focus-within .dp-range-form-cell[data-highlighted],
    .dp-range-form-cell:focus-visible {
      outline: 2px solid var(--ex-accent, #0e7c6b);
      outline-offset: -2px;
    }

    .dp-range-form-cell[aria-disabled] {
      color: var(--ex-muted, #585d66);
      opacity: 0.4;
      cursor: not-allowed;
      text-decoration: line-through;
    }

    .dp-range-form-cell[data-in-range] {
      background: color-mix(in srgb, var(--ex-accent, #0e7c6b) 15%, var(--ex-surface, #ffffff));
      border-radius: 0;
    }

    .dp-range-form-cell[data-range-start],
    .dp-range-form-cell[data-range-end] {
      background: var(--ex-accent, #0e7c6b);
      color: var(--ex-accent-contrast, #ffffff);
      font-weight: 600;
    }

    .dp-range-form-cell[data-range-preview] {
      background: color-mix(in srgb, var(--ex-accent, #0e7c6b) 8%, var(--ex-surface, #ffffff));
      border-radius: 0;
    }

    .dp-range-form-cell[data-range-start]:not([data-range-end]) {
      border-radius: 999px 0 0 999px;
    }

    .dp-range-form-cell[data-range-end]:not([data-range-start]) {
      border-radius: 0 999px 999px 0;
    }

    .dp-range-form-pop-in {
      transform-origin: var(--for-floating-content-transform-origin, center);
      animation: dp-range-form-pop-in 0.2s var(--ex-ease-spring, cubic-bezier(0.34, 1.56, 0.64, 1))
        both;
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

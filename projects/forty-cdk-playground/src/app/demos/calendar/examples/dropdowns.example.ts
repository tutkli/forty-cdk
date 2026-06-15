import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { CalendarDate, getLocalTimeZone, today } from '@internationalized/date';
import {
  ForCalendar,
  ForCalendarCell,
  ForCalendarGrid,
  ForCalendarGridHeader,
  ForCalendarHeading,
  ForCalendarMonthSelect,
  ForCalendarNextButton,
  ForCalendarPrevButton,
  ForCalendarYearSelect,
} from 'forty-cdk';
import { provideInternationalizedDateAdapter } from 'forty-cdk/internationalized-date';

import { DemoLayout } from '../../../ui/demo-layout';

@Component({
  selector: 'app-calendar-dropdowns-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DemoLayout,
    ForCalendar,
    ForCalendarHeading,
    ForCalendarPrevButton,
    ForCalendarNextButton,
    ForCalendarGrid,
    ForCalendarGridHeader,
    ForCalendarCell,
    ForCalendarMonthSelect,
    ForCalendarYearSelect,
  ],
  providers: [...provideInternationalizedDateAdapter()],
  template: `
    <playground-demo
      title="Month / year dropdowns"
      subtitle="[forCalendarMonthSelect] and [forCalendarYearSelect] wire native selects to the calendar's month/year navigation. Render the options yourself from m.options() and y.years()."
      sourcePath="projects/forty-cdk-playground/src/app/demos/calendar/examples/dropdowns.example.ts"
    >
      <div demo>
        <div forCalendar class="pg-cal" [(value)]="value" [min]="min" [max]="max">
          <header class="pg-cal-header pg-cal-header--dropdowns">
            <button forCalendarPrevButton class="pg-cal-nav" [ariaLabel]="'Previous month'">‹</button>

            <select forCalendarMonthSelect #m="forCalendarMonthSelect" class="pg-cal-select">
              @for (opt of m.options(); track opt.value) {
                <option [value]="opt.value" [disabled]="opt.disabled">{{ opt.label }}</option>
              }
            </select>

            <select forCalendarYearSelect #y="forCalendarYearSelect" [minYear]="minYear" [maxYear]="maxYear" class="pg-cal-select">
              @for (opt of y.years(); track opt.value) {
                <option [value]="opt.value" [disabled]="opt.disabled">{{ opt.value }}</option>
              }
            </select>

            <button forCalendarNextButton class="pg-cal-nav" [ariaLabel]="'Next month'">›</button>
            <h2 forCalendarHeading #heading="forCalendarHeading" class="pg-sr-only">{{ heading.label() }}</h2>
          </header>

          <table forCalendarGrid #grid="forCalendarGrid" class="pg-cal-grid">
            <thead forCalendarGridHeader>
              <tr>
                @for (day of grid.weekDays(); track day.key) {
                  <th scope="col" class="pg-cal-weekday" [attr.aria-label]="day.long">
                    {{ day.narrow }}
                  </th>
                }
              </tr>
            </thead>
            <tbody>
              @for (week of grid.weeks(); track week.key) {
                <tr>
                  @for (cell of week.days; track cell.key) {
                    <td forCalendarCell class="pg-cal-cell" [date]="cell.date">{{ cell.label }}</td>
                  }
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>

      <div controls class="pg-controls">
        <p class="pg-state">
          selected: <b>{{ selectedLabel() }}</b>
        </p>
        <p class="pg-hint">
          min = Feb 1 of last year · max = Dec 31 of next year. Months/years entirely outside
          that range are disabled in the dropdowns.
        </p>
      </div>
    </playground-demo>
  `,
  styles: `
    .pg-cal {
      width: 280px;
      padding: 1rem;
      background: var(--pg-surface);
      border: 1px solid var(--pg-border);
      border-radius: var(--pg-radius);
    }

    .pg-cal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
      margin-bottom: 0.75rem;
    }

    .pg-cal-header--dropdowns {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr) minmax(0, 1fr) auto;
      gap: 0.4rem;
    }

    .pg-cal-select {
      min-width: 0;
      padding: 0.25rem 0.4rem;
      border: 1px solid var(--pg-border-strong);
      border-radius: var(--pg-radius-sm);
      background: var(--pg-surface);
      color: var(--pg-text);
      font-size: 0.85rem;
      cursor: pointer;
    }

    .pg-cal-nav {
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

    .pg-cal-nav:hover:not([disabled]) {
      background: var(--pg-surface-2);
    }

    .pg-cal-nav[disabled] {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .pg-sr-only {
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

    .pg-cal-grid {
      width: 100%;
      table-layout: fixed;
      border-collapse: collapse;
    }

    .pg-cal-weekday {
      padding: 0.35rem 0;
      font-size: 0.68rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--pg-text-muted);
    }

    .pg-cal-cell {
      height: 36px;
      text-align: center;
      vertical-align: middle;
      font-size: 0.85rem;
      border-radius: var(--pg-radius-sm);
      cursor: pointer;
      user-select: none;
      transition: background 0.12s ease;
    }

    .pg-cal-cell:hover:not([aria-disabled]) {
      background: var(--pg-surface-2);
    }

    .pg-cal-cell[data-outside-month] {
      color: var(--pg-text-muted);
      opacity: 0.5;
    }

    .pg-cal-cell[data-today] {
      box-shadow: inset 0 0 0 1px var(--pg-border-strong);
    }

    .pg-cal-cell[data-selected] {
      background: var(--pg-primary);
      color: var(--pg-primary-contrast);
      font-weight: 600;
    }

    .pg-cal-grid:focus-within .pg-cal-cell[data-highlighted],
    .pg-cal-cell:focus-visible {
      outline: 2px solid var(--pg-primary);
      outline-offset: -2px;
    }

    .pg-cal-cell[aria-disabled] {
      color: var(--pg-text-muted);
      opacity: 0.4;
      cursor: not-allowed;
      text-decoration: line-through;
    }

    @media (prefers-reduced-motion: reduce) {
      .pg-cal-nav,
      .pg-cal-cell {
        transition: none;
      }
    }
  `,
})
export class CalendarDropdownsExample {
  readonly #todayDate = today(getLocalTimeZone());
  protected readonly value = signal<CalendarDate | null>(this.#todayDate);
  protected readonly min = new CalendarDate(this.#todayDate.year - 1, 2, 1);
  protected readonly max = new CalendarDate(this.#todayDate.year + 1, 12, 31);
  protected readonly minYear = this.#todayDate.year - 2;
  protected readonly maxYear = this.#todayDate.year + 2;
  protected readonly selectedLabel = computed(() => this.value()?.toString() ?? '—');
}

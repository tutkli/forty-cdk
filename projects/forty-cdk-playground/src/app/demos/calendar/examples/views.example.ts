import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
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
} from 'forty-cdk';
import { provideInternationalizedDateAdapter } from 'forty-cdk/internationalized-date';

import { type ControlOption, ControlSelect } from '../../../ui/control-select';
import { DemoLayout } from '../../../ui/demo-layout';

@Component({
  selector: 'app-calendar-view-switching-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DemoLayout,
    ControlSelect,
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
    <playground-demo
      title="View switching (month / year picker)"
      subtitle="Click the heading button to cycle from day → month → year view. Click a month to drill down to days; click a year to drill down to months. Prev/next pages by month, year, or block depending on the active view. min/max disable out-of-range months and years and stop the arrows at the bounds, and yearBlockSize sets how many years fill the year grid."
      sourcePath="projects/forty-cdk-playground/src/app/demos/calendar/examples/views.example.ts"
    >
      <div demo>
        <div
          forCalendar
          class="pg-cal"
          [(value)]="value"
          [min]="min"
          [max]="max"
          [yearBlockSize]="yearBlockSize()"
          #cal="forCalendar"
        >
          <header class="pg-cal-header">
            <button forCalendarPrevButton class="pg-cal-nav" [ariaLabel]="'Previous'">‹</button>
            <button
              forCalendarViewTrigger
              #vt="forCalendarViewTrigger"
              class="pg-cal-title pg-cal-view-btn"
            >
              {{ vt.label() }}
            </button>
            <button forCalendarNextButton class="pg-cal-nav" [ariaLabel]="'Next'">›</button>
            <h2 forCalendarHeading #heading="forCalendarHeading" class="pg-sr-only">
              {{ heading.label() }}
            </h2>
          </header>

          @switch (cal.view()) {
            @case ('day') {
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
                        <td forCalendarCell class="pg-cal-cell" [date]="cell.date">
                          {{ cell.label }}
                        </td>
                      }
                    </tr>
                  }
                </tbody>
              </table>
            }
            @case ('month') {
              <table
                forCalendarMonthGrid
                #mg="forCalendarMonthGrid"
                class="pg-cal-grid pg-cal-grid--3col"
              >
                <tbody>
                  @for (row of mg.rows(); track row.key) {
                    <tr>
                      @for (m of row.months; track m.value) {
                        <td
                          forCalendarMonthCell
                          [month]="m.value"
                          class="pg-cal-cell pg-cal-cell--pick"
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
              <table
                forCalendarYearGrid
                #yg="forCalendarYearGrid"
                class="pg-cal-grid pg-cal-grid--3col"
              >
                <tbody>
                  @for (row of yg.rows(); track row.key) {
                    <tr>
                      @for (y of row.years; track y.value) {
                        <td
                          forCalendarYearCell
                          [year]="y.value"
                          class="pg-cal-cell pg-cal-cell--pick"
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
      </div>

      <div controls class="pg-controls">
        <app-control-select
          label="yearBlockSize"
          hint="How many years the year grid shows at once. Blocks align to multiples of the size."
          [options]="blockSizeOptions"
          [(value)]="blockSize"
        />
        <p class="pg-hint">
          min = Apr 1 last year · max = Sep 30 next year. Switch to month or year view to see
          out-of-range cells disabled, and the prev/next arrows stop at the bounds.
        </p>
        <p class="pg-state">
          selected: <b>{{ selectedLabel() }}</b>
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

    .pg-cal-view-btn {
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

    .pg-cal-view-btn:hover {
      background: var(--pg-surface-2);
      border-color: var(--pg-border);
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

    .pg-cal-grid--3col {
      table-layout: fixed;
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

    .pg-cal-cell--pick {
      height: 52px;
      font-size: 0.9rem;
    }

    .pg-cal-cell:hover:not([aria-disabled]) {
      background: var(--pg-surface-2);
    }

    .pg-cal-cell[data-today] {
      box-shadow: inset 0 0 0 1px var(--pg-border-strong);
    }

    .pg-cal-cell[data-selected] {
      background: var(--pg-primary);
      color: var(--pg-primary-contrast);
      font-weight: 600;
    }

    .pg-cal-cell[data-outside-month] {
      color: var(--pg-text-muted);
      opacity: 0.5;
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
      .pg-cal-view-btn,
      .pg-cal-cell {
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

  protected readonly blockSizeOptions: readonly ControlOption<'12' | '15' | '24'>[] = [
    { value: '12', label: '12 years' },
    { value: '15', label: '15 years' },
    { value: '24', label: '24 years' },
  ];
  protected readonly blockSize = signal<'12' | '15' | '24'>('12');
  protected readonly yearBlockSize = computed(() => Number(this.blockSize()));

  protected readonly selectedLabel = computed(() => this.value()?.toString() ?? '—');
}

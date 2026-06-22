import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { type CalendarDate, today, getLocalTimeZone } from '@internationalized/date';
import {
  type CalendarDateRange,
  ForCalendar,
  ForCalendarCell,
  ForCalendarGrid,
  ForCalendarGridHeader,
  ForCalendarHeading,
  ForCalendarNextButton,
  ForCalendarPrevButton,
} from 'forty-cdk';
import { provideInternationalizedDateAdapter } from 'forty-cdk/internationalized-date';

import { DemoLayout } from '../../../ui/demo-layout';

@Component({
  selector: 'app-calendar-range-example',
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
  ],
  providers: [...provideInternationalizedDateAdapter()],
  template: `
    <playground-demo
      title="Range selection"
      subtitle="Set selectionMode=range and bind [(range)] to a CalendarDateRange signal. Click a first cell to anchor the range; move the pointer to preview; click a second cell to commit. Committed cells reflect data-range-start / data-range-end / data-in-range; the preview band uses data-range-preview."
      sourcePath="projects/forty-cdk-playground/src/app/demos/calendar/examples/range.example.ts"
    >
      <div demo>
        <div forCalendar class="pg-cal" selectionMode="range" [(range)]="dateRange">
          <header class="pg-cal-header">
            <button forCalendarPrevButton class="pg-cal-nav" [ariaLabel]="'Previous month'">
              ‹
            </button>
            <h2 forCalendarHeading #heading="forCalendarHeading" class="pg-cal-title">
              {{ heading.label() }}
            </h2>
            <button forCalendarNextButton class="pg-cal-nav" [ariaLabel]="'Next month'">›</button>
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
        <div class="pg-btn-row">
          <button type="button" class="pg-btn" (click)="dateRange.set(null)">Clear</button>
        </div>
        <p class="pg-state">
          start: <b>{{ dateRange()?.start?.toString() ?? 'null' }}</b
          ><br />
          end: <b>{{ dateRange()?.end?.toString() ?? 'null' }}</b>
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

    .pg-cal-title {
      margin: 0;
      font-size: 0.95rem;
      font-weight: 600;
      letter-spacing: -0.01em;
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

    .pg-cal-cell:hover:not([aria-disabled]):not([data-in-range]):not([data-range-preview]) {
      background: var(--pg-surface-2);
    }

    .pg-cal-cell[data-outside-month] {
      color: var(--pg-text-muted);
      opacity: 0.5;
    }

    .pg-cal-cell[data-today] {
      box-shadow: inset 0 0 0 1px var(--pg-border-strong);
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

    .pg-cal-cell[data-in-range] {
      background: color-mix(in srgb, var(--pg-primary) 15%, var(--pg-surface));
      border-radius: 0;
    }

    .pg-cal-cell[data-range-preview] {
      background: color-mix(in srgb, var(--pg-primary) 8%, var(--pg-surface));
      border-radius: 0;
    }

    .pg-cal-cell[data-range-start],
    .pg-cal-cell[data-range-end] {
      background: var(--pg-primary);
      color: var(--pg-primary-contrast);
      font-weight: 600;
    }

    .pg-cal-cell[data-range-start]:not([data-range-end]) {
      border-radius: 999px 0 0 999px;
    }

    .pg-cal-cell[data-range-end]:not([data-range-start]) {
      border-radius: 0 999px 999px 0;
    }

    @media (prefers-reduced-motion: reduce) {
      .pg-cal-nav,
      .pg-cal-cell {
        transition: none;
      }
    }
  `,
})
export class CalendarRangeExample {
  protected readonly dateRange = signal<CalendarDateRange<CalendarDate> | null>({
    start: today(getLocalTimeZone()).subtract({ days: 3 }),
    end: today(getLocalTimeZone()).add({ days: 4 }),
  });
}

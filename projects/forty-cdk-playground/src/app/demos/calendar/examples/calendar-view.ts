import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import type { CalendarDate } from '@internationalized/date';
import {
  ForCalendar,
  ForCalendarCell,
  ForCalendarGrid,
  ForCalendarGridHeader,
  ForCalendarHeading,
  ForCalendarNextButton,
  ForCalendarPrevButton,
} from 'forty-cdk';
import { provideInternationalizedDateAdapter } from 'forty-cdk/internationalized-date';

@Component({
  selector: 'app-calendar-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
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
      forCalendar
      class="pg-cal"
      [(value)]="value"
      [min]="min()"
      [max]="max()"
      [firstDayOfWeek]="firstDayOfWeek()"
      [disabled]="disabled()"
      [readonly]="readonly()"
      [isDateUnavailable]="isDateUnavailable()"
    >
      <header class="pg-cal-header">
        <button forCalendarPrevButton class="pg-cal-nav" [ariaLabel]="'Previous month'">‹</button>
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
  `,
  styles: `
    .pg-cal {
      width: 280px;
      padding: 1rem;
      background: var(--pg-surface);
      border: 1px solid var(--pg-border);
      border-radius: var(--pg-radius);
    }

    .pg-cal[data-disabled] {
      opacity: 0.55;
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
export class CalendarView {
  readonly value = model<CalendarDate | null>(null);
  readonly min = input<CalendarDate | null>(null);
  readonly max = input<CalendarDate | null>(null);
  readonly firstDayOfWeek = input<number | null>(null);
  readonly disabled = input(false);
  readonly readonly = input(false);
  readonly isDateUnavailable = input<(date: CalendarDate) => boolean>(() => false);
}

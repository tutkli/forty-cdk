# Calendar

Headless single-date calendar grid following the [WAI-ARIA Grid pattern](https://www.w3.org/WAI/ARIA/apg/patterns/grid/) — the date table at the heart of the APG [Date Picker Dialog](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/examples/datepicker-dialog/) example. Roving-tabindex focus management, full grid keyboard interaction (arrows / `Home` / `End` / `PageUp` / `PageDown` / `Shift+PageUp` / `Shift+PageDown`), focus paging across month boundaries, `aria-current="date"` on today, `min` / `max` / per-date availability, RTL arrow mirroring, and a pluggable, date-library-agnostic `DateAdapter<D>`.

`ForCalendar` is the grid widget, **not a form value** — it exposes `[(value)]` as a `model<D | null>`. The form-control contract (`FormValueControl<D>`) arrives with the follow-up `ForDatePicker` / `ForDateField`.

## Date adapter — pick one (required)

All date math goes through a `DateAdapter<D>`, so the library hard-depends on **no** date library. Provide exactly one adapter in your application (or component) providers:

| Provider                                  | Date type `D`                          | Dependency                                            |
| ----------------------------------------- | -------------------------------------- | ----------------------------------------------------- |
| `provideInternationalizedDateAdapter()`   | `CalendarDate` (`@internationalized/date`) | **Recommended.** `@internationalized/date` (optional peer) |
| `provideNativeDateAdapter()`              | `Date`                                 | None (zero-dependency fallback)                       |

```ts
import { bootstrapApplication } from '@angular/platform-browser';
import { provideInternationalizedDateAdapter } from 'forty-cdk';

bootstrapApplication(App, {
  providers: [provideInternationalizedDateAdapter()],
});
```

`@internationalized/date` is the immutable, calendar-aware date primitive React Aria and Ark UI build on; it works in every browser today with no polyfill, and its reference-equality-on-mutation makes it signal-friendly. A `Temporal.PlainDate` adapter is a planned non-breaking addition once the Temporal API is broadly available across browsers — the `DateAdapter<D>` seam means adopting it later is a drop-in, not a migration.

## Pieces

| Class                   | Selector                  | Role                                                                                        |
| ----------------------- | ------------------------- | ------------------------------------------------------------------------------------------- |
| `ForCalendar`           | `[forCalendar]`           | Root. Owns `value`, the focused date, the visible month, and the shared context.            |
| `ForCalendarHeading`    | `[forCalendarHeading]`    | Month/year title. `aria-live="polite"`; its text is set to the visible period.              |
| `ForCalendarPrevButton` | `[forCalendarPrevButton]` | Pages to the previous month. Auto-disabled at the `min` bound.                              |
| `ForCalendarNextButton` | `[forCalendarNextButton]` | Pages to the next month. Auto-disabled at the `max` bound.                                  |
| `ForCalendarGrid`       | `[forCalendarGrid]`       | Date table (`role="grid"`, `aria-labelledby` the heading). Exposes `weekDays()` / `weeks()`. |
| `ForCalendarGridHeader` | `[forCalendarGridHeader]` | Header rowgroup holding the weekday `columnheader`s. Also exposes `weekDays()`.             |
| `ForCalendarCell`       | `[forCalendarCell]`       | One day (`role="gridcell"`). Roving tab stop, ARIA state, and keyboard / click interaction. |

## Inputs / models — `ForCalendar`

| API                 | Type                          | Description                                                                                                       |
| ------------------- | ----------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `value`             | `model<D \| null>`            | Two-way bindable selected date, or `null`. `(valueChange)` fires only on internal selection. Default `null`.      |
| `min`               | `input<D \| null>`            | Minimum selectable date (inclusive). Earlier dates are unavailable. Default `null`.                               |
| `max`               | `input<D \| null>`            | Maximum selectable date (inclusive). Later dates are unavailable. Default `null`.                                 |
| `isDateUnavailable` | `input<(date: D) => boolean>` | Per-date predicate marking a date unavailable (present but not selectable). Default `() => false`.                |
| `disabled`          | `input<boolean>`              | Disables the whole calendar (no focus movement, no selection). Reflected as `data-disabled`.                      |
| `readonly`          | `input<boolean>`              | Read-only: dates stay focusable, selection is blocked. Reflected as `data-readonly`.                              |
| `firstDayOfWeek`    | `input<number \| null>`       | First column's weekday, **0-6** (`0` = Sunday). Default `null` → the adapter's value (or `provideForCalendarDefaults`). |
| `dir`               | `input<'ltr' \| 'rtl' \| null>` | Writing direction. Default `null` resolves the ambient direction; reflected to the host `dir` and mirrors horizontal arrows. |

## Usage

```ts
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { CalendarDate, today, getLocalTimeZone } from '@internationalized/date';
import {
  ForCalendar,
  ForCalendarCell,
  ForCalendarGrid,
  ForCalendarGridHeader,
  ForCalendarHeading,
  ForCalendarNextButton,
  ForCalendarPrevButton,
} from 'forty-cdk';

@Component({
  selector: 'app-date',
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
  template: `
    <div forCalendar [(value)]="date">
      <header>
        <button forCalendarPrevButton [ariaLabel]="'Previous month'">‹</button>
        <h2 forCalendarHeading #heading="forCalendarHeading">{{ heading.label() }}</h2>
        <button forCalendarNextButton [ariaLabel]="'Next month'">›</button>
      </header>

      <table forCalendarGrid #grid="forCalendarGrid">
        <thead forCalendarGridHeader>
          <tr>
            @for (day of grid.weekDays(); track day.key) {
              <th scope="col" [attr.aria-label]="day.long">{{ day.short }}</th>
            }
          </tr>
        </thead>
        <tbody>
          @for (week of grid.weeks(); track week.key) {
            <tr>
              @for (cell of week.days; track cell.key) {
                <td forCalendarCell [date]="cell.date">{{ cell.label }}</td>
              }
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
export class DatePage {
  readonly date = signal<CalendarDate | null>(today(getLocalTimeZone()));
}
```

The library is styleless: style the boolean `data-*` hooks on `[forCalendarCell]` yourself (`[data-selected]`, `[data-today]`, `[data-outside-month]`, `[data-highlighted]`, and `:not([data-disabled])` for the enabled state).

## Keyboard

LTR (horizontal arrows mirror under `dir="rtl"`):

| Key                               | Behavior                                                       |
| --------------------------------- | -------------------------------------------------------------- |
| **ArrowLeft / ArrowRight**        | Previous / next day.                                           |
| **ArrowUp / ArrowDown**           | Same weekday, previous / next week.                            |
| **Home / End**                    | First / last day of the focused week.                          |
| **PageUp / PageDown**             | Same day-of-month, previous / next month (re-pages the grid).  |
| **Shift+PageUp / Shift+PageDown** | Same month, previous / next year.                              |
| **Enter / Space**                 | Select the focused date.                                       |

Focus that crosses a month boundary re-pages the visible grid and keeps the focused cell in view. Day-of-month is constrained when paging (e.g. Jan 31 → Feb 28). Paging (the prev / next buttons and `PageUp` / `PageDown`) also clamps the focused date into the `[min, max]` range, so it never lands on a cell outside the selectable bounds; day / week arrows still move freely across unavailable dates so keyboard navigation is never trapped.

## Scope defaults

```ts
import { provideForCalendarDefaults } from 'forty-cdk';

// app config or a component's providers — Monday-first weeks for this scope
providers: [provideForCalendarDefaults({ firstDayOfWeek: 1 })];
```

## Accessibility notes

- **`role="grid"`** on the table, `columnheader` weekday headers, `gridcell` days — the APG Date Picker Dialog technique over a real `<table>`.
- **`aria-labelledby`** wires the grid to the `aria-live="polite"` heading, so screen readers announce the new month/year on every navigation.
- **`aria-selected`** is always emitted (`"true"` / `"false"`); **`aria-current="date"`** marks today; **`aria-disabled`** marks unavailable dates (truthy-only).
- **Roving tabindex**: exactly one cell (the focused date) is tabbable. `Tab` enters and leaves the grid in one stop.
- **Boolean `data-*`** on the cell — `data-selected`, `data-today`, `data-highlighted` (the focused/roving cell), `data-disabled`, `data-outside-month` — present when true, absent when false.

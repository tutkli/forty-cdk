# Calendar

A single-date calendar grid implementing the APG Grid pattern over a pluggable date adapter: roving-tabindex day navigation, month / year paging, and min / max / per-date availability.

Headless and styleless — the date table at the heart of the APG [Date Picker Dialog](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/examples/datepicker-dialog/) example. Full grid keyboard interaction (arrows / `Home` / `End` / `PageUp` / `PageDown` / `Shift+PageUp` / `Shift+PageDown`), focus paging across month boundaries, `aria-current="date"` on today, RTL arrow mirroring, and a pluggable, date-library-agnostic `DateAdapter<D>`.

`ForCalendar` is the grid widget, **not a form value** — it exposes `[(value)]` as a `model<D | null>`. The form-control contract (`FormValueControl<D>`) arrives with the follow-up `ForDatePicker` / `ForDateField`.

## Date adapter

All date math goes through a `DateAdapter<D>`, so the library hard-depends on **no** date library. Provide exactly one adapter in your application (or component) providers (required):

| Provider                                | Date type `D`                              | Dependency                                                                                                |
| --------------------------------------- | ------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| `provideInternationalizedDateAdapter()` | `CalendarDate` (`@internationalized/date`) | **Recommended.** From `forty-cdk/internationalized-date`; needs `@internationalized/date` (optional peer) |
| `provideNativeDateAdapter()`            | `Date`                                     | None (zero-dependency fallback)                                                                           |

```ts
import { bootstrapApplication } from '@angular/platform-browser';
import { provideInternationalizedDateAdapter } from 'forty-cdk/internationalized-date';

bootstrapApplication(App, {
  providers: [provideInternationalizedDateAdapter()],
});
```

`@internationalized/date` is a widely-used immutable date primitive; it works in every browser today with no polyfill, and its reference-equality-on-mutation makes it signal-friendly. Both `@internationalized/date` adapters operate on the **Gregorian** calendar today — `createDate` always builds a Gregorian date, so the grid stays Gregorian regardless of the runtime locale. True non-Gregorian calendar systems are deferred to the planned `Temporal.PlainDate` adapter ([#354](https://github.com/tutkli/forty-cdk/issues/354)), a non-breaking addition once the Temporal API is broadly available across browsers — the `DateAdapter<D>` seam means adopting it later is a drop-in, not a migration.

## Anatomy

```html
<div forCalendar [(value)]="date">
  <header>
    <button forCalendarPrevButton [ariaLabel]="'Previous month'">‹</button>
    <h2 forCalendarHeading #heading="forCalendarHeading">{{ heading.label() }}</h2>
    <button forCalendarNextButton [ariaLabel]="'Next month'">›</button>
  </header>

  <table forCalendarGrid #grid="forCalendarGrid">
    <thead forCalendarGridHeader>
      <tr>
        <!-- @for (day of grid.weekDays(); track day.key) -->
        <th scope="col" [attr.aria-label]="day.long">{{ day.short }}</th>
      </tr>
    </thead>
    <tbody>
      <!-- @for (week of grid.weeks(); track week.key) -->
      <tr>
        <!-- @for (cell of week.days; track cell.key) -->
        <td forCalendarCell [date]="cell.date">{{ cell.label }}</td>
      </tr>
    </tbody>
  </table>
</div>
```

## Examples

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
} from 'forty-cdk/calendar';

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
                <td forCalendarCell class="calendar-cell" [date]="cell.date">{{ cell.label }}</td>
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

## API

### `ForCalendar`

| Property            | Type                                   | Description                                                                                                                                           |
| ------------------- | -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `value`             | `model<D \| null>`                     | Two-way bindable selected date, or `null`. Used in `selectionMode="single"`. `(valueChange)` fires only on internal selection.<br>**Default:** `null` |
| `selectionMode`     | `input<'single' \| 'range'>`           | `'single'` (default) keeps the single-date `value` flow. `'range'` switches to anchor → commit and exposes `range`.<br>**Default:** `'single'`        |
| `range`             | `model<DateRange<D> \| null>`          | Two-way bindable committed range. Only used in `selectionMode="range"`. `(rangeChange)` fires only on internal commits/clears.<br>**Default:** `null` |
| `minRangeLength`    | `input<number \| null>`                | Minimum inclusive day count. A commit shorter than this is a no-op.<br>**Default:** `null` (no minimum)                                               |
| `maxRangeLength`    | `input<number \| null>`                | Maximum inclusive day count. A commit longer than this is a no-op.<br>**Default:** `null` (no maximum)                                                |
| `min`               | `input<D \| null>`                     | Minimum selectable date (inclusive). Earlier dates are unavailable.<br>**Default:** `null`                                                            |
| `max`               | `input<D \| null>`                     | Maximum selectable date (inclusive). Later dates are unavailable.<br>**Default:** `null`                                                              |
| `isDateUnavailable` | `input<(date: D) => boolean>`          | Per-date predicate marking a date unavailable (present but not selectable).<br>**Default:** `() => false`                                             |
| `dateLabel`         | `input<CalendarDateLabelFormatter<D>>` | Formats each gridcell's `aria-label` (full accessible date).<br>**Default:** localized full date, outside-month days suffixed                         |
| `disabled`          | `input<boolean>`                       | Disables the whole calendar (no focus movement, no selection). Reflected as `data-disabled`.<br>**Default:** —                                        |
| `readonly`          | `input<boolean>`                       | Read-only: dates stay focusable, selection is blocked. Reflected as `data-readonly`.<br>**Default:** —                                                |
| `firstDayOfWeek`    | `input<number \| null>`                | First column's weekday, **0-6** (`0` = Sunday).<br>**Default:** `null` → the adapter's value (or `provideForCalendarDefaults`)                        |
| `dir`               | `input<'ltr' \| 'rtl' \| null>`        | Writing direction.<br>**Default:** `null` resolves the ambient direction; reflected to the host `dir` and mirrors horizontal arrows                   |

### Data attributes

| Piece                     | Attribute            | Values            |
| ------------------------- | -------------------- | ----------------- |
| `[forCalendar]`           | `data-disabled`      | present \| absent |
| `[forCalendar]`           | `data-readonly`      | present \| absent |
| `[forCalendarPrevButton]` | `data-disabled`      | present \| absent |
| `[forCalendarNextButton]` | `data-disabled`      | present \| absent |
| `[forCalendarCell]`       | `data-selected`      | present \| absent |
| `[forCalendarCell]`       | `data-today`         | present \| absent |
| `[forCalendarCell]`       | `data-highlighted`   | present \| absent |
| `[forCalendarCell]`       | `data-disabled`      | present \| absent |
| `[forCalendarCell]`       | `data-outside-month` | present \| absent |

## Range selection

Set `selectionMode="range"` and bind `[(range)]` to get date-range selection. In range mode the single-date `value` is unused and stays `null`.

```html
<div forCalendar selectionMode="range" [(range)]="dateRange">
  <!-- …header + grid… -->
</div>
```

**Interaction model.** Click (or `Enter` / `Space`) a first cell to set the anchor; the grid enters selecting state. Click (or `Enter` / `Space`) a second cell at or after the anchor to commit the range. Clicking before the anchor re-anchors (starts over from the earlier date). No explicit Escape-to-cancel — an in-progress anchor is simply overwritten by the next click.

**Keyboard in range mode.** `Enter` / `Space` on the focused cell sets the anchor on the first press and commits on the second (same key as single mode). While selecting, arrow / `Home` / `End` / `PageUp` / `PageDown` move the keyboard focus and update the preview end (the keyboard equivalent of pointer hover).

**`min` / `max` / `isDateUnavailable`** still gate both endpoints. An unavailable or out-of-bounds date cannot become an anchor or an end.

**`minRangeLength` / `maxRangeLength`.** Constrain the inclusive day count of the committed range. A click that would violate either limit is a no-op (the anchor is preserved). Both default to `null` (unconstrained).

**Cell facets (range mode).** Four boolean `data-*` attributes are added to `[forCalendarCell]`:

| Attribute            | Present when                                                                    |
| -------------------- | ------------------------------------------------------------------------------- |
| `data-range-start`   | Cell is the start of the effective range (committed idle, or preview selecting) |
| `data-range-end`     | Cell is the end of the effective range                                          |
| `data-in-range`      | Cell is within the **committed** range, inclusive (idle only)                   |
| `data-range-preview` | Cell is within the **preview** band, inclusive (selecting only)                 |

`data-in-range` and `data-range-preview` are mutually exclusive. Endpoints carry both the endpoint attribute and the band attribute (inclusive). All four are absent in single mode.

```css
[data-in-range] {
  background: var(--accent-light);
}
[data-range-start],
[data-range-end] {
  background: var(--accent);
  color: white;
}
[data-range-preview] {
  background: var(--accent-faint);
}
[data-range-start]:not([data-range-end]) {
  border-radius: 50% 0 0 50%;
}
[data-range-end]:not([data-range-start]) {
  border-radius: 0 50% 50% 0;
}
```

**`aria-selected`** in range mode is `"true"` across every committed-range cell (inclusive). During selecting (range null), it is `"false"` everywhere.

**v1 scope.** Range mode is day-granular only — `granularity` / time is orthogonal and not supported in v1.

## Month / year navigation

`ForCalendar` exposes absolute-navigation methods so consumers can wire their own month/year `<select>` dropdowns — or any other UI — without needing a library directive.

### Navigation methods

| Method              | Description                                                                             |
| ------------------- | --------------------------------------------------------------------------------------- |
| `goTo(year, month)` | Set the visible month to `(year, month)` without selecting a date. `month` is **1-12**. |
| `goToMonth(month)`  | Set the visible month within the current visible year. `month` is **1-12**.             |
| `goToYear(year)`    | Set the visible year, keeping the current visible month.                                |

All three methods re-apply the user's intended day-of-month (clamped to the target month's length), clamp the result into `[min, max]`, and announce the new period politely when the visible month changes. They keep DOM focus on the caller — they do not move focus into the grid. They are a no-op while the calendar is `disabled`.

### Read accessors and predicates

| API                      | Type                                     | Description                                                                             |
| ------------------------ | ---------------------------------------- | --------------------------------------------------------------------------------------- |
| `visibleYear()`          | `Signal<number>`                         | The visible month's full year (e.g. `2026`).                                            |
| `visibleMonthNumber()`   | `Signal<number>`                         | The visible month, **1-12**.                                                            |
| `monthOptions()`         | `Signal<readonly CalendarMonthOption[]>` | Twelve localized, bounds-aware entries for the visible year. See `CalendarMonthOption`. |
| `isMonthDisabled(month)` | `(month: number) => boolean`             | Whether every day of `month` (**1-12**) in the visible year is outside `[min, max]`.    |
| `isYearDisabled(year)`   | `(year: number) => boolean`              | Whether every day of `year` is outside `[min, max]`.                                    |

`CalendarMonthOption` has three fields: `value: number` (1-12), `label: string` (localized month name via the adapter), and `disabled: boolean`.

A month/year is "disabled" only when its **entire** span is out of range — its last day falls before `min`, or its first day falls after `max`. A non-midnight `min`/`max` keeps its boundary month/year enabled, matching the grid's existing day-level availability.

### Usage — native `<select>` dropdowns

The recommended path is `[forCalendarMonthSelect]` and `[forCalendarYearSelect]`. Apply them on `<select>` elements inside `[forCalendar]` and render the `<option>` elements yourself from the directive's signals:

```html
<div forCalendar [(value)]="date">
  <header>
    <button forCalendarPrevButton [ariaLabel]="'Previous month'">‹</button>
    <select forCalendarMonthSelect #m="forCalendarMonthSelect">
      @for (opt of m.options(); track opt.value) {
      <option [value]="opt.value" [disabled]="opt.disabled">{{ opt.label }}</option>
      }
    </select>
    <select forCalendarYearSelect #y="forCalendarYearSelect" [minYear]="1900" [maxYear]="2100">
      @for (opt of y.years(); track opt.value) {
      <option [value]="opt.value" [disabled]="opt.disabled">{{ opt.value }}</option>
      }
    </select>
    <button forCalendarNextButton [ariaLabel]="'Next month'">›</button>
    <h2 forCalendarHeading class="sr-only" #h="forCalendarHeading">{{ h.label() }}</h2>
  </header>
  <table forCalendarGrid>
    …
  </table>
</div>
```

#### `ForCalendarMonthSelect` API

| API         | Description                                                                                                   |
| ----------- | ------------------------------------------------------------------------------------------------------------- |
| `options()` | `Signal<readonly CalendarMonthOption[]>` — twelve localized, bounds-aware month options for the visible year. |

#### `ForCalendarYearSelect` API

| API       | Description                                                                                                                                            |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `minYear` | `input<number \| null>` — lowest listed year. Defaults to `currentYear - 100` when `null`.                                                             |
| `maxYear` | `input<number \| null>` — highest listed year. Defaults to `currentYear + 10` when `null`.                                                             |
| `years()` | `Signal<readonly CalendarYearOption[]>` — years from `minYear` to `maxYear` inclusive, each `disabled` when the whole year falls outside `[min, max]`. |

The default window is **anchored to the current year** (not the visible year), so navigating far away never drops the current year off the list. Out-of-`[min, max]` entries have `disabled: true`, matching the `CalendarYearOption` shape. Both directives set the native `disabled` attribute on the `<select>` itself when the calendar is disabled.

**Keep `[forCalendarHeading]` in the DOM.** The grid's `aria-labelledby` points at the heading's id. When dropdowns replace the visible heading, keep a visually-hidden `[forCalendarHeading]` so the grid stays named — removing the heading entirely leaves `aria-labelledby` pointing at a missing element.

The lower-level hooks (`visibleMonthNumber()`, `visibleYear()`, `monthOptions()`, `goToMonth()`, `goToYear()`, `isYearDisabled()`) in the table above remain available for any other UI.

## View switching

`ForCalendar` supports two additional views — **month grid** and **year grid** — so users can jump quickly to a different month or year without paging one at a time. All three views share a single `[(view)]` model and the same `focusedDate` cursor.

### Pieces

| Class                    | Selector                   | Role                                                                                                                  |
| ------------------------ | -------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `ForCalendarViewTrigger` | `[forCalendarViewTrigger]` | Button that cycles the view: day → month → year. Auto-disabled when the calendar is disabled.                         |
| `ForCalendarMonthGrid`   | `[forCalendarMonthGrid]`   | 4×3 month grid (`role="grid"`). Exposes `rows()` — array of `CalendarMonthRow`, each with three `CalendarYearOption`. |
| `ForCalendarMonthCell`   | `[forCalendarMonthCell]`   | One month (`role="gridcell"`). Requires `[month]` (1–12). Click drills down to day view for that month.               |
| `ForCalendarYearGrid`    | `[forCalendarYearGrid]`    | 4×3 year grid (`role="grid"`). Exposes `rows()` — array of `CalendarYearRow`, each with three `CalendarYearOption`.   |
| `ForCalendarYearCell`    | `[forCalendarYearCell]`    | One year (`role="gridcell"`). Requires `[year]`. Click drills down to month view for that year.                       |

### `view` model — `ForCalendar`

| API             | Type                                                 | Description                                                                        |
| --------------- | ---------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `view`          | `model<CalendarView>` (`'day' \| 'month' \| 'year'`) | Active view. Default `'day'`. `[(view)]` for two-way binding or read `cal.view()`. |
| `yearBlockSize` | `input<number>`                                      | Years per year-grid page (must be a multiple of 3). Default `12`.                  |

### Usage

```html
<div forCalendar [(value)]="date" #cal="forCalendar">
  <header>
    <button forCalendarPrevButton [ariaLabel]="'Previous'">‹</button>
    <button forCalendarViewTrigger #vt="forCalendarViewTrigger">{{ vt.label() }}</button>
    <button forCalendarNextButton [ariaLabel]="'Next'">›</button>
    <!-- keep a visually-hidden heading so the grid stays labelled -->
    <h2 forCalendarHeading #h="forCalendarHeading" class="sr-only">{{ h.label() }}</h2>
  </header>

  @switch (cal.view()) { @case ('day') {
  <table forCalendarGrid #grid="forCalendarGrid">
    <thead forCalendarGridHeader>
      <tr>
        @for (day of grid.weekDays(); track day.key) {
        <th scope="col" [attr.aria-label]="day.long">{{ day.narrow }}</th>
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
  } @case ('month') {
  <table forCalendarMonthGrid #mg="forCalendarMonthGrid">
    <tbody>
      @for (row of mg.rows(); track row.key) {
      <tr>
        @for (m of row.months; track m.value) {
        <td forCalendarMonthCell [month]="m.value">{{ m.label }}</td>
        }
      </tr>
      }
    </tbody>
  </table>
  } @case ('year') {
  <table forCalendarYearGrid #yg="forCalendarYearGrid">
    <tbody>
      @for (row of yg.rows(); track row.key) {
      <tr>
        @for (y of row.years; track y.value) {
        <td forCalendarYearCell [year]="y.value">{{ y.value }}</td>
        }
      </tr>
      }
    </tbody>
  </table>
  } }
</div>
```

### Keyboard (month / year grids)

| Key                        | Behavior                                                                |
| -------------------------- | ----------------------------------------------------------------------- |
| **ArrowLeft / ArrowRight** | Previous / next cell (RTL-mirrored).                                    |
| **ArrowUp / ArrowDown**    | Previous / next row (three cells per row).                              |
| **Home / End**             | First / last cell in the current row.                                   |
| **PageUp / PageDown**      | Previous / next year (month grid) or previous / next block (year grid). |
| **Enter / Space**          | Select the focused month or year and drill down.                        |
| **Escape**                 | (handled by consumer via `[(view)]`).                                   |

### Prev / next behavior per view

The prev and next buttons (`[forCalendarPrevButton]` / `[forCalendarNextButton]`) are view-aware:

| View    | Prev / Next pages by                          |
| ------- | --------------------------------------------- |
| `day`   | One month (as before).                        |
| `month` | One year.                                     |
| `year`  | One `yearBlockSize` block (default 12 years). |

Auto-disabled when the entire previous / next page would be outside `[min, max]`.

### Data attributes (view switching)

| Piece                    | Attribute          | Values                           |
| ------------------------ | ------------------ | -------------------------------- |
| `[forCalendar]`          | `data-view`        | `"day"` \| `"month"` \| `"year"` |
| `[forCalendarMonthGrid]` | `data-view`        | `"month"` (static)               |
| `[forCalendarYearGrid]`  | `data-view`        | `"year"` (static)                |
| `[forCalendarMonthCell]` | `data-selected`    | present \| absent                |
| `[forCalendarMonthCell]` | `data-today`       | present \| absent                |
| `[forCalendarMonthCell]` | `data-highlighted` | present \| absent                |
| `[forCalendarMonthCell]` | `data-disabled`    | present \| absent                |
| `[forCalendarYearCell]`  | `data-selected`    | present \| absent                |
| `[forCalendarYearCell]`  | `data-today`       | present \| absent                |
| `[forCalendarYearCell]`  | `data-highlighted` | present \| absent                |
| `[forCalendarYearCell]`  | `data-disabled`    | present \| absent                |

## Scope defaults

```ts
import { provideForCalendarDefaults } from 'forty-cdk/calendar';

// app config or a component's providers — Monday-first weeks for this scope
providers: [provideForCalendarDefaults({ firstDayOfWeek: 1 })];
```

## Keyboard

LTR (horizontal arrows mirror under `dir="rtl"`):

| Key                               | Behavior                                                      |
| --------------------------------- | ------------------------------------------------------------- |
| **ArrowLeft / ArrowRight**        | Previous / next day.                                          |
| **ArrowUp / ArrowDown**           | Same weekday, previous / next week.                           |
| **Home / End**                    | First / last day of the focused week.                         |
| **PageUp / PageDown**             | Same day-of-month, previous / next month (re-pages the grid). |
| **Shift+PageUp / Shift+PageDown** | Same month, previous / next year.                             |
| **Enter / Space**                 | Select the focused date.                                      |

Focus that crosses a month boundary re-pages the visible grid and keeps the focused cell in view. Day-of-month is constrained when paging (e.g. Jan 31 → Feb 28). Paging (the prev / next buttons and `PageUp` / `PageDown`) also clamps the focused date into the `[min, max]` range, so it never lands on a cell outside the selectable bounds; day / week arrows still move freely across unavailable dates so keyboard navigation is never trapped.

## Accessibility

Implements the [WAI-ARIA Grid pattern](https://www.w3.org/WAI/ARIA/apg/patterns/grid/).

- **`role="grid"`** on the table, `columnheader` weekday headers, `gridcell` days — the APG Date Picker Dialog technique over a real `<table>`.
- **`aria-labelledby`** wires the grid to the heading so it names the visible period. Paging the month is announced through a dedicated off-screen `aria-live="polite"` region (owned by `[forCalendar]`), so the period is read on navigation without the heading double-announcing as both a live region and the grid's label.
- **`aria-label`** on every cell carries the full localized date (e.g. `"Monday, June 15, 2026"`) so screen readers announce the whole date, not the bare day number that stays the cell's visible content. Outside-month padding days are suffixed (`" (outside month)"`) so they are distinguishable. Override the format via `ForCalendar`'s `dateLabel` input.
- **`aria-selected`** is always emitted (`"true"` / `"false"`); **`aria-current="date"`** marks today; **`aria-disabled`** marks unavailable dates (truthy-only).
- **Roving tabindex**: exactly one cell (the focused date) is tabbable. `Tab` enters and leaves the grid in one stop.
- **Boolean `data-*`** on the cell — `data-selected`, `data-today`, `data-highlighted` (the focused/roving cell), `data-disabled`, `data-outside-month` — present when true, absent when false.

## Styling

forty-cdk ships no styles. Add your own class to each piece — the `forCalendar*` selectors are the behavior API, not a styling contract (see [Styling forty-cdk](../../../../../docs/styling.md)). Key your CSS off the reflected `data-*` attributes listed under [Data attributes](#data-attributes).

```css
.calendar-cell {
  cursor: pointer;
}
.calendar-cell[data-selected] {
  background: var(--accent);
  color: white;
}
.calendar-cell[data-today] {
  outline: 1px solid var(--accent);
}
.calendar-cell[data-outside-month] {
  opacity: 0.4;
}
.calendar-cell[data-disabled] {
  cursor: default;
  opacity: 0.3;
}
```

## SSR

The active adapter's `today()` and `format()` resolve against the **runtime** time zone and default locale. Rendered on the server they reflect the _server's_ environment, so a render near midnight (or under a different server locale) can disagree with the browser by up to a day — `ForCalendar` reads `today()` once to mark the `data-today` / `aria-current="date"` cell, so the mismatch surfaces there as a hydration error and a flicker. For SSR, pin a fixed "today" / time zone / locale for both environments, or defer the today-highlight so it only computes client-side:

```ts
import { ChangeDetectionStrategy, Component, afterNextRender, signal } from '@angular/core';
import { CalendarDate, today, getLocalTimeZone } from '@internationalized/date';

@Component({
  selector: 'app-date',
  changeDetection: ChangeDetectionStrategy.OnPush,
  /* ... */
})
export class DatePage {
  readonly date = signal<CalendarDate | null>(null);

  constructor() {
    afterNextRender(() => this.date.set(today(getLocalTimeZone())));
  }
}
```

# Calendar

Headless single-date calendar grid following the [WAI-ARIA Grid pattern](https://www.w3.org/WAI/ARIA/apg/patterns/grid/) — the date table at the heart of the APG [Date Picker Dialog](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/examples/datepicker-dialog/) example. Roving-tabindex focus management, full grid keyboard interaction (arrows / `Home` / `End` / `PageUp` / `PageDown` / `Shift+PageUp` / `Shift+PageDown`), focus paging across month boundaries, `aria-current="date"` on today, `min` / `max` / per-date availability, RTL arrow mirroring, and a pluggable, date-library-agnostic `DateAdapter<D>`.

`ForCalendar` is the grid widget, **not a form value** — it exposes `[(value)]` as a `model<D | null>`. The form-control contract (`FormValueControl<D>`) arrives with the follow-up `ForDatePicker` / `ForDateField`.

## Date adapter — pick one (required)

All date math goes through a `DateAdapter<D>`, so the library hard-depends on **no** date library. Provide exactly one adapter in your application (or component) providers:

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

`@internationalized/date` is the immutable date primitive React Aria and Ark UI build on; it works in every browser today with no polyfill, and its reference-equality-on-mutation makes it signal-friendly. Both `@internationalized/date` adapters operate on the **Gregorian** calendar today — `createDate` always builds a Gregorian date, so the grid stays Gregorian regardless of the runtime locale. True non-Gregorian calendar systems are deferred to the planned `Temporal.PlainDate` adapter ([#354](https://github.com/tutkli/forty-cdk/issues/354)), a non-breaking addition once the Temporal API is broadly available across browsers — the `DateAdapter<D>` seam means adopting it later is a drop-in, not a migration.

## Pieces

| Class                   | Selector                  | Role                                                                                                |
| ----------------------- | ------------------------- | --------------------------------------------------------------------------------------------------- |
| `ForCalendar`           | `[forCalendar]`           | Root. Owns `value`, the focused date, the visible month, and the shared context.                    |
| `ForCalendarHeading`    | `[forCalendarHeading]`    | Month/year title and the grid's `aria-labelledby` target; its text is set to the visible period.    |
| `ForCalendarPrevButton` | `[forCalendarPrevButton]` | Pages to the previous month. Auto-disabled at the `min` bound.                                      |
| `ForCalendarNextButton` | `[forCalendarNextButton]` | Pages to the next month. Auto-disabled at the `max` bound.                                          |
| `ForCalendarGrid`       | `[forCalendarGrid]`       | Date table (`role="grid"`, `aria-labelledby` the heading). Exposes `weekDays()` / `weeks()`.        |
| `ForCalendarGridHeader` | `[forCalendarGridHeader]` | Header rowgroup (`role="rowgroup"`) holding the weekday `columnheader`s. Also exposes `weekDays()`. |
| `ForCalendarCell`       | `[forCalendarCell]`       | One day (`role="gridcell"`). Roving tab stop, ARIA state, and keyboard / click interaction.         |

## Inputs / models — `ForCalendar`

| API                 | Type                                   | Description                                                                                                                  |
| ------------------- | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `value`             | `model<D \| null>`                     | Two-way bindable selected date, or `null`. Used in `selectionMode="single"`. `(valueChange)` fires only on internal selection. Default `null`. |
| `selectionMode`     | `input<'single' \| 'range'>`           | `'single'` (default) keeps the single-date `value` flow. `'range'` switches to anchor → commit and exposes `range`.         |
| `range`             | `model<CalendarDateRange<D> \| null>`  | Two-way bindable committed range. Only used in `selectionMode="range"`. `(rangeChange)` fires only on internal commits/clears. Default `null`. |
| `minRangeLength`    | `input<number \| null>`                | Minimum inclusive day count. A commit shorter than this is a no-op. Default `null` (no minimum).                            |
| `maxRangeLength`    | `input<number \| null>`                | Maximum inclusive day count. A commit longer than this is a no-op. Default `null` (no maximum).                             |
| `min`               | `input<D \| null>`                     | Minimum selectable date (inclusive). Earlier dates are unavailable. Default `null`.                                          |
| `max`               | `input<D \| null>`                     | Maximum selectable date (inclusive). Later dates are unavailable. Default `null`.                                            |
| `isDateUnavailable` | `input<(date: D) => boolean>`          | Per-date predicate marking a date unavailable (present but not selectable). Default `() => false`.                           |
| `dateLabel`         | `input<CalendarDateLabelFormatter<D>>` | Formats each gridcell's `aria-label` (full accessible date). Default: localized full date, outside-month days suffixed.      |
| `disabled`          | `input<boolean>`                       | Disables the whole calendar (no focus movement, no selection). Reflected as `data-disabled`.                                 |
| `readonly`          | `input<boolean>`                       | Read-only: dates stay focusable, selection is blocked. Reflected as `data-readonly`.                                         |
| `firstDayOfWeek`    | `input<number \| null>`                | First column's weekday, **0-6** (`0` = Sunday). Default `null` → the adapter's value (or `provideForCalendarDefaults`).      |
| `dir`               | `input<'ltr' \| 'rtl' \| null>`        | Writing direction. Default `null` resolves the ambient direction; reflected to the host `dir` and mirrors horizontal arrows. |

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

| Attribute            | Present when                                                                      |
| -------------------- | --------------------------------------------------------------------------------- |
| `data-range-start`   | Cell is the start of the effective range (committed idle, or preview selecting)   |
| `data-range-end`     | Cell is the end of the effective range                                            |
| `data-in-range`      | Cell is within the **committed** range, inclusive (idle only)                     |
| `data-range-preview` | Cell is within the **preview** band, inclusive (selecting only)                   |

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

**`aria-selected`** in range mode is `"true"` across every committed-range cell (inclusive), matching React Aria's range calendar semantics. During selecting (range null), it is `"false"` everywhere.

**v1 scope.** Range mode is day-granular only — `granularity` / time is orthogonal and not supported in v1.

## Styling

forty-cdk ships no styles. Add your own class to each piece — the `forCalendar*` selectors are the behavior API, not a styling contract (see [Styling forty-cdk](../../../../../docs/styling.md)). Key your CSS off the reflected `data-*` attributes below.

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

## Scope defaults

```ts
import { provideForCalendarDefaults } from 'forty-cdk';

// app config or a component's providers — Monday-first weeks for this scope
providers: [provideForCalendarDefaults({ firstDayOfWeek: 1 })];
```

## SSR / hydration

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

## Accessibility notes

- **`role="grid"`** on the table, `columnheader` weekday headers, `gridcell` days — the APG Date Picker Dialog technique over a real `<table>`.
- **`aria-labelledby`** wires the grid to the heading so it names the visible period. Paging the month is announced through a dedicated off-screen `aria-live="polite"` region (owned by `[forCalendar]`), so the period is read on navigation without the heading double-announcing as both a live region and the grid's label.
- **`aria-label`** on every cell carries the full localized date (e.g. `"Monday, June 15, 2026"`) so screen readers announce the whole date, not the bare day number that stays the cell's visible content. Outside-month padding days are suffixed (`" (outside month)"`) so they are distinguishable. Override the format via `ForCalendar`'s `dateLabel` input.
- **`aria-selected`** is always emitted (`"true"` / `"false"`); **`aria-current="date"`** marks today; **`aria-disabled`** marks unavailable dates (truthy-only).
- **Roving tabindex**: exactly one cell (the focused date) is tabbable. `Tab` enters and leaves the grid in one stop.
- **Boolean `data-*`** on the cell — `data-selected`, `data-today`, `data-highlighted` (the focused/roving cell), `data-disabled`, `data-outside-month` — present when true, absent when false.

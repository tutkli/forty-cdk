# DateRangeField

A segmented date (and optional time) range input over a pluggable date adapter: two labelled spinbutton endpoints (start / end) sharing locale, granularity and bounds. Implements FormValueControl, so the committed range auto-wires with Signal Forms — null until both endpoints are filled and ordered.

Headless, segmented, spin-editable — the keyboard-first, form-capable counterpart to [DateRangePicker](../date-picker/README.md). There is **no single WAI-ARIA APG pattern** for a range field; it is a composition of two labelled `role="group"` endpoints (start / end), each holding a row of spinbutton segments — the same machinery as [DateField](../date-field/README.md) — nested inside one outer `role="group"`. Segment **order** and separators follow the runtime locale (`MM/DD/YYYY` vs `DD.MM.YYYY` vs `YYYY/MM/DD`).

`ForDateRangeField` implements `FormValueControl<DateRange<D> | null>` from `@angular/forms/signals` — the **same** contract as `ForDateRangePicker` — so the committed range auto-wires with `[formField]` and auto-associates inside a `[forField]` (label / description / error) with no extra markup. The value stays `null` until **both** endpoints are fully entered and ordered (`start <= end`); a half-entered or out-of-order range never reaches the form.

## Date adapter

Pick one (required). All date math goes through the same pluggable `DateAdapter<D>` as `ForCalendar`, so the library hard-depends on **no** date library. Provide exactly one adapter in your application (or component) providers:

| Provider                                | Date type `D`                              | Dependency                                                                                                |
| --------------------------------------- | ------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| `provideInternationalizedDateAdapter()` | `CalendarDate` (`@internationalized/date`) | **Recommended.** From `forty-cdk/internationalized-date`; needs `@internationalized/date` (optional peer) |
| `provideNativeDateAdapter()`            | `Date`                                     | None (zero-dependency fallback)                                                                           |

## Anatomy

```html
<div forDateRangeField [(value)]="stay" ariaLabel="Stay">
  <div forDateRangeFieldStart #start="forDateRangeFieldStart">
    @for (seg of start.segments(); track seg.id) {
    <!-- seg.isLiteral → a decorative separator, else an editable segment -->
    <span forDateRangeFieldLiteral>{{ seg.text }}</span>
    <span forDateRangeFieldSegment [segment]="seg.type!">{{ seg.text }}</span>
    }
  </div>
  <span aria-hidden="true">–</span>
  <div forDateRangeFieldEnd #end="forDateRangeFieldEnd">
    @for (seg of end.segments(); track seg.id) {
    <span forDateRangeFieldLiteral>{{ seg.text }}</span>
    <span forDateRangeFieldSegment [segment]="seg.type!">{{ seg.text }}</span>
    }
  </div>
</div>
```

## Examples

### Stand-alone

```ts
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { CalendarDate } from '@internationalized/date';
import {
  type DateRange,
  ForDateRangeField,
  ForDateRangeFieldEnd,
  ForDateRangeFieldLiteral,
  ForDateRangeFieldSegment,
  ForDateRangeFieldStart,
} from 'forty-cdk/date-range-field';

@Component({
  selector: 'app-stay',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ForDateRangeField,
    ForDateRangeFieldStart,
    ForDateRangeFieldEnd,
    ForDateRangeFieldSegment,
    ForDateRangeFieldLiteral,
  ],
  template: `
    <div forDateRangeField class="range-field" [(value)]="stay" [ariaLabel]="'Stay'">
      <div forDateRangeFieldStart class="range-endpoint" #start="forDateRangeFieldStart">
        @for (seg of start.segments(); track seg.id) {
          @if (seg.isLiteral) {
            <span forDateRangeFieldLiteral>{{ seg.text }}</span>
          } @else {
            <span forDateRangeFieldSegment class="range-segment" [segment]="seg.type!">{{
              seg.text
            }}</span>
          }
        }
      </div>
      <span aria-hidden="true">–</span>
      <div forDateRangeFieldEnd class="range-endpoint" #end="forDateRangeFieldEnd">
        @for (seg of end.segments(); track seg.id) {
          @if (seg.isLiteral) {
            <span forDateRangeFieldLiteral>{{ seg.text }}</span>
          } @else {
            <span forDateRangeFieldSegment class="range-segment" [segment]="seg.type!">{{
              seg.text
            }}</span>
          }
        }
      </div>
    </div>
  `,
})
export class StayField {
  readonly stay = signal<DateRange<CalendarDate> | null>(null);
}
```

### Signal Forms

```ts
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { form } from '@angular/forms/signals';
import { CalendarDate } from '@internationalized/date';
import {
  type DateRange,
  ForDateRangeField,
  ForDateRangeFieldEnd,
  ForDateRangeFieldLiteral,
  ForDateRangeFieldSegment,
  ForDateRangeFieldStart,
} from 'forty-cdk/date-range-field';

@Component({
  selector: 'app-stay-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ForDateRangeField,
    ForDateRangeFieldStart,
    ForDateRangeFieldEnd,
    ForDateRangeFieldSegment,
    ForDateRangeFieldLiteral,
  ],
  template: `
    <div forDateRangeField class="range-field" [formField]="booking.stay" [ariaLabel]="'Stay'">
      <div forDateRangeFieldStart class="range-endpoint" #start="forDateRangeFieldStart">
        @for (seg of start.segments(); track seg.id) {
          @if (seg.isLiteral) {
            <span forDateRangeFieldLiteral>{{ seg.text }}</span>
          } @else {
            <span forDateRangeFieldSegment class="range-segment" [segment]="seg.type!">{{
              seg.text
            }}</span>
          }
        }
      </div>
      <span aria-hidden="true">–</span>
      <div forDateRangeFieldEnd class="range-endpoint" #end="forDateRangeFieldEnd">
        @for (seg of end.segments(); track seg.id) {
          @if (seg.isLiteral) {
            <span forDateRangeFieldLiteral>{{ seg.text }}</span>
          } @else {
            <span forDateRangeFieldSegment class="range-segment" [segment]="seg.type!">{{
              seg.text
            }}</span>
          }
        }
      </div>
    </div>
  `,
})
export class StayFormField {
  readonly model = signal({ stay: null as DateRange<CalendarDate> | null });
  readonly booking = form(this.model);
}
```

## API

### `ForDateRangeField`

| Property      | Type                                                  | Description                                                                                                                                       |
| ------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `value`       | `model<DateRange<D> \| null>`                         | Two-way bindable committed range, or `null` while incomplete or out of order. The `FormValueControl` backing.<br>**Default:** `null`              |
| `minDate`     | `input<D \| null>`                                    | Minimum date (inclusive) for both endpoints. A composed endpoint below it is clamped up. Named `minDate` — see note below.<br>**Default:** `null` |
| `maxDate`     | `input<D \| null>`                                    | Maximum date (inclusive) for both endpoints. A composed endpoint above it is clamped down.<br>**Default:** `null`                                 |
| `granularity` | `input<'day' \| 'hour' \| 'minute' \| 'second'>`      | Date-time precision shared by both endpoints. `'day'` is date-only; coarser-than-day appends time segments.<br>**Default:** `'day'`               |
| `hourCycle`   | `input<12 \| 24 \| null>`                             | 12/24-hour cycle for the time segments. `null` → locale. 12-hour adds the AM/PM segment.<br>**Default:** `null`                                   |
| `locale`      | `input<string \| null>`                               | BCP 47 locale driving segment order, separators, and month name. `null` → runtime locale.<br>**Default:** `null`                                  |
| `placeholder` | `input<Partial<Record<DateTimeSegmentType, string>>>` | Per-segment placeholder while empty, applied to both endpoints.<br>**Default:** `{}`                                                              |
| `ariaLabel`   | `input<string \| null>`                               | Accessible name for the whole range field group. Emits no `aria-label` while `null`.<br>**Default:** `null`                                       |
| `dir`         | `input<'ltr' \| 'rtl' \| null>`                       | Writing direction. `null` resolves the ambient direction; mirrors ArrowLeft / ArrowRight segment navigation.<br>**Default:** `null`               |

The endpoint groups (`[forDateRangeFieldStart]` / `[forDateRangeFieldEnd]`) each accept an `ariaLabel` input for their own group label, falling back to the scope defaults (`'Start date'` / `'End date'`).

Plus the shared `FormUiControl` members from `@angular/forms/signals`: `disabled`, `readonly`, `required`, `invalid`, `name`, `errors`, `touched` (bound automatically by `[formField]`).

> **Why `minDate` / `maxDate`, not `min` / `max`?** `FormUiControl.min` / `max` are reserved members typed `number | undefined` for numeric validators, and additionally typed `NonNullable<TValue>` (the range object itself), which is meaningless as a bound — so the date bounds use distinct names.

### Data attributes

| Piece                        | Attribute          | Values            |
| ---------------------------- | ------------------ | ----------------- |
| `[forDateRangeField]`        | `data-disabled`    | present \| absent |
| `[forDateRangeField]`        | `data-readonly`    | present \| absent |
| `[forDateRangeField]`        | `data-empty`       | present \| absent |
| `[forDateRangeField]`        | `data-range-error` | present \| absent |
| `[forDateRangeFieldSegment]` | `data-highlighted` | present \| absent |
| `[forDateRangeFieldSegment]` | `data-placeholder` | present \| absent |
| `[forDateRangeFieldSegment]` | `data-disabled`    | present \| absent |
| `[forDateRangeFieldSegment]` | `data-readonly`    | present \| absent |

`data-empty` marks the whole field while the range is `null` (either endpoint unfilled, or the two out of order); `data-range-error` marks the specific case of two complete but out-of-order endpoints; `data-placeholder` marks each individual segment that is still empty. `data-highlighted` is the current roving-tabindex segment — the only focus hook the consumer gets, shared with the other roving primitives.

## Ordering

The two endpoints are typed independently, so order is not guaranteed by construction the way the picker's two-click flow guarantees it. The field preserves the `DateRange` `end >= start` invariant by **never emitting an out-of-order range**: when both endpoints are complete but `start > end`, the typed segments are kept (not silently rewritten), `value` stays `null`, and the root reflects `aria-invalid="true"` + `data-range-error` so the disorder is perceivable and stylable. Editing either endpoint back into order emits the range.

## Date-time range

Set `granularity` to `'hour'`, `'minute'`, or `'second'` (`granularity > 'day'`) to append time segments to **each** endpoint — hour / minute / second and, in 12-hour mode, an AM·PM `dayPeriod`. This needs a **time-capable** adapter — `provideNativeDateAdapter()` (`Date`) or `provideInternationalizedDateTimeAdapter()` (`CalendarDateTime`); the day-only `provideInternationalizedDateAdapter()` (`CalendarDate`) throws.

## Scope defaults

```ts
import { provideForDateRangeFieldDefaults } from 'forty-cdk/date-range-field';

// app config or a component's providers — localize the endpoint group labels,
// segment labels, and the empty-segment announcement for every nested field.
providers: [
  provideForDateRangeFieldDefaults({
    emptySegmentText: 'Vacío',
    startLabel: 'Desde',
    endLabel: 'Hasta',
    segmentLabels: { day: 'día', month: 'mes', year: 'año', dayPeriod: 'AM/PM' },
  }),
];
```

`startLabel` / `endLabel` supply each endpoint group's default `aria-label`; `segmentLabels` supplies each segment's default `aria-label`, keyed by part type. Unset keys keep the library default, so overriding a single key never wipes the rest. An endpoint's own `[ariaLabel]`, or a segment's own `[ariaLabel]`, still wins over the scope default.

## Keyboard

Key behavior applies per segment. Each endpoint is its own tab stop, so `Tab` moves from the start group to the end group to the next control; arrows move between segments **within** an endpoint. Horizontal arrows mirror under `dir="rtl"`.

| Key                        | Behavior                                                                 |
| -------------------------- | ------------------------------------------------------------------------ |
| **0–9**                    | Type the value; auto-advances to the next segment when full.             |
| **ArrowUp / ArrowDown**    | Step the value. Day and month wrap; year clamps. Empty seeds from today. |
| **ArrowLeft / ArrowRight** | Move to the previous / next segment in the same endpoint (no wrap).      |
| **Home / End**             | Jump to the segment minimum / maximum.                                   |
| **Backspace / Delete**     | Clear the segment (the range becomes `null` until refilled).             |

The day clamps to the current month's length (e.g. 31 → 28 in February), and each composed endpoint is clamped into `[minDate, maxDate]`.

## Accessibility

Each segment implements the [WAI-ARIA Spinbutton pattern](https://www.w3.org/WAI/ARIA/apg/patterns/spinbutton/); there is no single APG pattern for a range field, so the field composes them inside nested labelled `role="group"` endpoints.

- **`role="group"`** on the root carries the field's accessible name (`ariaLabel`, or point native `aria-labelledby` at a visible label); each endpoint is its own labelled `role="group"`.
- **`role="spinbutton"`** per segment, with `aria-valuemin` / `aria-valuemax` / `aria-valuenow` reflected; the month segment also exposes a localized `aria-valuetext` ("March").
- **Roving tabindex per endpoint**: exactly one segment per endpoint is tabbable, so `Tab` steps start group → end group; arrows move between segments within an endpoint.
- **`aria-invalid="true"`** is reflected on the root when the form marks it invalid **or** when two complete endpoints are out of order.
- **Literals are `aria-hidden`** and never focusable — assistive tech reads only the spinbutton segments.

## Styling

forty-cdk ships no styles. Add your own class to each piece — the for\* selectors are the behavior API, not a styling contract (see [Styling forty-cdk](../../../../../docs/styling.md)). Key your CSS off the reflected data-\* attributes listed under [Data attributes](#data-attributes).

## Wrapping in a design system

Both supported wrapper patterns — `hostDirectives` with the exported `FOR_DATE_RANGE_FIELD_HOST_DIRECTIVE_INPUTS` / `FOR_DATE_RANGE_FIELD_HOST_DIRECTIVE_OUTPUTS` name tuples, and subclassing — are documented in [Wrapping form primitives](../../../../../docs/wrapping-form-primitives.md).

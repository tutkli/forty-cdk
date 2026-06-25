# TimeRangeField

Headless, segmented, spin-editable time-of-day **range** input — the keyboard-first, form-capable time analog of [DateRangeField](../date-range-field/README.md). There is **no single WAI-ARIA APG pattern** for a range field; it is a composition of two labelled `role="group"` endpoints (start / end), each holding a row of [Spinbuttons](https://www.w3.org/WAI/ARIA/apg/patterns/spinbutton/) — the same machinery as [TimeField](../time-field/README.md) — nested inside one outer `role="group"`. Segment **order**, the separators between them, and whether an AM/PM segment is shown follow the runtime locale and the resolved hour cycle.

`ForTimeRangeField` implements `FormValueControl<CalendarDateRange<D> | null>` from `@angular/forms/signals` — the **same** contract as `ForDateRangeField` — so the committed range auto-wires with `[formField]` and auto-associates inside a `[forField]` (label / description / error) with no extra markup. The value stays `null` until **both** endpoints are fully entered and ordered (`start <= end`); a half-entered or out-of-order range never reaches the form.

## Date adapter — pick a time-capable one (required)

All time math goes through the same pluggable `DateAdapter<D>` as `ForCalendar`, so the library hard-depends on **no** date library. The range field needs the adapter's optional time accessors, so provide a **time-capable** adapter:

| Provider                                    | Date-time type `D`                             | Dependency                                                                                                |
| ------------------------------------------- | ---------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `provideInternationalizedDateTimeAdapter()` | `CalendarDateTime` (`@internationalized/date`) | **Recommended.** From `forty-cdk/internationalized-date`; needs `@internationalized/date` (optional peer) |
| `provideNativeDateAdapter()`                | `Date`                                         | None (zero-dependency fallback)                                                                           |

> The day-only `provideInternationalizedDateAdapter()` (`CalendarDate`) cannot carry a time — `ForTimeRangeField` throws a descriptive error if it is the active adapter.

Each endpoint anchors its wall-clock time on a fixed, DST-stable sentinel date (`2000-01-01`) while no value is bound, exactly as `ForTimeField` does, so the two endpoints compare by time-of-day and a time always round-trips to the same instant. Bind an existing range as `value` to edit its endpoints' times in place (each endpoint's calendar day is preserved).

## Pieces

| Class                      | Selector                     | Role                                                                                                         |
| -------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `ForTimeRangeField`        | `[forTimeRangeField]`        | Root (`role="group"`). Owns both endpoint engines, composes the `CalendarDateRange`, the `FormValueControl`. |
| `ForTimeRangeFieldStart`   | `[forTimeRangeFieldStart]`   | Start endpoint group (`role="group"`). Its own tab stop; exposes `segments()`.                               |
| `ForTimeRangeFieldEnd`     | `[forTimeRangeFieldEnd]`     | End endpoint group (`role="group"`). Its own tab stop; exposes `segments()`.                                 |
| `ForTimeRangeFieldSegment` | `[forTimeRangeFieldSegment]` | One editable part (`role="spinbutton"`). Roving tab stop, ARIA value reflection, keyboard editing.           |
| `ForTimeRangeFieldLiteral` | `[forTimeRangeFieldLiteral]` | A decorative separator (`:`, a space). `aria-hidden`, out of the tab order.                                  |

## Inputs / models — `ForTimeRangeField`

| API           | Type                                              | Description                                                                                                                   |
| ------------- | ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `value`       | `model<CalendarDateRange<D> \| null>`             | Two-way bindable committed range, or `null` while incomplete or out of order. The `FormValueControl` backing. Default `null`. |
| `minTime`     | `input<D \| null>`                                | Earliest time-of-day (inclusive) for both endpoints. A composed endpoint earlier is clamped up. See note below.               |
| `maxTime`     | `input<D \| null>`                                | Latest time-of-day (inclusive) for both endpoints. A composed endpoint later is clamped down. Default `null`.                 |
| `granularity` | `input<'hour' \| 'minute' \| 'second'>`           | Smallest editable unit shared by both endpoints. Default `'minute'`.                                                          |
| `hourCycle`   | `input<12 \| 24 \| null>`                         | 12/24-hour cycle. Default `null` → locale. 12-hour adds the AM/PM segment to each endpoint.                                   |
| `locale`      | `input<string \| null>`                           | BCP 47 locale driving segment order, separators, and AM/PM names. Default `null` → runtime locale.                            |
| `placeholder` | `input<Partial<Record<TimeSegmentType, string>>>` | Per-segment placeholder while empty, applied to both endpoints. Default `{}`.                                                 |
| `ariaLabel`   | `input<string \| null>`                           | Accessible name for the whole range field group. Emits no `aria-label` while `null`. Default `null`.                          |
| `dir`         | `input<'ltr' \| 'rtl' \| null>`                   | Writing direction. Default `null` resolves the ambient direction; mirrors ArrowLeft / ArrowRight segment navigation.          |

The endpoint groups (`[forTimeRangeFieldStart]` / `[forTimeRangeFieldEnd]`) each accept an `ariaLabel` input for their own group label, falling back to the scope defaults (`'Start time'` / `'End time'`).

Plus the shared `FormUiControl` members from `@angular/forms/signals`: `disabled`, `readonly`, `required`, `invalid`, `name`, `errors`, `touched` (bound automatically by `[formField]`).

> **Why `minTime` / `maxTime`, not `min` / `max`?** `FormUiControl.min` / `max` are reserved members typed `number | undefined` for numeric validators, and additionally typed `NonNullable<TValue>` (the range object itself), which is meaningless as a bound — so the time bounds use distinct names. Only the time-of-day component of the bounds is considered.

## Usage

```ts
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { CalendarDateTime } from '@internationalized/date';
import { CalendarDateRange } from 'forty-cdk/calendar';
import {
  ForTimeRangeField,
  ForTimeRangeFieldEnd,
  ForTimeRangeFieldLiteral,
  ForTimeRangeFieldSegment,
  ForTimeRangeFieldStart,
} from 'forty-cdk/time-range-field';

@Component({
  selector: 'app-opening-hours',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ForTimeRangeField,
    ForTimeRangeFieldStart,
    ForTimeRangeFieldEnd,
    ForTimeRangeFieldSegment,
    ForTimeRangeFieldLiteral,
  ],
  template: `
    <div forTimeRangeField class="range-field" [(value)]="hours" [ariaLabel]="'Opening hours'">
      <div forTimeRangeFieldStart class="range-endpoint" #start="forTimeRangeFieldStart">
        @for (seg of start.segments(); track seg.id) {
          @if (seg.isLiteral) {
            <span forTimeRangeFieldLiteral>{{ seg.text }}</span>
          } @else {
            <span forTimeRangeFieldSegment class="range-segment" [segment]="seg.type!">{{
              seg.text
            }}</span>
          }
        }
      </div>
      <span aria-hidden="true">–</span>
      <div forTimeRangeFieldEnd class="range-endpoint" #end="forTimeRangeFieldEnd">
        @for (seg of end.segments(); track seg.id) {
          @if (seg.isLiteral) {
            <span forTimeRangeFieldLiteral>{{ seg.text }}</span>
          } @else {
            <span forTimeRangeFieldSegment class="range-segment" [segment]="seg.type!">{{
              seg.text
            }}</span>
          }
        }
      </div>
    </div>
  `,
})
export class OpeningHoursField {
  readonly hours = signal<CalendarDateRange<CalendarDateTime> | null>(null);
}
```

## Ordering

The two endpoints are typed independently, so order is not guaranteed by construction. The field preserves the `CalendarDateRange` `end >= start` invariant by **never emitting an out-of-order range**: when both endpoints are complete but `start > end`, the typed segments are kept (not silently rewritten), `value` stays `null`, and the root reflects `aria-invalid="true"` + `data-range-error` so the disorder is perceivable and stylable. Editing either endpoint back into order emits the range.

## Keyboard (per segment)

Each endpoint is its own tab stop, so `Tab` moves from the start group to the end group to the next control; arrows move between segments **within** an endpoint. Horizontal arrows mirror under `dir="rtl"`.

| Key                        | Behavior                                                                                           |
| -------------------------- | -------------------------------------------------------------------------------------------------- |
| **0–9**                    | Type the value; auto-advances to the next segment when full.                                       |
| **a / p**                  | On the AM/PM segment, set the period of the entered hour.                                          |
| **ArrowUp / ArrowDown**    | Step the value. Hour / minute / second wrap; the AM/PM segment toggles. Empty seeds from midnight. |
| **ArrowLeft / ArrowRight** | Move to the previous / next segment in the same endpoint (no wrap).                                |
| **Home / End**             | Jump to the segment minimum / maximum (the AM/PM segment → AM / PM).                               |
| **Backspace / Delete**     | Clear a numeric segment (the range becomes `null` until refilled).                                 |

Each composed endpoint is clamped into `[minTime, maxTime]` by time-of-day. The AM/PM period is derived from the entered hour; clearing it is a no-op (clear or step the hour instead).

## Scope defaults

```ts
import { provideForTimeRangeFieldDefaults } from 'forty-cdk/time-range-field';

// app config or a component's providers — localize the endpoint group labels,
// segment labels, and the empty-segment announcement for every nested field.
providers: [
  provideForTimeRangeFieldDefaults({
    emptySegmentText: 'Vacío',
    startLabel: 'Desde',
    endLabel: 'Hasta',
    segmentLabels: { hour: 'hora', minute: 'minuto', second: 'segundo', dayPeriod: 'AM/PM' },
  }),
];
```

`startLabel` / `endLabel` supply each endpoint group's default `aria-label`; `segmentLabels` supplies each segment's default `aria-label`, keyed by part type. Unset keys keep the library default, so overriding a single key never wipes the rest. An endpoint's own `[ariaLabel]`, or a segment's own `[ariaLabel]`, still wins over the scope default.

## Styling

forty-cdk ships no styles. Add your own class to each piece — the for\* selectors are the behavior API, not a styling contract (see [Styling forty-cdk](../../../../../docs/styling.md)). Key your CSS off the reflected data-\* attributes below.

### Data attributes

| Piece                        | Attribute          | Values            |
| ---------------------------- | ------------------ | ----------------- |
| `[forTimeRangeField]`        | `data-disabled`    | present \| absent |
| `[forTimeRangeField]`        | `data-readonly`    | present \| absent |
| `[forTimeRangeField]`        | `data-empty`       | present \| absent |
| `[forTimeRangeField]`        | `data-range-error` | present \| absent |
| `[forTimeRangeFieldSegment]` | `data-highlighted` | present \| absent |
| `[forTimeRangeFieldSegment]` | `data-placeholder` | present \| absent |
| `[forTimeRangeFieldSegment]` | `data-disabled`    | present \| absent |
| `[forTimeRangeFieldSegment]` | `data-readonly`    | present \| absent |

`data-empty` marks the whole field while the range is `null` (either endpoint unfilled, or the two out of order); `data-range-error` marks the specific case of two complete but out-of-order endpoints; `data-placeholder` marks each individual segment that is still empty. `data-highlighted` is the current roving-tabindex segment — the only focus hook the consumer gets, shared with the other roving primitives.

## Accessibility notes

- **`role="group"`** on the root carries the field's accessible name (`ariaLabel`, or point native `aria-labelledby` at a visible label); each endpoint is its own labelled `role="group"`.
- **`role="spinbutton"`** per segment, with `aria-valuemin` / `aria-valuemax` / `aria-valuenow` reflected; the AM/PM segment also exposes a localized `aria-valuetext` ("AM" / "PM").
- **Roving tabindex per endpoint**: exactly one segment per endpoint is tabbable, so `Tab` steps start group → end group; arrows move between segments within an endpoint.
- **`aria-invalid="true"`** is reflected on the root when the form marks it invalid **or** when two complete endpoints are out of order.
- **Literals are `aria-hidden`** and never focusable — assistive tech reads only the spinbutton segments.

## Wrapping in a design system

Both supported wrapper patterns — `hostDirectives` with the exported `FOR_TIME_RANGE_FIELD_HOST_DIRECTIVE_INPUTS` / `FOR_TIME_RANGE_FIELD_HOST_DIRECTIVE_OUTPUTS` name tuples, and subclassing — are documented in [Wrapping form primitives](../../../../../docs/wrapping-form-primitives.md).

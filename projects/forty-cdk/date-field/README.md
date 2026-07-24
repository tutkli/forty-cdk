# DateField

A segmented date (and optional time) input over a pluggable date adapter — each part a spinbutton with keyboard stepping, locale-driven segment order and min / max clamping.

The keyboard-first counterpart to [Calendar](../calendar/README.md): each day / month / year part is an independent `role="spinbutton"` segment inside a labelled `role="group"`, so entry is unambiguous and locale-correct — no free-text parsing, no `03/04`-is-it-March-4th guesswork. Segment **order** and separators follow the runtime locale (`MM/DD/YYYY` vs `DD.MM.YYYY` vs `YYYY/MM/DD`).

`ForDateField` implements `FormValueControl<D | null>` from `@angular/forms/signals`, so it auto-wires with `[formField]` and auto-associates inside a `[forField]` (label / description / error) with no extra markup. The value stays `null` until every segment is filled.

## Date adapter

Pick one (required). All date math goes through the same pluggable `DateAdapter<D>` as `ForCalendar`, so the library hard-depends on **no** date library. Provide exactly one adapter in your application (or component) providers:

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

## Anatomy

```html
<div forDateField [(value)]="date" ariaLabel="Date" #field="forDateField">
  <!-- field.segments() yields the locale-ordered parts; render each one: -->
  <!-- literal separator (/, ., -) — aria-hidden, out of the tab order -->
  <span forDateFieldLiteral>{{ seg.text }}</span>
  <!-- editable part — role="spinbutton", one roving tab stop -->
  <span forDateFieldSegment [segment]="seg.type">{{ seg.text }}</span>
</div>
```

## Examples

### Stand-alone

```ts
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { CalendarDate } from '@internationalized/date';
import { ForDateField, ForDateFieldLiteral, ForDateFieldSegment } from 'forty-cdk/date-field';

@Component({
  selector: 'app-dob',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForDateField, ForDateFieldSegment, ForDateFieldLiteral],
  template: `
    <div
      forDateField
      class="date-field"
      [(value)]="date"
      [ariaLabel]="'Date of birth'"
      #field="forDateField"
    >
      @for (seg of field.segments(); track seg.id) {
        @if (seg.isLiteral) {
          <span forDateFieldLiteral>{{ seg.text }}</span>
        } @else {
          <span forDateFieldSegment class="date-field-segment" [segment]="seg.type!">{{
            seg.text
          }}</span>
        }
      }
    </div>
  `,
})
export class DobField {
  readonly date = signal<CalendarDate | null>(null);
}
```

The library is styleless: style the boolean `data-*` hooks on the segments yourself — `[data-highlighted]` (the focused/roving segment), `[data-placeholder]` (empty), `[data-disabled]`, `[data-readonly]` — and `[data-empty]` / `[data-disabled]` / `[data-readonly]` on the root group.

### Signal Forms

```ts
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { form } from '@angular/forms/signals';
import { CalendarDate } from '@internationalized/date';
import { ForDateField, ForDateFieldLiteral, ForDateFieldSegment } from 'forty-cdk/date-field';

@Component({
  selector: 'app-dob-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForDateField, ForDateFieldSegment, ForDateFieldLiteral],
  template: `
    <div
      forDateField
      class="date-field"
      [formField]="checkout.dob"
      [ariaLabel]="'Date of birth'"
      #field="forDateField"
    >
      @for (seg of field.segments(); track seg.id) {
        @if (seg.isLiteral) {
          <span forDateFieldLiteral>{{ seg.text }}</span>
        } @else {
          <span forDateFieldSegment class="date-field-segment" [segment]="seg.type!">{{
            seg.text
          }}</span>
        }
      }
    </div>
  `,
})
export class DobFormField {
  readonly model = signal({ dob: null as CalendarDate | null });
  readonly checkout = form(this.model);
}
```

## API

### `ForDateField`

| Property      | Type                                                  | Description                                                                                                                                |
| ------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `value`       | `model<D \| null>`                                    | Two-way bindable entered date, or `null` while any segment is empty. The `FormValueControl` backing.<br>**Default:** `null`                |
| `minDate`     | `input<D \| null>`                                    | Minimum date (inclusive). A composed value below it is clamped up. Named `minDate` — see note below.<br>**Default:** `null`                |
| `maxDate`     | `input<D \| null>`                                    | Maximum date (inclusive). A composed value above it is clamped down.<br>**Default:** `null`                                                |
| `granularity` | `input<'day' \| 'hour' \| 'minute' \| 'second'>`      | Date-time precision. `'day'` is date-only; coarser-than-day appends time segments. See below.<br>**Default:** `'day'`                      |
| `hourCycle`   | `input<12 \| 24 \| null>`                             | 12/24-hour cycle for the time segments. `null` → locale. 12-hour adds the AM/PM segment.<br>**Default:** `null`                            |
| `locale`      | `input<string \| null>`                               | BCP 47 locale driving segment order, separators, and month name. `null` → runtime locale.<br>**Default:** `null`                           |
| `placeholder` | `input<Partial<Record<DateTimeSegmentType, string>>>` | Per-segment placeholder while empty. Unspecified parts fall back to `dd` / `mm` / `yyyy` / `hh` / `mm` / `ss` / `--`.<br>**Default:** `{}` |
| `ariaLabel`   | `input<string \| null>`                               | Accessible name for the group. Emits no `aria-label` while `null`.<br>**Default:** `null`                                                  |
| `dir`         | `input<'ltr' \| 'rtl' \| null>`                       | Writing direction. `null` resolves the ambient direction; mirrors ArrowLeft / ArrowRight segment navigation.<br>**Default:** `null`        |

Plus the shared `FormUiControl` members from `@angular/forms/signals`: `disabled`, `readonly`, `required`, `invalid`, `name`, `errors`, `touched` (bound automatically by `[formField]`).

> **Why `minDate` / `maxDate`, not `min` / `max`?** `FormUiControl.min` / `max` are reserved members typed `number | undefined` for numeric validators bound by `[formField]`. A date-typed `min` / `max` would break the `FormValueControl` contract, so the date bounds use distinct names.

### Data attributes

| Piece                   | Attribute          | Values            |
| ----------------------- | ------------------ | ----------------- |
| `[forDateField]`        | `data-disabled`    | present \| absent |
| `[forDateField]`        | `data-readonly`    | present \| absent |
| `[forDateField]`        | `data-empty`       | present \| absent |
| `[forDateFieldSegment]` | `data-highlighted` | present \| absent |
| `[forDateFieldSegment]` | `data-placeholder` | present \| absent |
| `[forDateFieldSegment]` | `data-disabled`    | present \| absent |
| `[forDateFieldSegment]` | `data-readonly`    | present \| absent |

`data-empty` marks the field only while **every** editable segment is empty (nothing has been entered); a partially-typed field is **not** empty. `data-placeholder` marks each individual segment that is still empty. `data-highlighted` is the current roving-tabindex segment — the only focus hook the consumer gets, shared with the other roving primitives. `[forDateFieldLiteral]` carries no data-\* attributes (it is `aria-hidden` and out of the tab order).

## Date-time field

Set `granularity` to `'hour'`, `'minute'`, or `'second'` (`granularity > 'day'`) to append time segments — hour / minute / second and, in 12-hour mode, an AM·PM `dayPeriod` — after the date segments in the same `role="group"`. The whole field stays a single tab stop with one roving cursor across **all** segments; `field.segments()` already returns the combined, locale-ordered list, so the same `@for` template renders it. This needs a **time-capable** adapter — `provideNativeDateAdapter()` (`Date`) or `provideInternationalizedDateTimeAdapter()` (`CalendarDateTime`); the day-only `provideInternationalizedDateAdapter()` (`CalendarDate`) throws.

```html
<div
  forDateField
  class="date-field"
  [(value)]="when"
  granularity="minute"
  [hourCycle]="24"
  #field="forDateField"
>
  @for (seg of field.segments(); track seg.id) { @if (seg.isLiteral) {
  <span forDateFieldLiteral>{{ seg.text }}</span>
  } @else {
  <span forDateFieldSegment class="date-field-segment" [segment]="seg.type!">{{ seg.text }}</span>
  } }
</div>
```

On the AM/PM segment, `a` / `p` set the period and ArrowUp / ArrowDown toggle it; the period is derived from the entered hour, so clearing it is a no-op (clear or step the hour instead). The value stays `null` until every visible segment — date **and** time — is filled.

## Scope defaults

```ts
import { provideForDateFieldDefaults } from 'forty-cdk/date-field';

// app config or a component's providers — localize segment labels and the
// empty-segment announcement for every nested [forDateField].
providers: [
  provideForDateFieldDefaults({
    emptySegmentText: 'Vacío',
    segmentLabels: { day: 'día', month: 'mes', year: 'año', dayPeriod: 'AM/PM' },
  }),
];
```

`segmentLabels` supplies each segment's default `aria-label`, keyed by part type. Unset keys keep the library default (the part name, and `'AM/PM'` for the `dayPeriod` segment), so overriding a single key never wipes the rest. A segment's own `[ariaLabel]` still wins over the scope default.

## Keyboard

Key behavior applies per segment. Horizontal arrows mirror under `dir="rtl"`.

| Key                        | Behavior                                                                                |
| -------------------------- | --------------------------------------------------------------------------------------- |
| **0–9**                    | Type the value; auto-advances to the next segment when full.                            |
| **ArrowUp / ArrowDown**    | Step the value. Day and month wrap; year clamps. Empty seeds from today.                |
| **ArrowLeft / ArrowRight** | Move to the previous / next segment (no wrap).                                          |
| **Home / End**             | Jump to the segment minimum / maximum.                                                  |
| **Backspace**              | Delete the last entered digit; the value becomes `null` when the last digit is removed. |
| **Delete**                 | Clear the whole segment (the value becomes `null` until refilled).                      |

The day clamps to the current month's length (e.g. 31 → 28 in February), and a composed value is clamped into `[minDate, maxDate]`.

## Accessibility

Composes the [WAI-ARIA Spinbutton pattern](https://www.w3.org/WAI/ARIA/apg/patterns/spinbutton/) — there is no single APG pattern for a date field, so each segment is an independent spinbutton inside a labelled `role="group"`.

- **`role="group"`** on the root carries the field's accessible name (`ariaLabel`, or point native `aria-labelledby` at a visible label).
- **`role="spinbutton"`** per segment, with `aria-valuemin` / `aria-valuemax` / `aria-valuenow` reflected; the month segment also exposes a localized `aria-valuetext` ("March"), so screen readers read the name rather than the number.
- **Roving tabindex**: exactly one segment is tabbable, so `Tab` enters and leaves the whole field in one stop; arrows move between segments.
- **Literals are `aria-hidden`** and never focusable — assistive tech reads only the spinbutton segments.
- **Boolean `data-*`** on each segment — `data-highlighted` (focused/roving), `data-placeholder` (empty), `data-disabled`, `data-readonly` — present when true, absent when false.

## Styling

forty-cdk ships no styles. Add your own class to each piece — the for\* selectors are the behavior API, not a styling contract (see [Styling forty-cdk](../../../../../docs/styling.md)). Key your CSS off the reflected data-\* attributes listed under [Data attributes](#data-attributes).

```css
.date-field-segment[data-placeholder] {
  color: GrayText;
}
.date-field-segment[data-highlighted] {
  background: Highlight;
  color: HighlightText;
}
.date-field[data-disabled] {
  opacity: 0.5;
}
```

## Wrapping in a design system

Both supported wrapper patterns — `hostDirectives` with the exported `FOR_DATE_FIELD_HOST_DIRECTIVE_INPUTS` / `FOR_DATE_FIELD_HOST_DIRECTIVE_OUTPUTS` name tuples, and subclassing — are documented in [Wrapping form primitives](../../../../../docs/wrapping-form-primitives.md).

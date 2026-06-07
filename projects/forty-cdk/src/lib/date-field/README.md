# DateField

Headless, segmented, spin-editable date input — the keyboard-first counterpart to [Calendar](../calendar/README.md). There is **no single WAI-ARIA APG pattern** for a date field; it is a composition of [Spinbuttons](https://www.w3.org/WAI/ARIA/apg/patterns/spinbutton/) inside a labelled `role="group"`, exactly as React Aria's [`useDateField`](https://react-aria.adobe.com/DateField/useDateField.html) models it. Each day / month / year part is an independent `role="spinbutton"` segment, so entry is unambiguous and locale-correct — no free-text parsing, no `03/04`-is-it-March-4th guesswork. Segment **order** and separators follow the runtime locale (`MM/DD/YYYY` vs `DD.MM.YYYY` vs `YYYY/MM/DD`).

`ForDateField` implements `FormValueControl<D | null>` from `@angular/forms/signals`, so it auto-wires with `[formField]` and auto-associates inside a `[forField]` (label / description / error) with no extra markup. The value stays `null` until every segment is filled.

## Date adapter — pick one (required)

All date math goes through the same pluggable `DateAdapter<D>` as `ForCalendar`, so the library hard-depends on **no** date library. Provide exactly one adapter in your application (or component) providers:

| Provider                                | Date type `D`                              | Dependency                                                 |
| --------------------------------------- | ------------------------------------------ | ---------------------------------------------------------- |
| `provideInternationalizedDateAdapter()` | `CalendarDate` (`@internationalized/date`) | **Recommended.** `@internationalized/date` (optional peer) |
| `provideNativeDateAdapter()`            | `Date`                                     | None (zero-dependency fallback)                            |

```ts
import { bootstrapApplication } from '@angular/platform-browser';
import { provideInternationalizedDateAdapter } from 'forty-cdk';

bootstrapApplication(App, {
  providers: [provideInternationalizedDateAdapter()],
});
```

## Pieces

| Class                 | Selector               | Role                                                                                              |
| --------------------- | ---------------------- | ------------------------------------------------------------------------------------------------- |
| `ForDateField`        | `[forDateField]`       | Root (`role="group"`). Owns the entered parts, composes the value, and exposes `segments()`.      |
| `ForDateFieldSegment` | `[forDateFieldSegment]` | One editable part (`role="spinbutton"`). Roving tab stop, ARIA value reflection, keyboard editing. |
| `ForDateFieldLiteral` | `[forDateFieldLiteral]` | A decorative separator (`/`, `.`, `-`). `aria-hidden`, out of the tab order.                      |

## Inputs / models — `ForDateField`

| API           | Type                                                  | Description                                                                                                              |
| ------------- | ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `value`       | `model<D \| null>`                                    | Two-way bindable entered date, or `null` while any segment is empty. The `FormValueControl` backing. Default `null`.    |
| `minDate`     | `input<D \| null>`                                    | Minimum date (inclusive). A composed value below it is clamped up. Named `minDate` — see note below. Default `null`.    |
| `maxDate`     | `input<D \| null>`                                    | Maximum date (inclusive). A composed value above it is clamped down. Default `null`.                                    |
| `granularity` | `input<'day' \| 'hour' \| 'minute' \| 'second'>`     | Date-time precision. `'day'` (default) is date-only; coarser-than-day off appends time segments. See below.            |
| `hourCycle`   | `input<12 \| 24 \| null>`                             | 12/24-hour cycle for the time segments. Default `null` → locale. 12-hour adds the AM/PM segment.                       |
| `locale`      | `input<string \| null>`                               | BCP 47 locale driving segment order, separators, and month name. Default `null` → runtime locale.                      |
| `placeholder` | `input<Partial<Record<DateTimeSegmentType, string>>>` | Per-segment placeholder while empty. Unspecified parts fall back to `dd` / `mm` / `yyyy` / `hh` / `mm` / `ss` / `--`. Default `{}`. |
| `ariaLabel`   | `input<string \| null>`                               | Accessible name for the group. Emits no `aria-label` while `null`. Default `null`.                                     |
| `dir`         | `input<'ltr' \| 'rtl' \| null>`                       | Writing direction. Default `null` resolves the ambient direction; mirrors ArrowLeft / ArrowRight segment navigation.   |

Plus the shared `FormUiControl` members from `@angular/forms/signals`: `disabled`, `readonly`, `required`, `invalid`, `name`, `errors`, `touched` (bound automatically by `[formField]`).

> **Why `minDate` / `maxDate`, not `min` / `max`?** `FormUiControl.min` / `max` are reserved members typed `number | undefined` for numeric validators bound by `[formField]`. A date-typed `min` / `max` would break the `FormValueControl` contract, so the date bounds use distinct names.

## Usage

```ts
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { CalendarDate } from '@internationalized/date';
import { ForDateField, ForDateFieldLiteral, ForDateFieldSegment } from 'forty-cdk';

@Component({
  selector: 'app-dob',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForDateField, ForDateFieldSegment, ForDateFieldLiteral],
  template: `
    <div forDateField [(value)]="date" [ariaLabel]="'Date of birth'" #field="forDateField">
      @for (seg of field.segments(); track seg.id) {
        @if (seg.isLiteral) {
          <span forDateFieldLiteral>{{ seg.text }}</span>
        } @else {
          <span forDateFieldSegment [segment]="seg.type!">{{ seg.text }}</span>
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

## Keyboard (per segment)

Horizontal arrows mirror under `dir="rtl"`.

| Key                        | Behavior                                                                  |
| -------------------------- | ------------------------------------------------------------------------- |
| **0–9**                    | Type the value; auto-advances to the next segment when full.              |
| **ArrowUp / ArrowDown**    | Step the value. Day and month wrap; year clamps. Empty seeds from today.  |
| **ArrowLeft / ArrowRight** | Move to the previous / next segment (no wrap).                            |
| **Home / End**             | Jump to the segment minimum / maximum.                                    |
| **Backspace / Delete**     | Clear the segment (the value becomes `null` until refilled).              |

The day clamps to the current month's length (e.g. 31 → 28 in February), and a composed value is clamped into `[minDate, maxDate]`.

## Date-time field (`granularity > 'day'`)

Set `granularity` to `'hour'`, `'minute'`, or `'second'` to append time segments — hour / minute / second and, in 12-hour mode, an AM·PM `dayPeriod` — after the date segments in the same `role="group"`. The whole field stays a single tab stop with one roving cursor across **all** segments; `field.segments()` already returns the combined, locale-ordered list, so the same `@for` template renders it. This needs a **time-capable** adapter — `provideNativeDateAdapter()` (`Date`) or `provideInternationalizedDateTimeAdapter()` (`CalendarDateTime`); the day-only `provideInternationalizedDateAdapter()` (`CalendarDate`) throws.

```html
<div forDateField [(value)]="when" granularity="minute" [hourCycle]="24" #field="forDateField">
  @for (seg of field.segments(); track seg.id) {
    @if (seg.isLiteral) {
      <span forDateFieldLiteral>{{ seg.text }}</span>
    } @else {
      <span forDateFieldSegment [segment]="seg.type!">{{ seg.text }}</span>
    }
  }
</div>
```

On the AM/PM segment, `a` / `p` set the period and ArrowUp / ArrowDown toggle it; the period is derived from the entered hour, so clearing it is a no-op (clear or step the hour instead). The value stays `null` until every visible segment — date **and** time — is filled.

## Scope defaults

```ts
import { provideForDateFieldDefaults } from 'forty-cdk';

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

## Accessibility notes

- **`role="group"`** on the root carries the field's accessible name (`ariaLabel`, or point native `aria-labelledby` at a visible label).
- **`role="spinbutton"`** per segment, with `aria-valuemin` / `aria-valuemax` / `aria-valuenow` reflected; the month segment also exposes a localized `aria-valuetext` ("March"), so screen readers read the name rather than the number.
- **Roving tabindex**: exactly one segment is tabbable, so `Tab` enters and leaves the whole field in one stop; arrows move between segments.
- **Literals are `aria-hidden`** and never focusable — assistive tech reads only the spinbutton segments.
- **Boolean `data-*`** on each segment — `data-highlighted` (focused/roving), `data-placeholder` (empty), `data-disabled`, `data-readonly` — present when true, absent when false.

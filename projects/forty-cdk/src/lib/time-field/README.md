# TimeField

Headless, segmented, spin-editable **time-of-day** input — the time counterpart to [DateField](../date-field/README.md). There is **no single WAI-ARIA APG pattern** for a time field; it is a composition of [Spinbuttons](https://www.w3.org/WAI/ARIA/apg/patterns/spinbutton/) inside a labelled `role="group"`, exactly as React Aria's [`useTimeField`](https://react-aria.adobe.com/TimeField/useTimeField.html) models it. Each hour / minute / second / AM·PM part is an independent `role="spinbutton"` segment, so entry is unambiguous and locale-correct. Segment **order**, the separators between them, and whether an AM/PM segment is shown follow the runtime locale and the resolved hour cycle.

`ForTimeField` implements `FormValueControl<D | null>` from `@angular/forms/signals`, so it auto-wires with `[formField]` and auto-associates inside a `[forField]` (label / description / error) with no extra markup. The value stays `null` until every visible segment is filled.

## Date adapter — pick a time-capable one (required)

All time math goes through the same pluggable `DateAdapter<D>` as `ForCalendar`, so the library hard-depends on **no** date library. The time field needs the adapter's optional time accessors, so provide a **time-capable** adapter:

| Provider                                    | Date-time type `D`                             | Dependency                                                 |
| ------------------------------------------- | ---------------------------------------------- | ---------------------------------------------------------- |
| `provideInternationalizedDateTimeAdapter()` | `CalendarDateTime` (`@internationalized/date`) | **Recommended.** From `forty-cdk/internationalized-date`; needs `@internationalized/date` (optional peer) |
| `provideNativeDateAdapter()`                | `Date`                                         | None (zero-dependency fallback)                            |

> The day-only `provideInternationalizedDateAdapter()` (`CalendarDate`) cannot carry a time — `ForTimeField` throws a descriptive error if it is the active adapter.

```ts
import { bootstrapApplication } from '@angular/platform-browser';
import { provideInternationalizedDateTimeAdapter } from 'forty-cdk/internationalized-date';

bootstrapApplication(App, {
  providers: [provideInternationalizedDateTimeAdapter()],
});
```

When no value is bound yet, a composed value is anchored on the adapter's `today()` and carries the entered time. Bind an existing date-time as `value` to edit its time in place (the calendar day is preserved).

## Pieces

| Class                 | Selector                | Role                                                                                               |
| --------------------- | ----------------------- | -------------------------------------------------------------------------------------------------- |
| `ForTimeField`        | `[forTimeField]`        | Root (`role="group"`). Owns the entered parts, composes the value, and exposes `segments()`.       |
| `ForTimeFieldSegment` | `[forTimeFieldSegment]` | One editable part (`role="spinbutton"`). Roving tab stop, ARIA value reflection, keyboard editing. |
| `ForTimeFieldLiteral` | `[forTimeFieldLiteral]` | A decorative separator (`:`, a space). `aria-hidden`, out of the tab order.                        |

## Inputs / models — `ForTimeField`

| API           | Type                                              | Description                                                                                                                      |
| ------------- | ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `value`       | `model<D \| null>`                                | Two-way bindable entered time, or `null` while any visible segment is empty. The `FormValueControl` backing. Default `null`.     |
| `minTime`     | `input<D \| null>`                                | Earliest time-of-day (inclusive). A composed value earlier in the day is clamped up. Named `minTime` — see note. Default `null`. |
| `maxTime`     | `input<D \| null>`                                | Latest time-of-day (inclusive). A composed value later in the day is clamped down. Default `null`.                               |
| `hourCycle`   | `input<12 \| 24 \| null>`                         | 12- or 24-hour cycle. Default `null` → derived from the locale. 12-hour adds the AM/PM segment.                                  |
| `granularity` | `input<'hour' \| 'minute' \| 'second'>`           | Smallest editable unit. Default `'minute'`.                                                                                      |
| `locale`      | `input<string \| null>`                           | BCP 47 locale driving segment order, separators, and AM/PM names. Default `null` → runtime locale.                               |
| `placeholder` | `input<Partial<Record<TimeSegmentType, string>>>` | Per-segment placeholder while empty. Unspecified parts fall back to `hh` / `mm` / `ss` / `--`. Default `{}`.                     |
| `ariaLabel`   | `input<string \| null>`                           | Accessible name for the group. Emits no `aria-label` while `null`. Default `null`.                                               |
| `dir`         | `input<'ltr' \| 'rtl' \| null>`                   | Writing direction. Default `null` resolves the ambient direction; mirrors ArrowLeft / ArrowRight segment navigation.             |

Plus the shared `FormUiControl` members from `@angular/forms/signals`: `disabled`, `readonly`, `required`, `invalid`, `name`, `errors`, `touched` (bound automatically by `[formField]`).

> **Why `minTime` / `maxTime`, not `min` / `max`?** `FormUiControl.min` / `max` are reserved members typed `number | undefined` for numeric validators bound by `[formField]`. A date-time-typed `min` / `max` would break the `FormValueControl` contract, so the time bounds use distinct names. Only the time-of-day component of the bounds is considered.

## Usage

```ts
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { CalendarDateTime } from '@internationalized/date';
import { ForTimeField, ForTimeFieldLiteral, ForTimeFieldSegment } from 'forty-cdk';

@Component({
  selector: 'app-appt-time',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForTimeField, ForTimeFieldSegment, ForTimeFieldLiteral],
  template: `
    <div forTimeField [(value)]="time" [ariaLabel]="'Appointment time'" #field="forTimeField">
      @for (seg of field.segments(); track seg.id) {
        @if (seg.isLiteral) {
          <span forTimeFieldLiteral>{{ seg.text }}</span>
        } @else {
          <span forTimeFieldSegment class="time-field-segment" [segment]="seg.type!">{{
            seg.text
          }}</span>
        }
      }
    </div>
  `,
})
export class ApptTime {
  readonly time = signal<CalendarDateTime | null>(null);
}
```

The library is styleless: style the boolean `data-*` hooks on the segments yourself — `[data-highlighted]` (the focused/roving segment), `[data-placeholder]` (empty), `[data-disabled]`, `[data-readonly]` — and `[data-empty]` / `[data-disabled]` / `[data-readonly]` on the root group.

## Keyboard (per segment)

Horizontal arrows mirror under `dir="rtl"`.

| Key                        | Behavior                                                                                           |
| -------------------------- | -------------------------------------------------------------------------------------------------- |
| **0–9**                    | Type the value; auto-advances to the next segment when full.                                       |
| **a / p**                  | On the AM/PM segment, set the period of the entered hour.                                          |
| **ArrowUp / ArrowDown**    | Step the value. Hour / minute / second wrap; the AM/PM segment toggles. Empty seeds from midnight. |
| **ArrowLeft / ArrowRight** | Move to the previous / next segment (no wrap).                                                     |
| **Home / End**             | Jump to the segment minimum / maximum (the AM/PM segment → AM / PM).                               |
| **Backspace / Delete**     | Clear a numeric segment (the value becomes `null` until refilled).                                 |

The hour, minute, and second clamp to their valid ranges (hour to the cycle, minute / second to 0–59), and a composed value is clamped into `[minTime, maxTime]` by time-of-day. The AM/PM period is derived from the entered hour; clearing it is a no-op (clear or step the hour instead).

## Scope defaults

```ts
import { provideForTimeFieldDefaults } from 'forty-cdk';

// app config or a component's providers — localize segment labels and the
// empty-segment announcement for every nested [forTimeField].
providers: [
  provideForTimeFieldDefaults({
    emptySegmentText: 'Vacío',
    segmentLabels: { hour: 'hora', minute: 'minuto', second: 'segundo', dayPeriod: 'AM/PM' },
  }),
];
```

`segmentLabels` supplies each segment's default `aria-label`, keyed by part type. Unset keys keep the library default (the part name, and `'AM/PM'` for the `dayPeriod` segment), so overriding a single key never wipes the rest. A segment's own `[ariaLabel]` still wins over the scope default.

## Styling

forty-cdk ships no styles. Add your own class to each piece — the `for*` selectors are the behavior API, not a styling contract (see [Styling forty-cdk](../../../../../docs/styling.md)). Key your CSS off the reflected `data-*` attributes below.

### Data attributes

| Piece                   | Attribute          | Values            |
| ----------------------- | ------------------ | ----------------- |
| `[forTimeField]`        | `data-disabled`    | present \| absent |
| `[forTimeField]`        | `data-readonly`    | present \| absent |
| `[forTimeField]`        | `data-empty`       | present \| absent |
| `[forTimeFieldSegment]` | `data-highlighted` | present \| absent |
| `[forTimeFieldSegment]` | `data-placeholder` | present \| absent |
| `[forTimeFieldSegment]` | `data-disabled`    | present \| absent |
| `[forTimeFieldSegment]` | `data-readonly`    | present \| absent |

`[forTimeFieldLiteral]` carries no `data-*` hooks — it is `aria-hidden` and purely decorative; style it directly via your own class.

```css
.time-field-segment[data-placeholder] {
  color: gray;
}

.time-field-segment[data-highlighted] {
  background: highlight;
}
```

## Accessibility notes

- **`role="group"`** on the root carries the field's accessible name (`ariaLabel`, or point native `aria-labelledby` at a visible label).
- **`role="spinbutton"`** per segment, with `aria-valuemin` / `aria-valuemax` / `aria-valuenow` reflected; the AM/PM segment also exposes a localized `aria-valuetext` ("AM" / "PM"), so screen readers read the period rather than `0` / `1`.
- **Roving tabindex**: exactly one segment is tabbable, so `Tab` enters and leaves the whole field in one stop; arrows move between segments.
- **Literals are `aria-hidden`** and never focusable — assistive tech reads only the spinbutton segments.
- **Boolean `data-*`** on each segment — `data-highlighted` (focused/roving), `data-placeholder` (empty), `data-disabled`, `data-readonly` — present when true, absent when false.

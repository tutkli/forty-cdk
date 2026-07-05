# DatePicker

A trigger that opens a floating calendar to pick a date, composing ForCalendar inside a dismissable popover with min / max bounds and per-date availability.

Reinterpreted idiomatically for modern Angular: a focusable trigger that opens a floating surface wrapping a projected [`ForCalendar`](../calendar/README.md).

`ForDatePicker` is the root **and** the form value — it implements `FormValueControl<D | null>` from `@angular/forms/signals`, so it auto-wires with `[formField]`. The trigger is the focusable control that carries `name` / `disabled` / `invalid`; selection state flows root → projected calendar via `[(value)]`. The library reuses its existing overlay stack (trigger-anchored Popover positioning, dismissable layer, return-focus) rather than re-implementing positioning, dismissal, or focus return — and the modal opt-in routes through the shared modal shell (focus trap + inert background + scroll lock).

## Date adapter

All date math and formatting go through a `DateAdapter<D>`, shared with `ForCalendar`, so the library hard-depends on **no** date library. Provide exactly one adapter in your application (or component) providers (required):

| Provider                                | Date type `D`                              | Dependency                                                                                                |
| --------------------------------------- | ------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| `provideInternationalizedDateAdapter()` | `CalendarDate` (`@internationalized/date`) | **Recommended.** From `forty-cdk/internationalized-date`; needs `@internationalized/date` (optional peer) |
| `provideNativeDateAdapter()`            | `Date`                                     | None (zero-dependency fallback)                                                                           |

## Anatomy

```html
<div forDatePicker [(value)]="date" [(open)]="open" name="dob">
  <!-- optional: wrap a decorated field box in [forDatePickerAnchor] to position against it -->
  <button forDatePickerTrigger>
    <span forDatePickerValue placeholder="Pick a date"></span>
  </button>

  <!-- present in the DOM only while open -->
  <div forDatePickerContent>
    <div forCalendar [(value)]="date">
      <!-- …calendar header + grid… -->
    </div>
  </div>
</div>
```

## Examples

```ts
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { CalendarDate } from '@internationalized/date';
import {
  ForCalendar,
  ForCalendarCell,
  ForCalendarGrid,
  ForCalendarGridHeader,
  ForCalendarHeading,
  ForCalendarNextButton,
  ForCalendarPrevButton,
} from 'forty-cdk/calendar';
import {
  ForDatePicker,
  ForDatePickerContent,
  ForDatePickerTrigger,
  ForDatePickerValue,
} from 'forty-cdk/date-picker';

@Component({
  selector: 'app-dob',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ForDatePicker,
    ForDatePickerTrigger,
    ForDatePickerValue,
    ForDatePickerContent,
    ForCalendar,
    ForCalendarHeading,
    ForCalendarPrevButton,
    ForCalendarNextButton,
    ForCalendarGrid,
    ForCalendarGridHeader,
    ForCalendarCell,
  ],
  template: `
    <div
      forDatePicker
      [(value)]="date"
      [(open)]="open"
      [minDate]="min"
      [maxDate]="max"
      name="dob"
      [ariaLabel]="'Choose date'"
      #picker="forDatePicker"
    >
      <button forDatePickerTrigger class="date-picker-trigger">
        <span forDatePickerValue class="date-picker-value" [placeholder]="'Pick a date'"></span>
      </button>

      @if (open()) {
        <div forDatePickerContent animate.leave="fade-out">
          <div
            forCalendar
            [(value)]="date"
            [min]="picker.minDate()"
            [max]="picker.maxDate()"
            [isDateUnavailable]="picker.isDateUnavailable()"
          >
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
        </div>
      }
    </div>
  `,
})
export class DobPage {
  readonly date = signal<CalendarDate | null>(null);
  readonly open = signal(false);
  readonly min: CalendarDate | null = null;
  readonly max: CalendarDate | null = null;
}
```

Bind the projected `[forCalendar]` to the picker: `[(value)]` to the same date signal, and forward `[min]` / `[max]` / `[isDateUnavailable]` from the picker's accessors (`#picker="forDatePicker"`). The picker observes the calendar's selection through a `contentChild` query — it never mutates the calendar — so picking a date sets the value, flips `touched`, and (when `closeOnSelect`) closes the surface.

The library is styleless: presence in the DOM is the consumer's job (`@if (open())`), and `animate.enter` / `animate.leave` drive transitions. Style the `data-state="open" | "closed"` hooks (root + trigger + content) and `[data-disabled]` yourself.

## API

### `ForDatePicker`

| Property            | Type                                             | Description                                                                                                                                                               |
| ------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `value`             | `model<D \| null>`                               | Two-way bindable selected date. `(valueChange)` fires only on internal commits.<br>**Default:** `null`                                                                    |
| `open`              | `model<boolean>`                                 | Two-way bindable surface visibility. `(openChange)` fires only on internal transitions.<br>**Default:** `false`                                                           |
| `minDate`           | `input<D \| null>`                               | Minimum selectable date (inclusive). Forward to the projected calendar's `[min]`.<br>**Default:** `null`                                                                  |
| `maxDate`           | `input<D \| null>`                               | Maximum selectable date (inclusive). Forward to the projected calendar's `[max]`.<br>**Default:** `null`                                                                  |
| `isDateUnavailable` | `input<(date: D) => boolean>`                    | Per-date predicate. Forward to the projected calendar's `[isDateUnavailable]`.<br>**Default:** `() => false`                                                              |
| `closeOnSelect`     | `input<boolean>`                                 | Close the surface after a date is picked. Honoured only at `granularity="day"`.<br>**Default:** `true`                                                                    |
| `granularity`       | `input<'day' \| 'hour' \| 'minute' \| 'second'>` | Date-time precision. `'day'` (default) is a pure date picker; coarser-than-day off composes a time field.<br>**Default:** `'day'`                                         |
| `hourCycle`         | `input<12 \| 24 \| null>`                        | 12/24-hour cycle for the value display (and typically the projected `[forTimeField]`).<br>**Default:** `null` → locale                                                    |
| `modal`             | `input<boolean>`                                 | Trap focus + inert background + scroll lock (centered dialog) instead of an anchored popover.<br>**Default:** `false`                                                     |
| `dismissible`       | `input<boolean>`                                 | Escape / outside-pointer dismiss the surface.<br>**Default:** `true`                                                                                                      |
| `returnFocus`       | `input<boolean>`                                 | Return focus to the trigger on close.<br>**Default:** `true`                                                                                                              |
| `formatOptions`     | `input<Intl.DateTimeFormatOptions>`              | Options for the text rendered by `[forDatePickerValue]`.<br>**Default:** `{ year: 'numeric', month: 'long', day: 'numeric' }`                                             |
| `locale`            | `input<string \| null>`                          | BCP 47 locale for the text rendered by `[forDatePickerValue]`. Not forwarded to the projected calendar — bind its `[locale]` too.<br>**Default:** `null` → runtime locale |
| `placeholder`       | `input<string>`                                  | Fallback text for `[forDatePickerValue]` when empty.<br>**Default:** `''`                                                                                                 |
| `side` / `align`    | `input`                                          | Anchored placement (popover mode only).<br>**Default:** `'bottom'` / `'start'`                                                                                            |
| `dir`               | `input<'ltr' \| 'rtl' \| null>`                  | Writing direction.<br>**Default:** `null` resolves the ambient direction; reflected to the host `dir`                                                                     |

Plus the shared `FormUiControl` inputs from the base (`disabled`, `readonly`, `required`, `invalid`, `pending`, `dirty`, `name`, `errors`, and the `touched` model) and the floating tunables (`sideOffset`, `alignOffset`, `avoidCollisions`, `collisionPadding`, `sticky`, `hideWhenDetached`).

> **`locale` only styles the trigger display.** It drives the text rendered by `[forDatePickerValue]` (both here and on `ForDateRangePicker`); it is **not** forwarded to the projected `ForCalendar`. Bind the calendar's own `[locale]` to localize its heading / weekday / cell labels, exactly as you forward `[min]` / `[max]`.

> **Why `minDate` / `maxDate`, not `min` / `max`?** `ForDatePicker` is a `FormValueControl`, and `FormUiControl` reserves `min` / `max` for numeric validators (`InputSignal<number | undefined>`). A date-typed `min` / `max` would break that contract, so the date bounds use the `*Date` suffix. (`ForCalendar` is not a form control, so it keeps `min` / `max`.)

### Data attributes

| Piece                    | Attribute          | Values             |
| ------------------------ | ------------------ | ------------------ |
| `[forDatePicker]`        | `data-state`       | `open` \| `closed` |
| `[forDatePicker]`        | `data-disabled`    | present \| absent  |
| `[forDatePickerTrigger]` | `data-state`       | `open` \| `closed` |
| `[forDatePickerTrigger]` | `data-disabled`    | present \| absent  |
| `[forDatePickerContent]` | `data-state`       | `open` \| `closed` |
| `[forDatePickerValue]`   | `data-placeholder` | present \| absent  |

## Triggers stamped from outside-declared templates

Angular resolves `ng-template` DI at the template's **declaration** site, not where it is stamped. A `[forDatePickerTrigger]` declared in a template outside the root throws the orphan error even when the template is rendered inside the root via `ngTemplateOutlet`. For that case the selector attribute accepts the root reference as a value, `routerLink`-style — grab it with `#root="forDatePicker"` and pass it through the outlet context. The bare valueless attribute keeps resolving via DI.

```html
<div forDatePicker #root="forDatePicker" [(value)]="date">
  <ng-container *ngTemplateOutlet="trig; context: { root }" />
  @if (root.open()) {
  <div forDatePickerContent>…</div>
  }
</div>

<ng-template #trig let-root="root">
  <button [forDatePickerTrigger]="root">
    <span forDatePickerValue>Pick a date</span>
  </button>
</ng-template>
```

## Anchoring to a field box

By default the surface is positioned against `[forDatePickerTrigger]`. When the trigger lives inside a decorated field box — padding, a prefix icon, a clear / chevron button — anchoring to the inner button offsets the surface from the visible field's edge. Wrap the field box in `[forDatePickerAnchor]` so floating-ui positions the surface against the box instead:

```html
<div forDatePicker #picker="forDatePicker" [(value)]="date">
  <div forDatePickerAnchor class="field-box">
    <icon name="calendar" />
    <button forDatePickerTrigger>
      <span forDatePickerValue placeholder="Pick a date"></span>
    </button>
    <button class="clear" (click)="date.set(null)">×</button>
  </div>
  @if (picker.open()) {
  <div forDatePickerContent>
    <div forCalendar [(value)]="date"><!-- …header + grid… --></div>
  </div>
  }
</div>
```

`[forDatePickerAnchor]` changes **only** positioning. The trigger keeps `aria-haspopup` / `aria-expanded` / `aria-controls`, the click toggle, focus return on close, and its exemption from outside-pointer dismissal. Without an anchor the surface falls back to the trigger, so existing markup is unaffected. At most one `[forDatePickerAnchor]` per `[forDatePicker]` — a second one throws `[forty-cdk/date-picker]`. (A calendar has its own intrinsic width and ignores `--for-anchor-width`, so the anchor mainly affects start / side alignment to the box edge.)

## Modal vs non-modal

By default the surface is a **non-modal popover**: anchored to the trigger, no background inert, no scroll lock. Set `[modal]="true"` to route through the modal shell instead: focus is trapped inside the dialog, the background is inert, and body scroll is locked (a centered dialog you position with CSS, not trigger-anchored). Either way the surface is `role="dialog"` and `aria-haspopup="dialog"`-anchored; modal mode adds `aria-modal="true"`.

The mode is read once when the surface mounts (it is structurally different per mode), so toggle `modal` while the surface is closed.

## Date-time picker

Set `granularity` to `'hour'`, `'minute'`, or `'second'` to turn the picker into a **date-time picker**: project a [`ForTimeField`](../time-field/README.md) beside the calendar and the value gains a time component. This needs a **time-capable** adapter — `provideNativeDateAdapter()` (`Date`) or `provideInternationalizedDateTimeAdapter()` (`CalendarDateTime`); the day-only `provideInternationalizedDateAdapter()` (`CalendarDate`) throws.

Bind the calendar **and** the time field **one-way** to `picker.value()` (not `[(value)]`). The picker is the single source of truth: when one-way bound to a timed value the calendar preserves the time-of-day on its own selection, and the picker re-grafts the previously entered time as a defensive fallback for the case where the calendar value was null or midnight (reading its own value, which the one-way children never clobber); a time-field edit emits a full date-time the picker mirrors in. A date-time picker never closes on a calendar selection, so the user can go on to set the time.

```html
<div
  forDatePicker
  [(value)]="when"
  [(open)]="open"
  granularity="minute"
  [hourCycle]="24"
  #picker="forDatePicker"
>
  <button forDatePickerTrigger class="date-picker-trigger">
    <span forDatePickerValue class="date-picker-value" [placeholder]="'Pick date & time'"></span>
  </button>

  @if (open()) {
  <div forDatePickerContent>
    <div forCalendar [value]="picker.value()" [min]="picker.minDate()" [max]="picker.maxDate()">
      <!-- …calendar header + grid… -->
    </div>

    <div
      forTimeField
      [value]="picker.value()"
      [hourCycle]="picker.hourCycle()"
      #field="forTimeField"
    >
      @for (seg of field.segments(); track seg.id) { @if (seg.isLiteral) {
      <span forTimeFieldLiteral>{{ seg.text }}</span>
      } @else {
      <span forTimeFieldSegment [segment]="seg.type!">{{ seg.text }}</span>
      } }
    </div>
  </div>
  }
</div>
```

The value display (`[forDatePickerValue]`) automatically appends the time to its formatting when `granularity > 'day'` and you haven't set time fields in `formatOptions`.

## Range selection — `ForDateRangePicker`

For date-range selection use the dedicated `ForDateRangePicker` root (selector `[forDateRangePicker]`). It is the root **and** the form value, implementing `FormValueControl<DateRange<D> | null>`, so the committed range auto-wires with `[formField]` exactly like any other control.

It reuses the same pieces — `[forDatePickerTrigger]`, `[forDatePickerContent]`, `[forDatePickerValue]`, `[forDatePickerAnchor]` — through a shared base, and provides `FOR_DATE_PICKER_CONTEXT` so they resolve under it. Project a `[forCalendar]` in `selectionMode="range"` and bind its range to the picker's `value`; the two-click anchor → commit flow keeps `value` `null` until both endpoints are chosen (the form never sees a half-entered range), and `start <= end` is an invariant. Range is day-granular in v1 (no time composition).

```ts
import { type DateRange, ForDateRangePicker } from 'forty-cdk/date-picker';
import { form } from '@angular/forms/signals';

interface Booking {
  stay: DateRange<CalendarDate> | null;
}
readonly model = signal<Booking>({ stay: null });
readonly booking = form(this.model, (p) => required(p.stay));
```

```html
<div
  forDateRangePicker
  [formField]="booking.stay"
  [(open)]="open"
  [ariaLabel]="'Choose date range'"
  #picker="forDateRangePicker"
>
  <button forDatePickerTrigger>
    <span forDatePickerValue [placeholder]="'Pick a range'"></span>
  </button>

  @if (open()) {
  <div forDatePickerContent>
    <div
      forCalendar
      selectionMode="range"
      [(range)]="picker.value"
      [min]="picker.minDate()"
      [max]="picker.maxDate()"
    >
      <!-- …header + grid… -->
    </div>
  </div>
  }
</div>
```

- **Form value.** The committed `DateRange<D> | null` is the `value` model. `null` is the empty state — pair it with `required(p.stay)` so `invalid()` flips when the form demands a range and none is committed. `touched` fires on commit and on close, exactly like the single-date picker.
- **Validity.** `start <= end` is guaranteed by construction and is never an error. Forward `minDate` / `maxDate` to the calendar's `[min]` / `[max]`, and `minRangeLength` / `maxRangeLength` to the calendar's `[minRangeLength]` / `[maxRangeLength]` (a too-short / too-long range is rejected as a no-op by the calendar's two-click flow).
- **Native submission.** When `name` is set, two hidden inputs `<name>-start` / `<name>-end` mirror the committed endpoints as ISO `YYYY-MM-DD` for native `<form>` posts.
- **Bounds naming.** `minDate` / `maxDate` (not `min` / `max`) for the same reason as `ForDatePicker` — and additionally because `FormUiControl.min` / `max` are typed `NonNullable<TValue>` (the range object itself), which is meaningless as a bound.

Defaults are configured with `provideForDateRangePickerDefaults` (`sideOffset` / `collisionPadding`), and both wrapper patterns work via the exported `FOR_DATE_RANGE_PICKER_HOST_DIRECTIVE_INPUTS` / `FOR_DATE_RANGE_PICKER_HOST_DIRECTIVE_OUTPUTS` tuples — see [Wrapping form primitives](../../../../../docs/wrapping-form-primitives.md).

## Keyboard

| Key                          | Behavior                                                                  |
| ---------------------------- | ------------------------------------------------------------------------- |
| **Enter / Space** on trigger | Open the surface (native button activation).                              |
| **Escape**                   | Dismiss the surface and return focus to the trigger (when `dismissible`). |

Inside the surface, the projected `ForCalendar` owns the full grid keyboard map (arrows / `Home` / `End` / `PageUp` / `PageDown` / `Enter` / `Space`). On open, focus lands on the calendar's focused cell (`value ?? today`) in non-modal mode, or the first focusable element in modal mode.

## Accessibility

Implements the [WAI-ARIA Date Picker Dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/examples/datepicker-dialog/).

- **`aria-haspopup="dialog"`** on the trigger, with `aria-expanded` reflecting `open()` and `aria-controls` pointing at the surface while open.
- **`role="dialog"`** on the surface, named by `[ariaLabel]` (or `aria-labelledby` the trigger when no label is set). `aria-modal="true"` only in modal mode (truthy-only).
- **Form-control ARIA** (`aria-disabled` / `aria-readonly` / `aria-required` / `aria-invalid` / `aria-busy`) is reflected on the focusable trigger so assistive tech announces validity on the element that takes focus.
- **Focus management**: focus enters the surface on open (the calendar's roving cell in non-modal mode) and returns to the trigger on close, both vetoable via `(autoFocusOnOpen)` / `(autoFocusOnClose)`.
- **Dismissal**: Escape (`(escapeKeyDown)`) and outside-pointer (`(pointerDownOutside)` / `(interactOutside)`) close the surface, each vetoable.

## Styling

forty-cdk ships no styles. Add your own class to each piece — the `for*` selectors are the behavior API, not a styling contract (see [Styling forty-cdk](../../../../../docs/styling.md)). Key your CSS off the reflected `data-*` attributes listed under [Data attributes](#data-attributes).

> `[forDatePickerContent]` is portaled to `document.body`, so it lives outside your component's view-encapsulated styles. Style it with **global CSS** (or a class you pass through) rather than component-scoped rules — see [Styling floating content](../../../../../docs/styling-floating-content.md). In non-modal (anchored) mode the surface also exposes the shared positioner custom properties (`--for-anchor-width` / `--for-anchor-height`, `--for-available-width` / `--for-available-height`, `--for-content-transform-origin`); that same guide tabulates the full set.

```css
.date-picker-trigger .date-picker-value[data-placeholder] {
  color: var(--muted-foreground);
}

.date-picker-trigger .chevron {
  transition: transform 150ms;
}
.date-picker-trigger[data-state='open'] .chevron {
  transform: rotate(180deg);
}
```

## Wrapping in a design system

Both supported wrapper patterns — `hostDirectives` with the exported `FOR_DATE_PICKER_HOST_DIRECTIVE_INPUTS` / `FOR_DATE_PICKER_HOST_DIRECTIVE_OUTPUTS` name tuples, and subclassing — are documented in [Wrapping form primitives](../../../../../docs/wrapping-form-primitives.md).

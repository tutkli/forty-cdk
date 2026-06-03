# DatePicker

Headless date picker following the [WAI-ARIA Date Picker Dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/examples/datepicker-dialog/) — reinterpreted idiomatically for modern Angular the way [React Aria](https://react-aria.adobe.com/DatePicker/) and [Ark UI](https://ark-ui.com/docs/components/date-picker) do it: a focusable trigger that opens a floating surface wrapping a projected [`ForCalendar`](../calendar/README.md).

`ForDatePicker` is the root **and** the form value — it implements `FormValueControl<D | null>` from `@angular/forms/signals`, so it auto-wires with `[formField]`. The trigger is the focusable control that carries `name` / `disabled` / `invalid`; selection state flows root → projected calendar via `[(value)]`. The library reuses its existing overlay stack (trigger-anchored Popover positioning, dismissable layer, return-focus) rather than re-implementing positioning, dismissal, or focus return — and the modal opt-in routes through the shared modal shell (focus trap + inert background + scroll lock).

## Date adapter — pick one (required)

All date math and formatting go through a `DateAdapter<D>`, shared with `ForCalendar`, so the library hard-depends on **no** date library. Provide exactly one adapter in your application (or component) providers:

| Provider                                | Date type `D`                              | Dependency                                                 |
| --------------------------------------- | ------------------------------------------ | ---------------------------------------------------------- |
| `provideInternationalizedDateAdapter()` | `CalendarDate` (`@internationalized/date`) | **Recommended.** `@internationalized/date` (optional peer) |
| `provideNativeDateAdapter()`            | `Date`                                     | None (zero-dependency fallback)                            |

## Pieces

| Class                  | Selector                 | Role                                                                                                            |
| ---------------------- | ------------------------ | -------------------------------------------------------------------------------------------------------------- |
| `ForDatePicker`        | `[forDatePicker]`        | Root + `FormValueControl<D \| null>`. Owns `value`, `open`, the shared context, and the close-on-select bridge. |
| `ForDatePickerTrigger` | `[forDatePickerTrigger]` | The focusable button (`aria-haspopup="dialog"`). Opens the surface; carries the form-control ARIA state.        |
| `ForDatePickerContent` | `[forDatePickerContent]` | The floating `role="dialog"` surface. Non-modal popover by default; modal dialog when `[modal]`.                |
| `ForDatePickerValue`   | `[forDatePickerValue]`   | Renders the formatted value (or the placeholder) inside the trigger, via the adapter's `format`.                |

## Inputs / models — `ForDatePicker`

| API                 | Type                              | Description                                                                                                  |
| ------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `value`             | `model<D \| null>`                | Two-way bindable selected date. `(valueChange)` fires only on internal commits. Default `null`.              |
| `open`              | `model<boolean>`                  | Two-way bindable surface visibility. `(openChange)` fires only on internal transitions. Default `false`.     |
| `minDate`           | `input<D \| null>`                | Minimum selectable date (inclusive). Forward to the projected calendar's `[min]`. Default `null`.            |
| `maxDate`           | `input<D \| null>`                | Maximum selectable date (inclusive). Forward to the projected calendar's `[max]`. Default `null`.            |
| `isDateUnavailable` | `input<(date: D) => boolean>`     | Per-date predicate. Forward to the projected calendar's `[isDateUnavailable]`. Default `() => false`.        |
| `closeOnSelect`     | `input<boolean>`                  | Close the surface after a date is picked. Default `true`.                                                    |
| `modal`             | `input<boolean>`                  | Trap focus + inert background + scroll lock (centered dialog) instead of an anchored popover. Default `false`. |
| `dismissible`       | `input<boolean>`                  | Escape / outside-pointer dismiss the surface. Default `true`.                                                |
| `returnFocus`       | `input<boolean>`                  | Return focus to the trigger on close. Default `true`.                                                        |
| `formatOptions`     | `input<Intl.DateTimeFormatOptions>` | Options for the text rendered by `[forDatePickerValue]`. Default `{ year: 'numeric', month: 'long', day: 'numeric' }`. |
| `placeholder`       | `input<string>`                   | Fallback text for `[forDatePickerValue]` when empty. Default `''`.                                           |
| `side` / `align`    | `input`                           | Anchored placement (popover mode only). Defaults `'bottom'` / `'start'`.                                     |
| `dir`               | `input<'ltr' \| 'rtl' \| null>`   | Writing direction. Default `null` resolves the ambient direction; reflected to the host `dir`.               |

Plus the shared `FormUiControl` inputs from the base (`disabled`, `readonly`, `required`, `invalid`, `pending`, `dirty`, `name`, `errors`, and the `touched` model) and the floating tunables (`sideOffset`, `alignOffset`, `avoidCollisions`, `collisionPadding`, `sticky`, `hideWhenDetached`).

> **Why `minDate` / `maxDate`, not `min` / `max`?** `ForDatePicker` is a `FormValueControl`, and `FormUiControl` reserves `min` / `max` for numeric validators (`InputSignal<number | undefined>`). A date-typed `min` / `max` would break that contract, so the date bounds use the `*Date` suffix. (`ForCalendar` is not a form control, so it keeps `min` / `max`.)

## Usage

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
  ForDatePicker,
  ForDatePickerContent,
  ForDatePickerTrigger,
  ForDatePickerValue,
} from 'forty-cdk';

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
      <button forDatePickerTrigger>
        <span forDatePickerValue [placeholder]="'Pick a date'"></span>
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

## Modal vs non-modal

By default the surface is a **non-modal popover**: anchored to the trigger, no background inert, no scroll lock — matching React Aria / Ark UI. Set `[modal]="true"` to route through the modal shell instead: focus is trapped inside the dialog, the background is inert, and body scroll is locked (a centered dialog you position with CSS, not trigger-anchored). Either way the surface is `role="dialog"` and `aria-haspopup="dialog"`-anchored; modal mode adds `aria-modal="true"`.

The mode is read once when the surface mounts (it is structurally different per mode), so toggle `modal` while the surface is closed.

## Keyboard

| Key                       | Behavior                                                                  |
| ------------------------- | ------------------------------------------------------------------------- |
| **Enter / Space** on trigger | Open the surface (native button activation).                           |
| **Escape**                | Dismiss the surface and return focus to the trigger (when `dismissible`). |

Inside the surface, the projected `ForCalendar` owns the full grid keyboard map (arrows / `Home` / `End` / `PageUp` / `PageDown` / `Enter` / `Space`). On open, focus lands on the calendar's focused cell (`value ?? today`) in non-modal mode, or the first focusable element in modal mode.

## Accessibility notes

- **`aria-haspopup="dialog"`** on the trigger, with `aria-expanded` reflecting `open()` and `aria-controls` pointing at the surface while open.
- **`role="dialog"`** on the surface, named by `[ariaLabel]` (or `aria-labelledby` the trigger when no label is set). `aria-modal="true"` only in modal mode (truthy-only).
- **Form-control ARIA** (`aria-disabled` / `aria-readonly` / `aria-required` / `aria-invalid` / `aria-busy`) is reflected on the focusable trigger so assistive tech announces validity on the element that takes focus.
- **Focus management**: focus enters the surface on open (the calendar's roving cell in non-modal mode) and returns to the trigger on close, both vetoable via `(autoFocusOnOpen)` / `(autoFocusOnClose)`.
- **Dismissal**: Escape (`(escapeKeyDown)`) and outside-pointer (`(pointerDownOutside)` / `(interactOutside)`) close the surface, each vetoable.

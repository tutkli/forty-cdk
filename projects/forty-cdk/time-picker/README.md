# ForTimePicker

A trigger that opens a floating listbox of generated time slots over a pluggable date adapter, with a configurable step, 12 / 24-hour labels and min / max bounds. Picking a slot preserves the date, so it composes inside a date-time picker.

Headless and styleless: a combobox trigger opens a floating listbox of generated time slots. Value is typed as your adapter's date-time type `D`.

Requires a time-capable adapter:
[`provideNativeDateAdapter()`](../calendar/src/native-date-adapter.ts) or the
`@internationalized/date` adapter from `forty-cdk/internationalized-date`.

## Anatomy

```html
<div
  forTimePicker
  [(value)]="value"
  [(open)]="open"
  [step]="30"
  [hourCycle]="24"
  #picker="forTimePicker"
>
  <button forTimePickerTrigger>
    <span forTimePickerValue placeholder="Pick a time"></span>
  </button>

  <!-- @if (picker.open()) { -->
  <div forTimePickerContent>
    <!-- @for slot of picker.slots() -->
    <div forTimePickerOption [value]="slot.value" [disabled]="slot.disabled">{{ slot.label }}</div>
  </div>
  <!-- } -->
</div>
```

## Examples

```html
<div
  forTimePicker
  [(value)]="value"
  [(open)]="open"
  [step]="30"
  [hourCycle]="24"
  #picker="forTimePicker"
>
  <button forTimePickerTrigger>
    <span forTimePickerValue placeholder="Pick a time"></span>
  </button>

  @if (open()) {
  <div forTimePickerContent>
    @for (slot of picker.slots(); track slot.id) {
    <div forTimePickerOption [value]="slot.value" [disabled]="slot.disabled">{{ slot.label }}</div>
    }
  </div>
  }
</div>
```

### Signal Forms

```html
<div forTimePicker [formField]="profile.meetingTime" [(open)]="open" #picker="forTimePicker">
  <button forTimePickerTrigger>
    <span forTimePickerValue placeholder="Pick a time"></span>
  </button>
  @if (open()) {
  <div forTimePickerContent>
    @for (slot of picker.slots(); track slot.id) {
    <div forTimePickerOption [value]="slot.value" [disabled]="slot.disabled">{{ slot.label }}</div>
    }
  </div>
  }
</div>
```

## API

### `ForTimePicker`

| Property        | Type                             | Description                                             |
| --------------- | -------------------------------- | ------------------------------------------------------- |
| `value`         | `D \| null`                      | Selected time (two-way)<br>**Default:** `null`          |
| `open`          | `boolean`                        | Open state (two-way)<br>**Default:** `false`            |
| `step`          | `number`                         | Slot interval in minutes<br>**Default:** `30`           |
| `granularity`   | `'hour' \| 'minute' \| 'second'` | Selection precision<br>**Default:** `'minute'`          |
| `hourCycle`     | `12 \| 24 \| null`               | Hour cycle for labels<br>**Default:** `null`            |
| `locale`        | `string \| null`                 | BCP 47 locale for labels<br>**Default:** `null`         |
| `minTime`       | `D \| null`                      | Earliest selectable time<br>**Default:** `null`         |
| `maxTime`       | `D \| null`                      | Latest selectable time<br>**Default:** `null`           |
| `closeOnSelect` | `boolean`                        | Close on slot selection<br>**Default:** `true`          |
| `modal`         | `boolean`                        | Modal (focus-trapped) mode<br>**Default:** `false`      |
| `dismissible`   | `boolean`                        | Escape / outside close<br>**Default:** `true`           |
| `returnFocus`   | `boolean`                        | Return focus to trigger on close<br>**Default:** `true` |
| `placeholder`   | `string`                         | Value display placeholder<br>**Default:** `''`          |
| `formatOptions` | `Intl.DateTimeFormatOptions`     | Override slot label format<br>**Default:** `{}`         |

Inherits all `FormUiControl` inputs (`disabled`, `readonly`, `required`, `invalid`,
`errors`, `touched`, `name`, `pending`) for `[formField]` auto-wiring.

### Data attributes

| Piece                    | Attribute          | Values                     |
| ------------------------ | ------------------ | -------------------------- |
| `[forTimePicker]`        | `data-state`       | `open` \| `closed`         |
| `[forTimePicker]`        | `data-disabled`    | present \| absent          |
| `[forTimePicker]`        | `data-readonly`    | present \| absent          |
| `[forTimePickerTrigger]` | `data-state`       | `open` \| `closed`         |
| `[forTimePickerTrigger]` | `data-disabled`    | present \| absent          |
| `[forTimePickerTrigger]` | `data-readonly`    | present \| absent          |
| `[forTimePickerValue]`   | `data-placeholder` | present \| absent          |
| `[forTimePickerContent]` | `data-state`       | `open` \| `closed`         |
| `[forTimePickerContent]` | `data-orientation` | `vertical` \| `horizontal` |
| `[forTimePickerContent]` | `data-modal`       | present \| absent          |
| `[forTimePickerOption]`  | `data-state`       | `checked` \| `unchecked`   |
| `[forTimePickerOption]`  | `data-disabled`    | present \| absent          |
| `[forTimePickerOption]`  | `data-highlighted` | present \| absent          |

`data-highlighted` marks the keyboard-focused slot (shared vocabulary with the listbox / menu / select primitives). `[forTimePickerContent]` also carries the positioner markers `data-side` / `data-align` / `data-placement` (and `data-detached` while `hideWhenDetached` is active) — see [Styling floating content](../../../docs/styling-floating-content.md).

## Scoped defaults

`provideForTimePickerDefaults` configures positioning defaults for an injector subtree — at the application root or in any component's `providers` array. Partial overrides inherit unspecified keys from the parent scope (or the library fallbacks at the root).

| Key                | Library fallback | Meaning                                                                          |
| ------------------ | ---------------- | -------------------------------------------------------------------------------- |
| `side`             | `'bottom'`       | Anchor side for time pickers that don't set `side` themselves.                   |
| `align`            | `'start'`        | Alignment along `side` for time pickers that don't set `align` themselves.       |
| `sideOffset`       | `4`              | Main-axis gap (px) for time pickers that don't set `sideOffset` themselves.      |
| `collisionPadding` | `8`              | Collision-middleware padding (px) for time pickers that don't set it themselves. |

Per-instance inputs always win over the scope defaults. All four are no-ops when `modal` is set: `[forTimePickerContent]` mounts the modal shell instead of the anchored positioner, so the surface is never positioned against the trigger and the consumer's own CSS places it.

```ts
import { provideForTimePickerDefaults } from 'forty-cdk/time-picker';

// Every time picker in the app opens above its trigger, aligned to the end edge
bootstrapApplication(App, {
  providers: [provideForTimePickerDefaults({ side: 'top', align: 'end' })],
});

// component-level override layers on top, per key
@Component({
  providers: [provideForTimePickerDefaults({ sideOffset: 0 })],
  ...
})
class CompactToolbar {}
```

## Anchoring to a field box

By default the listbox is positioned against `[forTimePickerTrigger]`. When the trigger lives inside a decorated field box — padding, a prefix icon, a clear / chevron button — anchoring to the inner button makes the panel offset from the visible field's edge. Wrap the field box in `[forTimePickerAnchor]` so floating-ui positions (and sizes, via `--for-floating-anchor-width`) the listbox against the box instead:

```html
<div forTimePicker #picker="forTimePicker" [(value)]="value" [(open)]="open">
  <div forTimePickerAnchor class="field-box">
    <icon name="clock" />
    <button forTimePickerTrigger>
      <span forTimePickerValue placeholder="Pick a time"></span>
    </button>
    <button class="clear" (click)="value.set(null)">×</button>
  </div>
  @if (open()) {
  <div forTimePickerContent style="width: var(--for-floating-anchor-width)">
    @for (slot of picker.slots(); track slot.id) {
    <div forTimePickerOption [value]="slot.value" [disabled]="slot.disabled">{{ slot.label }}</div>
    }
  </div>
  }
</div>
```

`[forTimePickerAnchor]` changes **only** positioning. The trigger keeps `aria-haspopup` / `aria-expanded` / `aria-controls`, the click toggle, focus return on close, and its exemption from outside-pointer dismissal. Without an anchor the listbox falls back to the trigger, so existing markup is unaffected. At most one `[forTimePickerAnchor]` per `[forTimePicker]` — a second one throws `[forty-cdk/time-picker]`.

## Date-time composition

Place `[forTimePicker]` inside `[forDatePickerContent]` alongside a `[forCalendar]`. The
`FOR_TIME_VALUE_SOURCE` token is provided by `[forTimePicker]`, and `[forDatePicker]`
resolves it automatically via `contentChild` to graft time changes onto the committed date.

```html
<div forDatePicker granularity="minute" [(value)]="value" [(open)]="open" #dp="forDatePicker">
  <button forDatePickerTrigger>...</button>
  @if (open()) {
  <div forDatePickerContent>
    <div forCalendar [value]="dp.value()">...</div>
    <div forTimePicker [value]="dp.value()" [step]="60" #tp="forTimePicker">
      <button forTimePickerTrigger>...</button>
      @if (tp.open()) {
      <div forTimePickerContent>
        @for (slot of tp.slots(); track slot.id) {
        <div forTimePickerOption [value]="slot.value" [disabled]="slot.disabled">
          {{ slot.label }}
        </div>
        }
      </div>
      }
    </div>
  </div>
  }
</div>
```

## Keyboard

| Key                     | Behavior                                  |
| ----------------------- | ----------------------------------------- |
| `Enter` / `Space`       | Select the focused slot                   |
| `ArrowDown` / `ArrowUp` | Move focus between slots                  |
| `Home`                  | Focus the first enabled slot              |
| `End`                   | Focus the last enabled slot               |
| `Tab`                   | Commit the focused slot and advance focus |
| `Escape`                | Close without committing                  |

## Accessibility

Implements the [WAI-ARIA Listbox pattern](https://www.w3.org/WAI/ARIA/apg/patterns/listbox/).

- **`role="combobox"`** on the trigger (`[forTimePickerTrigger]`) with `aria-haspopup="listbox"` and `aria-expanded` reflecting `open`.
- **`role="listbox"`** on the portaled content (`[forTimePickerContent]`); each slot is `role="option"` with `aria-selected` and `aria-disabled`.
- When used inside `[forDatePickerContent]` alongside a `[forCalendar]`, the time picker delegates its value to `[forDatePicker]` via `FOR_TIME_VALUE_SOURCE` — the combined date-time value is surfaced on the date picker's form-control ARIA.
- **Inside a `[forField]` the labelled element is the trigger**, not the `[forTimePicker]` wrapper: the field's `controlId` and its `aria-labelledby` / `aria-describedby` / `aria-errormessage` land on `[forTimePickerTrigger]`, so `[forLabel]`'s `for` points at the element that takes focus, clicking a non-`<label>` `[forLabel]` opens the listbox, and Signal Forms' focus-on-error reaches the trigger.

## Wrapping in a design system

Both supported wrapper patterns — `hostDirectives` with the exported `FOR_TIME_PICKER_HOST_DIRECTIVE_INPUTS` / `FOR_TIME_PICKER_HOST_DIRECTIVE_OUTPUTS` name tuples, and subclassing — are documented in [Wrapping form primitives](../../../docs/wrapping-form-primitives.md).

```typescript
import {
  FOR_TIME_PICKER_HOST_DIRECTIVE_INPUTS,
  FOR_TIME_PICKER_HOST_DIRECTIVE_OUTPUTS,
  ForTimePicker,
} from 'forty-cdk/time-picker';

@Component({
  selector: '[myTimePicker]',
  hostDirectives: [
    {
      directive: ForTimePicker,
      inputs: [...FOR_TIME_PICKER_HOST_DIRECTIVE_INPUTS],
      outputs: [...FOR_TIME_PICKER_HOST_DIRECTIVE_OUTPUTS],
    },
  ],
})
export class MyTimePicker {}
```

# ForTimePicker

Headless, styleless slot-based time picker. Implements the
[WAI-ARIA Listbox pattern](https://www.w3.org/WAI/ARIA/apg/patterns/listbox/) — a
combobox trigger opens a floating listbox of generated time slots. Value is typed as
your adapter's date-time type `D`.

Requires a time-capable adapter:
[`provideNativeDateAdapter()`](../calendar/native-date-adapter.ts) or the
`@internationalized/date` adapter from `forty-cdk/internationalized-date`.

## Usage

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
        <div
          forTimePickerOption
          [value]="slot.value"
          [disabled]="slot.disabled"
        >{{ slot.label }}</div>
      }
    </div>
  }
</div>
```

## Pieces

| Piece | Selector | Role |
|---|---|---|
| `ForTimePicker` | `[forTimePicker]` | Root — state, slots, context |
| `ForTimePickerTrigger` | `[forTimePickerTrigger]` | Combobox button |
| `ForTimePickerValue` | `[forTimePickerValue]` | Display element |
| `ForTimePickerContent` | `[forTimePickerContent]` | Portaled listbox |
| `ForTimePickerOption` | `[forTimePickerOption]` | Option (non-button `<div>`) |

## Inputs (root)

| Input | Type | Default | Description |
|---|---|---|---|
| `value` | `D \| null` | `null` | Selected time (two-way) |
| `open` | `boolean` | `false` | Open state (two-way) |
| `step` | `number` | `30` | Slot interval in minutes |
| `granularity` | `'hour' \| 'minute' \| 'second'` | `'minute'` | Selection precision |
| `hourCycle` | `12 \| 24 \| null` | `null` | Hour cycle for labels |
| `locale` | `string \| null` | `null` | BCP 47 locale for labels |
| `minTime` | `D \| null` | `null` | Earliest selectable time |
| `maxTime` | `D \| null` | `null` | Latest selectable time |
| `closeOnSelect` | `boolean` | `true` | Close on slot selection |
| `modal` | `boolean` | `false` | Modal (focus-trapped) mode |
| `dismissible` | `boolean` | `true` | Escape / outside close |
| `returnFocus` | `boolean` | `true` | Return focus to trigger on close |
| `placeholder` | `string` | `''` | Value display placeholder |
| `formatOptions` | `Intl.DateTimeFormatOptions` | `{}` | Override slot label format |

Inherits all `FormUiControl` inputs (`disabled`, `readonly`, `required`, `invalid`,
`errors`, `touched`, `name`, `pending`) for `[formField]` auto-wiring.

## Signal Forms

```html
<div forTimePicker [formField]="profile.meetingTime" [(open)]="open" #picker="forTimePicker">
  <button forTimePickerTrigger>
    <span forTimePickerValue placeholder="Pick a time"></span>
  </button>
  @if (open()) {
    <div forTimePickerContent>
      @for (slot of picker.slots(); track slot.id) {
        <div forTimePickerOption [value]="slot.value" [disabled]="slot.disabled">
          {{ slot.label }}
        </div>
      }
    </div>
  }
</div>
```

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

## Wrapping with `hostDirectives`

```typescript
import {
  FOR_TIME_PICKER_HOST_DIRECTIVE_INPUTS,
  FOR_TIME_PICKER_HOST_DIRECTIVE_OUTPUTS,
  ForTimePicker,
} from 'forty-cdk';

@Component({
  selector: '[myTimePicker]',
  hostDirectives: [{
    directive: ForTimePicker,
    inputs: [...FOR_TIME_PICKER_HOST_DIRECTIVE_INPUTS],
    outputs: [...FOR_TIME_PICKER_HOST_DIRECTIVE_OUTPUTS],
  }],
})
export class MyTimePicker {}
```

## Keyboard interaction

| Key | Behavior |
|---|---|
| `Enter` / `Space` | Select the focused slot |
| `ArrowDown` / `ArrowUp` | Move focus between slots |
| `Home` | Focus the first enabled slot |
| `End` | Focus the last enabled slot |
| `Tab` | Commit the focused slot and advance focus |
| `Escape` | Close without committing |

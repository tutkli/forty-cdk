# Number Input

Headless numeric spinbutton implementing the [WAI-ARIA Spinbutton pattern](https://www.w3.org/WAI/ARIA/apg/patterns/spinbutton/) and Angular's `FormValueControl<number | null>` from `@angular/forms/signals`, so it auto-wires with `[formField]` and auto-associates inside a [`[forField]`](../field/README.md) — label, description, and error wiring — with zero extra markup.

It owns parsing, clamping to `[min, max]`, the full Spinbutton keyboard map, and optional `Intl.NumberFormat`-based display formatting. The directive sits on a `<input type="text">` (not `type="number"`, whose native UI is unstylable and locale-quirky); the focusable spinbutton input itself is the `FormValueControl`, mirroring `<button forSwitch>`.

## Anatomy

| Class                     | Selector                    | Element     | Role                                                                 |
| ------------------------- | --------------------------- | ----------- | -------------------------------------------------------------------- |
| `ForNumberInput`          | `[forNumberInput]`          | `<input>`   | The spinbutton. Owns value, parsing, clamping, keyboard.             |
| `ForNumberInputGroup`     | `[forNumberInputGroup]`     | any wrapper | Coordination wrapper — only needed when you use the stepper buttons. |
| `ForNumberInputIncrement` | `[forNumberInputIncrement]` | `<button>`  | "Step up" affordance (`tabindex="-1"`).                              |
| `ForNumberInputDecrement` | `[forNumberInputDecrement]` | `<button>`  | "Step down" affordance (`tabindex="-1"`).                            |

> **Why the group?** A `<input>` is a void element, so the stepper buttons can't be its DOM descendants and therefore can't inject its context directly. `[forNumberInputGroup]` provides that context and forwards it to the `[forNumberInput]` registered beneath it. A standalone spinbutton (keyboard / `[(value)]` only) needs no group.

## Examples

### Stand-alone

```ts
import { Component, signal } from '@angular/core';
import {
  ForNumberInput,
  ForNumberInputDecrement,
  ForNumberInputGroup,
  ForNumberInputIncrement,
} from 'forty-cdk/number-input';

@Component({
  selector: 'demo-quantity',
  imports: [ForNumberInputGroup, ForNumberInput, ForNumberInputIncrement, ForNumberInputDecrement],
  template: `
    <div forNumberInputGroup>
      <button forNumberInputDecrement class="number-input-decrement" ariaLabel="Decrease">−</button>
      <input forNumberInput [(value)]="qty" [min]="0" [max]="10" [step]="1" />
      <button forNumberInputIncrement class="number-input-increment" ariaLabel="Increase">+</button>
    </div>
    <p>{{ qty() }}</p>
  `,
})
export class DemoQuantity {
  readonly qty = signal<number | null>(1);
}
```

Keyboard-only (no buttons, no group):

```html
<input forNumberInput [(value)]="qty" [min]="0" [max]="100" />
```

### Formatting

`formatOptions` (+ optional `locale`) drives both the displayed text and `aria-valuetext`; `value()` stays the raw number, and that raw number is what a surrounding `<form>` submits (via a hidden input).

```html
<input
  forNumberInput
  [(value)]="price"
  locale="en-US"
  [formatOptions]="{ style: 'currency', currency: 'USD' }"
/>
<!-- value() === 1234.5 → displayed "$1,234.50", aria-valuenow="1234.5" -->
```

### Field composition

Drop the spinbutton inside a `[forField]` and it auto-associates with the label, description, and error region — no `id` / `aria-*` wiring by hand.

```ts
import { Component, signal } from '@angular/core';
import { form, min, required, FormField } from '@angular/forms/signals';
import { ForField, ForFieldError, ForLabel } from 'forty-cdk/field';
import { ForNumberInput } from 'forty-cdk/number-input';

@Component({
  selector: 'demo-order',
  imports: [ForField, ForLabel, ForFieldError, ForNumberInput, FormField],
  template: `
    <div forField>
      <label forLabel>Quantity</label>
      <input forNumberInput [formField]="order.qty" [min]="1" />
      @if (err.shown()) {
        <p forFieldError #err="forFieldError">{{ err.messages().join(', ') }}</p>
      }
    </div>
  `,
})
export class DemoOrder {
  readonly model = signal({ qty: null as number | null });
  readonly order = form(this.model, (o) => {
    required(o.qty, { message: 'Quantity is required' });
    min(o.qty, 1, { message: 'At least one' });
  });
}
```

## API

### `ForNumberInput`

| Property                                                               | Type                                      | Description                                                                                                           |
| ---------------------------------------------------------------------- | ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `value`                                                                | `model<number \| null>`                   | Two-way bindable value. `null` is the empty input (reflected as `data-empty`).<br>**Default:** —                      |
| `min`                                                                  | `input<number \| undefined>`              | Lower bound. Reflected as `aria-valuemin`. Unset → no lower bound.<br>**Default:** —                                  |
| `max`                                                                  | `input<number \| undefined>`              | Upper bound. Reflected as `aria-valuemax`. Unset → no upper bound.<br>**Default:** —                                  |
| `step`                                                                 | `input<number>`                           | Increment for ArrowUp / ArrowDown and the buttons.<br>**Default:** `1`                                                |
| `stepMultiplier`                                                       | `input<number>`                           | Multiplier over `step` for PageUp / PageDown (configurable via `provideForNumberInputDefaults`).<br>**Default:** `10` |
| `formatOptions`                                                        | `input<Intl.NumberFormatOptions \| null>` | When set, drives the displayed text and `aria-valuetext`.<br>**Default:** —                                           |
| `locale`                                                               | `input<string \| null>`                   | BCP 47 locale for parsing and formatting. Defaults to the runtime locale.<br>**Default:** —                           |
| `disabled` / `readonly` / `required` / `invalid` / `pending` / `dirty` | `input<boolean>`                          | Shared form-control flags (see [Field](../field/README.md)).<br>**Default:** —                                        |
| `name`                                                                 | `input<string>`                           | Mounts a hidden `<input>` carrying the **raw** number for native form submission.<br>**Default:** —                   |
| `touched`                                                              | `model<boolean>`                          | Set to `true` on blur.<br>**Default:** —                                                                              |

The host carries `data-empty` (while the value is `null`), `data-disabled`, and `data-readonly`, plus `data-touched` / `data-dirty` / `data-pending` / `data-invalid` from the shared form-control reflection.

### Stepper buttons

Both `[forNumberInputIncrement]` / `[forNumberInputDecrement]` take the uniform `ariaLabel` input for their accessible name and stay `tabindex="-1"` (focus belongs on the spinbutton). They reflect `[disabled]` + `data-disabled` at the bound (`max` for increment, `min` for decrement) or when the control is disabled / read-only.

> Set the accessible name with the `ariaLabel` **input** (`ariaLabel="Increase"`), not the native `aria-label` attribute — like every forty-cdk primitive, the directive host-binds `aria-label` from that input and clears it when empty.

### Data attributes

| Piece                       | Attribute       | Values                                               |
| --------------------------- | --------------- | ---------------------------------------------------- |
| `[forNumberInput]`          | `data-empty`    | present (while `value()` is `null`) / absent         |
| `[forNumberInput]`          | `data-disabled` | present / absent                                     |
| `[forNumberInput]`          | `data-readonly` | present / absent                                     |
| `[forNumberInput]`          | `data-touched`  | present / absent                                     |
| `[forNumberInput]`          | `data-dirty`    | present / absent                                     |
| `[forNumberInput]`          | `data-pending`  | present / absent                                     |
| `[forNumberInput]`          | `data-invalid`  | present / absent                                     |
| `[forNumberInputIncrement]` | `data-disabled` | present (at `max`, or disabled / read-only) / absent |
| `[forNumberInputDecrement]` | `data-disabled` | present (at `min`, or disabled / read-only) / absent |

`[forNumberInputGroup]` carries no styling attributes — it is a behavior-only coordination wrapper.

## Keyboard

The following shortcuts implement the Spinbutton APG keyboard map.

| Key                     | Behavior                                                        |
| ----------------------- | --------------------------------------------------------------- |
| `ArrowUp` / `ArrowDown` | `value ± step`, clamped.                                        |
| `PageUp` / `PageDown`   | `value ± step × stepMultiplier`, clamped.                       |
| `Home` / `End`          | Set to `min` / `max` (when defined).                            |
| `Enter`                 | Commit (clamp the typed text).                                  |
| typing                  | Numeric characters parsed live; clamped on blur / Enter / step. |

Stepping from an empty field lands on the clamped baseline (`min ?? 0`).

## Accessibility

- **`role="spinbutton"` on a text input.** `aria-valuenow` / `aria-valuemin` / `aria-valuemax` reflect the value and bounds; `aria-valuetext` is emitted only when `formatOptions` is set (so the formatted text — "$1,234.50" — is announced instead of the bare number). `inputmode` is `numeric`, or `decimal` when fractional values are possible.
- **Clamp on commit, validate on input.** Keystrokes update the parsed value live so you can type transient out-of-range text without fighting the caret; clamping to `[min, max]` happens on blur / Enter / step actions.
- **Hidden input for submission.** Because the displayed text can be formatted, the visible input does **not** carry `name`; setting `name` mounts a hidden `<input>` with the raw number so native `<form>` serialization sees the value, not "$1,234.50". A disabled control is skipped automatically.
- **Falsy state styling selects on absence.** `aria-disabled` / `aria-readonly` / `aria-required` / `aria-invalid` / `aria-busy` are emitted only when truthy — style the off state with `:not([aria-invalid])`, never `[aria-invalid="false"]`.
- **`@angular/forms` is an optional peer.** If you're not using Signal Forms, don't install it — the directive runs fine on a plain `[(value)]` binding (the only `@angular/forms/signals` reference is a type import, erased at build).

## Styling

forty-cdk ships no styles. Add your own class to each piece — the `for*` selectors are the behavior API, not a styling contract (see [Styling forty-cdk](../../../../../docs/styling.md)). Key your CSS off the reflected `data-*` attributes listed under [Data attributes](#data-attributes).

```css
.number-input-increment[data-disabled],
.number-input-decrement[data-disabled] {
  opacity: 0.4;
  cursor: not-allowed;
}
```

## Wrapping in a design system

Both supported wrapper patterns — `hostDirectives` with the exported `FOR_NUMBER_INPUT_HOST_DIRECTIVE_INPUTS` / `FOR_NUMBER_INPUT_HOST_DIRECTIVE_OUTPUTS` name tuples, and subclassing — are documented in [Wrapping form primitives](../../../../../docs/wrapping-form-primitives.md).

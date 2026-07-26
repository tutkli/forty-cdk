# Field

Headless wiring that ties a label, description and error region to a control, and reflects validation state as data-\* for styling. Any forty-cdk form control auto-associates; native inputs opt in with forFieldControl.

It renders **nothing** and imposes no layout, and there is **no control contract to implement**: every forty-cdk form primitive (`FormValueControl` / `FormCheckboxControl`) already exposes the state the field needs (`id` / `aria-labelledby` / `aria-describedby` / `aria-errormessage` association plus `data-*` validation hooks), so wrapping one in a `[forField]` auto-associates it with zero extra markup.

## Anatomy

```html
<div forField #field="forField">
  <label forLabel>Email address</label>
  <input forFieldControl type="email" required />
  <p forFieldDescription>We'll only use this to send receipts.</p>
  @if (field.invalid()) {
  <p forFieldError #err="forFieldError">{{ err.messages().join(', ') }}</p>
  }
</div>
```

## How the control connects

- **forty-cdk controls** (`forSwitch`, `forCheckbox`, `forSlider`, `forSelect`, `forListbox`, `forCombobox`, `forRadioGroup`, `forToggle`, `forToggleGroup`) auto-wire — they inherit the association from the shared form base. No marker needed.
- **Native controls** add `[forFieldControl]` and drive validation state via its `invalid` / `required` / `disabled` / `touched` inputs.

`ForField` owns the control's `id` (it assigns one if the control has none, otherwise it adopts the existing id), so a `<label forLabel>`'s `for` always resolves to the control.

**One control per field.** A `[forField]` owns a single `controlId`, so wrap each control in its own field and group related fields with `[forFieldset]`. Registering a second control logs a dev-mode warning; the last one registered wins, and unmounting it falls back to the previous still-mounted control.

## `ForFieldError` — automatic Signal Forms errors

`ForFieldError` reads the control's `errors()` automatically and exposes them as signals:

- `errors()` — the raw `ValidationError[]`.
- `messages()` — `string[]` of human-readable messages.
- `hasErrors()` / `shown()` — `shown()` is `true` when the control is invalid and has errors.

You render them; the field handles the ARIA. The error id is wired into `aria-errormessage` (and folded into `aria-describedby`) only while the control is invalid.

Gate the region's `@if` on the field's `invalid()` (exposed via the `[forField]` export, `#field="forField"`) or on the bound Signal Forms field — **not** on a reference to `ForFieldError` itself, which is block-scoped to the `@if` body and so can't appear in the condition that mounts it.

## Examples

```ts
import { Component, signal } from '@angular/core';
import { form, FormField, required } from '@angular/forms/signals';
import { ForField, ForFieldDescription, ForFieldError, ForLabel } from 'forty-cdk/field';
import { ForSwitch } from 'forty-cdk/switch';

@Component({
  selector: 'demo-field',
  imports: [ForField, ForLabel, ForFieldDescription, ForFieldError, ForSwitch, FormField],
  template: `
    <div forField class="field" #field="forField">
      <label forLabel class="field-label">Notifications</label>
      <button forSwitch [formField]="settings.notify"></button>
      <p forFieldDescription>We'll only email you about security.</p>
      @if (field.invalid()) {
        <p forFieldError #err="forFieldError">{{ err.messages().join(', ') }}</p>
      }
    </div>
  `,
})
export class DemoField {
  readonly model = signal({ notify: false });
  readonly settings = form(this.model, (s) => {
    required(s.notify, { message: 'Please choose a preference' });
  });
}
```

Style off the reflected state:

```css
.field[data-invalid] .field-label {
  color: var(--color-danger);
}
```

### Label-click activation

Clicking the label activates the control on both host shapes, not just focuses it. A native `<label forLabel>` emits `for` and the browser forwards the click; a non-`<label>` `[forLabel]` (e.g. `<span forLabel>`) has no native `for` forwarding, so the directive forwards the click itself. Either way, clicking the label toggles a `[forSwitch]` / checkbox-role control, activates a button-host control, or focuses a text input — matching native `<label for>` behavior consistently.

> Note: composite controls whose host is not the focusable element (`forListbox`, `forSelect`, `forCombobox`) still receive `aria-labelledby` correctly, and a label click is forwarded to the control's nominated focusable element (the Select trigger / Combobox input) rather than the wrapper host.

## API

### `ForField`

Root container (`[forField]`). Owns the generated ids and reflects the registered control's validation state. The reflected state mirrors the registered control: `data-invalid` while it is invalid, `data-required` while it is required, `data-touched` once it has been touched, and `data-disabled` from the control's own disabled state OR a surrounding `[forFieldset]`'s `disabled`.

| Data attribute  | Values           |
| --------------- | ---------------- |
| `data-invalid`  | present / absent |
| `data-disabled` | present / absent |
| `data-required` | present / absent |
| `data-touched`  | present / absent |

### `ForLabel`

Accessible label (`[forLabel]`). Inside a field it adopts the field's `labelId` and wires `aria-labelledby` (and `for` on a native `<label>`); usable standalone.

### `ForFieldDescription`

Hint / description (`[forFieldDescription]`). Adopts the field's `descriptionId` and wires `aria-describedby`.

### `ForFieldError`

Error region (`[forFieldError]`, `role="alert"`). Reads the control's Signal Forms errors automatically and exposes them as signals.

| Property    | Type                        | Description                                        |
| ----------- | --------------------------- | -------------------------------------------------- |
| `errors`    | `Signal<ValidationError[]>` | The control's current raw validation errors.       |
| `messages`  | `Signal<readonly string[]>` | Human-readable messages derived from `errors`.     |
| `hasErrors` | `Signal<boolean>`           | `true` when the control has at least one error.    |
| `shown`     | `Signal<boolean>`           | `true` when the control is invalid and has errors. |

### `ForFieldControl`

Opt-in marker (`[forFieldControl]`) for a **native** `<input>` / `<textarea>` / `<select>` (forty-cdk controls auto-wire and don't need it). Validation state is consumer-driven. Reflects `aria-invalid` on its own host while `invalid` is true (an ARIA hook, not a styling one).

| Property   | Type             | Description                                                                                     |
| ---------- | ---------------- | ----------------------------------------------------------------------------------------------- |
| `invalid`  | `input<boolean>` | Marks the control invalid — drives the error region and `aria-invalid`.<br>**Default:** `false` |
| `required` | `input<boolean>` | Marks the control required — reflected by the field as `data-required`.<br>**Default:** `false` |
| `disabled` | `input<boolean>` | Marks the control disabled — reflected by the field as `data-disabled`.<br>**Default:** `false` |
| `touched`  | `input<boolean>` | Marks the control touched — reflected by the field as `data-touched`.<br>**Default:** `false`   |

## Accessibility

- **`aria-labelledby`** is wired from `[forLabel]` to the control's id, so screen readers announce the label when the control receives focus.
- **`aria-describedby`** is wired from `[forFieldDescription]` (hint text) and folds in the error id while the control is invalid.
- **`aria-errormessage`** points at `[forFieldError]`'s id while the control is invalid. The error region carries `role="alert"` so it is announced immediately.
- **Label-click activation** matches native `<label for>` behavior on both native `<label>` and non-label hosts (see [Label-click activation](#label-click-activation)).

## Styling

forty-cdk ships no styles. Add your own class to each piece — the for\* selectors are the behavior API, not a styling contract (see [Styling forty-cdk](../../../../../docs/styling.md)). Key your CSS off the reflected data-\* attributes listed per piece in the [API](#api) section.

```css
.field[data-invalid] .field-label {
  color: var(--color-danger);
}
```

# Field

Headless form-field wiring — the styleless counterpart to Radix `Label` + `Form` and Base UI `Field`. It renders **nothing** and imposes no layout: it only associates a label, a description, and an error region with a single control (via `id` / `aria-labelledby` / `aria-describedby` / `aria-errormessage`) and reflects the control's validation state as `data-*` styling hooks.

Unlike Angular Material's `MatFormField`, there is no rendered chrome, no appearance variants, and **no control contract to implement**: every forty-cdk form primitive (`FormValueControl` / `FormCheckboxControl`) already exposes the state the field needs, so wrapping one in a `[forField]` auto-associates it with zero extra markup.

## Pieces

| Class                 | Selector                | Role                                                                                             |
| --------------------- | ----------------------- | ------------------------------------------------------------------------------------------------ |
| `ForField`            | `[forField]`            | Root. Owns the generated ids and reflects `data-invalid` / `data-disabled` / `data-required` / `data-touched`. |
| `ForLabel`            | `[forLabel]`            | Accessible label. Inside a field it wires `aria-labelledby` (and `for` on a `<label>`); usable standalone. |
| `ForFieldDescription` | `[forFieldDescription]` | Hint / description. Wires `aria-describedby`.                                                     |
| `ForFieldError`       | `[forFieldError]`       | Error region (`role="alert"`). Reads the control's Signal Forms errors automatically.            |
| `ForFieldControl`     | `[forFieldControl]`     | Opt-in marker for a **native** `<input>` / `<textarea>` (forty-cdk controls don't need it).       |

## How the control connects

- **forty-cdk controls** (`forSwitch`, `forCheckbox`, `forSlider`, `forSelect`, `forListbox`, `forCombobox`, `forRadioGroup`, `forToggle`, `forToggleGroup`) auto-wire — they inherit the association from the shared form base. No marker needed.
- **Native controls** add `[forFieldControl]` and drive validation state via its `invalid` / `required` / `disabled` / `touched` inputs.

`ForField` owns the control's `id` (it assigns one if the control has none, otherwise it adopts the existing id), so a `<label forLabel>`'s `for` always resolves to the control.

## `ForFieldError` — automatic Signal Forms errors

`ForFieldError` reads the control's `errors()` automatically and exposes them as signals:

- `errors()` — the raw `ValidationError[]`.
- `messages()` — `string[]` of human-readable messages.
- `hasErrors()` / `shown()` — `shown()` is `true` when the control is invalid and has errors.

You render them; the field handles the ARIA. The error id is wired into `aria-errormessage` (and folded into `aria-describedby`) only while the control is invalid.

## Example

```ts
import { Component, signal } from '@angular/core';
import { form, FormField, required } from '@angular/forms/signals';
import {
  ForField,
  ForLabel,
  ForFieldDescription,
  ForFieldError,
  ForSwitch,
} from 'forty-cdk';

@Component({
  selector: 'demo-field',
  imports: [ForField, ForLabel, ForFieldDescription, ForFieldError, ForSwitch, FormField],
  template: `
    <div forField>
      <label forLabel>Notifications</label>
      <button forSwitch [formField]="settings.notify"></button>
      <p forFieldDescription>We'll only email you about security.</p>
      @if (err.shown()) {
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
[forField][data-invalid] [forLabel] {
  color: var(--color-danger);
}
```

> Note: composite controls whose host is not the focusable element (`forListbox`, `forSelect`, `forCombobox`) still receive `aria-labelledby` correctly, but a label click focuses the control's host rather than the inner active element.

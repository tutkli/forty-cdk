# Input / Textarea

Attribute directives for single- and multi-line text: a string value() that auto-wires with Signal Forms and reflects every form state (empty, disabled, readonly, invalid …) as data-_ / aria-_ hooks.

`ForInput` and `ForTextarea` implement Angular's `FormValueControl<string>` from `@angular/forms/signals`, so they auto-wire with `[formField]` and auto-associate inside a [`[forField]`](../field/README.md) — label, description, and error wiring — with zero extra markup. These are thin wrappers, not re-implementations: the native `<input>` / `<textarea>` keeps its own `type`, caret, IME composition, and native form submission. The directive only bridges the value to a signal and reflects validation state.

## Anatomy

```html
<!-- Single-line, two-way bound value -->
<input forInput [(value)]="email" type="email" />

<!-- Multi-line; autosize grows the height to fit content -->
<textarea forTextarea autosize [(value)]="bio"></textarea>

<!-- Auto-associated inside a Field via Signal Forms -->
<div forField>
  <label forLabel>Full name</label>
  <input forInput [formField]="profile.name" />
</div>
```

Both expose the identical API below; `[forTextarea]` adds the optional `autosize` input.

## Auto-resizing textarea

`[forTextarea]` accepts an optional `autosize` input. When set, the textarea's height tracks its content — it grows as the value gets taller and shrinks back as it gets shorter, recomputed on every edit, on programmatic `value` writes, and on width reflow. The directive only sets the element's `height`; pair it with `resize: none; overflow: hidden;` (key off the reflected `data-autosize`) so the native resize grip and scrollbar don't fight the measured height.

```ts
import { Component, signal } from '@angular/core';
import { ForTextarea } from 'forty-cdk/input';

@Component({
  selector: 'demo-comment',
  imports: [ForTextarea],
  template: `<textarea forTextarea autosize class="textarea" [(value)]="comment"></textarea>`,
})
export class DemoComment {
  readonly comment = signal('');
}
```

```css
.textarea[data-autosize] {
  resize: none;
  overflow: hidden;
}
```

Auto-resize is a browser-only DOM side effect, so it is inert under server-side rendering and hydrates without a layout jump.

## Examples

### Stand-alone

```ts
import { Component, signal } from '@angular/core';
import { ForInput, ForTextarea } from 'forty-cdk/input';

@Component({
  selector: 'demo-profile',
  imports: [ForInput, ForTextarea],
  template: `
    <input forInput class="input" [(value)]="email" type="email" placeholder="you@example.com" />
    <textarea forTextarea class="textarea" [(value)]="bio" placeholder="About you"></textarea>
    <p>{{ email() }} — {{ bio().length }} chars</p>
  `,
})
export class DemoProfile {
  readonly email = signal('');
  readonly bio = signal('');
}
```

### Field composition

Drop the control inside a `[forField]` and it auto-associates with the label, description, and error region — no `id` / `aria-*` wiring by hand.

```ts
import { Component, signal } from '@angular/core';
import { form, required } from '@angular/forms/signals';
import { FormField } from '@angular/forms/signals';
import { ForField, ForFieldError, ForLabel } from 'forty-cdk/field';
import { ForInput } from 'forty-cdk/input';

@Component({
  selector: 'demo-signup',
  imports: [ForField, ForLabel, ForFieldError, ForInput, FormField],
  template: `
    <form>
      <div forField>
        <label forLabel>Full name</label>
        <input forInput class="input" [formField]="profile.name" />
        @if (err.shown()) {
          <p forFieldError #err="forFieldError">{{ err.messages().join(', ') }}</p>
        }
      </div>
    </form>
  `,
})
export class DemoSignup {
  readonly model = signal({ name: '' });
  readonly profile = form(this.model, (p) => {
    required(p.name, { message: 'Name is required' });
  });
}
```

`[formField]` detects the `FormValueControl<string>` interface and wires everything — value, disabled, required, invalid, errors, touched — without any glue.

## API

### `ForInput`

| Property   | Type                                                      | Description                                                                                                                |
| ---------- | --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `value`    | `model<string>`                                           | Two-way bindable text value. Defaults to `''`; reflected as `data-empty` while empty.<br>**Default:** —                    |
| `disabled` | `input<boolean>`                                          | Reflects native `disabled` + `aria-disabled="true"` + `data-disabled`.<br>**Default:** —                                   |
| `readonly` | `input<boolean>`                                          | Reflects native `readonly` + `aria-readonly="true"` + `data-readonly`.<br>**Default:** —                                   |
| `required` | `input<boolean>`                                          | Reflects `aria-required="true"`.<br>**Default:** —                                                                         |
| `invalid`  | `input<boolean>`                                          | Reflects `aria-invalid="true"` + `data-invalid`.<br>**Default:** —                                                         |
| `pending`  | `input<boolean>`                                          | Reflects `aria-busy="true"` + `data-pending` while async validation is in flight.<br>**Default:** —                        |
| `dirty`    | `input<boolean>`                                          | Reflects `data-dirty`.<br>**Default:** —                                                                                   |
| `name`     | `input<string>`                                           | Reflected on the native `name` attribute for form submission.<br>**Default:** —                                            |
| `errors`   | `input<readonly ValidationError.WithOptionalFieldTree[]>` | Validation errors fed by `[formField]`. The directive does not render them — that is consumer territory.<br>**Default:** — |
| `touched`  | `model<boolean>`                                          | Set to `true` on blur. Two-way so the field can read it back.<br>**Default:** —                                            |

| Data attribute  | Values                           |
| --------------- | -------------------------------- |
| `data-empty`    | present (value is `''`) / absent |
| `data-disabled` | present / absent                 |
| `data-readonly` | present / absent                 |
| `data-touched`  | present / absent                 |
| `data-dirty`    | present / absent                 |
| `data-pending`  | present / absent                 |
| `data-invalid`  | present / absent                 |

### `ForTextarea`

| Property   | Type                                                      | Description                                                                                                                |
| ---------- | --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `value`    | `model<string>`                                           | Two-way bindable text value. Defaults to `''`; reflected as `data-empty` while empty.<br>**Default:** —                    |
| `disabled` | `input<boolean>`                                          | Reflects native `disabled` + `aria-disabled="true"` + `data-disabled`.<br>**Default:** —                                   |
| `readonly` | `input<boolean>`                                          | Reflects native `readonly` + `aria-readonly="true"` + `data-readonly`.<br>**Default:** —                                   |
| `required` | `input<boolean>`                                          | Reflects `aria-required="true"`.<br>**Default:** —                                                                         |
| `invalid`  | `input<boolean>`                                          | Reflects `aria-invalid="true"` + `data-invalid`.<br>**Default:** —                                                         |
| `pending`  | `input<boolean>`                                          | Reflects `aria-busy="true"` + `data-pending` while async validation is in flight.<br>**Default:** —                        |
| `dirty`    | `input<boolean>`                                          | Reflects `data-dirty`.<br>**Default:** —                                                                                   |
| `name`     | `input<string>`                                           | Reflected on the native `name` attribute for form submission.<br>**Default:** —                                            |
| `errors`   | `input<readonly ValidationError.WithOptionalFieldTree[]>` | Validation errors fed by `[formField]`. The directive does not render them — that is consumer territory.<br>**Default:** — |
| `touched`  | `model<boolean>`                                          | Set to `true` on blur. Two-way so the field can read it back.<br>**Default:** —                                            |
| `autosize` | `input<boolean>`                                          | Grows/shrinks the height to fit content; reflects `data-autosize`.<br>**Default:** `false`                                 |

| Data attribute  | Values                           |
| --------------- | -------------------------------- |
| `data-empty`    | present (value is `''`) / absent |
| `data-disabled` | present / absent                 |
| `data-readonly` | present / absent                 |
| `data-touched`  | present / absent                 |
| `data-dirty`    | present / absent                 |
| `data-pending`  | present / absent                 |
| `data-invalid`  | present / absent                 |
| `data-autosize` | present (`autosize` on) / absent |

## Accessibility

- **The native element is the control.** It stays the focusable, submittable form field, so screen readers, mobile keyboards (`type`, `inputmode`), autofill, and native validation all behave exactly as they would on a bare `<input>` / `<textarea>`.
- **No hidden input.** Because the visible element carries `name` and its `.value` _is_ the form value, the browser serializes it natively — unlike `ForSwitch` (a `<button>`) or `ForNumberInput` (formatted display), which mount a hidden input. A disabled control is skipped by native serialization automatically.
- **Falsy state styling selects on absence.** `aria-disabled` / `aria-readonly` / `aria-required` / `aria-invalid` / `aria-busy` are emitted only when truthy — style the off state with `:not([aria-invalid])`, never `[aria-invalid="false"]`.
- **`@angular/forms` is an optional peer.** If you're not using Signal Forms, don't install it — the directive runs fine on a plain `[(value)]` binding (the only `@angular/forms/signals` reference is a type import, erased at build).

## Styling

forty-cdk ships no styles. Add your own class to each piece — the `for*` selectors are the behavior API, not a styling contract (see [Styling forty-cdk](../../../docs/styling.md)). Key your CSS off the reflected `data-*` attributes listed per piece in the [API](#api) section.

`[forInput]` and `[forTextarea]` reflect the identical set of attributes on their native host element.

```css
.input[data-invalid] {
  border-color: red;
}

.input[data-empty]::placeholder {
  opacity: 0.5;
}
```

## Wrapping in a design system

Both supported wrapper patterns — `hostDirectives` with the exported `FOR_INPUT_HOST_DIRECTIVE_INPUTS` / `FOR_INPUT_HOST_DIRECTIVE_OUTPUTS` and `FOR_TEXTAREA_HOST_DIRECTIVE_INPUTS` / `FOR_TEXTAREA_HOST_DIRECTIVE_OUTPUTS` name tuples, and subclassing — are documented in [Wrapping form primitives](../../../docs/wrapping-form-primitives.md).

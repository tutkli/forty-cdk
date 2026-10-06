---
title: Input
group: primitives
archetype: [form-control]
---

# Input / Textarea

Attribute directives for single- and multi-line text: a string value() that auto-wires with Signal Forms and reflects every form state (empty, disabled, readonly, invalid …) as `data-*` / `aria-*` hooks.

`ForInput` and `ForTextarea` implement Angular's `FormValueControl<string>` from `@angular/forms/signals`, so they auto-wire with `[formField]` and auto-associate inside a [`[forField]`](../field/README.md) (label, description, and error wiring) with zero extra markup. These are thin wrappers, not re-implementations: the native `<input>` / `<textarea>` keeps its own `type`, caret, IME composition, and native form submission. The directive only bridges the value to a signal and reflects validation state.

## When to choose

- **Input / Textarea**: the control. `[forInput]` / `[forTextarea]` sit on a native `<input>` / `<textarea>`, bridge its string value to a signal and reflect validation state; the element keeps its own `type`, caret and IME behaviour.
- **[Field](../field/README.md)**: the wiring around a control (label, description and error region tied to it by id), with no value of its own. It renders nothing and never replaces the input, so the two are used together.
- When the value is not free text, reach for the control that models it: [Number Input](../number-input/README.md), [Date Field](../date-field/README.md), [Select](../select/README.md) or [Combobox](../combobox/README.md).

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

## Field composition

Drop the control inside a `[forField]` and it auto-associates with the label, description, and error region without any `id` / `aria-*` wiring by hand.

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

`[formField]` detects the `FormValueControl<string>` interface and wires everything (value, disabled, required, invalid, errors, touched) without any glue.

## Examples

Type in the field and watch the `[forInput]` host: `data-empty` and `data-touched` follow what the user has actually done to it. `data-dirty` is a reflection of the `dirty` input, so it appears only when `[formField]` or a `[dirty]` binding supplies it, never from this standalone `[(value)]` binding.

```ts
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ForInput, ForTextarea } from 'forty-cdk/input';

@Component({
  selector: 'app-input-default-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForInput, ForTextarea],
  template: `
    <div class="stack">
      <input
        forInput
        class="input"
        type="email"
        aria-label="Email address"
        placeholder="jane@example.com"
        [(value)]="email"
      />
      <textarea
        forTextarea
        class="input area"
        rows="3"
        aria-label="Short bio"
        placeholder="A short bio…"
        [(value)]="bio"
      ></textarea>
      <p class="state">{{ email() || '∅' }} — {{ bio().length }} chars</p>
    </div>
  `,
})
export class InputDefaultExample {
  protected readonly email = signal('');
  protected readonly bio = signal('');
}
```

### States

One class and one directive, three states. `disabled` reflects native `disabled` plus `data-disabled` and drops out of submission; `readonly` keeps the field focusable but blocks edits and reflects `data-readonly`. The example's stylesheet keys on nothing else.

### Auto-sizing textarea

`autosize` makes the textarea's height track its content: type a few lines and delete them, and it grows and shrinks with each edit. It also recomputes on programmatic `value` writes and when the width reflows. The directive sets only `height`, so pair it with `resize: none; overflow: hidden` keyed off the reflected `data-autosize`. Cap it with a `max-height` and `overflowing()` tells you when the content runs past the cap, on every edit including the ones that leave the box the same size, so a "Read more" toggle can lift the cap. The measurement is browser-only, so it is inert under SSR and hydrates without a layout jump.

```html
<textarea
  forTextarea
  #notes="forTextarea"
  class="input area"
  autosize
  aria-label="Release notes"
  [attr.data-capped]="expanded() ? null : ''"
  [(value)]="text"
></textarea>
@if (notes.overflowing() || expanded()) {
<button type="button" [attr.aria-expanded]="expanded()" (click)="expanded.set(!expanded())">
  {{ expanded() ? 'Show less' : 'Read more' }}
</button>
}
```

```css
.area[data-capped] {
  max-height: 6.5rem;
}
```

### Signal Forms validation

Bound through `[formField]`, `forInput` auto-associates inside `forField`: the label adopts the control id, errors flow into `aria-errormessage`, and `touched` / `invalid` are reflected with no manual id plumbing. Type an invalid address and blur to surface the error.

## API

### `ForInput`

| Property   | Type                                                      | Description                                                                                                               |
| ---------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `value`    | `model<string>`                                           | Two-way bindable text value. Defaults to `''`; reflected as `data-empty` while empty.<br>**Default:** —                   |
| `disabled` | `input<boolean>`                                          | Reflects native `disabled` + `data-disabled` (no `aria-disabled`).<br>**Default:** —                                      |
| `readonly` | `input<boolean>`                                          | Reflects native `readonly` + `aria-readonly="true"` + `data-readonly`.<br>**Default:** —                                  |
| `required` | `input<boolean>`                                          | Reflects `aria-required="true"`.<br>**Default:** —                                                                        |
| `invalid`  | `input<boolean>`                                          | Reflects `aria-invalid="true"` + `data-invalid`.<br>**Default:** —                                                        |
| `pending`  | `input<boolean>`                                          | Reflects `aria-busy="true"` + `data-pending` while async validation is in flight.<br>**Default:** —                       |
| `dirty`    | `input<boolean>`                                          | Reflects `data-dirty`.<br>**Default:** —                                                                                  |
| `name`     | `input<string>`                                           | Reflected on the native `name` attribute for form submission.<br>**Default:** —                                           |
| `errors`   | `input<readonly ValidationError.WithOptionalFieldTree[]>` | Validation errors fed by `[formField]`. The directive does not render them. That is consumer territory.<br>**Default:** — |
| `touched`  | `model<boolean>`                                          | Set to `true` on blur. Two-way so the field can read it back.<br>**Default:** —                                           |

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

| Property      | Type                                                      | Description                                                                                                                                                                           |
| ------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `value`       | `model<string>`                                           | Two-way bindable text value. Defaults to `''`; reflected as `data-empty` while empty.<br>**Default:** —                                                                               |
| `disabled`    | `input<boolean>`                                          | Reflects native `disabled` + `data-disabled` (no `aria-disabled`).<br>**Default:** —                                                                                                  |
| `readonly`    | `input<boolean>`                                          | Reflects native `readonly` + `aria-readonly="true"` + `data-readonly`.<br>**Default:** —                                                                                              |
| `required`    | `input<boolean>`                                          | Reflects `aria-required="true"`.<br>**Default:** —                                                                                                                                    |
| `invalid`     | `input<boolean>`                                          | Reflects `aria-invalid="true"` + `data-invalid`.<br>**Default:** —                                                                                                                    |
| `pending`     | `input<boolean>`                                          | Reflects `aria-busy="true"` + `data-pending` while async validation is in flight.<br>**Default:** —                                                                                   |
| `dirty`       | `input<boolean>`                                          | Reflects `data-dirty`.<br>**Default:** —                                                                                                                                              |
| `name`        | `input<string>`                                           | Reflected on the native `name` attribute for form submission.<br>**Default:** —                                                                                                       |
| `errors`      | `input<readonly ValidationError.WithOptionalFieldTree[]>` | Validation errors fed by `[formField]`. The directive does not render them. That is consumer territory.<br>**Default:** —                                                             |
| `touched`     | `model<boolean>`                                          | Set to `true` on blur. Two-way so the field can read it back.<br>**Default:** —                                                                                                       |
| `autosize`    | `input<boolean>`                                          | Grows/shrinks the height to fit content; reflects `data-autosize`.<br>**Default:** `false`                                                                                            |
| `overflowing` | `Signal<boolean>`                                         | Whether the content is taller than the visible box, with or without `autosize`; a 1px difference counts as fitting. `false` under SSR. Reflects `data-overflowing`.<br>**Default:** — |

| Data attribute     | Values                                         |
| ------------------ | ---------------------------------------------- |
| `data-empty`       | present (value is `''`) / absent               |
| `data-disabled`    | present / absent                               |
| `data-readonly`    | present / absent                               |
| `data-touched`     | present / absent                               |
| `data-dirty`       | present / absent                               |
| `data-pending`     | present / absent                               |
| `data-invalid`     | present / absent                               |
| `data-autosize`    | present (`autosize` on) / absent               |
| `data-overflowing` | present (content taller than the box) / absent |

## Accessibility

- **The native element is the control.** It stays the focusable, submittable form field, so screen readers, mobile keyboards (`type`, `inputmode`), autofill, and native validation all behave exactly as they would on a bare `<input>` / `<textarea>`.
- **No hidden input.** Because the visible element carries `name` and its `.value` _is_ the form value, the browser serializes it natively, unlike `ForSwitch` (a `<button>`) or `ForNumberInput` (formatted display), which mount a hidden input. A disabled control is skipped by native serialization automatically.
- **Disabled reflects through one channel.** The native `disabled` attribute already exposes the unavailable state through HTML-AAM, so no `aria-disabled` is emitted alongside it. Style the disabled state with `:disabled` or `[data-disabled]`.
- **Falsy state styling selects on absence.** `aria-readonly` / `aria-required` / `aria-invalid` / `aria-busy` are emitted only when truthy, so style the off state with `:not([aria-invalid])`, never `[aria-invalid="false"]`.
- **`@angular/forms` is an optional peer.** If you're not using Signal Forms, don't install it. The directive runs fine on a plain `[(value)]` binding (the only `@angular/forms/signals` reference is a type import, erased at build).

## Styling

forty-cdk ships no styles: put your own class on each piece and key your CSS off the `data-*` attributes listed under [API](#api), not off the `for*` selectors ([Styling forty-cdk](../../../docs/styling.md) explains why).

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

[Wrapping form primitives](../../../docs/wrapping-form-primitives.md) documents both supported wrapper patterns: `hostDirectives` with the exported `FOR_INPUT_HOST_DIRECTIVE_INPUTS` / `FOR_INPUT_HOST_DIRECTIVE_OUTPUTS` and `FOR_TEXTAREA_HOST_DIRECTIVE_INPUTS` / `FOR_TEXTAREA_HOST_DIRECTIVE_OUTPUTS` name tuples, and subclassing.

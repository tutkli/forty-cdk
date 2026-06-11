# Wrapping form primitives

Design systems built on forty-cdk usually don't expose the raw primitives — they wrap each
form control in a styled component with the system's selector and classes. The wrapper must
re-expose the primitive's full API by exact public name: the value model (`value` /
`checked`), the `touched` model, the `touch` output, and the shared form-state inputs
(`disabled`, `readonly`, `required`, `invalid`, `pending`, `dirty`, `name`, `errors`), plus
every control-specific member. Any omission fails silently — an unbound name falls back to a
native DOM property and `[formField]` discovery degrades.

Two patterns are supported. Both keep the Signal Forms contract intact, so a wrapper still
auto-wires with `[formField]`.

## Pattern 1 — `hostDirectives` with the exported name tuples

Every primitive implementing `FormValueControl` / `FormCheckboxControl` exports two `as
const` tuples from the main entry point: `FOR_<PRIMITIVE>_HOST_DIRECTIVE_INPUTS` and
`FOR_<PRIMITIVE>_HOST_DIRECTIVE_OUTPUTS` — the exact public names of every input (models
included) and every output (the models' `*Change` emitters and the `touch` output). Spread
them into a `hostDirectives` entry:

```ts
import { ChangeDetectionStrategy, Component } from '@angular/core';
import {
  FOR_INPUT_HOST_DIRECTIVE_INPUTS,
  FOR_INPUT_HOST_DIRECTIVE_OUTPUTS,
  ForInput,
} from 'forty-cdk';

@Component({
  selector: 'input[mtxInput]',
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'mtx-input' },
  hostDirectives: [
    {
      directive: ForInput,
      inputs: [...FOR_INPUT_HOST_DIRECTIVE_INPUTS],
      outputs: [...FOR_INPUT_HOST_DIRECTIVE_OUTPUTS],
    },
  ],
})
export class MtxInput {}
```

The wrapper now accepts every `ForInput` binding by its original name — `[(value)]`,
`[(touched)]`, `[disabled]`, `(touch)`, … — and works under `[formField]` exactly like the
bare primitive:

```html
<input mtxInput [formField]="profile.name" />
```

An anti-drift spec in the library fails whenever a tuple stops matching the directive's
actual inputs/outputs, so the lists stay trustworthy across releases.

### Always spread into an inline object literal

Angular resolves `hostDirectives` statically at compile time. When your app compiles against
the published package, the compiler can evaluate the name tuples (their literal types are
preserved in the `.d.ts`) — but it cannot evaluate a pre-built `{ directive, inputs,
outputs }` object imported from the package, and fails with `NG1010: Host directive
reference must be a class`. That is why forty-cdk ships name tuples instead of ready-made
config objects: spread them into an object literal written directly inside the
`hostDirectives` array, as shown above.

### Composite primitives keep working

The root directive's `providers` (its `FOR_<PRIMITIVE>_CONTEXT` token) come along with the
host directive, so the child pieces a consumer projects into the wrapper still resolve their
context:

```ts
import { ChangeDetectionStrategy, Component } from '@angular/core';
import {
  FOR_LISTBOX_HOST_DIRECTIVE_INPUTS,
  FOR_LISTBOX_HOST_DIRECTIVE_OUTPUTS,
  ForListbox,
} from 'forty-cdk';

@Component({
  selector: 'ul[mtxListbox]',
  template: '<ng-content />',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'mtx-listbox' },
  hostDirectives: [
    {
      directive: ForListbox,
      inputs: [...FOR_LISTBOX_HOST_DIRECTIVE_INPUTS],
      outputs: [...FOR_LISTBOX_HOST_DIRECTIVE_OUTPUTS],
    },
  ],
})
export class MtxListbox {}
```

```html
<ul mtxListbox [(value)]="picked" ariaLabel="Fruit">
  <li><button type="button" forListboxOption value="apple">Apple</button></li>
</ul>
```

### Exposing only part of the surface

The tuples are plain readonly string arrays, so a wrapper that wants to own some inputs can
filter before spreading:

```ts
inputs: [...FOR_INPUT_HOST_DIRECTIVE_INPUTS.filter((name) => name !== 'name')],
```

The filtered name is then no longer bindable from the outside; the wrapper binds the
underlying directive itself (e.g. via `host` or by injecting it).

## Pattern 2 — subclassing

A subclass with its own decorator inherits the primitive's inputs, outputs, host bindings,
and listeners, and stays a `FormValueControl` / `FormCheckboxControl` — `[formField]` keeps
working with no re-exposed names to maintain:

```ts
import { Directive } from '@angular/core';
import { ForInput } from 'forty-cdk';

@Directive({
  selector: 'input[mtxInput]',
  host: { class: 'mtx-input' },
})
export class MtxInput extends ForInput {}
```

### Decorator `providers` are not inherited

Angular inherits the parent's compiled metadata (inputs, outputs, host bindings) through the
class hierarchy, but each decorator declares its own `providers`. A primitive that shares a
context token through `providers: [{ provide: FOR_X_CONTEXT, useExisting: ForX }]` loses
that registration in the subclass — projected child pieces (`[forListboxOption]`,
`[forSelectTrigger]`, …) can no longer resolve their context and throw the primitive's
orphan error. The subclass must re-provide the token, pointing `useExisting` at itself:

```ts
import { Directive } from '@angular/core';
import { FOR_LISTBOX_CONTEXT, ForListbox } from 'forty-cdk';

@Directive({
  selector: 'ul[mtxListbox]',
  host: { class: 'mtx-listbox' },
  providers: [{ provide: FOR_LISTBOX_CONTEXT, useExisting: MtxListbox }],
})
export class MtxListbox extends ForListbox {}
```

Primitives whose root provides a context token (and therefore needs the re-provide):
`ForCombobox`, `ForDateField`, `ForDatePicker`, `ForListbox`, `ForOtpInput`,
`ForRadioGroup`, `ForSelect`, `ForSlider`, `ForTimeField`, `ForToggleGroup`. The leaf
controls — `ForInput`, `ForTextarea`, `ForCheckbox`, `ForSwitch`, `ForToggle`,
`ForNumberInput` — declare no providers, so a bare subclass is enough.

## Choosing a pattern

- **`hostDirectives`** composes without touching the class hierarchy: the wrapper is a
  component that owns its template and can layer extra structure, and several host
  directives can stack on one host. Bindings forward by name, so the exported tuples (plus
  the anti-drift spec behind them) are what keeps the surface complete.
- **Subclassing** is the lighter option when the wrapper only adds styling hooks or
  overrides behavior: nothing to re-expose, but remember the `providers` caveat above and
  that the subclass inherits future API additions automatically (including ones your design
  system may not want to expose).

## Exported tuples

| Primitive        | Inputs tuple                             | Outputs tuple                             |
| ---------------- | ---------------------------------------- | ----------------------------------------- |
| `ForCheckbox`    | `FOR_CHECKBOX_HOST_DIRECTIVE_INPUTS`     | `FOR_CHECKBOX_HOST_DIRECTIVE_OUTPUTS`     |
| `ForCombobox`    | `FOR_COMBOBOX_HOST_DIRECTIVE_INPUTS`     | `FOR_COMBOBOX_HOST_DIRECTIVE_OUTPUTS`     |
| `ForDateField`   | `FOR_DATE_FIELD_HOST_DIRECTIVE_INPUTS`   | `FOR_DATE_FIELD_HOST_DIRECTIVE_OUTPUTS`   |
| `ForDatePicker`  | `FOR_DATE_PICKER_HOST_DIRECTIVE_INPUTS`  | `FOR_DATE_PICKER_HOST_DIRECTIVE_OUTPUTS`  |
| `ForInput`       | `FOR_INPUT_HOST_DIRECTIVE_INPUTS`        | `FOR_INPUT_HOST_DIRECTIVE_OUTPUTS`        |
| `ForListbox`     | `FOR_LISTBOX_HOST_DIRECTIVE_INPUTS`      | `FOR_LISTBOX_HOST_DIRECTIVE_OUTPUTS`      |
| `ForNumberInput` | `FOR_NUMBER_INPUT_HOST_DIRECTIVE_INPUTS` | `FOR_NUMBER_INPUT_HOST_DIRECTIVE_OUTPUTS` |
| `ForOtpInput`    | `FOR_OTP_INPUT_HOST_DIRECTIVE_INPUTS`    | `FOR_OTP_INPUT_HOST_DIRECTIVE_OUTPUTS`    |
| `ForRadioGroup`  | `FOR_RADIO_GROUP_HOST_DIRECTIVE_INPUTS`  | `FOR_RADIO_GROUP_HOST_DIRECTIVE_OUTPUTS`  |
| `ForSelect`      | `FOR_SELECT_HOST_DIRECTIVE_INPUTS`       | `FOR_SELECT_HOST_DIRECTIVE_OUTPUTS`       |
| `ForSlider`      | `FOR_SLIDER_HOST_DIRECTIVE_INPUTS`       | `FOR_SLIDER_HOST_DIRECTIVE_OUTPUTS`       |
| `ForSwitch`      | `FOR_SWITCH_HOST_DIRECTIVE_INPUTS`       | `FOR_SWITCH_HOST_DIRECTIVE_OUTPUTS`       |
| `ForTextarea`    | `FOR_TEXTAREA_HOST_DIRECTIVE_INPUTS`     | `FOR_TEXTAREA_HOST_DIRECTIVE_OUTPUTS`     |
| `ForTimeField`   | `FOR_TIME_FIELD_HOST_DIRECTIVE_INPUTS`   | `FOR_TIME_FIELD_HOST_DIRECTIVE_OUTPUTS`   |
| `ForToggle`      | `FOR_TOGGLE_HOST_DIRECTIVE_INPUTS`       | `FOR_TOGGLE_HOST_DIRECTIVE_OUTPUTS`       |
| `ForToggleGroup` | `FOR_TOGGLE_GROUP_HOST_DIRECTIVE_INPUTS` | `FOR_TOGGLE_GROUP_HOST_DIRECTIVE_OUTPUTS` |

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

Because `hostDirectives` is resolved statically, the compiler cannot evaluate computed
expressions over the tuples — `.filter(...)`, `.map(...)`, and friends fail with `NG1010:
Value could not be determined statically`. A wrapper that wants to withhold some inputs
lists its subset literally instead of spreading:

```ts
inputs: ['value', 'disabled', 'touched'],
```

The withheld names are then no longer bindable from the outside; the wrapper binds the
underlying directive itself (e.g. via `host` or by injecting it). Note that a hand-written
subset opts out of the anti-drift guarantee — future API additions won't flow through
automatically — so prefer spreading the full tuple unless hiding a member is a hard
requirement.

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

Primitives whose **root** provides a context token (and therefore needs the re-provide):
`ForCombobox`, `ForDateField`, `ForDatePicker`, `ForListbox`, `ForOtpInput`,
`ForRadioGroup`, `ForSelect`, `ForSlider`, `ForTimeField`, `ForToggleGroup`. The pure leaf
controls — `ForInput`, `ForTextarea`, `ForSwitch`, `ForToggle`, `ForNumberInput` — declare no
providers, so a bare subclass is enough.

### Indicator parent parts also self-provide a token

A second family of parts provides a self-token so their optional **indicator** resolves the
parent without importing the concrete class. Subclassing one of these parts and projecting
its indicator needs the same one-line re-provide, pointing `useExisting` at the subclass:

```ts
import { Directive } from '@angular/core';
import { FOR_SELECT_OPTION, ForSelectOption } from 'forty-cdk';

@Directive({
  selector: 'button[mtxSelectOption]',
  host: { class: 'mtx-select-option' },
  providers: [{ provide: FOR_SELECT_OPTION, useExisting: MtxSelectOption }],
})
export class MtxSelectOption extends ForSelectOption {}
```

| Subclassed part       | Indicator that resolves it    | Token to re-provide      |
| --------------------- | ----------------------------- | ------------------------ |
| `ForSelectOption`     | `[forSelectIndicator]`        | `FOR_SELECT_OPTION`      |
| `ForComboboxOption`   | `[forComboboxIndicator]`      | `FOR_COMBOBOX_OPTION`    |
| `ForListboxOption`    | `[forListboxOptionIndicator]` | `FOR_LISTBOX_OPTION`     |
| `ForCheckbox`         | `[forCheckboxIndicator]`      | `FOR_CHECKBOX`           |
| `ForRadio`            | `[forRadioIndicator]`         | `FOR_RADIO`              |
| `ForMenuCheckboxItem` | `[forMenuItemIndicator]`      | `FOR_MENU_CHECKBOX_ITEM` |
| `ForMenuRadioItem`    | `[forMenuItemIndicator]`      | `FOR_MENU_RADIO_ITEM`    |

`ForCheckbox` is the one part that is both a leaf form control and an indicator parent: a bare
`MtxCheckbox extends ForCheckbox` is enough on its own, and the re-provide is only needed when
the wrapper projects `[forCheckboxIndicator]` into it. The other parts always carry their
indicator inside the same wrapper, so re-provide the token whenever you subclass them.

### Projected time sources self-provide a bridge token

`ForDatePicker` builds a date-time picker by querying its projected time control through
`contentChild(FOR_TIME_VALUE_SOURCE)`. Both `ForTimeField` and `ForTimePicker` satisfy that
bridge by providing the token from their own decorator (`{ provide: FOR_TIME_VALUE_SOURCE,
useExisting: ForTimeField | ForTimePicker }`). A subclass wrapper projected into a date-time
`ForDatePicker` must re-provide the token, pointing `useExisting` at itself, or the bridge
finds no time source and the time component is silently dropped:

```ts
import { Directive } from '@angular/core';
import { FOR_TIME_VALUE_SOURCE, ForTimeField } from 'forty-cdk';

@Directive({
  selector: '[mtxTimeField]',
  exportAs: 'mtxTimeField',
  providers: [{ provide: FOR_TIME_VALUE_SOURCE, useExisting: MtxTimeField }],
})
export class MtxTimeField extends ForTimeField {}
```

| Subclassed primitive | Bridge that resolves it                      | Token to re-provide     |
| -------------------- | -------------------------------------------- | ----------------------- |
| `ForTimeField`       | `ForDatePicker`'s `contentChild` time bridge | `FOR_TIME_VALUE_SOURCE` |
| `ForTimePicker`      | `ForDatePicker`'s `contentChild` time bridge | `FOR_TIME_VALUE_SOURCE` |

For `ForTimeField` this is **in addition to** the `FOR_TIME_FIELD_CONTEXT` re-provide from the
table above — its decorator provides both tokens, and a subclass that projects the time field's
own segment pieces _and_ feeds a date-time picker re-provides each. A subclass that only feeds
the date-picker bridge (no projected child pieces) re-provides `FOR_TIME_VALUE_SOURCE` alone.

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

## Binding a single-valued field to a selection primitive

The selection primitives — `ForSelect`, `ForListbox`, `ForCombobox` — model their value as
`readonly T[]`, with single mode keeping the array at length ≤ 1 (the selection value-type
contract). That uniform array shape is the `FormValueControl<readonly T[]>` backing the
`[formField]` directive auto-wires to, and it is deliberately the same for single and multi
selection.

A single-select consumer, however, models their domain field as `T | null` — so a
`FieldTree<T | null>` cannot bind to the control through `[formField]` directly: the value
types don't line up, and the read-only `selected` / `selectedItem` accessors only help the
read direction. Rather than hand-roll the `T | null` ⇄ `readonly T[]` mapping in every
wrapper (and re-plumb `disabled` / `invalid` / `errors` / `touched` / `required` alongside
it — exactly the glue `[formField]` exists to delete), use the `forSingleValueField` helper:

```ts
import { Component, signal } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import { ForSelect, forSingleValueField } from 'forty-cdk';

@Component({
  selector: 'app-country-picker',
  imports: [ForSelect, FormField],
  template: `<div forSelect [formField]="country">…</div>`,
})
export class CountryPicker {
  private readonly model = signal({ country: null as string | null });
  protected readonly profile = form(this.model);

  // FieldTree<string | null> → FieldTree<readonly string[]>; bind the result.
  protected readonly country = forSingleValueField(this.profile.country);
}
```

`forSingleValueField` returns a derived `FieldTree<readonly T[]>` view: the value maps both
directions (`null` ↔ `[]`, `v` ↔ `[v]`, last entry wins for a longer write), and every other
field-state member delegates to the original field, so `[formField]` pushes the same UI state
into the control it would for any other field. The value is `computed`, never copied — there
is no second source of truth. Multi-select fields are already `readonly T[]`; bind those (and
any field you model as `readonly T[]` yourself) with `[formField]` directly. See
[the helper's README](../projects/forty-cdk/src/lib/signal-forms/README.md) for the full
behaviour table.

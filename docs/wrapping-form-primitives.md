# Wrapping form primitives

Design systems built on forty-cdk usually don't expose the raw primitives. They wrap each
form control in a styled component with the system's selector and classes. The wrapper must
re-expose the primitive's full API by exact public name: the value model (`value` /
`checked`), the `touched` model, the `touch` output, and the shared form-state inputs
(`disabled`, `readonly`, `required`, `invalid`, `pending`, `dirty`, `name`, `errors`), plus
every control-specific member. Any omission fails silently: an unbound name falls back to a
native DOM property and `[formField]` discovery degrades.

Two patterns are supported. Both keep the Signal Forms contract intact, so a wrapper still
auto-wires with `[formField]`.

## Pattern 1 — `hostDirectives` with the exported name tuples

Every primitive implementing `FormValueControl` / `FormCheckboxControl` exports two `as
const` tuples from the main entry point: `FOR_<PRIMITIVE>_HOST_DIRECTIVE_INPUTS` and
`FOR_<PRIMITIVE>_HOST_DIRECTIVE_OUTPUTS`. They hold the exact public names of every input (models
included) and every output (the models' `*Change` emitters and the `touch` output). Spread
them into a `hostDirectives` entry:

```ts
import { ChangeDetectionStrategy, Component } from '@angular/core';
import {
  FOR_INPUT_HOST_DIRECTIVE_INPUTS,
  FOR_INPUT_HOST_DIRECTIVE_OUTPUTS,
  ForInput,
} from 'forty-cdk/input';

@Component({
  selector: 'input[myInput]',
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'my-input' },
  hostDirectives: [
    {
      directive: ForInput,
      inputs: [...FOR_INPUT_HOST_DIRECTIVE_INPUTS],
      outputs: [...FOR_INPUT_HOST_DIRECTIVE_OUTPUTS],
    },
  ],
})
export class MyInput {}
```

The wrapper now accepts every `ForInput` binding by its original name (`[(value)]`,
`[(touched)]`, `[disabled]`, `(touch)`, …) and works under `[formField]` exactly like the
bare primitive:

```html
<input myInput [formField]="profile.name" />
```

An anti-drift spec in the library fails whenever a tuple stops matching the directive's
actual inputs/outputs, so the lists stay trustworthy across releases.

### Always spread into an inline object literal

Angular resolves `hostDirectives` statically at compile time. When your app compiles against
the published package, the compiler can evaluate the name tuples (their literal types are
preserved in the `.d.ts`), but it cannot evaluate a pre-built `{ directive, inputs,
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
} from 'forty-cdk/listbox';

@Component({
  selector: 'ul[myListbox]',
  template: '<ng-content />',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'my-listbox' },
  hostDirectives: [
    {
      directive: ForListbox,
      inputs: [...FOR_LISTBOX_HOST_DIRECTIVE_INPUTS],
      outputs: [...FOR_LISTBOX_HOST_DIRECTIVE_OUTPUTS],
    },
  ],
})
export class MyListbox {}
```

```html
<ul myListbox [(value)]="picked" ariaLabel="Fruit">
  <li><button type="button" forListboxOption value="apple">Apple</button></li>
</ul>
```

### Exposing only part of the surface

Because `hostDirectives` is resolved statically, the compiler cannot evaluate computed
expressions over the tuples. Calling `.filter(...)`, `.map(...)`, and friends fails with `NG1010:
Value could not be determined statically`. A wrapper that wants to withhold some inputs
lists its subset literally instead of spreading:

<!-- snippet: fragment -->

```ts
inputs: ['value', 'disabled', 'touched'],
```

The withheld names are then no longer bindable from the outside; the wrapper binds the
underlying directive itself (e.g. via `host` or by injecting it). Note that a hand-written
subset opts out of the anti-drift guarantee (future API additions won't flow through
automatically), so prefer spreading the full tuple unless hiding a member is a hard
requirement.

## Pattern 2 — subclassing

A subclass with its own decorator inherits the primitive's inputs, outputs, host bindings,
and listeners, and stays a `FormValueControl` / `FormCheckboxControl`, so `[formField]` keeps
working with no re-exposed names to maintain:

```ts
import { Directive } from '@angular/core';
import { ForInput } from 'forty-cdk/input';

@Directive({
  selector: 'input[myInput]',
  host: { class: 'my-input' },
})
export class MyInput extends ForInput {}
```

### Decorator `providers` are not inherited

Angular inherits the parent's compiled metadata (inputs, outputs, host bindings) through the
class hierarchy, but each decorator declares its own `providers`. A primitive that shares a
context token through `providers: [{ provide: FOR_X_CONTEXT, useExisting: ForX }]` loses
that registration in the subclass, so projected child pieces (`[forListboxOption]`,
`[forSelectTrigger]`, …) can no longer resolve their context and throw the primitive's
orphan error. The subclass must re-provide the token, pointing `useExisting` at itself:

```ts
import { Directive } from '@angular/core';
import { FOR_LISTBOX_CONTEXT, ForListbox } from 'forty-cdk/listbox';

@Directive({
  selector: 'ul[myListbox]',
  host: { class: 'my-listbox' },
  providers: [{ provide: FOR_LISTBOX_CONTEXT, useExisting: MyListbox }],
})
export class MyListbox extends ForListbox {}
```

Primitives whose **root** provides a context token (and therefore needs the re-provide):
`ForCombobox` (`FOR_COMBOBOX_CONTEXT`), `ForDateField` (`FOR_DATE_FIELD_CONTEXT`),
`ForDateRangeField` (`FOR_DATE_RANGE_FIELD_CONTEXT`), `ForListbox` (`FOR_LISTBOX_CONTEXT`),
`ForOtpInput` (`FOR_OTP_INPUT_CONTEXT`), `ForRadioGroup` (`FOR_RADIO_GROUP_CONTEXT`), `ForSelect`
(`FOR_SELECT_CONTEXT`), `ForSlider` (`FOR_SLIDER_CONTEXT`), `ForTimeRangeField`
(`FOR_TIME_RANGE_FIELD_CONTEXT`), `ForToggleGroup` (`FOR_TOGGLE_GROUP_CONTEXT`).
`ForDatePicker`, `ForDateRangePicker`, `ForTimePicker` and `ForTimeField` also provide tokens
a wrapper cannot import, so they spread a provider helper instead (see
[Date and time roots spread their provider helper](#date-and-time-roots-spread-their-provider-helper)).
The pure leaf controls (`ForInput`, `ForTextarea`, `ForSearch`, `ForSwitch`, `ForToggle`,
`ForNumberInput`) and the virtualization add-ons (`ForComboboxVirtualized`, `ForListboxVirtualized`,
`ForSelectVirtualized`) declare no providers, so a bare subclass is enough.

The two group registries a void-rooted control coordinates through provide their own token:
`ForNumberInputGroup` (`FOR_NUMBER_INPUT_GROUP`) and `ForSearchGroup` (`FOR_SEARCH_GROUP`). A
subclass of either re-provides it with `useExisting`, or the stepper buttons and the clear button
inside it throw their orphan errors. The range fields' endpoint groups, `ForDateRangeFieldStart` /
`ForDateRangeFieldEnd` (`FOR_DATE_RANGE_FIELD_SEGMENT_CONTEXT`) and `ForTimeRangeFieldStart` /
`ForTimeRangeFieldEnd` (`FOR_TIME_RANGE_FIELD_SEGMENT_CONTEXT`), provide a token the library does
not export, so a subclass cannot re-provide it: style an endpoint through the classes on its host
instead of subclassing it.

A wrapper that also wants `inject(ForSelect)` to resolve adds
`{ provide: ForSelect, useExisting: MySelect }` alongside the context re-provide.

### A split context does not change the re-provide

`ForSelect`, `ForCombobox`, `ForListbox`, `ForTimePicker`, `ForDatePicker` and `ForRadioGroup`
split their coordination surface in two:
the public `FOR_<PRIMITIVE>_CONTEXT` an advanced consumer injects, and an internal interface carrying
the members only the primitive's own pieces call (the piece-registration protocol, in Listbox's
and TimePicker's case the pointer-highlight channel, and in DatePicker's the anatomy). That interface is deliberately not exported
([#1399](https://github.com/tutkli/forty-cdk/issues/1399),
[#1524](https://github.com/tutkli/forty-cdk/issues/1524),
[#1781](https://github.com/tutkli/forty-cdk/issues/1781),
[#1784](https://github.com/tutkli/forty-cdk/issues/1784)). Since
[#1593](https://github.com/tutkli/forty-cdk/issues/1593) both are typed views of the **same token on
the same object**, the one-line re-provide above is the whole provider set. There is no second
provider for a wrapper to name:

```ts
import { Directive } from '@angular/core';
import { FOR_SELECT_CONTEXT, ForSelect } from 'forty-cdk/select';

@Directive({
  selector: '[mySelect]',
  exportAs: 'mySelect',
  providers: [{ provide: FOR_SELECT_CONTEXT, useExisting: MySelect }],
})
export class MySelect<T> extends ForSelect<T> {}
```

`useExisting` pointing at the root's class (or a subclass of it) is a precondition rather than a
style, because the pieces read the token at the internal interface's type. A `useValue` carrying your
own object satisfies the token's declared type and resolves, but has none of the registration protocol
behind it; in dev mode the first piece to resolve rejects it with a `[forty-cdk/<primitive>]`-prefixed
error naming this shape ([#1669](https://github.com/tutkli/forty-cdk/issues/1669)). The same check
covers Select's and Combobox's explicit trigger reference (`[forSelectTrigger]="root"` /
`[forComboboxTrigger]="root"`), which resolves the root without DI.

`ForTable` is an exception. It is not a form primitive, but it splits its context the same way
_and_ provides an internal registry its own constructor injects, so a subclass without
`provideForTable(MyTable)` fails to construct at all (`NG0201`). See
[Wrapping non-form roots](wrapping-non-form-roots.md#fortable-needs-its-provider-helper-not-a-hand-written-provider).
`ForTimePicker` and `ForDatePicker` are the others: each context is split the same way, but each
root also provides the date-time tokens covered below, so a subclass spreads
`provideForTimePicker(MyTimePicker)` or `provideForDatePicker(MyDatePicker)`.

### Indicator parent parts also self-provide a token

A second family of parts provides a self-token so their optional **indicator** resolves the
parent without importing the concrete class. Subclassing one of these parts and projecting
its indicator needs the same one-line re-provide, pointing `useExisting` at the subclass:

```ts
import { Directive } from '@angular/core';
import { FOR_SELECT_OPTION, ForSelectOption } from 'forty-cdk/select';

@Directive({
  selector: 'button[mySelectOption]',
  host: { class: 'my-select-option' },
  providers: [{ provide: FOR_SELECT_OPTION, useExisting: MySelectOption }],
})
export class MySelectOption extends ForSelectOption {}
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
`MyCheckbox extends ForCheckbox` is enough on its own, and the re-provide is only needed when
the wrapper projects `[forCheckboxIndicator]` into it. The other parts always carry their
indicator inside the same wrapper, so re-provide the token whenever you subclass them.

### Date and time roots spread their provider helper

The date and time primitives find each other through tokens their roots provide. A date-time
`ForDatePicker` finds its projected `ForTimeField` or `ForTimePicker` through one, a field
projected under `anatomy="field"` is adopted by its picker through another, and the projected
calendar, time field and time picker take the picker's `readonly` and `disabled` through a third.
None of them can be imported, so a subclass of one of these roots spreads the root's provider
helper as its `providers` instead of listing tokens. The helper installs the root's whole set,
public context included, and keeps the wrapper in step when the library adds a token:

```ts
import { Directive } from '@angular/core';
import { ForDatePicker, provideForDatePicker } from 'forty-cdk/date-picker';

@Directive({
  selector: '[myDatePicker]',
  exportAs: 'myDatePicker',
  providers: provideForDatePicker(MyDatePicker),
})
export class MyDatePicker<D> extends ForDatePicker<D> {}
```

| Subclassed root      | Helper                              | What a subclass without it loses                                                                                                                                                        |
| -------------------- | ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ForDatePicker`      | `provideForDatePicker(MyRoot)`      | A projected field is not adopted, and opening throws `FORCDK-DATE-PICKER-007` in dev mode. A read-only or disabled picker's calendar and time control accept input again.               |
| `ForDateRangePicker` | `provideForDateRangePicker(MyRoot)` | The shared `[forDatePickerTrigger]`, `[forDatePickerContent]` and `[forDatePickerValue]` resolve `FOR_DATE_PICKER_CONTEXT` under a range picker too, so they throw their orphan errors. |
| `ForTimePicker`      | `provideForTimePicker(MyRoot)`      | A date-time `ForDatePicker` silently drops the time component, and a projected field is not adopted (`FORCDK-TIME-PICKER-004` on open in dev mode).                                     |
| `ForTimeField`       | `provideForTimeField(MyRoot)`       | Its segment pieces lose their context, and a date-time `ForDatePicker` silently drops the time component.                                                                               |

The argument is the subclass, so the public context token aliases it and an advanced consumer
injecting `FOR_DATE_PICKER_CONTEXT` or `FOR_TIME_FIELD_CONTEXT` reaches your instance. A wrapper
composing one of these roots through `hostDirectives` needs none of this, because a host directive
brings its own providers to the element.

The picker finds its calendar through `contentChild(FOR_CALENDAR_CONTEXT)`, the token a
`ForCalendar` subclass re-provides anyway (see [Wrapping non-form roots](wrapping-non-form-roots.md)).

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

| Primitive                | Inputs tuple                                     | Outputs tuple                                     |
| ------------------------ | ------------------------------------------------ | ------------------------------------------------- |
| `ForCheckbox`            | `FOR_CHECKBOX_HOST_DIRECTIVE_INPUTS`             | `FOR_CHECKBOX_HOST_DIRECTIVE_OUTPUTS`             |
| `ForCombobox`            | `FOR_COMBOBOX_HOST_DIRECTIVE_INPUTS`             | `FOR_COMBOBOX_HOST_DIRECTIVE_OUTPUTS`             |
| `ForComboboxVirtualized` | `FOR_COMBOBOX_VIRTUALIZED_HOST_DIRECTIVE_INPUTS` | `FOR_COMBOBOX_VIRTUALIZED_HOST_DIRECTIVE_OUTPUTS` |
| `ForDateField`           | `FOR_DATE_FIELD_HOST_DIRECTIVE_INPUTS`           | `FOR_DATE_FIELD_HOST_DIRECTIVE_OUTPUTS`           |
| `ForDatePicker`          | `FOR_DATE_PICKER_HOST_DIRECTIVE_INPUTS`          | `FOR_DATE_PICKER_HOST_DIRECTIVE_OUTPUTS`          |
| `ForDateRangeField`      | `FOR_DATE_RANGE_FIELD_HOST_DIRECTIVE_INPUTS`     | `FOR_DATE_RANGE_FIELD_HOST_DIRECTIVE_OUTPUTS`     |
| `ForDateRangePicker`     | `FOR_DATE_RANGE_PICKER_HOST_DIRECTIVE_INPUTS`    | `FOR_DATE_RANGE_PICKER_HOST_DIRECTIVE_OUTPUTS`    |
| `ForInput`               | `FOR_INPUT_HOST_DIRECTIVE_INPUTS`                | `FOR_INPUT_HOST_DIRECTIVE_OUTPUTS`                |
| `ForListbox`             | `FOR_LISTBOX_HOST_DIRECTIVE_INPUTS`              | `FOR_LISTBOX_HOST_DIRECTIVE_OUTPUTS`              |
| `ForListboxVirtualized`  | `FOR_LISTBOX_VIRTUALIZED_HOST_DIRECTIVE_INPUTS`  | `FOR_LISTBOX_VIRTUALIZED_HOST_DIRECTIVE_OUTPUTS`  |
| `ForNumberInput`         | `FOR_NUMBER_INPUT_HOST_DIRECTIVE_INPUTS`         | `FOR_NUMBER_INPUT_HOST_DIRECTIVE_OUTPUTS`         |
| `ForOtpInput`            | `FOR_OTP_INPUT_HOST_DIRECTIVE_INPUTS`            | `FOR_OTP_INPUT_HOST_DIRECTIVE_OUTPUTS`            |
| `ForRadioGroup`          | `FOR_RADIO_GROUP_HOST_DIRECTIVE_INPUTS`          | `FOR_RADIO_GROUP_HOST_DIRECTIVE_OUTPUTS`          |
| `ForSearch`              | `FOR_SEARCH_HOST_DIRECTIVE_INPUTS`               | `FOR_SEARCH_HOST_DIRECTIVE_OUTPUTS`               |
| `ForSelect`              | `FOR_SELECT_HOST_DIRECTIVE_INPUTS`               | `FOR_SELECT_HOST_DIRECTIVE_OUTPUTS`               |
| `ForSelectVirtualized`   | `FOR_SELECT_VIRTUALIZED_HOST_DIRECTIVE_INPUTS`   | `FOR_SELECT_VIRTUALIZED_HOST_DIRECTIVE_OUTPUTS`   |
| `ForSlider`              | `FOR_SLIDER_HOST_DIRECTIVE_INPUTS`               | `FOR_SLIDER_HOST_DIRECTIVE_OUTPUTS`               |
| `ForSwitch`              | `FOR_SWITCH_HOST_DIRECTIVE_INPUTS`               | `FOR_SWITCH_HOST_DIRECTIVE_OUTPUTS`               |
| `ForTextarea`            | `FOR_TEXTAREA_HOST_DIRECTIVE_INPUTS`             | `FOR_TEXTAREA_HOST_DIRECTIVE_OUTPUTS`             |
| `ForTimeField`           | `FOR_TIME_FIELD_HOST_DIRECTIVE_INPUTS`           | `FOR_TIME_FIELD_HOST_DIRECTIVE_OUTPUTS`           |
| `ForTimePicker`          | `FOR_TIME_PICKER_HOST_DIRECTIVE_INPUTS`          | `FOR_TIME_PICKER_HOST_DIRECTIVE_OUTPUTS`          |
| `ForTimeRangeField`      | `FOR_TIME_RANGE_FIELD_HOST_DIRECTIVE_INPUTS`     | `FOR_TIME_RANGE_FIELD_HOST_DIRECTIVE_OUTPUTS`     |
| `ForToggle`              | `FOR_TOGGLE_HOST_DIRECTIVE_INPUTS`               | `FOR_TOGGLE_HOST_DIRECTIVE_OUTPUTS`               |
| `ForToggleGroup`         | `FOR_TOGGLE_GROUP_HOST_DIRECTIVE_INPUTS`         | `FOR_TOGGLE_GROUP_HOST_DIRECTIVE_OUTPUTS`         |

## Binding a single-valued field to a selection primitive

The selection primitives (`ForSelect`, `ForListbox`, `ForCombobox`) model their value as
`readonly T[]`, with single mode keeping the array at length ≤ 1 (the selection value-type
contract). That uniform array shape is the `FormValueControl<readonly T[]>` backing the
`[formField]` directive auto-wires to, and it is deliberately the same for single and multi
selection.

**Model the form field with the same shape, and bind it directly.** A single-select field is a
`readonly T[]` you keep at length ≤ 1. There is no adapter, no wrapper directive, and nothing
to re-plumb: `[formField]` pushes `disabled` / `readonly` / `required` / `invalid` / `errors` /
`touched` into the control and routes `focus()` to the primitive's real focus target, exactly
as it does for a multi-select field.

```ts
import { Component, signal } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import { ForSelect } from 'forty-cdk/select';

@Component({
  selector: 'app-country-picker',
  imports: [ForSelect, FormField],
  template: `<div forSelect [formField]="profile.country">…</div>`,
})
export class CountryPicker {
  // Single-select: the array never exceeds one entry, `[]` means nothing picked.
  private readonly model = signal({ country: [] as readonly string[] });
  protected readonly profile = form(this.model);
}
```

Read the picked value off the primitive's `selected` / `selectedItem` accessor for display, and
map to a `T | null` shape at the edge that needs it (a request payload, a persisted record)
rather than in the binding. A `FieldTree<T | null>` cannot bind to these controls: Angular's
template type-checker adds a two-way `[value]` binding between the field and **every** directive
on the host that owns a `value` model, so the value types have to line up exactly, in both
directions.

Do not reach for a hand-written `FieldTree` view to bridge the gap. The library shipped one
(`forSingleValueField`, retired in
[#1579](https://github.com/tutkli/forty-cdk/issues/1579)) and it could only be expressed as
reflection over `@angular/forms/signals` internals: Angular exposes no writable-computed
primitive, so a two-way mapped value signal means mutating a `computed` after creation, and
`FieldTree<readonly T[]>` is additionally an array-like of per-element subfield trees that no
hand-built view carries. Every one of those bets fails silently on a dependency bump, which is
why the shipped answer is to match the shape instead.

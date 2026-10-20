# Selection value-type contract

Every selection primitive in forty-cdk models its value the same way, so you learn one shape across the whole library, and on the roots that are form controls it flows through `[formField]` unchanged whether the control is single- or multi-select.

## The value is always a `readonly` array

Every root below exposes `value` as a `readonly` array model. The roots generic over their item type use `model<readonly T[]>`, so `T` can be any item type, objects included, matched through the root's `compareWith` input. Accordion panel ids and ToggleGroup item values are keys rather than domain items, so those two use `model<readonly string[]>`.

| Root                      | `value`                    | Form control                          |
| ------------------------- | -------------------------- | ------------------------------------- |
| `ForAccordion`            | `model<readonly string[]>` | No                                    |
| `ForToggleGroup`          | `model<readonly string[]>` | `FormValueControl<readonly string[]>` |
| `ForListbox<T = string>`  | `model<readonly T[]>`      | `FormValueControl<readonly T[]>`      |
| `ForSelect<T = string>`   | `model<readonly T[]>`      | `FormValueControl<readonly T[]>`      |
| `ForCombobox<T = string>` | `model<readonly T[]>`      | `FormValueControl<readonly T[]>`      |
| `ForTree<T = string>`     | `model<readonly T[]>`      | No                                    |
| `ForTable<T = unknown>`   | `model<readonly T[]>`      | No                                    |

On a form control that array is the `FormValueControl` backing the `[formField]` directive auto-wires to, so the field's `disabled`, `required`, `invalid` and `touched` state reaches the control. `ForAccordion`, `ForTree` and `ForTable` share the array shape but are not form controls: bind their `value` with `[(value)]`. One root covers both single and multi selection because the shape never changes with mode.

The array is treated immutably: the primitive replaces it (`[...]`, `.filter()`, a fresh `Set` then spread) rather than mutating it in place. You write to it through `[(value)]`.

## Single mode is the same array with 0–1 elements

With `multiple` unset (the default) the array stays at length ≤ 1. Activating an option replaces the current entry rather than appending, and an empty array means nothing is selected. There is no separate "single value" model to keep in sync.

## Single-select consumers read a derived accessor, never `value()[0]`

The roots in this table expose a read-only, single-mode view derived with `computed()`; the others have none, so read their `value` directly:

| Primitive                            | Accessor                          |
| ------------------------------------ | --------------------------------- |
| `ForSelect`, `ForListbox`, `ForTree` | `selected: Signal<T \| null>`     |
| `ForCombobox`                        | `selectedItem: Signal<T \| null>` |

It returns the sole element when the array holds exactly one entry, otherwise `null` (empty, or multiple in multi mode). This is a convenience accessor, not a second source of truth: writes still go through `[(value)]`.

## A single-select form field is modeled as the same array

In single mode, bind `[formField]` to a field you model as `readonly T[]`, exactly as in multi mode, and keep it at length ≤ 1. There is no adapter to insert: `[formField]` pushes `disabled`, `readonly`, `required`, `invalid`, `errors` and `touched` into the control and routes `focus()` to the primitive's real focus target (the listbox option, the select trigger, the combobox input) on its own.

<!-- snippet: fragment -->

```ts
readonly model = signal({ country: [] as readonly string[] });
readonly profile = form(this.model);
// <div forSelect [formField]="profile.country">
```

A `FieldTree<T | null>` cannot bind to these controls, and it is deliberately not bridged. Angular's template type-checker adds a two-way `[value]` binding between the field and every directive on the host owning a `value` model, so the value type has to match in both directions; a hand-written `FieldTree` view that mapped `null ⇄ []` was only expressible as reflection over `@angular/forms/signals` internals and was retired in [#1579](https://github.com/tutkli/forty-cdk/issues/1579). Map to a `T | null` shape at the edge that needs it (a request payload, a persisted record) rather than in the binding, and read the picked value for display off `selected` / `selectedItem`.

## What is out of this contract

Selection-for-display primitives that model a single value (`ForTabs` and `ForRadioGroup`) are out of this array contract. It covers the array-backed, multi-capable controls only.

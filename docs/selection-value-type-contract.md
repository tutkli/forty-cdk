# Selection value-type contract

Every selection primitive in forty-cdk models its value the same way, so you learn one shape across the whole library and it flows through `[formField]` unchanged whether the control is single- or multi-select.

## The value is always a `readonly` array

`ForAccordion`, `ForToggleGroup`, `ForListbox`, and `ForSelect` expose `value` as `model<readonly string[]>`; the generic `ForCombobox` uses `model<readonly T[]>`. That uniform array is the `FormValueControl<readonly T[]>` (or `readonly T[]`) backing that the `[formField]` directive auto-wires to — one control covers both single and multi selection because the shape never changes with mode.

The array is treated immutably: the primitive replaces it (`[...]`, `.filter()`, a fresh `Set` then spread) rather than mutating it in place. You write to it through `[(value)]`.

## Single mode is the same array with 0–1 elements

With `multiple` unset (the default) the array stays at length ≤ 1 — activating an option replaces the current entry rather than appending, and an empty array means nothing is selected. There is no separate "single value" model to keep in sync.

## Single-select consumers read a derived accessor, never `value()[0]`

Each primitive exposes a read-only, single-mode view derived with `computed()`:

| Primitive                 | Accessor                           |
| ------------------------- | ---------------------------------- |
| `ForSelect`, `ForListbox` | `selected: Signal<string \| null>` |
| `ForCombobox`             | `selectedItem: Signal<T \| null>`  |

It returns the sole element when the array holds exactly one entry, otherwise `null` (empty, or multiple in multi mode). This is a convenience accessor, not a second source of truth — writes still go through `[(value)]`.

## A single-select form field is modeled as the same array

Bind `[formField]` to a field you model as `readonly T[]` and keep at length ≤ 1 — in single mode exactly as in multi mode. There is no adapter to insert: `[formField]` pushes `disabled`, `readonly`, `required`, `invalid`, `errors` and `touched` into the control and routes `focus()` to the primitive's real focus target (the listbox option, the select trigger, the combobox input) on its own.

```ts
readonly model = signal({ country: [] as readonly string[] });
readonly profile = form(this.model);
// <div forSelect [formField]="profile.country">
```

A `FieldTree<T | null>` cannot bind to these controls, and it is deliberately not bridged. Angular's template type-checker adds a two-way `[value]` binding between the field and every directive on the host owning a `value` model, so the value type has to match in both directions; a hand-written `FieldTree` view that mapped `null ⇄ []` was only expressible as reflection over `@angular/forms/signals` internals and was retired in [#1579](https://github.com/tutkli/forty-cdk/issues/1579). Map to a `T | null` shape at the edge that needs it — a request payload, a persisted record — rather than in the binding, and read the picked value for display off `selected` / `selectedItem`.

## What is out of this contract

Selection-for-display primitives that model a single value — `ForTabs` and `ForRadioGroup` — are out of this array contract. It covers the array-backed, multi-capable controls only.

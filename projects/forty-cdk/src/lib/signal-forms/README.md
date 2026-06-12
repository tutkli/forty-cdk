# Signal Forms helpers

Small, framework-supported bridges between `@angular/forms/signals` and forty-cdk's form primitives. They contain no UI and no directives — just the glue the `[formField]` directive can't express on its own.

## `forSingleValueField` — single-value selection bridge

The selection primitives (`ForSelect`, `ForListbox`, `ForCombobox`) model their value as `readonly T[]` — single mode keeps the array at length ≤ 1 (see the [selection value-type contract](../../../../../.claude/rules/conventions.md)). That uniform array shape is what makes one control cover both single and multi selection, and it is the `FormValueControl<readonly T[]>` backing the `[formField]` directive auto-wires to.

But a single-select consumer models their domain field as `T | null`, so a `FieldTree<T | null>` cannot bind to the control directly — the value types don't match. `forSingleValueField` adapts the field to the array view the control expects, so the standard `[formField]` wiring works unchanged:

```ts
import { Component, signal } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import {
  ForSelect,
  ForSelectTrigger,
  ForSelectValue,
  ForSelectContent,
  ForSelectOption,
  forSingleValueField,
} from 'forty-cdk';

@Component({
  selector: 'app-country-picker',
  imports: [
    ForSelect,
    ForSelectTrigger,
    ForSelectValue,
    ForSelectContent,
    ForSelectOption,
    FormField,
  ],
  template: `
    <div forSelect [formField]="country">
      <button forSelectTrigger>
        <span forSelectValue placeholder="Country"></span>
      </button>
      @if (forSelect.open()) {
        <div forSelectContent>
          <button forSelectOption value="fr">France</button>
          <button forSelectOption value="de">Germany</button>
        </div>
      }
    </div>
  `,
})
export class CountryPicker {
  private readonly model = signal({ country: null as string | null });
  protected readonly profile = form(this.model);

  // `profile.country` is a FieldTree<string | null>; the control expects
  // readonly string[]. Bridge it once and bind the result with [formField].
  protected readonly country = forSingleValueField(this.profile.country);
}
```

### What it adapts

| Direction              | Behaviour                                                                                           |
| ---------------------- | --------------------------------------------------------------------------------------------------- |
| Field → control (read) | `null` reads as `[]`; a value `v` reads as `[v]`.                                                    |
| Control → field (write) | `[]` clears the field to `null`; `[v]` sets it to `v`. In single mode the array never exceeds one. |
| Everything else        | `disabled` / `readonly` / `required` / `invalid` / `errors` / `touched` / `dirty` / `pending` / `name` / validation / touch tracking / focus delegate to the original field. |

The value view is **derived** (`computed`) from the original field — there is no second copy of the value to keep in sync, so it honours the "single source of truth" rule (derive, never effect-write).

### When you don't need it

- **Multi-select** fields are already `readonly T[]` — bind `[formField]` directly, no bridge.
- **A single field you model as `readonly T[]`** (length ≤ 1) — bind directly. The bridge exists specifically for the `T | null` domain shape.

See the [wrapping form primitives guide](../../../../../docs/wrapping-form-primitives.md) for the full picture, including how design-system wrappers re-expose the primitives.

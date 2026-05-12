---
title: Checkbox
slug: checkbox
source: projects/forty-cdk/src/lib/checkbox/README.md
---

# Checkbox

Headless implementation of the [WAI-ARIA Checkbox pattern](https://www.w3.org/WAI/ARIA/apg/patterns/checkbox/) with optional tri-state (`indeterminate`) support. Implements `FormCheckboxControl` from `@angular/forms/signals` for `[formField]` auto-wiring.

## When to choose Checkbox vs Switch

- **Checkbox**: deferred selection (user is choosing options for a form to apply later). Supports the tri-state `mixed` value, useful for "select all" parents.
- **Switch**: immediate setting (flipping it changes the world right now). Always binary.

Use the one that matches your semantics. `ForCheckbox` and `ForSwitch` are intentionally separate even though they share most of their state surface.

## Pieces

| Class | Selector | Role |
| --- | --- | --- |
| `ForCheckbox` | `[forCheckbox]` | Single directive on a `&lt;button&gt;`. Wires ARIA + click + Signal Forms. |

## Inputs / models

| API | Type | Description |
| --- | --- | --- |
| `checked` | `model&lt;boolean&gt;` | Two-way bindable on/off. Required by `FormCheckboxControl`. |
| `indeterminate` | `model&lt;boolean&gt;` | Two-way bindable. When true, `aria-checked="mixed"` regardless of `checked`. Click clears it. UI-only — not part of the form value. |
| `disabled` / `readonly` / `required` / `invalid` / `pending` | `input&lt;boolean&gt;` | Reflected as the matching `aria-*` / `disabled` / `data-*` attributes. |
| `name` | `input&lt;string&gt;` | Reflected on `name` (empty string omits the attribute). |
| `errors` | `input&lt;readonly ValidationError.WithOptionalFieldTree[]&gt;` | Validation errors fed by `[formField]`. |
| `touched` | `model&lt;boolean&gt;` | Set to `true` on blur. |

The host gets `data-state="checked" \| "unchecked" \| "indeterminate"` for CSS hooks.

## Stand-alone usage

```ts
import { Component, signal } from '@angular/core';
import { ForCheckbox } from 'forty-cdk';

@Component({
  selector: 'demo-terms',
  imports: [ForCheckbox],
  template: `
    <label>
      <button forCheckbox [(checked)]="agreed">
        <span class="indicator"></span>
      </button>
      I agree to the terms
    </label>
  `,
})
export class DemoTerms {
  readonly agreed = signal(false);
}
```

## Tri-state ("select all") usage

```ts
import { Component, computed, signal } from '@angular/core';
import { ForCheckbox } from 'forty-cdk';

@Component({
  selector: 'demo-select-all',
  imports: [ForCheckbox],
  template: `
    <button
      forCheckbox
      [checked]="allChecked()"
      [indeterminate]="someChecked()"
      (click)="toggleAll()"
    ></button>
    @for (item of items(); track item.id) {
      <button forCheckbox [(checked)]="item.selected"></button>
    }
  `,
})
export class DemoSelectAll {
  readonly items = signal([
    { id: 1, selected: false },
    { id: 2, selected: true },
    { id: 3, selected: false },
  ]);

  readonly allChecked = computed(() => this.items().every((i) => i.selected));
  readonly someChecked = computed(() => {
    const some = this.items().some((i) => i.selected);
    return some && !this.allChecked();
  });

  toggleAll(): void {
    const next = !this.allChecked();
    this.items.update((list) => list.map((i) => ({ ...i, selected: next })));
  }
}
```

## Signal Forms usage

```ts
import { Component, signal } from '@angular/core';
import { form, required } from '@angular/forms/signals';
import { ForCheckbox } from 'forty-cdk';

@Component({
  selector: 'demo-checkout',
  imports: [ForCheckbox /* , FormField from @angular/forms */],
  template: `
    <button forCheckbox [formField]="checkout.acceptTerms"></button>
  `,
})
export class DemoCheckout {
  readonly model = signal({ acceptTerms: false });
  readonly checkout = form(this.model, (s) => required(s.acceptTerms));
}
```

## Accessibility notes

- **Provide an accessible name.** Wrap the button in a `&lt;label&gt;`, or set `aria-labelledby` / `aria-label`. Without one, the control is announced as just "checkbox" with no purpose.
- **`role="checkbox"`** with `aria-checked="mixed"` is the canonical tri-state contract. Some legacy screen readers handle "mixed" differently — test with your target SRs.
- **Keyboard**: APG only mandates Space. The directive sits on a `&lt;button&gt;` so Enter also activates — this is a documented superset, not a violation.
- **Activation of an indeterminate checkbox** clears `indeterminate` and toggles `checked` (matches native `&lt;input type="checkbox"&gt;`).

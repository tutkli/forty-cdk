# Checkbox

Headless implementation of the [WAI-ARIA Checkbox pattern](https://www.w3.org/WAI/ARIA/apg/patterns/checkbox/) with optional tri-state (`indeterminate`) support. Implements `FormCheckboxControl` from `@angular/forms/signals` for `[formField]` auto-wiring.

## When to choose Checkbox vs Switch

- **Checkbox**: deferred selection (user is choosing options for a form to apply later). Supports the tri-state `mixed` value, useful for "select all" parents.
- **Switch**: immediate setting (flipping it changes the world right now). Always binary.

Use the one that matches your semantics. `ForCheckbox` and `ForSwitch` are intentionally separate even though they share most of their state surface.

## Pieces

| Class         | Selector        | Role                                                                 |
| ------------- | --------------- | -------------------------------------------------------------------- |
| `ForCheckbox` | `[forCheckbox]` | Single directive on a `<button>`. Wires ARIA + click + Signal Forms. |

## Inputs / models

| API                                                          | Type                                                      | Description                                                                                                                         |
| ------------------------------------------------------------ | --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `checked`                                                    | `model<boolean>`                                          | Two-way bindable on/off. Required by `FormCheckboxControl`.                                                                         |
| `indeterminate`                                              | `model<boolean>`                                          | Two-way bindable. When true, `aria-checked="mixed"` regardless of `checked`. Click clears it. UI-only — not part of the form value. |
| `disabled` / `readonly` / `required` / `invalid` / `pending` | `input<boolean>`                                          | Reflected as the matching `aria-*` / `data-*` attributes. A disabled checkbox stays focusable (per APG) — `aria-disabled="true"` + `data-disabled`, no native `disabled`; click is a no-op. |
| `name`                                                       | `input<string>`                                           | Reflected on `name` (empty string omits the attribute).                                                                             |
| `errors`                                                     | `input<readonly ValidationError.WithOptionalFieldTree[]>` | Validation errors fed by `[formField]`.                                                                                             |
| `touched`                                                    | `model<boolean>`                                          | Set to `true` on blur.                                                                                                              |

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
      <button forCheckbox class="checkbox" [(checked)]="agreed">
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
      class="checkbox"
      [checked]="allChecked()"
      [indeterminate]="someChecked()"
      (click)="toggleAll()"
    ></button>
    @for (item of items(); track item.id) {
      <button forCheckbox class="checkbox" [(checked)]="item.selected"></button>
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
  template: ` <button forCheckbox class="checkbox" [formField]="checkout.acceptTerms"></button> `,
})
export class DemoCheckout {
  readonly model = signal({ acceptTerms: false });
  readonly checkout = form(this.model, (s) => required(s.acceptTerms));
}
```

## Styling

forty-cdk ships no styles. Add your own class to each piece — the for* selectors are the behavior API, not a styling contract (see [Styling forty-cdk](../../../../../docs/styling.md)). Key your CSS off the reflected data-* attributes below.

### Data attributes

| Piece                    | Attribute       | Values                                      |
| ------------------------ | --------------- | ------------------------------------------- |
| `[forCheckbox]`          | `data-state`    | `checked` \| `unchecked` \| `indeterminate` |
| `[forCheckbox]`          | `data-disabled` | present \| absent                           |
| `[forCheckbox]`          | `data-readonly` | present \| absent                           |
| `[forCheckboxIndicator]` | `data-state`    | `checked` \| `unchecked` \| `indeterminate` |

```css
.checkbox-indicator[data-state='unchecked'] {
  display: none;
}

.checkbox[data-state='indeterminate'] .dash {
  display: block;
}
```

## Accessibility notes

- **Provide an accessible name.** Wrap the button in a `<label>`, or set `aria-labelledby` / `aria-label`. Without one, the control is announced as just "checkbox" with no purpose.
- **`role="checkbox"`** with `aria-checked="mixed"` is the canonical tri-state contract. Some legacy screen readers handle "mixed" differently — test with your target SRs.
- **Keyboard**: APG only mandates Space. The directive sits on a `<button>` so Enter also activates — this is a documented superset, not a violation.
- **Activation of an indeterminate checkbox** clears `indeterminate` and toggles `checked` (matches native `<input type="checkbox">`).

# Checkbox

A checkbox supporting the three states checked, unchecked and indeterminate.

Headless and styleless. Implements `FormCheckboxControl` from `@angular/forms/signals` for `[formField]` auto-wiring.

## When to choose

- **Checkbox**: deferred selection (user is choosing options for a form to apply later). Supports the tri-state `mixed` value, useful for "select all" parents.
- **Switch**: immediate setting (flipping it changes the world right now). Always binary.

Use the one that matches your semantics. `ForCheckbox` and `ForSwitch` are intentionally separate even though they share most of their state surface.

## Anatomy

```html
<label>
  <button forCheckbox [(checked)]="agreed">
    <span forCheckboxIndicator></span>
  </button>
  I agree to the terms
</label>
```

## Examples

### Stand-alone

```ts
import { Component, signal } from '@angular/core';
import { ForCheckbox } from 'forty-cdk/checkbox';

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

### Tri-state ("select all")

```ts
import { Component, computed, signal } from '@angular/core';
import { ForCheckbox } from 'forty-cdk/checkbox';

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

### Signal Forms

```ts
import { Component, signal } from '@angular/core';
import { form, required } from '@angular/forms/signals';
import { ForCheckbox } from 'forty-cdk/checkbox';

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

## API

### `ForCheckbox`

| Property                                                     | Type                                                      | Description                                                                                                                                                                                                   |
| ------------------------------------------------------------ | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `checked`                                                    | `model<boolean>`                                          | Two-way bindable on/off. Required by `FormCheckboxControl`.<br>**Default:** —                                                                                                                                 |
| `indeterminate`                                              | `model<boolean>`                                          | Two-way bindable. When true, `aria-checked="mixed"` regardless of `checked`. Click clears it. UI-only — not part of the form value.<br>**Default:** —                                                         |
| `disabled` / `readonly` / `required` / `invalid` / `pending` | `input<boolean>`                                          | Reflected as the matching `aria-*` / `data-*` attributes. A disabled checkbox stays focusable (per APG) — `aria-disabled="true"` + `data-disabled`, no native `disabled`; click is a no-op.<br>**Default:** — |
| `name`                                                       | `input<string>`                                           | Reflected on `name` (empty string omits the attribute).<br>**Default:** `''`                                                                                                                                  |
| `errors`                                                     | `input<readonly ValidationError.WithOptionalFieldTree[]>` | Validation errors fed by `[formField]`.<br>**Default:** —                                                                                                                                                     |
| `touched`                                                    | `model<boolean>`                                          | Set to `true` on blur.<br>**Default:** —                                                                                                                                                                      |

| Data attribute  | Values                                      |
| --------------- | ------------------------------------------- |
| `data-state`    | `checked` \| `unchecked` \| `indeterminate` |
| `data-disabled` | present \| absent                           |
| `data-readonly` | present \| absent                           |

### `ForCheckboxIndicator`

Optional styling slot inside a `[forCheckbox]`. Mirrors the parent's `data-state` so you can show or hide a check / dash without per-state bindings.

| Data attribute | Values                                      |
| -------------- | ------------------------------------------- |
| `data-state`   | `checked` \| `unchecked` \| `indeterminate` |

## Keyboard

| Key     | Action                                                      |
| ------- | ----------------------------------------------------------- |
| `Space` | Toggle the checkbox. The only key APG mandates.             |
| `Enter` | Also toggles — a documented superset, not an APG violation. |

Activating an indeterminate checkbox clears `indeterminate` and toggles `checked` (matches native `<input type="checkbox">`).

Both keys work on any host element. On a `<button>` they come from native button behavior; on any other host (`<div>`, `<span>`, or a `hostDirectives` wrapper's own host) the directive adds `tabindex="0"` and synthesizes the same activation, so a styled-from-scratch checkbox is never announced as a checkbox it is impossible to operate. `Space` keydown always blocks page scrolling; the toggle fires on its keyup.

## Accessibility

Implements the [WAI-ARIA Checkbox pattern](https://www.w3.org/WAI/ARIA/apg/patterns/checkbox/).

- **Provide an accessible name.** Wrap the button in a `<label>`, or set `aria-labelledby` / `aria-label`. Without one, the control is announced as just "checkbox" with no purpose.
- **Any host element works.** A `<button>` is the recommended host (the directive forces `type="button"` through a host binding, so it never submits a surrounding form even if you write `type="submit"` yourself), but a non-button host gets `tabindex="0"` and synthesized `Space` / `Enter` activation, so it is keyboard-operable too. A non-button host gets no `type` attribute at all — `type` is not valid on a `<div>` / `<span>`, and there is no form submission to protect against.
- **`role="checkbox"`** with `aria-checked="mixed"` is the canonical tri-state contract. Some legacy screen readers handle "mixed" differently — test with your target SRs.

## Styling

forty-cdk ships no styles. Add your own class to each piece — the for\* selectors are the behavior API, not a styling contract (see [Styling forty-cdk](../../../docs/styling.md)). Key your CSS off the reflected data-\* attributes listed per piece in the [API](#api) section.

```css
.checkbox-indicator[data-state='unchecked'] {
  display: none;
}

.checkbox[data-state='indeterminate'] .dash {
  display: block;
}
```

## Wrapping in a design system

Both supported wrapper patterns — `hostDirectives` with the exported `FOR_CHECKBOX_HOST_DIRECTIVE_INPUTS` / `FOR_CHECKBOX_HOST_DIRECTIVE_OUTPUTS` name tuples, and subclassing — are documented in [Wrapping form primitives](../../../docs/wrapping-form-primitives.md).

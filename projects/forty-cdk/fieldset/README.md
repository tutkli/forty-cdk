# Fieldset

Headless grouping that gives a set of related fields a shared accessible name — a native <fieldset> / legend, or role=group + aria-labelledby on any element — plus an optional shared disabled state that reaches custom-role controls.

The styleless counterpart to a native `<fieldset>` + `<legend>`, and the grouping companion to [`Field`](../field/README.md). It renders nothing and imposes no layout. Use it on a real `<fieldset>` to lean on native grouping, or on any other element to get `role="group"` + `aria-labelledby` wired automatically.

## Anatomy

```html
<fieldset forFieldset [disabled]="locked()">
  <legend forFieldsetLegend>Shipping address</legend>

  <div forField>
    <label forLabel>Street</label>
    <input forFieldControl />
  </div>
</fieldset>
```

## How grouping connects

`ForFieldset` detects its host tag, exactly like `ForLabel`'s `<label>` check:

- On a native **`<fieldset>`**, the browser groups its controls and labels them with the `<legend>` implicitly — so the directive emits **no** `role` and **no** `aria-labelledby`.
- On **any other element**, it emits `role="group"` and `aria-labelledby` pointing at the `[forFieldsetLegend]`'s generated id.

## Shared `disabled`

The `disabled` input:

- reflects `data-disabled` on the group host,
- emits the native `disabled` attribute on a `<fieldset>` (or `aria-disabled="true"` on any other element),
- and propagates to every descendant form control (`forSwitch`, `forCheckbox`, `forSelect`, `forSlider`, …) via context: each control ORs the group's disabled into its own effective disabled, so it becomes genuinely **inert** (interaction ignored, excluded from native form submission) and exposes `aria-disabled="true"` / `data-disabled`. This reaches custom-role controls that a native `<fieldset disabled>` cannot. A control outside any fieldset is unaffected.

Nesting composes like native fieldsets: a disabled outer `[forFieldset]` keeps every control inside disabled even under an inner, enabled `[forFieldset]` — the inner group cannot re-enable what the outer disabled.

## Examples

```ts
import { Component, signal } from '@angular/core';
import { ForField, ForFieldControl, ForLabel } from 'forty-cdk/field';
import { ForFieldset, ForFieldsetLegend } from 'forty-cdk/fieldset';

@Component({
  selector: 'demo-fieldset',
  imports: [ForFieldset, ForFieldsetLegend, ForField, ForLabel, ForFieldControl],
  template: `
    <fieldset forFieldset class="fieldset" [disabled]="locked()">
      <legend forFieldsetLegend>Shipping address</legend>

      <div forField>
        <label forLabel>Street</label>
        <input forFieldControl />
      </div>
      <div forField>
        <label forLabel>City</label>
        <input forFieldControl />
      </div>
    </fieldset>
  `,
})
export class DemoFieldset {
  readonly locked = signal(false);
}
```

On custom markup (no native `<fieldset>`), the same wiring yields `role="group"` + `aria-labelledby`:

```html
<div forFieldset class="fieldset">
  <span forFieldsetLegend>Shipping address</span>
  <!-- … fields … -->
</div>
```

## API

### `ForFieldset`

| Property   | Type             | Description                                                                                                                                                                                                                      |
| ---------- | ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `disabled` | `input<boolean>` | Disables the group. Emits the native `disabled` attribute on a `<fieldset>` (or `aria-disabled="true"` elsewhere) and propagates to every descendant control via context, reaching custom-role controls.<br>**Default:** `false` |

| Data attribute  | Values           |
| --------------- | ---------------- |
| `data-disabled` | present / absent |

### `ForFieldsetLegend`

Group label. Adopts the fieldset's `legendId` so `aria-labelledby` resolves; usable standalone outside a fieldset as an inert marker. Reflects no `data-*` attributes — it carries only the generated `id` that the group's `aria-labelledby` resolves to.

## Accessibility

- **Native `<fieldset>` grouping is preserved.** On a `<fieldset>` host, no extra ARIA is added — the browser's native grouping and `<legend>` labelling apply.
- **Custom hosts get `role="group"` + `aria-labelledby`** wired to the `[forFieldsetLegend]`'s generated id.
- **Disabled propagation reaches custom-role controls** that a native `<fieldset disabled>` cannot disable, via context injection.

## Styling

forty-cdk ships no styles. Add your own class to each piece — the for\* selectors are the behavior API, not a styling contract (see [Styling forty-cdk](../../../../../docs/styling.md)). Key your CSS off the reflected data-\* attributes listed per piece in the [API](#api) section.

```css
.fieldset[data-disabled] {
  opacity: 0.5;
}
```

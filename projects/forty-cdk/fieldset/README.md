---
title: Fieldset
group: primitives
archetype: [composable-ui]
---

# Fieldset

Headless grouping that gives a set of related fields a shared accessible name — a native `<fieldset>` / `<legend>`, or `role="group"` + `aria-labelledby` on any element — plus an optional shared disabled state that reaches custom-role controls.

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
- On **any other element**, it emits `role="group"` and `aria-labelledby` pointing at the `[forFieldsetLegend]`'s id — your own static `id` when you set one, else a generated one.

## Shared `disabled`

The `disabled` input:

- reflects `data-disabled` on the group host,
- emits the native `disabled` attribute on a `<fieldset>` (or `aria-disabled="true"` on any other element),
- and propagates to every descendant form control (`forSwitch`, `forCheckbox`, `forSelect`, `forSlider`, …) via context: each control ORs the group's disabled into its own effective disabled, so it becomes genuinely **inert** (interaction ignored, excluded from native form submission) and exposes `aria-disabled="true"` / `data-disabled`. This reaches custom-role controls that a native `<fieldset disabled>` cannot. It also reaches `[forButton]`, which is not a form value but composes the same group disabled state (activation suppressed, `aria-disabled` / `data-disabled` reflected). A control outside any fieldset is unaffected.

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

| Property   | Type             | Description                                                                                                                                                                                                                                        |
| ---------- | ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `disabled` | `input<boolean>` | Disables the group. Emits the native `disabled` attribute on a `<fieldset>` (or `aria-disabled="true"` elsewhere) and propagates to every descendant control via context, reaching custom-role controls and `[forButton]`.<br>**Default:** `false` |

| Data attribute  | Values           |
| --------------- | ---------------- |
| `data-disabled` | present / absent |

### `ForFieldsetLegend`

Group label. Emits the fieldset's `legendId` so `aria-labelledby` resolves; usable standalone outside a fieldset as an inert marker. Reflects no `data-*` attributes — it carries only the `id` that the group's `aria-labelledby` resolves to.

A static `id` you write on the legend is **preserved**, not clobbered, and the group's `aria-labelledby` follows it — so an external `aria-labelledby` / `aria-describedby` reference or a `<label for>` pointing at your own id keeps resolving:

```html
<div forFieldset>
  <span forFieldsetLegend id="shipping-legend">Shipping</span>
  <!-- … fields … -->
</div>
<!-- → <div role="group" aria-labelledby="shipping-legend"> -->
```

Only a plain `id="…"` attribute is adopted; a `[id]="expr"` property binding evaluates after the directive constructs, so it is not. With no `id` of your own the legend gets a generated `for-fieldset-legend-*` one. Keep **one** legend per group — a fieldset is labelled by a single id, so a second `[forFieldsetLegend]` shares it (duplicate DOM ids) and warns in dev mode.

## Accessibility

- **Native `<fieldset>` grouping is preserved.** On a `<fieldset>` host, no extra ARIA is added — the browser's native grouping and `<legend>` labelling apply.
- **Custom hosts get `role="group"` + `aria-labelledby`** wired to the `[forFieldsetLegend]`'s id — a consumer-set static `id` when present, else a generated one.
- **Disabled propagation reaches custom-role controls** that a native `<fieldset disabled>` cannot disable, via context injection.

## Styling

forty-cdk ships no styles. Add your own class to each piece — the for\* selectors are the behavior API, not a styling contract (see [Styling forty-cdk](../../../docs/styling.md)). Key your CSS off the reflected data-\* attributes listed per piece in the [API](#api) section.

```css
.fieldset[data-disabled] {
  opacity: 0.5;
}
```

## Wrapping in a design system

Subclassing the root is the supported pattern; the subclass must re-provide `FOR_FIELDSET_CONTEXT` because Angular does not inherit a directive's `providers`, and every projected piece resolves its context through it. See [Wrapping non-form roots](../../../docs/wrapping-non-form-roots.md).

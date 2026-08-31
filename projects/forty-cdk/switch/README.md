---
title: Switch
group: primitives
archetype: [form-control]
apgUrl: https://www.w3.org/WAI/ARIA/apg/patterns/switch/
---

# Switch

A binary on / off control toggled by click, Enter or Space.

Headless and styleless, it doubles as a `FormCheckboxControl` for Angular Signal Forms. A switch changes state immediately on activation — distinct semantically from a checkbox (which represents a deferred selection).

## When to choose

- **Switch**: immediate setting (flipping it changes the world right now). Always binary.
- **Checkbox**: deferred selection (user is choosing options for a form to apply later). Supports tri-state.

Use the one that matches your semantics. `ForSwitch` and `ForCheckbox` are intentionally separate even though they share most of their state surface.

## Anatomy

```html
<button forSwitch [(checked)]="enabled">
  <span class="thumb"></span>
</button>

<!-- With Signal Forms — [formField] wires value, validity and touched: -->
<button forSwitch [formField]="settings.notifications"></button>
```

## Examples

### Stand-alone

```ts
import { Component, signal } from '@angular/core';
import { ForSwitch } from 'forty-cdk/switch';

@Component({
  selector: 'demo-toggle',
  imports: [ForSwitch],
  template: `
    <button forSwitch class="switch" [(checked)]="enabled">
      <span class="thumb"></span>
    </button>
    <p>Notifications: {{ enabled() ? 'on' : 'off' }}</p>
  `,
})
export class DemoToggle {
  readonly enabled = signal(false);
}
```

### Signal Forms

`ForSwitch` implements `FormCheckboxControl`. The `[formField]` directive detects the interface and wires everything — value, disabled, required, invalid, errors, touched — without any glue.

```ts
import { Component, signal } from '@angular/core';
import { form, required } from '@angular/forms/signals';
import { Field } from '@angular/forms';
import { ForSwitch } from 'forty-cdk/switch';

interface Settings {
  notifications: boolean;
  termsAccepted: boolean;
}

@Component({
  selector: 'demo-settings',
  imports: [ForSwitch /* , FormField from @angular/forms */],
  template: `
    <button forSwitch [formField]="settings.notifications"></button>
    <button forSwitch [formField]="settings.termsAccepted"></button>
  `,
})
export class DemoSettings {
  readonly model = signal<Settings>({ notifications: false, termsAccepted: false });
  readonly settings = form(this.model, (s) => {
    required(s.termsAccepted);
  });
}
```

## API

### `ForSwitch`

| Property   | Type                                                      | Description                                                                                                                |
| ---------- | --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `checked`  | `model<boolean>`                                          | Two-way bindable on/off state. Required by `FormCheckboxControl`.<br>**Default:** —                                        |
| `disabled` | `input<boolean>`                                          | Ignores click; reflects `aria-disabled="true"` and `data-disabled`. Stays focusable (per APG).<br>**Default:** —           |
| `readonly` | `input<boolean>`                                          | Ignores click; reflects `aria-readonly="true"`. Stays focusable.<br>**Default:** —                                         |
| `required` | `input<boolean>`                                          | Reflects `aria-required="true"`.<br>**Default:** —                                                                         |
| `invalid`  | `input<boolean>`                                          | Reflects `aria-invalid="true"`.<br>**Default:** —                                                                          |
| `pending`  | `input<boolean>`                                          | Reflects `aria-busy="true"` while async validation is in flight.<br>**Default:** —                                         |
| `name`     | `input<string \| undefined>`                              | Reflects on `name`.<br>**Default:** —                                                                                      |
| `errors`   | `input<readonly ValidationError.WithOptionalFieldTree[]>` | Validation errors fed by `[formField]`. The directive does not render them — that is consumer territory.<br>**Default:** — |
| `touched`  | `model<boolean>`                                          | Set to `true` on blur. Two-way so the field can read it back.<br>**Default:** —                                            |

| Data attribute  | Values                   |
| --------------- | ------------------------ |
| `data-state`    | `checked` \| `unchecked` |
| `data-disabled` | present \| absent        |
| `data-readonly` | present \| absent        |
| `data-touched`  | present \| absent        |
| `data-dirty`    | present \| absent        |
| `data-pending`  | present \| absent        |
| `data-invalid`  | present \| absent        |

## Keyboard

| Key     | Action                                           |
| ------- | ------------------------------------------------ |
| `Space` | Toggle the switch.                               |
| `Enter` | Also toggles — a documented superset of the APG. |

Both keys work on any host element. On a `<button>` they come from native button behavior; on any other host (`<div>`, `<span>`, or a `hostDirectives` wrapper's own host) the directive adds `tabindex="0"` and synthesizes the same activation. `Space` keydown always blocks page scrolling; the toggle fires on its keyup.

## Accessibility

Implements the [WAI-ARIA Switch pattern](https://www.w3.org/WAI/ARIA/apg/patterns/switch/).

- **Prefer a `<button>`.** The directive forces `type="button"` through a host binding to prevent submit-by-Enter inside a `<form>` — a consumer `type="submit"` on the host is overridden, not honoured — and Enter / Space toggle the switch via native button behavior. Any other host element (e.g. `<div>`) works too: it gets `tabindex="0"` and the same Enter / Space activation synthesized, so `role="switch"` is never announced on an element a keyboard user cannot reach; it gets no `type` attribute at all, since `type` is not valid there.
- **A disabled switch stays focusable** (per APG): it reflects `aria-disabled="true"` + `data-disabled=""` rather than the native `disabled` attribute, so assistive tech still announces it while click / keyboard activation is a no-op. Form-submit exclusion is handled by the hidden `<input>`, not the visible button.
- **`role="switch"`** is announced as "switch, on/off" by screen readers, distinct from "checkbox, checked/not checked".
- **`@angular/forms` is an optional peer.** If you're not using Signal Forms, don't install it — the directive runs fine without it (only the type import from `@angular/forms/signals` is type-only and erased at build).

## Styling

forty-cdk ships no styles. Add your own class to each piece — the `for*` selectors are the behavior API, not a styling contract (see [Styling forty-cdk](../../../docs/styling.md)). Key your CSS off the reflected `data-*` attributes listed per piece in the [API](#api) section.

```css
.switch .thumb {
  transition: transform 150ms;
}

.switch[data-state='checked'] .thumb {
  transform: translateX(100%);
}
```

## Wrapping in a design system

Both supported wrapper patterns — `hostDirectives` with the exported `FOR_SWITCH_HOST_DIRECTIVE_INPUTS` / `FOR_SWITCH_HOST_DIRECTIVE_OUTPUTS` name tuples, and subclassing — are documented in [Wrapping form primitives](../../../docs/wrapping-form-primitives.md).

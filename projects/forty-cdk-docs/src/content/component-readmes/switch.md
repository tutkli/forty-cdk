---
title: Switch
slug: switch
source: projects/forty-cdk/src/lib/switch/README.md
---

# Switch

Headless implementation of the [WAI-ARIA Switch pattern](https://www.w3.org/WAI/ARIA/apg/patterns/switch/) that doubles as a `FormCheckboxControl` for Angular Signal Forms.

A switch is a binary on/off control whose state changes immediately on activation — distinct semantically from a checkbox (which represents a deferred selection).

## Pieces

| Class | Selector | Role |
| --- | --- | --- |
| `ForSwitch` | `[forSwitch]` | Single directive on a `&lt;button&gt;`. Wires ARIA + click + Signal Forms. |

## Inputs / models

| API | Type | Description |
| --- | --- | --- |
| `checked` | `model&lt;boolean&gt;` | Two-way bindable on/off state. Required by `FormCheckboxControl`. |
| `disabled` | `input&lt;boolean&gt;` | Ignores click; reflects `disabled` and `aria-disabled`. |
| `readonly` | `input&lt;boolean&gt;` | Ignores click; reflects `aria-readonly="true"`. Stays focusable. |
| `required` | `input&lt;boolean&gt;` | Reflects `aria-required="true"`. |
| `invalid` | `input&lt;boolean&gt;` | Reflects `aria-invalid="true"`. |
| `pending` | `input&lt;boolean&gt;` | Reflects `aria-busy="true"` while async validation is in flight. |
| `name` | `input&lt;string \| undefined&gt;` | Reflects on `name`. |
| `errors` | `input&lt;readonly ValidationError.WithOptionalFieldTree[]&gt;` | Validation errors fed by `[formField]`. The directive does not render them — that is consumer territory. |
| `touched` | `model&lt;boolean&gt;` | Set to `true` on blur. Two-way so the field can read it back. |

The host gets `data-state="checked" \| "unchecked"`, `data-disabled`, and `data-readonly` for CSS hooks.

## Stand-alone usage

```ts
import { Component, signal } from '@angular/core';
import { ForSwitch } from 'forty-cdk';

@Component({
  selector: 'demo-toggle',
  imports: [ForSwitch],
  template: `
    <button forSwitch [(checked)]="enabled">
      <span class="thumb"></span>
    </button>
    <p>Notifications: {{ enabled() ? 'on' : 'off' }}</p>
  `,
})
export class DemoToggle {
  readonly enabled = signal(false);
}
```

## Signal Forms usage

`ForSwitch` implements `FormCheckboxControl`. The `[formField]` directive detects the interface and wires everything — value, disabled, required, invalid, errors, touched — without any glue.

```ts
import { Component, signal } from '@angular/core';
import { form, required } from '@angular/forms/signals';
import { Field } from '@angular/forms';
import { ForSwitch } from 'forty-cdk';

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

## Accessibility notes

- **Use a `&lt;button&gt;`.** The directive forces `type="button"` to prevent submit-by-Enter inside a `&lt;form&gt;`. Enter and Space toggle the switch via native button behavior. On other elements (e.g. `&lt;div&gt;`), keyboard activation is on you.
- **Native `disabled` removes the switch from the tab order.** APG allows this; if you want the switch to stay focusable while inactive, use `readonly` instead.
- **`role="switch"`** is announced as "switch, on/off" by screen readers, distinct from "checkbox, checked/not checked".
- **`@angular/forms` is an optional peer.** If you're not using Signal Forms, don't install it — the directive runs fine without it (only the type import from `@angular/forms/signals` is type-only and erased at build).

# Getting started

This page builds one primitive end to end — installed, composed, styled, and bound to a form — so that by the end you have written every kind of code forty-cdk asks for. The primitive is **Switch**, chosen because it is small enough to show whole and is a form control, so it exercises the one API that has an extra step.

Everything here generalises. A Dialog has more pieces than a Switch and a Table has many more, but the four moves are the same ones.

---

## What you need

An Angular 22 application and the package:

```bash
npm install forty-cdk
```

No providers, no `NgModule`, no stylesheet import. If you want the full peer-dependency picture first, [Installation](./installation.md) has it.

## Compose it in a template

A primitive is a set of standalone directives you put on your own markup. `ForSwitch` is one directive; you bring the element it goes on and the element it toggles.

```ts
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ForSwitch } from 'forty-cdk/switch';

@Component({
  selector: 'app-notification-toggle',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForSwitch],
  template: `
    <button forSwitch class="switch" [(checked)]="enabled">
      <span class="switch__thumb"></span>
    </button>

    <p>Notifications are {{ enabled() ? 'on' : 'off' }}.</p>
  `,
})
export class NotificationToggle {
  readonly enabled = signal(false);
}
```

That is a complete, accessible switch. The directive has given the `<button>` `role="switch"`, kept `aria-checked` in step with the model, and made `Space` and `Enter` toggle it. Nothing was configured — the behaviour came with the selector.

Two details are worth naming, because they are the shape of every primitive:

- **The state is yours.** `checked` is a `model()`, so `[(checked)]` binds your own signal. The library does not own a store you read from.
- **The markup is yours.** `<button>` and `<span>` are elements you chose. A primitive that must inject structure uses an element selector and says so; most, like this one, attach to whatever you were going to write anyway.

## Style it

The switch above renders as an unstyled button, which is the point. You style it against **your own class** and the `data-*` attributes the directive reflects:

```css
.switch {
  width: 44px;
  height: 24px;
  padding: 2px;
  border: none;
  border-radius: 999px;
  background: #d4d4d8;
  cursor: pointer;
  transition: background 150ms;
}

.switch__thumb {
  display: block;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #fff;
  transition: transform 150ms;
}

.switch[data-state='checked'] {
  background: #2563eb;
}

.switch[data-state='checked'] .switch__thumb {
  transform: translateX(20px);
}

.switch[data-disabled] {
  opacity: 0.5;
  cursor: not-allowed;
}
```

Three rules to carry forward from those twenty lines:

- **Style your class, not the selector.** `[forSwitch]` is a valid attribute selector and a bad styling contract: the library is pre-1.0 and selectors can be renamed, while `.switch` is yours.
- **Enumerated state is a value**, so `[data-state='checked']` and `[data-state='unchecked']` are the two you write.
- **Boolean state is presence**, so it is `[data-disabled]` and `:not([data-disabled])` — never `[data-disabled='false']`, which never matches anything.

Each primitive's page lists the exact attributes it reflects, in a table under **API**. [Styling forty-cdk](../styling.md) is the full reference for all three hooks, including the `--for-*` custom properties primitives write measured values to.

## Wire it to a form

Form primitives implement an `@angular/forms/signals` control interface, so `[formField]` binds them with no adapter of your own. `ForSwitch` implements `FormCheckboxControl`; the same step applies to Checkbox, Radio Group, Slider, Select, Combobox and every other form primitive.

```ts
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { Field } from '@angular/forms';
import { form, required } from '@angular/forms/signals';
import { ForSwitch } from 'forty-cdk/switch';

interface Settings {
  notifications: boolean;
  termsAccepted: boolean;
}

@Component({
  selector: 'app-settings-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForSwitch, Field],
  template: `
    <button forSwitch class="switch" [formField]="settings.notifications">
      <span class="switch__thumb"></span>
    </button>

    <button forSwitch class="switch" [formField]="settings.termsAccepted">
      <span class="switch__thumb"></span>
    </button>
  `,
})
export class SettingsForm {
  readonly model = signal<Settings>({ notifications: false, termsAccepted: false });

  readonly settings = form(this.model, (s) => {
    required(s.termsAccepted);
  });
}
```

`[(checked)]` is gone and nothing replaced it: `[formField]` carries the value, the disabled and required state, validity, errors and touched in both directions. The directive reflects each of them as ARIA and as `data-*`, so `.switch[data-invalid]` and `.switch[data-touched]` are stylable without reading a single signal.

`@angular/forms` is an **optional** peer. Install it if you use Signal Forms; skip it and everything above the previous section still works.

## Where to go next

- [Concepts](./concepts.md) — the composition model these four steps are an instance of.
- [Your first overlay](../your-first-overlay.md) — the same walkthrough for a Popover, where content is portaled and the open state is yours to hold.
- [Wrapping form primitives](../wrapping-form-primitives.md) — how to put your own component around a primitive without losing its API.
- The primitive pages in the sidebar, each with live examples, a full API table and its keyboard map.

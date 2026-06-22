# ForButton

Headless implementation of the [WAI-ARIA Button pattern](https://www.w3.org/WAI/ARIA/apg/patterns/button/).

A single `[forButton]` directive turns any element into an accessible, interactive button. It works on a native `<button>` host and on any non-button host (e.g. `<div>`, `<span>`). Install from `forty-cdk`.

## Basic usage

```html
<!-- Native button — platform handles Enter/Space → click synthesis -->
<button forButton (activate)="save()">Save</button>

<!-- Non-button host — role="button", tabindex="0", and keyboard activation added automatically -->
<div forButton (activate)="save()">Save</div>
```

## Disabled

Disabled buttons stay focusable so assistive technology can announce them. The native `disabled` attribute is never set; instead `aria-disabled="true"` is reflected.

```html
<button forButton [disabled]="isSaving()" (activate)="save()">Save</button>
```

## Preserve consumer `type`

A native `<button>` without an explicit `type` attribute defaults to `type="button"`. A consumer-set `type="submit"` is preserved:

```html
<button type="submit" forButton>Submit form</button>
```

## Data attributes

The directive reflects the following boolean `data-*` attributes (present with an empty-string value when true, absent when false). There is no `data-state` — this primitive has no open/closed or checked/unchecked logical state.

| Attribute            | When present                                    |
| -------------------- | ----------------------------------------------- |
| `data-disabled`      | `[disabled]="true"`                             |
| `data-pressed`       | Primary pointer held down, or Enter/Space held  |
| `data-hovered`       | Mouse/pen pointer is over the element           |
| `data-focus-visible` | Focused via keyboard (keyboard modality active) |

## API

| Member     | Type             | Default | Description                                                                      |
| ---------- | ---------------- | ------- | -------------------------------------------------------------------------------- |
| `disabled` | `input<boolean>` | `false` | Suppresses activation and reflects `aria-disabled` + `data-disabled`.            |
| `activate` | `output<void>`   | —       | Fires once per user activation (click, Enter, Space). Never fires when disabled. |

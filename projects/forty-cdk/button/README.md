# ForButton

Headless implementation of the [WAI-ARIA Button pattern](https://www.w3.org/WAI/ARIA/apg/patterns/button/).

A single `[forButton]` directive turns any element into an accessible, interactive button. It works on a native `<button>` host and on any non-button host (e.g. `<div>`, `<span>`). Install from `forty-cdk`.

## Anatomy

| Class       | Selector      | Role                                                                                                                                     |
| ----------- | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `ForButton` | `[forButton]` | Single directive. On a native `<button>`, native semantics are preserved. On any other host, `role="button"` + `tabindex="0"` are added. |

## Examples

### Basic usage

```html
<!-- Native button — platform handles Enter/Space → click synthesis -->
<button forButton (activate)="save()">Save</button>

<!-- Non-button host — role="button", tabindex="0", and keyboard activation added automatically -->
<div forButton (activate)="save()">Save</div>
```

### Disabled

Disabled buttons stay focusable so assistive technology can announce them. The native `disabled` attribute is never set; instead `aria-disabled="true"` is reflected.

```html
<button forButton [disabled]="isSaving()" (activate)="save()">Save</button>
```

### Preserve consumer `type`

A native `<button>` without an explicit `type` attribute defaults to `type="button"`. A consumer-set `type="submit"` is preserved:

```html
<button type="submit" forButton>Submit form</button>
```

## API

### `ForButton`

| API        | Type             | Default | Description                                                                      |
| ---------- | ---------------- | ------- | -------------------------------------------------------------------------------- |
| `disabled` | `input<boolean>` | `false` | Suppresses activation and reflects `aria-disabled` + `data-disabled`.            |
| `activate` | `output<void>`   | —       | Fires once per user activation (click, Enter, Space). Never fires when disabled. |

### Data attributes

The directive reflects the following boolean `data-*` attributes (present with an empty-string value when true, absent when false). There is no `data-state` — this primitive has no open/closed or checked/unchecked logical state.

| Piece         | Attribute            | Values            |
| ------------- | -------------------- | ----------------- |
| `[forButton]` | `data-disabled`      | present \| absent |
| `[forButton]` | `data-pressed`       | present \| absent |
| `[forButton]` | `data-hovered`       | present \| absent |
| `[forButton]` | `data-focus-visible` | present \| absent |

`data-pressed` is present while the primary pointer is held down or Enter/Space is held. `data-hovered` is present while a mouse/pen pointer is over the element. `data-focus-visible` is present when focused via keyboard (keyboard modality active).

## Accessibility

- **Native `<button>` semantics are preserved.** On a native host, no extra ARIA is added; the browser's built-in button role, Enter/Space activation, and `type` handling all apply.
- **Non-button hosts get `role="button"` and `tabindex="0"`** plus keyboard activation (Enter/Space), matching the native button contract.
- **Disabled buttons stay focusable.** `aria-disabled="true"` is used instead of the native `disabled` attribute so assistive technology can still announce the control's purpose.

## Styling

forty-cdk ships no styles. Add your own class to each piece — the `for*` selectors are the behavior API, not a styling contract (see [Styling forty-cdk](../../../../../docs/styling.md)). Key your CSS off the reflected `data-*` attributes listed under [Data attributes](#data-attributes).

```css
[forButton][data-disabled] {
  opacity: 0.4;
  pointer-events: none;
}

[forButton][data-pressed] {
  transform: scale(0.97);
}
```

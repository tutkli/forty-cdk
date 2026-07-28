# ForButton

Turns any element — a native <button> or a custom host like <div> / <span> — into an accessible button with keyboard activation. Disabled stays focusable (aria-disabled, never the native attribute) and pressed / hovered / focus-visible are reflected as data-\* hooks.

A single `[forButton]` directive does all of this. On a native `<button>` host the platform owns Enter/Space activation and `type` handling; on any non-button host the directive adds `role="button"`, `tabindex="0"`, and keyboard activation so the contract matches.

## Anatomy

```html
<!-- Native button — platform owns Enter/Space and type handling -->
<button forButton [disabled]="saving()" (activate)="save()">Save</button>

<!-- Non-button host — role="button", tabindex="0", keyboard activation added -->
<div forButton (activate)="save()">Save</div>
```

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

A surrounding disabled `[forFieldset]` disables the button too — its `disabled` input is OR'd with the group's, so `aria-disabled` / `data-disabled` are reflected and activation is suppressed. This matters most on a non-native host (`<div forButton>`), which a native `<fieldset disabled>` cannot reach.

```html
<fieldset forFieldset [disabled]="locked()">
  <legend forFieldsetLegend>Account</legend>
  <button forButton (activate)="save()">Save</button>
</fieldset>
```

### Preserve consumer `type`

A native `<button>` without an explicit `type` attribute defaults to `type="button"`. A consumer-set `type="submit"` is preserved:

```html
<button type="submit" forButton>Submit form</button>
```

## API

### `ForButton`

| Property   | Type             | Description                                                                                                                                             |
| ---------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `disabled` | `input<boolean>` | Suppresses activation and reflects `aria-disabled` + `data-disabled`. OR'd with a surrounding `[forFieldset]`'s disabled state.<br>**Default:** `false` |
| `activate` | `output<void>`   | Fires once per user activation (click, Enter, Space). Never fires when disabled.<br>**Default:** —                                                      |

The directive reflects boolean `data-*` attributes (present with an empty-string value when true, absent when false). There is no `data-state` — this primitive has no open/closed or checked/unchecked logical state.

| Data attribute       | Values            |
| -------------------- | ----------------- |
| `data-disabled`      | present \| absent |
| `data-pressed`       | present \| absent |
| `data-hovered`       | present \| absent |
| `data-focus-visible` | present \| absent |

`data-pressed` is present while the primary pointer is held down or Enter/Space is held. `data-hovered` is present while a mouse/pen pointer is over the element. `data-focus-visible` is present when focused via keyboard (keyboard modality active).

## Accessibility

Implements the [WAI-ARIA Button pattern](https://www.w3.org/WAI/ARIA/apg/patterns/button/).

- **Native `<button>` semantics are preserved.** On a native host, no extra ARIA is added; the browser's built-in button role, Enter/Space activation, and `type` handling all apply.
- **Non-button hosts get `role="button"` and `tabindex="0"`** plus keyboard activation (Enter/Space), matching the native button contract.
- **Disabled buttons stay focusable.** `aria-disabled="true"` is used instead of the native `disabled` attribute so assistive technology can still announce the control's purpose.

## Styling

forty-cdk ships no styles. Add your own class to each piece — the `for*` selectors are the behavior API, not a styling contract (see [Styling forty-cdk](../../../docs/styling.md)). Key your CSS off the reflected `data-*` attributes listed per piece in the [API](#api) section.

```css
[forButton][data-disabled] {
  opacity: 0.4;
  pointer-events: none;
}

[forButton][data-pressed] {
  transform: scale(0.97);
}
```

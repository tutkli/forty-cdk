# Listbox

Headless implementation of the [WAI-ARIA Listbox pattern](https://www.w3.org/WAI/ARIA/apg/patterns/listbox/) with single / multi select, roving tabindex, typeahead, and `FormValueControl<string[]>` integration.

## Pieces

| Class              | Selector             | Role                                                                             |
| ------------------ | -------------------- | -------------------------------------------------------------------------------- |
| `ForListbox`       | `[forListbox]`       | Container. Owns selected values, mode, orientation. Provides the shared context. |
| `ForListboxOption` | `[forListboxOption]` | One option. Apply on a `<button type="button">`.                                 |

## Inputs / models

### `ForListbox`

| API                                                          | Type                                             | Description                                                                                                                                                               |
| ------------------------------------------------------------ | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `value`                                                      | `model<string[]>`                                | Two-way bindable. Selected values. Single mode keeps 0 or 1; multi any number. Required by `FormValueControl<string[]>`.                                                  |
| `multiple`                                                   | `input<boolean>`                                 | When true, multiple options can be selected. Default `false`.                                                                                                             |
| `orientation`                                                | `input<'vertical' \| 'horizontal'>`              | Default `'vertical'`. Drives keyboard nav and `aria-orientation`.                                                                                                         |
| `dir`                                                        | `input<'ltr' \| 'rtl'>`                          | Default `'ltr'`.                                                                                                                                                          |
| `selectionFollowsFocus`                                      | `input<boolean>`                                 | Single-mode only. When true, arrow nav also selects the focused option. APG flags this as case-by-case — leave off unless your UX specifically benefits. Default `false`. |
| `disabled` / `readonly` / `required` / `invalid` / `pending` | `input<boolean>`                                 | Reflected as `aria-*` / `data-*`.                                                                                                                                         |
| `name`                                                       | `input<string>`                                  | For form association.                                                                                                                                                     |
| `errors`                                                     | `input<ValidationError.WithOptionalFieldTree[]>` | Wired by `[formField]`.                                                                                                                                                   |
| `touched`                                                    | `model<boolean>`                                 | Set on focusout outside the listbox.                                                                                                                                      |

### `ForListboxOption`

| API        | Type                     | Description                                                 |
| ---------- | ------------------------ | ----------------------------------------------------------- |
| `value`    | `input.required<string>` | The option's identifier. Must be unique within the listbox. |
| `disabled` | `input<boolean>`         | Disables this option independently of the group.            |

## Stand-alone usage (single select)

```ts
import { Component, signal } from '@angular/core';
import { ForListbox, ForListboxOption } from 'forty-cdk';

@Component({
  selector: 'demo-fruit',
  imports: [ForListbox, ForListboxOption],
  template: `
    <ul forListbox [(value)]="picked" aria-label="Fruit">
      <li><button type="button" forListboxOption value="apple">Apple</button></li>
      <li><button type="button" forListboxOption value="banana">Banana</button></li>
      <li><button type="button" forListboxOption value="cherry">Cherry</button></li>
    </ul>
  `,
})
export class DemoFruit {
  readonly picked = signal<string[]>([]);
}
```

## Multi select

```html
<ul forListbox multiple [(value)]="tags" aria-label="Tags">
  <li><button type="button" forListboxOption value="urgent">Urgent</button></li>
  <li><button type="button" forListboxOption value="bug">Bug</button></li>
  <li><button type="button" forListboxOption value="ui">UI</button></li>
</ul>
```

Click toggles individual options in multi mode; click selects in single mode.

## Signal Forms usage

```ts
import { Component, signal } from '@angular/core';
import { form, required } from '@angular/forms/signals';
import { ForListbox, ForListboxOption } from 'forty-cdk';

@Component({
  selector: 'demo-priorities',
  imports: [ForListbox, ForListboxOption /* , FormField from @angular/forms */],
  template: `
    <ul forListbox multiple [formField]="prefs.priorities" aria-label="Priorities">
      <li><button type="button" forListboxOption value="speed">Speed</button></li>
      <li><button type="button" forListboxOption value="quality">Quality</button></li>
      <li><button type="button" forListboxOption value="cost">Cost</button></li>
    </ul>
  `,
})
export class DemoPriorities {
  readonly model = signal({ priorities: [] as string[] });
  readonly prefs = form(this.model, (s) => required(s.priorities));
}
```

## Keyboard

- **Tab** moves focus into / out of the listbox; lands on the selected option (or the first enabled one if nothing is selected, or the last user-focused option after first interaction).
- **ArrowDown / ArrowUp** in vertical, **ArrowRight / ArrowLeft** in horizontal: move focus, wrap-around, skip disabled.
- **Home / End** jump to first / last enabled option.
- **Space / Enter** activate the focused option (toggles in multi, selects in single) via the underlying button.
- **Typeahead**: typing characters focuses the first option whose visible text starts with the typed prefix (case-insensitive, debounced).
- Disabled options are skipped on arrow nav.

## Accessibility notes

- **Label the listbox** via `aria-label` or `aria-labelledby`.
- **Use `<button>` for each option** so Space / Enter activate via native click. Other host elements break keyboard activation.
- **Visible text on each option** is what typeahead matches against — keep it descriptive and unique-prefixed.
- **`selectionFollowsFocus`** is a v1 opt-in for single-select. Avoid combining it with side effects that depend on commit semantics — it changes the form value on every arrow key.
- **Multi-select v1 limitations**: range selection (Shift+Arrow), `Ctrl+A`, and `Ctrl+Shift+Home/End` are not yet implemented. They will land when there's a real consumer.
- **`data-highlighted=""`** is reflected on the option that is the current roving-tabindex active item — same vocabulary as the menu / select / combobox primitives, useful when you want a uniform "keyboard focus ring" across surfaces without coupling to `:focus`.

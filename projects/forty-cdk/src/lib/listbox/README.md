# Listbox

Headless implementation of the [WAI-ARIA Listbox pattern](https://www.w3.org/WAI/ARIA/apg/patterns/listbox/) with single / multi select, roving tabindex, typeahead, and `FormValueControl<readonly string[]>` integration.

## Pieces

| Class              | Selector             | Role                                                                             |
| ------------------ | -------------------- | -------------------------------------------------------------------------------- |
| `ForListbox`       | `[forListbox]`       | Container. Owns selected values, mode, orientation. Provides the shared context. |
| `ForListboxOption` | `[forListboxOption]` | One option. Apply on a `<button type="button">`.                                 |

## Inputs / models

### `ForListbox`

| API                                                          | Type                                             | Description                                                                                                                                                               |
| ------------------------------------------------------------ | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `value`                                                      | `model<readonly string[]>`                       | Two-way bindable. Selected values. Single mode keeps 0 or 1; multi any number. Required by `FormValueControl<readonly string[]>`.                                         |
| `selected`                                                   | `Signal<string \| null>`                         | Read-only single-select convenience view of `value`: the sole selected value, or `null` when none / many are selected. Lets single-select consumers skip `value()[0]`.   |
| `multiple`                                                   | `input<boolean>`                                 | When true, multiple options can be selected. Default `false`.                                                                                                             |
| `ariaLabel`                                                  | `input<string \| null>`                          | Reactive accessible name for the listbox, reflected as `aria-label`. Default `null` (and an empty string) emits no attribute. Prefer native `aria-labelledby` when a visible label element exists. |
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
  readonly picked = signal<readonly string[]>([]);
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

### Single mode (and the basics for both)

- **Tab** moves focus into / out of the listbox; lands on the selected option (or the first enabled one if nothing is selected, or the last user-focused option after first interaction).
- **ArrowDown / ArrowUp** in vertical, **ArrowRight / ArrowLeft** in horizontal: move focus, wrap-around, skip disabled.
- **Home / End** jump to first / last enabled option.
- **Space / Enter** activate the focused option (toggles in multi, selects in single) via the underlying button.
- **Typeahead**: typing characters focuses the first option whose visible text starts with the typed prefix (case-insensitive, debounced).
- Disabled options are skipped on arrow nav.

### Multi mode (APG-recommended range selection)

The full WAI-ARIA APG "Recommended Selection" model is implemented and active automatically when `multiple` is set. All shortcuts skip disabled options.

| Shortcut                         | Behavior                                                                                                |
| -------------------------------- | ------------------------------------------------------------------------------------------------------- |
| **Shift+ArrowDown / ArrowUp**    | Move focus to the next / previous enabled option AND toggle its selected state.                         |
| **Shift+Space**                  | Select every enabled option between the anchor (most recent unmodified click / Space) and the focused option, inclusive. Existing selection outside the range is preserved. |
| **Ctrl+A** (or **Cmd+A** on mac) | Select every enabled option. If every enabled option is already selected, clears the selection.         |
| **Ctrl+Shift+Home**              | Select from the focused option to the first enabled option, and move focus there.                       |
| **Ctrl+Shift+End**               | Select from the focused option to the last enabled option, and move focus there.                        |

The **anchor** for `Shift+Space` is set on every unmodified activation (click, plain Space, plain Enter) and is unaffected by `Shift+ArrowDown`/`ArrowUp` — that lets users click an option, navigate away with Shift+Arrow, and then Shift+Space to select the contiguous block back to where they started.

When `readonly` is set, the focus-moving shortcuts (Shift+Arrow, Ctrl+Shift+Home/End) still move focus but do not change the selection — same contract as plain arrow nav under `readonly`. Pure-selection shortcuts (Shift+Space, Ctrl+A) are no-ops.

## Accessibility notes

- **Label the listbox** via the reactive `[ariaLabel]` input or a native `aria-labelledby` pointing at a visible label element.
- **Use `<button>` for each option** so Space / Enter activate via native click. Other host elements break keyboard activation.
- **Visible text on each option** is what typeahead matches against — keep it descriptive and unique-prefixed.
- **`selectionFollowsFocus`** is an opt-in for single-select. Avoid combining it with side effects that depend on commit semantics — it changes the form value on every arrow key.
- **`data-highlighted=""`** is reflected on the option that is the current roving-tabindex active item — same vocabulary as the menu / select / combobox primitives, useful when you want a uniform "keyboard focus ring" across surfaces without coupling to `:focus`.

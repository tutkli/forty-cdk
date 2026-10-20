---
title: Toolbar
group: primitives
archetype: [composable-ui]
apgUrl: https://www.w3.org/WAI/ARIA/apg/patterns/toolbar/
---

# Toolbar

A container that groups a set of controls under roving-tabindex navigation.

The toolbar takes a single Tab stop and arrow keys move focus across its buttons, links, and toggle groups. Composes naturally with `[forToggleGroup]`: toggle items nested inside a toolbar register with the toolbar's roving tabindex automatically, so arrows move fluidly across the whole bar.

## Anatomy

```html
<div forToolbar aria-label="Formatting">
  <button forToolbarButton>Undo</button>
  <button forToolbarButton>Redo</button>
  <span forToolbarSeparator></span>
  <div forToggleGroup multiple>
    <button forToggleGroupItem value="bold">B</button>
    <button forToggleGroupItem value="italic">I</button>
  </div>
  <span forToolbarSeparator></span>
  <a forToolbarLink href="/help">Help</a>
</div>
```

## Examples

Move along the controls with the arrow keys. The toolbar keeps one tab stop, so `Tab` leaves it rather than walking every button in it.

```ts
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ForToggleGroup, ForToggleGroupItem } from 'forty-cdk/toggle';
import {
  ForToolbar,
  ForToolbarButton,
  ForToolbarLink,
  ForToolbarSeparator,
} from 'forty-cdk/toolbar';

@Component({
  selector: 'app-toolbar-default-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ForToolbar,
    ForToolbarButton,
    ForToolbarLink,
    ForToolbarSeparator,
    ForToggleGroup,
    ForToggleGroupItem,
  ],
  template: `
    <div forToolbar class="toolbar" aria-label="Text formatting">
      <button forToolbarButton class="toolbar-btn">Undo</button>
      <button forToolbarButton class="toolbar-btn">Redo</button>

      <span forToolbarSeparator class="toolbar-sep"></span>

      <div forToggleGroup class="toolbar-grp" multiple [(value)]="style" aria-label="Text style">
        <button forToggleGroupItem class="toolbar-btn toolbar-icon" value="bold" aria-label="Bold">
          B
        </button>
        <button
          forToggleGroupItem
          class="toolbar-btn toolbar-icon"
          value="italic"
          aria-label="Italic"
        >
          I
        </button>
        <button
          forToggleGroupItem
          class="toolbar-btn toolbar-icon"
          value="underline"
          aria-label="Underline"
        >
          U
        </button>
      </div>

      <span forToolbarSeparator class="toolbar-sep"></span>

      <div forToggleGroup class="toolbar-grp" [(value)]="align" aria-label="Alignment">
        <button
          forToggleGroupItem
          class="toolbar-btn toolbar-icon"
          value="left"
          aria-label="Align left"
        >
          L
        </button>
        <button
          forToggleGroupItem
          class="toolbar-btn toolbar-icon"
          value="center"
          aria-label="Align center"
        >
          C
        </button>
        <button
          forToggleGroupItem
          class="toolbar-btn toolbar-icon"
          value="right"
          aria-label="Align right"
        >
          R
        </button>
      </div>

      <span forToolbarSeparator class="toolbar-sep"></span>

      <a
        forToolbarLink
        class="toolbar-link"
        href="https://www.w3.org/WAI/ARIA/apg/patterns/toolbar/"
        target="_blank"
        rel="noreferrer noopener"
      >
        Docs
      </a>
    </div>
  `,
})
export class ToolbarDefaultExample {
  protected readonly style = signal<readonly string[]>(['bold']);
  protected readonly align = signal<readonly string[]>(['left']);
}
```

## API

### `ForToolbar`

Root directive. `role="toolbar"`. Owns roving tabindex and arrow-key navigation.

| Property      | Type                                | Description                                                                                                                                                             |
| ------------- | ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ariaLabel`   | `input<string \| null>`             | Reactive accessible name, reflected as `aria-label`. Prefer `aria-labelledby` when a visible label element exists.<br>**Default:** `null` (and `''`) emits no attribute |
| `orientation` | `input<'horizontal' \| 'vertical'>` | Layout direction.<br>**Default:** `'horizontal'`                                                                                                                        |
| `dir`         | `input<'ltr' \| 'rtl' \| null>`     | Reading direction. `null` inherits the nearest `[dir]` / `<html dir>`, else `'ltr'`. RTL swaps ArrowLeft / ArrowRight.<br>**Default:** `null`                           |
| `loop`        | `input<boolean>`                    | Whether arrow nav wraps at the ends.<br>**Default:** `true`                                                                                                             |
| `disabled`    | `input<boolean>`                    | Disables every item.<br>**Default:** —                                                                                                                                  |

| Data attribute     | Values                     |
| ------------------ | -------------------------- |
| `data-orientation` | `horizontal` \| `vertical` |
| `data-disabled`    | present \| absent          |

### `ForToolbarButton`

Plain push button. Apply on `<button>` so Enter / Space activate via native semantics.

| Property   | Type             | Description                                                                                                                                                                                                                                   |
| ---------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `disabled` | `input<boolean>` | Per-item disabled, in addition to the toolbar's `disabled`. When true the button is announced as `aria-disabled` and clicks are suppressed. It stays focusable (no native `disabled`) so assistive tech still announces it.<br>**Default:** — |

| Data attribute     | Values                     |
| ------------------ | -------------------------- |
| `data-orientation` | `horizontal` \| `vertical` |
| `data-disabled`    | present \| absent          |

### `ForToolbarLink`

Hyperlink. Apply on `<a>`; `Enter` follows the link via native semantics.

| Property   | Type             | Description                                                                                                                                                                                                                                                                                    |
| ---------- | ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `disabled` | `input<boolean>` | Per-item disabled, in addition to the toolbar's `disabled`. When true the link is announced as `aria-disabled`, and neither a click nor a middle-click follows its `href`. Because `<a>` has no native `disabled`, it stays focusable and assistive tech still announces it.<br>**Default:** — |

| Data attribute     | Values                     |
| ------------------ | -------------------------- |
| `data-orientation` | `horizontal` \| `vertical` |
| `data-disabled`    | present \| absent          |

### `ForToolbarSeparator`

Visual divider. Defaults `orientation` to the toolbar's cross-axis; reflects `role="separator"` + `aria-orientation` + `data-orientation`.

| Property      | Type                                             | Description                                                                                              |
| ------------- | ------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| `orientation` | `input<'horizontal' \| 'vertical' \| undefined>` | Axis the separator divides along. Falls back to the toolbar's cross-axis when omitted.<br>**Default:** — |
| `decorative`  | `input<boolean>`                                 | When true, gets `role="none"` and no `aria-orientation`.<br>**Default:** —                               |

| Data attribute     | Values                     |
| ------------------ | -------------------------- |
| `data-orientation` | `horizontal` \| `vertical` |

## Scoped defaults

`provideForToolbarDefaults` configures toolbar defaults for an injector subtree, either at the application root or in any component's `providers` array. Partial overrides inherit unspecified keys from the parent scope (or the library fallbacks at the root).

| Key    | Library fallback | Meaning                                                                                                                                                         |
| ------ | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `loop` | `true`           | Whether arrow navigation wraps past the first / last enabled item, for toolbars that don't set `loop` themselves. The fallback matches the APG Toolbar pattern. |

Per-instance inputs always win over the scope defaults.

```ts
import { type ApplicationConfig } from '@angular/core';
import { provideForToolbarDefaults } from 'forty-cdk/defaults';

export const appConfig: ApplicationConfig = {
  providers: [provideForToolbarDefaults({ loop: false })],
};
```

## Keyboard

| Key                        | Action                                                                    |
| -------------------------- | ------------------------------------------------------------------------- |
| `ArrowRight` / `ArrowDown` | Move focus to the next enabled item (direction depends on `orientation`). |
| `ArrowLeft` / `ArrowUp`    | Move focus to the previous enabled item. RTL inverts the horizontal pair. |
| `Home`                     | Move focus to the first enabled item.                                     |
| `End`                      | Move focus to the last enabled item.                                      |

## Accessibility

Implements the [WAI-ARIA Toolbar pattern](https://www.w3.org/WAI/ARIA/apg/patterns/toolbar/).

- **Single Tab stop that follows focus.** The toolbar takes one place in the tab order; only the entry-point item carries `tabindex="0"`. Before any interaction the entry point is the first enabled item; once you move focus with the arrows (or Home / End), the tab stop follows the last focused item, so Shift+Tab back into the toolbar restores it (matching APG and the Tabs / Tree primitives). Arrow keys move focus inside, Home / End jump to the first / last enabled item.
- **Always label the toolbar.** Pass the reactive `[ariaLabel]` input (or a native `aria-labelledby` pointing at a visible label element) so screen-reader users know what the toolbar acts on. Not optional: APG requires it.
- **Disabled items are skipped, not removed.** Both `<button forToolbarButton>` and `<a forToolbarLink>` expose `aria-disabled="true"` and suppress activation rather than setting the native `disabled` attribute. The arrow keys, Home and End skip a disabled item and it never holds the toolbar's Tab stop, but it stays focusable: an item disabled while it holds focus (an Undo button with nothing left to undo) keeps the arrow keys, Home and End, so the user can move on without leaving the toolbar.
- **Toggle groups don't change roles.** Inside a toolbar, `[forToggleGroup]` keeps `role="group"` (semantically a related set of buttons). The toolbar role lives only on the outer container.
- **Cross-axis separators.** `[forToolbarSeparator]` defaults to the orientation perpendicular to the toolbar so the line is visible. Override by setting `orientation` explicitly.

## Styling

forty-cdk ships no styles: put your own class on each piece and key your CSS off the `data-*` attributes listed under [API](#api), not off the `for*` selectors ([Styling forty-cdk](../../../docs/styling.md) explains why).

```css
.toolbar {
  display: flex;
  gap: 0.25rem;
}

.toolbar[data-orientation='vertical'] {
  flex-direction: column;
}

.toolbar-btn[data-disabled],
.toolbar-link[data-disabled] {
  opacity: 0.4;
  pointer-events: none;
}
```

## Wrapping in a design system

Subclass the root and spread `provideForToolbar(MyToolbar)` as its `providers`. Angular does not inherit a directive's `providers`, and besides `FOR_TOOLBAR_CONTEXT` the root provides an internal roving channel that keeps a nested `[forToggleGroup]` inside the toolbar's single Tab stop; the helper installs both. Composing through `hostDirectives: [ForToolbar]` needs neither. [Wrapping non-form roots](../../../docs/wrapping-non-form-roots.md) walks the pattern.

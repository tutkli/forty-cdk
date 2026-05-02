# DropdownMenu

Headless implementation of the [WAI-ARIA Menu Button pattern](https://www.w3.org/WAI/ARIA/apg/patterns/menu-button/): a button that opens a menu of actions on click, ArrowDown, or ArrowUp.

## Usage

```ts
import { Component, signal } from '@angular/core';
import {
  ForDropdownMenu,
  ForDropdownMenuTrigger,
  ForMenuContent,
  ForMenuItem,
  ForMenuSeparator,
  ForMenuRadioGroup,
  ForMenuRadioItem,
} from 'forty-cdk';

@Component({
  selector: 'demo-options',
  imports: [
    ForDropdownMenu,
    ForDropdownMenuTrigger,
    ForMenuContent,
    ForMenuItem,
    ForMenuSeparator,
    ForMenuRadioGroup,
    ForMenuRadioItem,
  ],
  template: `
    <div forDropdownMenu [(open)]="open">
      <button forDropdownMenuTrigger>Options</button>
      @if (open()) {
        <div forMenuContent animate.leave="fade-out">
          <button forMenuItem (select)="cut()">Cut</button>
          <button forMenuItem (select)="copy()">Copy</button>
          <button forMenuItem disabled>Paste</button>
          <hr forMenuSeparator />
          <div forMenuRadioGroup [(value)]="alignment">
            <button forMenuRadioItem value="left">Left</button>
            <button forMenuRadioItem value="center">Center</button>
            <button forMenuRadioItem value="right">Right</button>
          </div>
        </div>
      }
    </div>
  `,
})
export class DemoOptions {
  readonly open = signal(false);
  readonly alignment = signal<string>('left');
  cut() { /* ... */ }
  copy() { /* ... */ }
}
```

`@if (open())` is what makes Angular's `animate.enter` / `animate.leave` work — they fire on real mount / unmount. `[(open)]` is two-way bindable; trigger interactions, item activation, Escape, and outside dismissal flip it.

## Pieces

| Class | Selector | Role |
| --- | --- | --- |
| `ForDropdownMenu` | `[forDropdownMenu]` | Root. Owns open state, ids, item collection, navigate / typeahead / open semantics. |
| `ForDropdownMenuTrigger` | `[forDropdownMenuTrigger]` | The button. Wires `aria-haspopup="menu"`, `aria-expanded`, `aria-controls`. |

The actual menu items, content surface, radio groups, separators, and groups come from the [`menu/`](../menu/README.md) folder — same primitives are used by `[forContextMenu]`.

## Inputs (`ForDropdownMenu`)

| API | Default | Description |
| --- | --- | --- |
| `open` | `false` | Two-way bindable. Whether the menu is shown. |
| `placement` | `'bottom-start'` | Floating-ui placement of `[forMenuContent]` against the trigger. |
| `offset` | `4` | Gap (px) between the trigger and the content. |
| `loop` | `true` | Whether arrow navigation wraps at the ends. |
| `disabled` | `false` | When `true`, trigger interactions are ignored. |
| `dismissible` | `true` | When `false`, Escape and outside interactions don't close. |
| `returnFocus` | `true` | When `true`, focus returns to the trigger on close. |
| `ariaLabel` | `null` | Manual `aria-label` on `[forMenuContent]` if the trigger isn't a meaningful name. |

## Outputs (`ForDropdownMenu`)

All four are vetoable: call `preventDefault()` on the event to suppress the automatic close.

| Output | Payload | Fires on |
| --- | --- | --- |
| `escapeKeyDown` | `KeyboardEvent` | Escape pressed while the menu is the topmost dismissable layer. |
| `pointerDownOutside` | `PointerEvent` | Pointer-down on a target outside content + trigger. |
| `focusOutside` | `FocusEvent` | Focus moves outside content + trigger. |
| `interactOutside` | `PointerEvent \| FocusEvent` | Composite — fires alongside the two above. |

## Trigger keyboard

| Key | Behavior |
| --- | --- |
| `Click` / `Enter` / `Space` | Toggles the menu. On open, focus moves to the first enabled item. |
| `ArrowDown` | Opens the menu and focuses the first enabled item. |
| `ArrowUp` | Opens the menu and focuses the last enabled item. |

Once focus is in the menu, see [`menu/README.md`](../menu/README.md) for the in-menu keyboard.

## Behavior notes

- **Mount equals open.** The directive does not toggle `[hidden]` — `@if (open())` controls presence so `animate.enter` / `animate.leave` fire on the natural mount cycle.
- **Trigger is exempt** from outside-pointer / outside-focus checks. Without this, clicking the trigger to close would race with its own toggle handler and reopen immediately.
- **Initial focus depends on the opening key.** Click / Space / Enter / ArrowDown focus the first enabled item; ArrowUp focuses the last enabled item.
- **Selecting an item closes the menu** by default. To keep the menu open after activation (multi-select pattern), call `$event.preventDefault()` in the item's `(select)` handler.

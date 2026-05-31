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
  cut() {
    /* ... */
  }
  copy() {
    /* ... */
  }
}
```

`@if (open())` is what makes Angular's `animate.enter` / `animate.leave` work — they fire on real mount / unmount. `[(open)]` is two-way bindable; trigger interactions, item activation, Escape, and outside dismissal flip it.

## Pieces

| Class                    | Selector                   | Role                                                                                |
| ------------------------ | -------------------------- | ----------------------------------------------------------------------------------- |
| `ForDropdownMenu`        | `[forDropdownMenu]`        | Root. Owns open state, ids, item collection, navigate / typeahead / open semantics. |
| `ForDropdownMenuTrigger` | `[forDropdownMenuTrigger]` | The button. Wires `aria-haspopup="menu"`, `aria-expanded`, `aria-controls`.         |

The actual menu items, content surface, radio groups, separators, and groups come from the [`menu/`](../menu/README.md) folder — same primitives are used by `[forContextMenu]`.

## Inputs (`ForDropdownMenu`)

| API           | Default    | Description                                                                                                                                                                    |
| ------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `open`        | `false`    | Two-way bindable. Whether the menu is shown.                                                                                                                                   |
| `side`        | `'bottom'` | Anchor side of `[forMenuContent]` against the trigger.                                                                                                                         |
| `align`       | `'start'`  | Alignment along `side` (`'start'` / `'center'` / `'end'`).                                                                                                                     |
| `sideOffset`  | `4`        | Gap (px) between the trigger and the content along the main axis.                                                                                                              |
| `alignOffset` | `0`        | Gap (px) along the cross axis (parallel to `side`).                                                                                                                            |
| `loop`        | `true`     | Whether arrow navigation wraps at the ends.                                                                                                                                    |
| `dir`         | `'ltr'`    | Writing direction. In RTL, ArrowLeft opens submenus and ArrowRight closes them — the swap is automatic. Inherited by every nested `[forMenuSub]` underneath unless overridden. |
| `disabled`    | `false`    | When `true`, trigger interactions are ignored.                                                                                                                                 |
| `dismissible` | `true`     | When `false`, Escape and outside interactions don't close.                                                                                                                     |
| `returnFocus` | `true`     | When `true`, focus returns to the trigger on close.                                                                                                                            |
| `ariaLabel`   | `null`     | Manual `aria-label` on `[forMenuContent]` if the trigger isn't a meaningful name.                                                                                              |

## Outputs (`ForDropdownMenu`)

Every output below is vetoable — each handler receives a `VetoableEvent` (or `VetoableNativeEvent<E>` when there is a native DOM event). Call `preventDefault()` on the emitted veto to suppress the directive's default action; the original DOM event, when present, is on `.event`.

| Output               | Payload                                           | Fires on                                                                 |
| -------------------- | ------------------------------------------------- | ------------------------------------------------------------------------ |
| `escapeKeyDown`      | `VetoableNativeEvent<KeyboardEvent>`              | Escape pressed while the menu is the topmost dismissable layer.          |
| `pointerDownOutside` | `VetoableNativeEvent<PointerEvent>`               | Pointer-down on a target outside content + trigger.                      |
| `focusOutside`       | `VetoableNativeEvent<FocusEvent>`                 | Focus moves outside content + trigger.                                   |
| `interactOutside`    | `VetoableNativeEvent<PointerEvent \| FocusEvent>` | Composite — fires alongside the two above (and shares their veto state). |
| `autoFocusOnOpen`    | `VetoableEvent`                                   | Just before focus moves to the first / last enabled item on mount.       |
| `autoFocusOnClose`   | `VetoableEvent`                                   | Just before focus returns to the trigger on unmount.                     |

`(autoFocusOnOpen)` / `(autoFocusOnClose)` are output-shape because DropdownMenu always routes close transitions through `[(open)]` (via the implicit `openChange` emitter). See [CLAUDE.md › Auto-focus hook shape](../../../../../CLAUDE.md#auto-focus-hook-shape) for why Dialog uses callback-shape inputs instead.

## Trigger keyboard

| Key                         | Behavior                                                          |
| --------------------------- | ----------------------------------------------------------------- |
| `Click` / `Enter` / `Space` | Toggles the menu. On open, focus moves to the first enabled item. |
| `ArrowDown`                 | Opens the menu and focuses the first enabled item.                |
| `ArrowUp`                   | Opens the menu and focuses the last enabled item.                 |

Once focus is in the menu, see [`menu/README.md`](../menu/README.md) for the in-menu keyboard.

## Behavior notes

- **Mount equals open.** The directive does not toggle `[hidden]` — `@if (open())` controls presence so `animate.enter` / `animate.leave` fire on the natural mount cycle.
- **Trigger is exempt** from outside-pointer / outside-focus checks. Without this, clicking the trigger to close would race with its own toggle handler and reopen immediately.
- **Initial focus depends on the opening key.** Click / Space / Enter / ArrowDown focus the first enabled item; ArrowUp focuses the last enabled item.
- **Selecting an item closes the menu** by default. To keep the menu open after activation (multi-select pattern), call `$event.preventDefault()` in the item's `(select)` handler.

## CSS custom properties

The content surface is `[forMenuContent]` (from the [`menu/`](../menu/README.md) folder). It exposes the floating-ui-resolved geometry — `--for-anchor-width` / `--for-anchor-height`, `--for-available-width` / `--for-available-height`, and `--for-content-transform-origin` — as custom properties on the content host. See [menu → CSS custom properties](../menu/README.md#css-custom-properties) for the full table.

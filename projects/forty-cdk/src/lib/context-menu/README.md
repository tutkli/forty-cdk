# ContextMenu

Headless right-click menu — variant of the [WAI-ARIA Menu pattern](https://www.w3.org/WAI/ARIA/apg/patterns/menubar/) opened via the `contextmenu` event (right-click, long-press on touch) and via the keyboard activators `Shift+F10` and the dedicated `ContextMenu` key. The native browser context menu is suppressed.

Pointer activations anchor the menu at the cursor; keyboard activations anchor it at the bounding rect of the focused element so screen-reader / keyboard-only users get the menu next to whatever they're working on. Floating-ui's virtual element handles either case — placement, flip, and shift middleware still apply, so the menu is repositioned to stay on-screen automatically.

## Usage

```ts
import { Component, signal } from '@angular/core';
import { ForContextMenu, ForContextMenuTrigger, ForMenuContent, ForMenuItem } from 'forty-cdk';

@Component({
  selector: 'demo-context',
  imports: [ForContextMenu, ForContextMenuTrigger, ForMenuContent, ForMenuItem],
  template: `
    <div forContextMenu [(open)]="open">
      <div forContextMenuTrigger tabindex="-1" class="canvas">Right-click anywhere here.</div>
      @if (open()) {
        <div forMenuContent animate.leave="fade-out">
          <button forMenuItem (select)="rename()">Rename</button>
          <button forMenuItem (select)="duplicate()">Duplicate</button>
          <button forMenuItem (select)="delete()">Delete</button>
        </div>
      }
    </div>
  `,
})
export class DemoContext {
  readonly open = signal(false);
  rename() {
    /* ... */
  }
  duplicate() {
    /* ... */
  }
  delete() {
    /* ... */
  }
}
```

Add `tabindex="-1"` on the trigger element so focus can return there programmatically when the menu closes — without it, focus falls to the document body on close.

## Pieces

| Class                   | Selector                  | Role                                                                                                                                                                                             |
| ----------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `ForContextMenu`        | `[forContextMenu]`        | Root. Owns open state, the virtual anchor (pointer position), navigation, typeahead.                                                                                                             |
| `ForContextMenuTrigger` | `[forContextMenuTrigger]` | The right-click region. Captures `contextmenu`, `Shift+F10`, and the `ContextMenu` key, prevents the native menu, and opens — anchored at the pointer (mouse) or the focused element (keyboard). |

The menu items themselves come from the [`menu/`](../menu/README.md) folder.

## Inputs (`ForContextMenu`)

| API           | Default     | Description                                                                                                                                                                    |
| ------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `open`        | `false`     | Two-way bindable. Whether the menu is shown.                                                                                                                                   |
| `side`        | `'bottom'`  | Anchor side relative to the pointer.                                                                                                                                           |
| `align`       | `'start'`   | Alignment along `side` (`'start'` / `'center'` / `'end'`).                                                                                                                     |
| `sideOffset`  | `0`         | Gap (px) between the pointer and the menu along the main axis.                                                                                                                 |
| `alignOffset` | `0`         | Gap (px) along the cross axis (parallel to `side`).                                                                                                                            |
| `loop`        | `true`      | Whether arrow navigation wraps.                                                                                                                                                |
| `dir`         | `'ltr'`     | Writing direction. In RTL, ArrowLeft opens submenus and ArrowRight closes them — the swap is automatic. Inherited by every nested `[forMenuSub]` underneath unless overridden. |
| `disabled`    | `false`     | When `true`, the contextmenu event falls through to the native browser menu.                                                                                                   |
| `dismissible` | `true`      | When `false`, Escape and outside interactions don't close.                                                                                                                     |
| `returnFocus` | `true`      | When `true`, focus returns to the trigger element on close.                                                                                                                    |
| `ariaLabel`   | `null`      | Manual `aria-label` on `[forMenuContent]`.                                                                                                                                     |

## Outputs (`ForContextMenu`)

Same vetoable dismiss API as DropdownMenu — `(escapeKeyDown)`, `(pointerDownOutside)`, `(focusOutside)`, `(interactOutside)`. Call `preventDefault()` to keep the menu open.

`(autoFocusOnOpen)` / `(autoFocusOnClose)` fire just before the imperative focus move on mount / unmount. Call `preventDefault()` on the `CustomEvent` to skip the move while keeping the menu mounted.

## Behavior notes

- **Trigger is NOT exempt** from outside-pointer / outside-focus checks. Unlike DropdownMenu (where the trigger button toggles via its own click handler), the context-menu region is treated like any other "outside" element — a left-click on the region while the menu is open closes it. Right-clicking again immediately reopens at the new position.
- **Virtual anchor.** Right-click captures a 0×0 rect at the pointer location. `Shift+F10` and `ContextMenu` snapshot the bounding rect of the focused element (or the trigger if focus is on it directly), so the menu floats off the element under attention. Both forms feed floating-ui's `flip` and `shift` middleware, so corners and screen edges work without special-casing.
- **Keyboard activators only fire while focus is inside the trigger.** Keyboard events dispatch to the focused element, so `Shift+F10` / `ContextMenu` anywhere outside the trigger goes to the browser default. Make sure the trigger (or something inside it) is focusable — set `tabindex="-1"` if the region itself doesn't host a focusable child.
- **Native menu suppressed.** The trigger calls `event.preventDefault()` on `contextmenu` and on the keyboard activators. Set `disabled` to let the browser's native menu surface for that region.
- **Mount equals open.** Same convention as the rest of the library — wrap `[forMenuContent]` in `@if (open())` and use `animate.enter` / `animate.leave` for transitions.

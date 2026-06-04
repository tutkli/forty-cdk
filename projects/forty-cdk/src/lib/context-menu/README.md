# ContextMenu

> New to overlays in forty-cdk? [Your first overlay](../../../../../docs/your-first-overlay.md) walks a Popover from empty markup to styled-and-animated and explains the `@if` / open-state model and the portal → global CSS rule.

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
    <div forContextMenu #menu="forContextMenu">
      <div forContextMenuTrigger class="canvas">Right-click anywhere here.</div>
      @if (menu.open()) {
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

The trigger is focusable out of the box: `[forContextMenuTrigger]` host-binds a default `tabindex="-1"` so focus returns there programmatically when the menu closes — no consumer setup required. Override it with your own `tabindex` (e.g. `tabindex="0"` to put the region in the Tab order) and it wins.

### `#menu="forContextMenu"` vs. `[(open)]`

The minimal "right-click → show menu" case needs **neither** a separate `open` signal **nor** a two-way binding. `[forContextMenu]` is `exportAs: 'forContextMenu'`, so expose the directive instance with a template reference variable — `#menu="forContextMenu"` — and drive the `@if` straight off its own `open()` signal, as above. The contextmenu gesture, item activation, Escape, and outside dismissal all flip it.

Reach for the explicit `[(open)]="mySignal"` model binding only when the component class needs to read or drive open state — open it programmatically, persist it, or react to it elsewhere:

```html
<div forContextMenu [(open)]="open">
  <div forContextMenuTrigger>Right-click anywhere here.</div>
  @if (open()) {
  <div forMenuContent>…</div>
  }
</div>
```

## Pieces

| Class                   | Selector                  | Role                                                                                                                                                                                             |
| ----------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `ForContextMenu`        | `[forContextMenu]`        | Root. Owns open state, the virtual anchor (pointer position), navigation, typeahead.                                                                                                             |
| `ForContextMenuTrigger` | `[forContextMenuTrigger]` | The right-click region. Captures `contextmenu`, `Shift+F10`, and the `ContextMenu` key, prevents the native menu, and opens — anchored at the pointer (mouse) or the focused element (keyboard). |

The menu items themselves come from the [`menu/`](../menu/README.md) folder.

## Inputs (`ForContextMenu`)

| API           | Default    | Description                                                                                                                                                                    |
| ------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `open`        | `false`    | Two-way bindable. Whether the menu is shown.                                                                                                                                   |
| `side`        | `'bottom'` | Anchor side relative to the pointer.                                                                                                                                           |
| `align`       | `'start'`  | Alignment along `side` (`'start'` / `'center'` / `'end'`).                                                                                                                     |
| `sideOffset`  | `0`        | Gap (px) between the pointer and the menu along the main axis.                                                                                                                 |
| `alignOffset` | `0`        | Gap (px) along the cross axis (parallel to `side`).                                                                                                                            |
| `loop`        | `true`     | Whether arrow navigation wraps.                                                                                                                                                |
| `dir`         | `'ltr'`    | Writing direction. In RTL, ArrowLeft opens submenus and ArrowRight closes them — the swap is automatic. Inherited by every nested `[forMenuSub]` underneath unless overridden. |
| `disabled`    | `false`    | When `true`, the contextmenu event falls through to the native browser menu.                                                                                                   |
| `dismissible` | `true`     | When `false`, Escape and outside interactions don't close.                                                                                                                     |
| `returnFocus` | `true`     | When `true`, focus returns to the trigger element on close.                                                                                                                    |
| `ariaLabel`   | `null`     | Manual `aria-label` on `[forMenuContent]`.                                                                                                                                     |

## Outputs (`ForContextMenu`)

Same vetoable dismiss API as DropdownMenu — `(escapeKeyDown)`, `(pointerDownOutside)`, `(focusOutside)`, `(interactOutside)`. Each handler receives a `VetoableNativeEvent<E>` (the original DOM event lives on `.event`); call `preventDefault()` on the veto to keep the menu open.

`(autoFocusOnOpen)` / `(autoFocusOnClose)` fire just before the imperative focus move on mount / unmount. Each receives a `VetoableEvent`; call `preventDefault()` on the veto to skip the move while keeping the menu mounted. These are output-shape because ContextMenu always routes close transitions through `[(open)]` (via the implicit `openChange` emitter). See [CLAUDE.md › Auto-focus hook shape](../../../../../CLAUDE.md#auto-focus-hook-shape) for why Dialog uses callback-shape inputs instead.

## Behavior notes

- **Trigger is NOT exempt** from outside-pointer / outside-focus checks. Unlike DropdownMenu (where the trigger button toggles via its own click handler), the context-menu region is treated like any other "outside" element — a left-click on the region while the menu is open closes it. Right-clicking again immediately reopens at the new position.
- **Virtual anchor.** Right-click captures a 0×0 rect at the pointer location. `Shift+F10` and `ContextMenu` snapshot the bounding rect of the focused element (or the trigger if focus is on it directly), so the menu floats off the element under attention. Both forms feed floating-ui's `flip` and `shift` middleware, so corners and screen edges work without special-casing.
- **Keyboard activators only fire while focus is inside the trigger.** Keyboard events dispatch to the focused element, so `Shift+F10` / `ContextMenu` anywhere outside the trigger goes to the browser default. The trigger is focusable by default (host-bound `tabindex="-1"`), so this works out of the box; use `tabindex="0"` if you want the region itself reachable via Tab.
- **Native menu suppressed.** The trigger calls `event.preventDefault()` on `contextmenu` and on the keyboard activators. Set `disabled` to let the browser's native menu surface for that region.
- **Mount equals open.** Same convention as the rest of the library — wrap `[forMenuContent]` in `@if (open())` and use `animate.enter` / `animate.leave` for transitions.

## CSS custom properties

The content surface is `[forMenuContent]` (from the [`menu/`](../menu/README.md) folder). It exposes the floating-ui-resolved geometry — `--for-anchor-width` / `--for-anchor-height`, `--for-available-width` / `--for-available-height`, and `--for-content-transform-origin` — as custom properties on the content host. See [menu → CSS custom properties](../menu/README.md#css-custom-properties) for the full table.

See also: [Styling floating content](../../../../../docs/styling-floating-content.md) — animation rules and standalone `scale`/`opacity`.

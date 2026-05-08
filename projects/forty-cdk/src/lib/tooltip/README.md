# Tooltip

Headless implementation of the [WAI-ARIA Tooltip pattern](https://www.w3.org/WAI/ARIA/apg/patterns/tooltip/) with hover / focus delays, Escape-to-dismiss, portal rendering, and `@floating-ui/dom`-driven positioning.

> APG: tooltips are for **non-interactive** descriptive text. If you need a click-to-open menu / popup with focusable contents, use a Popover primitive (not yet shipped).

## Pieces

| Class               | Selector              | Role                                                                                              |
| ------------------- | --------------------- | ------------------------------------------------------------------------------------------------- |
| `ForTooltip`        | `[forTooltip]`        | Wrapper. Owns `open`, delays, side / align positioning. Provides the shared context.              |
| `ForTooltipTrigger` | `[forTooltipTrigger]` | Apply on a `<button>` or other focusable element. Emits the hover / focus / Escape signals.       |
| `ForTooltipContent` | `[forTooltipContent]` | The bubble. Portaled to `document.body`, positioned by floating-ui while open.                    |
| `ForTooltipArrow`   | `[forTooltipArrow]`   | Optional. Render inside the content; floating-ui's `arrow` middleware aligns it with the trigger. |

## Inputs / models

### `ForTooltip`

| API           | Type                   | Description                                                                    |
| ------------- | ---------------------- | ------------------------------------------------------------------------------ |
| `open`        | `model<boolean>`       | Two-way bindable visibility.                                                   |
| `side`        | `input<FloatingSide>`  | Anchor side (`'top'` / `'right'` / `'bottom'` / `'left'`). Default `'top'`.    |
| `align`       | `input<FloatingAlign>` | Alignment along `side` (`'start'` / `'center'` / `'end'`). Default `'center'`. |
| `sideOffset`  | `input<number>`        | Gap (px) between trigger and content along the main axis. Default `8`.         |
| `alignOffset` | `input<number>`        | Gap (px) along the cross axis. Default `0`.                                    |
| `openDelay`   | `input<number>`        | ms before showing after hover/focus enters. Default `700`.                     |
| `closeDelay`  | `input<number>`        | ms before hiding after hover/focus leaves. Escape ignores this. Default `300`. |
| `disabled`    | `input<boolean>`       | When `true`, all interaction is ignored.                                       |

### `ForTooltipTrigger`, `ForTooltipContent`, `ForTooltipArrow`

No inputs of their own — they coordinate via the `ForTooltip` context.

## Stand-alone usage

```ts
import { Component, signal } from '@angular/core';
import { ForTooltip, ForTooltipArrow, ForTooltipContent, ForTooltipTrigger } from 'forty-cdk';

@Component({
  selector: 'demo-save',
  imports: [ForTooltip, ForTooltipTrigger, ForTooltipContent, ForTooltipArrow],
  template: `
    <span forTooltip side="top" [openDelay]="400">
      <button type="button" forTooltipTrigger aria-label="Save">💾</button>
      <div forTooltipContent class="my-tooltip">
        Save changes
        <span forTooltipArrow class="my-tooltip-arrow"></span>
      </div>
    </span>
  `,
  styles: `
    .my-tooltip {
      background: #111;
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
    }
    .my-tooltip-arrow {
      width: 8px;
      height: 8px;
      background: #111;
      transform: rotate(45deg);
      /* How far the arrow pokes out of the bubble. Negative values
         straddle the edge; 0 keeps the arrow flush against the bubble. */
      --for-arrow-offset: -4px;
    }
  `,
})
export class DemoSave {}
```

## Keyboard

- **Tab** to the trigger → opens the tooltip after `openDelay`.
- **Tab** away → closes after `closeDelay`.
- **Escape** while open → closes immediately, regardless of `closeDelay`.

## Behavior notes

- **Portal**: the content element is moved to `document.body` on first render. Any styles you scope to the wrapper won't reach it — style the bubble globally or via a class on the content directive itself.
- **`pointer-events: none`** is applied by default so hovering the bubble doesn't extend its lifetime and clicks pass through to whatever is behind. Override with your own CSS if your design needs a different behavior.
- **Keep content non-interactive**. Tooltips don't trap focus and won't survive a click into them — APG explicitly forbids interactive children.
- **Content hover doesn't keep the tooltip alive in v1.** If a consumer needs that (e.g. selectable text inside a description), it'll be added when there's a real use case.
- **Touch**: APG flags tooltips as problematic on touch devices (no hover, no separate focus). v1 doesn't add special touch handling — consider a Popover for touch-first UI.
- **Arrow offset**: `[forTooltipArrow]` writes `position: absolute`, the floating-ui-resolved `left` / `top`, and `var(--for-arrow-offset, 0px)` on the side opposite the bubble. Set `--for-arrow-offset` on the arrow (or any ancestor) to control how far the arrow pokes out — typically a negative `px` value such as `-4px`. Defaults to `0px`.
- **Floating-ui dependency** is declared as an optional peer (`@floating-ui/dom`). Install it only if you actually use the Tooltip primitive:

  ```bash
  npm install @floating-ui/dom
  ```

## Accessibility notes

- The trigger receives `aria-describedby="<content-id>"` only while the tooltip is open, matching APG.
- The content carries `role="tooltip"` and a stable id wired to the trigger.
- The optional arrow is `aria-hidden="true"` — it's purely decorative.
- The tooltip never steals focus.

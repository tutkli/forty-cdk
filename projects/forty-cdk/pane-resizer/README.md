# Pane Resizer

Headless implementation of the [WAI-ARIA Window Splitter pattern](https://www.w3.org/WAI/ARIA/apg/patterns/windowsplitter/): the focusable divider between two resizable panes. It carries `role="separator"` plus live `aria-value*`, is tabbable, handles arrow / Page / Home / End keys, and drives a pointer-drag resize with `setPointerCapture`.

It is essentially a 1-D slider wearing a separator role. The static visual divider lives in the separate [`ForSeparator`](../separator/README.md) primitive so a plain `<hr forSeparator>` never pulls the drag / keyboard-resize code in.

## Anatomy

| Class            | Selector           | Role                                                                                  |
| ---------------- | ------------------ | ------------------------------------------------------------------------------------- |
| `ForPaneResizer` | `[forPaneResizer]` | Single attribute directive. Focusable resizer: tabbable, exposes `aria-value*`, drag. |

## Examples

```ts
import { Component, signal } from '@angular/core';
import { ForPaneResizer } from 'forty-cdk/pane-resizer';

@Component({
  selector: 'demo-split-pane',
  imports: [ForPaneResizer],
  template: `
    <div class="split" [style.--start.px]="size()">
      <section id="pane-a" class="pane-a">…</section>

      <div
        class="resizer"
        forPaneResizer
        orientation="vertical"
        [(value)]="size"
        [min]="120"
        [max]="640"
        [step]="8"
        [largeStep]="80"
        [valueText]="size() + ' pixels'"
        aria-controls="pane-a pane-b"
        (resizeCommit)="persist($event)"
      ></div>

      <section id="pane-b" class="pane-b">…</section>
    </div>
  `,
  styles: `
    .split {
      display: grid;
      grid-template-columns: var(--start) 4px 1fr;
      block-size: 100%;
    }
    .resizer {
      cursor: col-resize;
      background: var(--border);
    }
    .resizer:focus-visible {
      outline: 2px solid currentColor;
      outline-offset: 2px;
    }
    .resizer[data-disabled] {
      cursor: default;
      opacity: 0.5;
    }
  `,
})
export class DemoSplitPane {
  readonly size = signal(280);
  persist(px: number) {
    localStorage.setItem('pane-a-size', String(px));
  }
}
```

### Pointer drag

`pointerdown` captures the pointer, records the starting value, and on each `pointermove` adds the **raw px delta** along the resize axis to `value`, clamped to `[min, max]`. Use this directly for px-unit layouts; for percentage / fractional layouts, listen to `(resizing)` and translate yourself, or skip pointer drag and stick to keyboard.

## API

### `ForPaneResizer`

| API            | Type                                | Default        | Description                                                                                                            |
| -------------- | ----------------------------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `orientation`  | `input<'horizontal' \| 'vertical'>` | `'horizontal'` | Axis the divider line runs along. The resize axis runs perpendicular.                                                  |
| `disabled`     | `input<boolean>`                    | —              | Drops the resizer out of tab order; reflects `aria-disabled` / `data-disabled`; blocks keyboard / pointer.             |
| `value`        | `model<number>`                     | —              | Two-way bindable value along the resize axis. Units are consumer-defined (px, %, fr…).                                 |
| `min`          | `input<number>`                     | `0`            | Lower bound.                                                                                                           |
| `max`          | `input<number>`                     | `100`          | Upper bound.                                                                                                           |
| `step`         | `input<number>`                     | `1`            | Step applied by ArrowKeys.                                                                                             |
| `largeStep`    | `input<number>`                     | `10`           | Step applied by `Page Up` / `Page Down`.                                                                               |
| `valueText`    | `input<string \| null>`             | —              | Optional `aria-valuetext` string for human-readable values.                                                            |
| `controls`     | `input<string \| null>`             | —              | Space-separated list of pane ids surfaced as `aria-controls`.                                                          |
| `collapsible`  | `input<boolean>`                    | —              | Opt-in `Enter` / `Space` toggle: collapses to `min`, restores to the previous size on the next press.                  |
| `dir`          | `input<'ltr' \| 'rtl'>`             | —              | Reading direction. RTL inverts ArrowLeft / ArrowRight and the horizontal axis of pointer drag.                         |
| `valueChange`  | `output<number>`                    | —              | Output. Implicit emitter from `model()`. Fires on internal updates only — silent on consumer writes via `[(value)]`.   |
| `resize`       | `output<number>`                    | —              | Output. Verb-named alias for `valueChange`. Useful when wiring one-way without `[(value)]`.                            |
| `resizeCommit` | `output<number>`                    | —              | Output. Fires once at the end of a resize burst (key release, pointerup, or `pointercancel`). Persist final size here. |

### Data attributes

| Piece              | Attribute          | Values                     |
| ------------------ | ------------------ | -------------------------- |
| `[forPaneResizer]` | `data-orientation` | `horizontal` \| `vertical` |
| `[forPaneResizer]` | `data-disabled`    | present \| absent          |

## Keyboard

| Key                        | Action                                                                                                        |
| -------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `ArrowLeft` / `ArrowRight` | Move along the resize axis for a vertical separator (horizontal pane stack). RTL inverts the horizontal pair. |
| `ArrowUp` / `ArrowDown`    | Move along the resize axis for a horizontal separator (vertical pane stack).                                  |
| `Page Up`                  | Apply `largeStep` toward `max`.                                                                               |
| `Page Down`                | Apply `largeStep` toward `min`.                                                                               |
| `Home`                     | Snap to `min`.                                                                                                |
| `End`                      | Snap to `max`.                                                                                                |
| `Enter` / `Space`          | Toggle collapse to `min` / restore previous size. Only when `collapsible` is enabled (off by default).        |

## Accessibility

- **Follows the Window Splitter pattern verbatim.**
  - `aria-orientation` is reflected **explicitly** (both `'horizontal'` and `'vertical'`) so AT can announce the resize axis.
  - `aria-controls` is recommended: point it at the panes the resizer splits so AT can relate them.
- **`aria-valuetext`** when the bare number is not meaningful (e.g. `"30 percent of viewport"`).
- **`data-disabled`** is reflected when `disabled` is true so consumers can flip styling and pointer affordances in CSS.
- **Accessible name.** Provide a name via native `aria-label` / `aria-labelledby` on the host so AT announces what the resizer adjusts.

## Styling

forty-cdk ships no styles. Add your own class to each piece — the `for*` selectors are the behavior API, not a styling contract (see [Styling forty-cdk](../../../../../docs/styling.md)). Key your CSS off the reflected `data-*` attributes listed under [Data attributes](#data-attributes).

```css
.resizer[data-orientation='vertical'] {
  cursor: col-resize;
}
.resizer[data-orientation='horizontal'] {
  cursor: row-resize;
}
.resizer[data-disabled] {
  cursor: default;
  opacity: 0.5;
}
```

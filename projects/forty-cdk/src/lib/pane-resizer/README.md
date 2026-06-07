# Pane Resizer

Headless implementation of the [WAI-ARIA Window Splitter pattern](https://www.w3.org/WAI/ARIA/apg/patterns/windowsplitter/): the focusable divider between two resizable panes. It carries `role="separator"` plus live `aria-value*`, is tabbable, handles arrow / Page / Home / End keys, and drives a pointer-drag resize with `setPointerCapture`.

It is essentially a 1-D slider wearing a separator role. The static visual divider lives in the separate [`ForSeparator`](../separator/README.md) primitive so a plain `<hr forSeparator>` never pulls the drag / keyboard-resize code in.

## Pieces

| Class           | Selector          | Role                                                                                   |
| --------------- | ----------------- | -------------------------------------------------------------------------------------- |
| `ForPaneResizer` | `[forPaneResizer]` | Single attribute directive. Focusable resizer: tabbable, exposes `aria-value*`, drag. |

## Inputs

| API           | Type                                | Description                                                                                                  |
| ------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `orientation` | `input<'horizontal' \| 'vertical'>` | Axis the divider line runs along. Defaults to `'horizontal'`. The resize axis runs perpendicular.            |
| `disabled`    | `input<boolean>`                    | Drops the resizer out of tab order; reflects `aria-disabled` / `data-disabled`; blocks keyboard / pointer.   |
| `value`       | `model<number>`                     | Two-way bindable value along the resize axis. Units are consumer-defined (px, %, fr…).                       |
| `min`         | `input<number>`                     | Lower bound. Default `0`.                                                                                    |
| `max`         | `input<number>`                     | Upper bound. Default `100`.                                                                                  |
| `step`        | `input<number>`                     | Step applied by ArrowKeys. Default `1`.                                                                      |
| `largeStep`   | `input<number>`                     | Step applied by `Page Up` / `Page Down`. Default `10`.                                                       |
| `valueText`   | `input<string \| null>`             | Optional `aria-valuetext` string for human-readable values.                                                  |
| `controls`    | `input<string \| null>`             | Space-separated list of pane ids surfaced as `aria-controls`.                                                |
| `collapsible` | `input<boolean>`                    | Opt-in `Enter` / `Space` toggle: collapses to `min`, restores to the previous size on the next press.        |
| `dir`         | `input<'ltr' \| 'rtl'>`             | Reading direction. RTL inverts ArrowLeft / ArrowRight and the horizontal axis of pointer drag.               |

## Outputs

| API            | Payload  | Fires                                                                                                       |
| -------------- | -------- | ----------------------------------------------------------------------------------------------------------- |
| `valueChange`  | `number` | Implicit emitter from `model()`. Fires on internal updates only — silent on consumer writes via `[(value)]`. |
| `resize`       | `number` | Verb-named alias for `valueChange`. Useful when wiring one-way without `[(value)]`.                         |
| `resizeCommit` | `number` | Fires once at the end of a resize burst (key release, pointerup, or `pointercancel`). Persist final size here. |

The host gets `data-orientation="horizontal" \| "vertical"` for CSS hooks. When `disabled`, the host also gets `data-disabled=""`.

## Usage

```ts
import { Component, signal } from '@angular/core';
import { ForPaneResizer } from 'forty-cdk';

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

`pointerdown` captures the pointer, records the starting value, and on each `pointermove` adds the **raw px delta** along the resize axis to `value`, clamped to `[min, max]`. Use this directly for px-unit layouts; for percentage / fractional layouts, listen to `(resize)` and translate yourself, or skip pointer drag and stick to keyboard.

## Accessibility notes

- **Follows the Window Splitter pattern verbatim.**
  - `aria-orientation` is reflected **explicitly** (both `'horizontal'` and `'vertical'`) so AT can announce the resize axis.
  - **Arrow keys** move along the resize axis: `Arrow←` / `Arrow→` for a vertical separator (horizontal pane stack), `Arrow↑` / `Arrow↓` for a horizontal separator (vertical pane stack). RTL inverts the horizontal pair.
  - **`Page Up` / `Page Down`** apply `largeStep` (canonical APG large-step keys, not `Shift+Arrow`).
  - **`Home` / `End`** snap to `min` / `max`.
  - **`Enter` / `Space`** toggle to / from `min` when `collapsible` is enabled. Off by default — opt-in because it changes the meaning of `Enter`.
  - `aria-controls` is recommended: point it at the panes the resizer splits so AT can relate them.
- **`aria-valuetext`** when the bare number is not meaningful (e.g. `"30 percent of viewport"`).
- **`data-disabled`** is reflected when `disabled` is true so consumers can flip styling and pointer affordances in CSS.
- **Accessible name.** Provide a name via native `aria-label` / `aria-labelledby` on the host so AT announces what the resizer adjusts.

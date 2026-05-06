# Separator

Headless implementation of the [WAI-ARIA Separator pattern](https://www.w3.org/WAI/ARIA/apg/patterns/separator/). Ships both APG variants from one directive: a static line that splits content groups, and a focusable resizer that drives a split-pane layout.

## Pieces

| Class          | Selector         | Role                                                                                                                |
| -------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------- |
| `ForSeparator` | `[forSeparator]` | Single attribute directive. Static by default; opt into the focusable resizer variant by setting `focusable`. |

## Inputs

| API           | Type                                | Description                                                                                                  |
| ------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `orientation` | `input<'horizontal' \| 'vertical'>` | Axis the separator divides along. Defaults to `'horizontal'`.                                                |
| `decorative`  | `input<boolean>`                    | When true, the separator is purely visual (`role="none"`). Always wins over `focusable`.                     |
| `focusable`   | `input<boolean>`                    | Enables the focusable resizer variant: tabbable, exposes `aria-value*`, handles arrow / page / Home / End. |
| `disabled`    | `input<boolean>`                    | Disables the focusable variant. Drops the resizer out of tab order; reflects `aria-disabled` / `data-disabled`. |
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

The host gets `data-orientation="horizontal" \| "vertical"` for CSS hooks. When `focusable` and `disabled`, the host also gets `data-disabled=""`.

## Usage — static variant

```ts
import { Component } from '@angular/core';
import { ForSeparator } from 'forty-cdk';

@Component({
  selector: 'demo-separator',
  imports: [ForSeparator],
  template: `
    <section>
      <h2>Profile</h2>
      <p>…</p>
    </section>

    <hr forSeparator />

    <section>
      <h2>Notifications</h2>
      <p>…</p>
    </section>

    <nav>
      <a href="/a">A</a>
      <span forSeparator orientation="vertical" decorative></span>
      <a href="/b">B</a>
    </nav>
  `,
})
export class DemoSeparator {}
```

## Usage — focusable resizer (split pane)

```ts
import { Component, signal } from '@angular/core';
import { ForSeparator } from 'forty-cdk';

@Component({
  selector: 'demo-split-pane',
  imports: [ForSeparator],
  template: `
    <div class="split" [style.--start.px]="size()">
      <section id="pane-a" class="pane-a">…</section>

      <div
        class="resizer"
        forSeparator
        focusable
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

- **Static is the default.** `[forSeparator]` keeps `role="separator"` and (for vertical) `aria-orientation="vertical"`. Horizontal omits the attribute because it is the ARIA default.
- **Use `decorative` when redundant.** If the section split is already announced (e.g. headings on either side), set `decorative` so the separator becomes `role="none"` and AT skips it. `decorative` overrides `focusable` — a decorative resizer would not be readable by AT.
- **Focusable variant follows APG verbatim.**
  - `aria-orientation` is reflected **explicitly** (both `'horizontal'` and `'vertical'`) so AT can announce the resize axis.
  - **Arrow keys** move along the resize axis: `Arrow←` / `Arrow→` for a vertical separator (horizontal pane stack), `Arrow↑` / `Arrow↓` for a horizontal separator (vertical pane stack). RTL inverts the horizontal pair.
  - **`Page Up` / `Page Down`** apply `largeStep` (canonical APG large-step keys, not `Shift+Arrow`).
  - **`Home` / `End`** snap to `min` / `max`.
  - **`Enter` / `Space`** toggle to / from `min` when `collapsible` is enabled. Off by default — opt-in because it changes the meaning of `Enter`.
  - `aria-controls` is recommended: point it at the panes the resizer splits so AT can relate them.
- **`aria-valuetext`** when the bare number is not meaningful (e.g. `"30 percent of viewport"`).
- **`data-disabled`** is reflected when both `focusable` and `disabled` are true so consumers can flip styling and pointer affordances in CSS.

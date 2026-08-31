---
title: Pane Resizer
group: primitives
archetype: [composable-ui]
apgUrl: https://www.w3.org/WAI/ARIA/apg/patterns/windowsplitter/
---

# Pane Resizer

A focusable divider that resizes the panes on either side — draggable and keyboard-operable, with an optional collapse behaviour.

It carries `role="separator"` plus live `aria-value*`, is tabbable, handles arrow / Page / Home / End keys, and drives a pointer-drag resize with `setPointerCapture`. It is essentially a 1-D slider wearing a separator role; the static visual divider lives in the separate [`ForSeparator`](../separator/README.md) primitive so a plain `<hr forSeparator>` never pulls the drag / keyboard-resize code in.

## Anatomy

```html
<div class="split">
  <section id="pane-a">…</section>

  <div
    forPaneResizer
    orientation="vertical"
    [(value)]="size"
    [min]="120"
    [max]="640"
    aria-controls="pane-a pane-b"
    aria-label="Resize panes"
  ></div>

  <section id="pane-b">…</section>
</div>
```

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

The press also **focuses the divider**. Starting a drag calls `preventDefault()` (so the gesture never turns into a text selection), which suppresses the browser's native focus-on-press, so the directive focuses the host itself — keyboard fine-tuning continues from where the drag ended instead of needing a `Tab` first. Ship a visible `:focus-visible` style for the divider (as the example above does) so the focus ring appears for keyboard users without flashing after every mouse drag.

`Escape` (or a `pointercancel`) mid-drag restores the pre-drag value through `[(value)]` and emits no `(resizeCommit)`. Unmounting the resizer mid-drag reverts too, but the destroyed `[(value)]` model can no longer emit, so the pre-drag value is reported through the `[valueRevert]` callback instead — bind it as a function reference when you persist the size and the pane layout can disappear during a gesture:

```html
<div forPaneResizer [(value)]="size" [valueRevert]="onValueRevert"></div>
```

```ts
readonly onValueRevert = (value: number): void => {
  this.persistedSize.set(value);
};
```

## API

### `ForPaneResizer`

| Property       | Type                                     | Description                                                                                                                                                                                                                                                       |
| -------------- | ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `orientation`  | `input<'horizontal' \| 'vertical'>`      | Axis the divider line runs along. The resize axis runs perpendicular.<br>**Default:** `'horizontal'`                                                                                                                                                              |
| `disabled`     | `input<boolean>`                         | Drops the resizer out of tab order; reflects `aria-disabled` / `data-disabled`; blocks keyboard / pointer.<br>**Default:** —                                                                                                                                      |
| `value`        | `model<number>`                          | Two-way bindable value along the resize axis. Units are consumer-defined (px, %, fr…).<br>**Default:** —                                                                                                                                                          |
| `min`          | `input<number>`                          | Lower bound.<br>**Default:** `0`                                                                                                                                                                                                                                  |
| `max`          | `input<number>`                          | Upper bound.<br>**Default:** `100`                                                                                                                                                                                                                                |
| `step`         | `input<number>`                          | Step applied by ArrowKeys.<br>**Default:** `1`                                                                                                                                                                                                                    |
| `largeStep`    | `input<number>`                          | Step applied by `Page Up` / `Page Down`.<br>**Default:** `10`                                                                                                                                                                                                     |
| `valueText`    | `input<string \| null>`                  | Optional `aria-valuetext` string for human-readable values.<br>**Default:** —                                                                                                                                                                                     |
| `controls`     | `input<string \| null>`                  | Space-separated list of pane ids surfaced as `aria-controls`.<br>**Default:** —                                                                                                                                                                                   |
| `collapsible`  | `input<boolean>`                         | Opt-in `Enter` / `Space` toggle: collapses to `min`, and on the next press restores the last size the resizer settled on above `min` — from a drag, a keyboard burst, or a previous collapse. Falls back to `max` when no such size exists yet.<br>**Default:** — |
| `dir`          | `input<'ltr' \| 'rtl'>`                  | Reading direction. RTL inverts ArrowLeft / ArrowRight and the horizontal axis of pointer drag.<br>**Default:** —                                                                                                                                                  |
| `valueChange`  | `output<number>`                         | Output. Implicit emitter from `model()`. Fires on internal updates only — silent on consumer writes via `[(value)]`.<br>**Default:** —                                                                                                                            |
| `resizing`     | `output<number>`                         | Output. Verb-named alias for `valueChange`. Useful when wiring one-way without `[(value)]`.<br>**Default:** —                                                                                                                                                     |
| `resizeCommit` | `output<number>`                         | Output. Fires once at the end of a resize burst (key release, pointerup, `pointercancel`, or blur while a key is still held). Persist final size here.<br>**Default:** —                                                                                          |
| `valueRevert`  | `((value: number) => void) \| undefined` | Teardown-only revert callback, bound as a function reference. Called with the pre-drag value when the resizer is destroyed mid-drag, where `[(value)]` can no longer emit. Silent on the `Escape` / `pointercancel` reverts.<br>**Default:** —                    |

| Data attribute     | Values                     |
| ------------------ | -------------------------- |
| `data-orientation` | `horizontal` \| `vertical` |
| `data-disabled`    | present \| absent          |

## Keyboard

| Key                        | Action                                                                                                                                                                                                                                                                |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ArrowLeft` / `ArrowRight` | Move along the resize axis for a vertical separator (horizontal pane stack). RTL inverts the horizontal pair.                                                                                                                                                         |
| `ArrowUp` / `ArrowDown`    | Move along the resize axis for a horizontal separator (vertical pane stack).                                                                                                                                                                                          |
| `Page Up`                  | Apply `largeStep` toward `max`.                                                                                                                                                                                                                                       |
| `Page Down`                | Apply `largeStep` toward `min`.                                                                                                                                                                                                                                       |
| `Home`                     | Snap to `min`.                                                                                                                                                                                                                                                        |
| `End`                      | Snap to `max`.                                                                                                                                                                                                                                                        |
| `Enter` / `Space`          | Toggle collapse to `min` / restore the last size settled on above `min` — from a drag or a keyboard burst, so a drag-to-`min` then `Enter` returns to the pre-drag size (`max` is the never-sized-yet fallback). Only when `collapsible` is enabled (off by default). |

## Accessibility

Implements the [WAI-ARIA Window Splitter pattern](https://www.w3.org/WAI/ARIA/apg/patterns/windowsplitter/).

- **Follows the Window Splitter pattern verbatim.**
  - `aria-orientation` is reflected **explicitly** (both `'horizontal'` and `'vertical'`) so AT can announce the resize axis.
  - `aria-controls` is recommended: point it at the panes the resizer splits so AT can relate them.
- **`aria-valuetext`** when the bare number is not meaningful (e.g. `"30 percent of viewport"`).
- **`data-disabled`** is reflected when `disabled` is true so consumers can flip styling and pointer affordances in CSS.
- **Accessible name.** Provide a name via native `aria-label` / `aria-labelledby` on the host so AT announces what the resizer adjusts.

## Styling

forty-cdk ships no styles. Add your own class to each piece — the `for*` selectors are the behavior API, not a styling contract (see [Styling forty-cdk](../../../docs/styling.md)). Key your CSS off the reflected `data-*` attributes listed per piece in the [API](#api) section.

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

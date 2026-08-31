---
title: Progress
group: primitives
archetype: [composable-ui]
apgUrl: https://www.w3.org/WAI/ARIA/apg/patterns/meter/
---

# Progress

A bar that reflects the completion progress of a task.

Pass a numeric `value` for a determinate bar, or `null` for indeterminate ("loading…"). The directive owns ARIA + state; the visual fill is yours via `[forProgressIndicator]`.

## Anatomy

```html
<div forProgress [value]="uploaded()" [max]="100" announceCompletion>
  <div forProgressIndicator></div>
</div>
```

## Examples

```ts
import { Component, signal } from '@angular/core';
import { ForProgress, ForProgressIndicator } from 'forty-cdk/progress';

@Component({
  selector: 'demo-upload',
  imports: [ForProgress, ForProgressIndicator],
  template: `
    <div forProgress class="progress" [value]="uploaded()" [max]="total()" announceCompletion>
      <div forProgressIndicator class="progress-indicator"></div>
    </div>
  `,
  styles: [
    `
      .progress {
        position: relative;
        height: 8px;
        width: 240px;
        background: #eee;
        border-radius: 4px;
        overflow: hidden;
      }
      .progress-indicator {
        position: absolute;
        inset: 0;
        background: #4f46e5;
        transform-origin: left center;
        transition: transform 120ms;
      }
      .progress-indicator[data-state='loading'] {
        transform: scaleX(calc(var(--for-progress-percentage) / 100));
      }
      .progress-indicator[data-state='indeterminate'] {
        transform: scaleX(0.4);
        animation: slide 1.2s infinite ease-in-out;
      }
      @keyframes slide {
        from {
          transform: translateX(-100%) scaleX(0.4);
        }
        to {
          transform: translateX(250%) scaleX(0.4);
        }
      }
    `,
  ],
})
export class DemoUpload {
  readonly uploaded = signal(0);
  readonly total = signal(200);
}
```

## API

### `ForProgress`

| Property             | Type                                      | Description                                                                                                                                 |
| -------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `value`              | `input<number \| null>`                   | Current progress in `[0, max]` (one-way; display-only). `null` = indeterminate.<br>**Default:** `null`                                      |
| `max`                | `input<number>`                           | Upper bound. A non-positive `max` is clamped to `1` for ARIA so `aria-valuemax` always exceeds `aria-valuemin` (`0`).<br>**Default:** `100` |
| `getValueLabel`      | `input<((value, max) => string) \| null>` | Override for `aria-valuetext` (e.g. "Step 3 of 5").<br>**Default:** —                                                                       |
| `announceCompletion` | `input<boolean>`                          | Announce `Complete` (or the label) once via `aria-live` on the loading→complete transition.<br>**Default:** —                               |
| `ariaLabel`          | `input<string \| null>`                   | Accessible name for the progressbar. Prefer a visible label referenced via `aria-labelledby` when one exists.<br>**Default:** `null`        |

| Data attribute    | Values                                     |
| ----------------- | ------------------------------------------ |
| `data-state`      | `indeterminate` \| `loading` \| `complete` |
| `data-value`      | clamped value (absent while indeterminate) |
| `data-min`        | `0`                                        |
| `data-max`        | the `max` value                            |
| `data-percentage` | `0`–`100` (absent while indeterminate)     |

### `ForProgressIndicator`

Visual fill paired with `[forProgress]`. Reflects the same state so width / transform can be driven from CSS, plus the `--for-progress-percentage` custom property (e.g. `25%`) for use directly in `transform` / `width`.

| Data attribute    | Values                                     |
| ----------------- | ------------------------------------------ |
| `data-state`      | `indeterminate` \| `loading` \| `complete` |
| `data-value`      | clamped value (absent while indeterminate) |
| `data-min`        | `0`                                        |
| `data-max`        | the `max` value                            |
| `data-percentage` | `0`–`100` (absent while indeterminate)     |

## Accessibility

Implements the [WAI-ARIA Meter pattern](https://www.w3.org/WAI/ARIA/apg/patterns/meter/), using the [`progressbar` role](https://www.w3.org/TR/wai-aria-1.2/#progressbar).

- **`role="progressbar"`** is announced as "progressbar" with the current value as a percentage (or your `aria-valuetext` if `getValueLabel` is set).
- **Indeterminate omits `aria-valuenow`.** Per spec, the absence of `aria-valuenow` is what tells AT the bar is indeterminate. The directive enforces this; `data-state="indeterminate"` is the CSS hook.
- **Announce sparingly.** `announceCompletion` is opt-in; only enable it on flows where the user explicitly waits for completion (uploads, submissions). For background activity, the silent state change is enough.
- **Keep the bar focusable only if it has actions.** A vanilla `[forProgress]` is non-interactive and should not be in the tab order.

## Styling

forty-cdk ships no styles. Add your own class to each piece — the `for*` selectors are the behavior API, not a styling contract (see [Styling forty-cdk](../../../docs/styling.md)). Key your CSS off the reflected `data-*` attributes listed per piece in the [API](#api) section.

### CSS custom properties

| Property                    | Meaning                                                                                                                      |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `--for-progress-percentage` | Completion as a CSS percentage (e.g. `25%`), set on `[forProgressIndicator]`. Absent while indeterminate (`value === null`). |

```css
.progress-indicator[data-state='loading'] {
  transform: scaleX(calc(var(--for-progress-percentage) / 100));
}
```

## Wrapping in a design system

Subclassing the root is the supported pattern; the subclass must re-provide `FOR_PROGRESS_CONTEXT` because Angular does not inherit a directive's `providers`, and every projected piece resolves its context through it. See [Wrapping non-form roots](../../../docs/wrapping-non-form-roots.md).

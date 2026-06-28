# Progress

Headless [WAI-ARIA `progressbar`](https://www.w3.org/TR/wai-aria-1.2/#progressbar) for tasks whose completion you can communicate visually.

Pass a numeric `value` for a determinate bar, or `null` for indeterminate ("loading…"). The directive owns ARIA + state; the visual fill is yours via `[forProgressIndicator]`.

## Anatomy

| Class                  | Selector                 | Role                                                                |
| ---------------------- | ------------------------ | ------------------------------------------------------------------- |
| `ForProgress`          | `[forProgress]`          | Root. Owns `value` / `max`, reflects `role="progressbar"` and ARIA. |
| `ForProgressIndicator` | `[forProgressIndicator]` | Visual fill. Reflects `data-state` and `data-percentage`.           |

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

| API                  | Type                                      | Default | Description                                                                                                                              |
| -------------------- | ----------------------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `value`              | `model<number \| null>`                   | —       | Two-way bindable. Current progress in `[0, max]`. `null` = indeterminate.                                                                |
| `max`                | `input<number>`                           | `100`   | Upper bound. Defaults to `100`. A non-positive `max` is clamped to `1` for ARIA so `aria-valuemax` always exceeds `aria-valuemin` (`0`). |
| `getValueLabel`      | `input<((value, max) => string) \| null>` | —       | Override for `aria-valuetext` (e.g. "Step 3 of 5").                                                                                      |
| `announceCompletion` | `input<boolean>`                          | —       | Announce `Complete` (or the label) once via `aria-live` on the loading→complete transition.                                              |

The host carries `data-state="indeterminate" \| "loading" \| "complete"`, `data-value`, `data-min`, `data-max`, and `data-percentage` (absent while indeterminate), matching the meter root so the root can be styled from `data-percentage` directly. The indicator reflects the same `data-percentage` plus the CSS custom property `--for-progress-percentage` (e.g. `25%`) that you can use directly in `transform` / `width`.

### Data attributes

| Piece                    | Attribute         | Values                                     |
| ------------------------ | ----------------- | ------------------------------------------ |
| `[forProgress]`          | `data-state`      | `indeterminate` \| `loading` \| `complete` |
| `[forProgress]`          | `data-value`      | clamped value (absent while indeterminate) |
| `[forProgress]`          | `data-min`        | `0`                                        |
| `[forProgress]`          | `data-max`        | the `max` value                            |
| `[forProgress]`          | `data-percentage` | `0`–`100` (absent while indeterminate)     |
| `[forProgressIndicator]` | `data-state`      | `indeterminate` \| `loading` \| `complete` |
| `[forProgressIndicator]` | `data-value`      | clamped value (absent while indeterminate) |
| `[forProgressIndicator]` | `data-max`        | the `max` value                            |
| `[forProgressIndicator]` | `data-percentage` | `0`–`100` (absent while indeterminate)     |

## Accessibility

- **`role="progressbar"`** is announced as "progressbar" with the current value as a percentage (or your `aria-valuetext` if `getValueLabel` is set).
- **Indeterminate omits `aria-valuenow`.** Per spec, the absence of `aria-valuenow` is what tells AT the bar is indeterminate. The directive enforces this; `data-state="indeterminate"` is the CSS hook.
- **Announce sparingly.** `announceCompletion` is opt-in; only enable it on flows where the user explicitly waits for completion (uploads, submissions). For background activity, the silent state change is enough.
- **Keep the bar focusable only if it has actions.** A vanilla `[forProgress]` is non-interactive and should not be in the tab order.

## Styling

forty-cdk ships no styles. Add your own class to each piece — the `for*` selectors are the behavior API, not a styling contract (see [Styling forty-cdk](../../../../../docs/styling.md)). Key your CSS off the reflected `data-*` attributes listed under [Data attributes](#data-attributes).

### CSS custom properties

| Property                    | Meaning                                                                                                                      |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `--for-progress-percentage` | Completion as a CSS percentage (e.g. `25%`), set on `[forProgressIndicator]`. Absent while indeterminate (`value === null`). |

```css
.progress-indicator[data-state='loading'] {
  transform: scaleX(calc(var(--for-progress-percentage) / 100));
}
```

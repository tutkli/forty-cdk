# Progress

Headless [WAI-ARIA `progressbar`](https://www.w3.org/TR/wai-aria-1.2/#progressbar) for tasks whose completion you can communicate visually.

Pass a numeric `value` for a determinate bar, or `null` for indeterminate ("loading…"). The directive owns ARIA + state; the visual fill is yours via `[forProgressIndicator]`.

## Pieces

| Class | Selector | Role |
| --- | --- | --- |
| `ForProgress` | `[forProgress]` | Root. Owns `value` / `max`, reflects `role="progressbar"` and ARIA. |
| `ForProgressIndicator` | `[forProgressIndicator]` | Visual fill. Reflects `data-state` and `data-percentage`. |

## Inputs / models

| API | Type | Description |
| --- | --- | --- |
| `value` | `model<number \| null>` | Two-way bindable. Current progress in `[0, max]`. `null` = indeterminate. |
| `max` | `input<number>` | Upper bound. Defaults to `100`. |
| `getValueLabel` | `input<((value, max) => string) \| null>` | Override for `aria-valuetext` (e.g. "Step 3 of 5"). |
| `announceCompletion` | `input<boolean>` | Announce `Complete` (or the label) once via `aria-live` on the loading→complete transition. |

The host carries `data-state="indeterminate" \| "loading" \| "complete"`, `data-value`, and `data-max`. The indicator additionally reflects `data-percentage` and the CSS custom property `--for-progress-percentage` (e.g. `25%`) that you can use directly in `transform` / `width`.

## Usage

```ts
import { Component, signal } from '@angular/core';
import { ForProgress, ForProgressIndicator } from 'forty-cdk';

@Component({
  selector: 'demo-upload',
  imports: [ForProgress, ForProgressIndicator],
  template: `
    <div forProgress [value]="uploaded()" [max]="total()" announceCompletion>
      <div forProgressIndicator></div>
    </div>
  `,
  styles: [
    `
      [forProgress] {
        position: relative; height: 8px; width: 240px;
        background: #eee; border-radius: 4px; overflow: hidden;
      }
      [forProgressIndicator] {
        position: absolute; inset: 0;
        background: #4f46e5;
        transform-origin: left center;
        transition: transform 120ms;
      }
      [forProgressIndicator][data-state="loading"] {
        transform: scaleX(calc(var(--for-progress-percentage) / 100));
      }
      [forProgressIndicator][data-state="indeterminate"] {
        transform: scaleX(0.4);
        animation: slide 1.2s infinite ease-in-out;
      }
      @keyframes slide { from { transform: translateX(-100%) scaleX(0.4); } to { transform: translateX(250%) scaleX(0.4); } }
    `,
  ],
})
export class DemoUpload {
  readonly uploaded = signal(0);
  readonly total = signal(200);
}
```

## Accessibility notes

- **`role="progressbar"`** is announced as "progressbar" with the current value as a percentage (or your `aria-valuetext` if `getValueLabel` is set).
- **Indeterminate omits `aria-valuenow`.** Per spec, the absence of `aria-valuenow` is what tells AT the bar is indeterminate. The directive enforces this; `data-state="indeterminate"` is the CSS hook.
- **Announce sparingly.** `announceCompletion` is opt-in; only enable it on flows where the user explicitly waits for completion (uploads, submissions). For background activity, the silent state change is enough.
- **Keep the bar focusable only if it has actions.** A vanilla `[forProgress]` is non-interactive and should not be in the tab order.

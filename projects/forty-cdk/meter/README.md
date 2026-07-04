# Meter

A gauge that shows a scalar value within a known range, bucketed into quality bands.

Mirrors the HTML5 `<meter>` element: a **measurement** — battery, disk space, score, queue depth — _not_ progress on a task. Use [Progress](../progress) for the latter.

## Anatomy

```html
<div forMeter [value]="diskUsed()" [min]="0" [max]="100" [low]="20" [high]="80" [optimum]="40">
  <div forMeterIndicator></div>
</div>
```

## Examples

```ts
import { Component, signal } from '@angular/core';
import { ForMeter, ForMeterIndicator } from 'forty-cdk/meter';

@Component({
  selector: 'demo-disk',
  imports: [ForMeter, ForMeterIndicator],
  template: `
    <label for="disk">Disk usage</label>
    <div id="disk" forMeter class="meter" [value]="used()" [low]="20" [high]="80" [optimum]="40">
      <div forMeterIndicator class="meter-indicator"></div>
    </div>
    <output>{{ used() }}%</output>
  `,
  styles: [
    `
      .meter {
        position: relative;
        height: 8px;
        width: 200px;
        background: #f1f1f1;
        border-radius: 4px;
        overflow: hidden;
      }
      .meter-indicator {
        height: 100%;
        width: var(--for-meter-percentage, 0%);
        transition: width 200ms;
      }
      .meter-indicator[data-quality='optimum'] {
        background: #16a34a;
      }
      .meter-indicator[data-quality='sub-optimum'] {
        background: #ca8a04;
      }
      .meter-indicator[data-quality='even-less-good'] {
        background: #dc2626;
      }
    `,
  ],
})
export class DemoDisk {
  readonly used = signal(72);
}
```

## API

### `ForMeter`

| Property        | Type                                       | Description                                                                                                                                          |
| --------------- | ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `value`         | `input<number>`                            | Current measurement (one-way; display-only). Clamped to `[min, max]` for ARIA / data-\* output; the input retains the raw value.<br>**Default:** `0` |
| `min`           | `input<number>`                            | Lower bound.<br>**Default:** `0`                                                                                                                     |
| `max`           | `input<number>`                            | Upper bound.<br>**Default:** `100`                                                                                                                   |
| `low`           | `input<number \| null>`                    | Lower boundary of the "comfortable" range.<br>**Default:** `null` (= `min`)                                                                          |
| `high`          | `input<number \| null>`                    | Upper boundary of the "comfortable" range.<br>**Default:** `null` (= `max`)                                                                          |
| `optimum`       | `input<number \| null>`                    | Ideal point. Drives the quality classification.<br>**Default:** `null` (= midpoint)                                                                  |
| `getValueLabel` | `input<((v, min, max) => string) \| null>` | Override for `aria-valuetext`.<br>**Default:** —                                                                                                     |

| Data attribute    | Values                                         |
| ----------------- | ---------------------------------------------- |
| `data-quality`    | `optimum` \| `sub-optimum` \| `even-less-good` |
| `data-value`      | current value, clamped to `[min, max]`         |
| `data-min`        | lower bound                                    |
| `data-max`        | upper bound                                    |
| `data-percentage` | `value` as a number in `0`–`100`               |

### `ForMeterIndicator`

Visual fill paired with `[forMeter]`. Mirrors the root's `data-*` reflections and exposes the `--for-meter-percentage` custom property so the consumer can drive `width` / `transform` from CSS.

| Data attribute    | Values                                         |
| ----------------- | ---------------------------------------------- |
| `data-quality`    | `optimum` \| `sub-optimum` \| `even-less-good` |
| `data-value`      | current value, clamped to `[min, max]`         |
| `data-min`        | lower bound                                    |
| `data-max`        | upper bound                                    |
| `data-percentage` | `value` as a number in `0`–`100`               |

## Quality algorithm

The `data-quality` reflection follows the HTML5 spec:

| Optimum sits in | `value` in            | Quality          |
| --------------- | --------------------- | ---------------- |
| middle          | `[low, high]`         | `optimum`        |
| middle          | outside `[low, high]` | `sub-optimum`    |
| below `low`     | below `low`           | `optimum`        |
| below `low`     | `[low, high]`         | `sub-optimum`    |
| below `low`     | above `high`          | `even-less-good` |
| above `high`    | above `high`          | `optimum`        |
| above `high`    | `[low, high]`         | `sub-optimum`    |
| above `high`    | below `low`           | `even-less-good` |

## Accessibility

Implements the [WAI-ARIA Meter pattern](https://www.w3.org/WAI/ARIA/apg/patterns/meter/).

- **`role="meter"`** announces the current value as a fraction of the range. Pair with a visible label and `aria-labelledby` (or `aria-label`) for context — "Disk usage 72 of 100".
- **Always determinate.** Unlike `<progress>`, a meter must always have a known value. There is no indeterminate mode in HTML5 / ARIA.
- **Don't use Meter as Progress.** Screen readers announce the two roles differently (and assistive guidance differs); pick the right primitive for the meaning.
- **Quality is for CSS only.** `data-quality` is a styling hook; assistive tech reads `aria-valuenow` / `aria-valuetext`, not the quality bucket.

## Styling

forty-cdk ships no styles. Add your own class to each piece — the `for*` selectors are the behavior API, not a styling contract (see [Styling forty-cdk](../../../../../docs/styling.md)). Key your CSS off the reflected `data-*` attributes listed per piece in the [API](#api) section.

### CSS custom properties

| Property                 | Meaning                                                                                                                       |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| `--for-meter-percentage` | `value` as a CSS percentage of `[min, max]` (`0%`–`100%`), set on `[forMeterIndicator]`. Drive `width` / `transform` from it. |

```css
.meter-indicator {
  width: var(--for-meter-percentage, 0%);
}
.meter-indicator[data-quality='even-less-good'] {
  background: #dc2626;
}
```

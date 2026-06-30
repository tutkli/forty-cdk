# Slider

A draggable thumb that picks a numeric value along a track.

A single primitive supports single, range, and multi-thumb sliders — the shape comes from `value`'s array length and how many `[forSliderThumb]` you render. Implements `FormValueControl<readonly number[]>` from `@angular/forms/signals`.

## Anatomy

```html
<div forSlider [(value)]="value" [min]="0" [max]="100" [step]="1">
  <span forSliderTrack>
    <span forSliderRange></span>
    <span forSliderThumb [index]="0" label="Volume"></span>
  </span>
</div>
```

## Examples

### Single thumb

```html
<div forSlider [(value)]="volume">
  <span forSliderTrack>
    <span forSliderRange></span>
    <span forSliderThumb [index]="0" [label]="'Volume'"></span>
  </span>
</div>
```

Where `volume = signal<readonly number[]>([50])`.

### Range (two thumbs)

```html
<div forSlider [(value)]="priceRange" [min]="0" [max]="1000" [step]="10">
  <span forSliderTrack>
    <span forSliderRange></span>
    <span forSliderThumb [index]="0" [label]="'Minimum price'"></span>
    <span forSliderThumb [index]="1" [label]="'Maximum price'"></span>
  </span>
</div>
```

`priceRange = signal<readonly number[]>([200, 800])` — non-passing constraint is enforced automatically (the lower thumb can't go above the upper, and vice versa). Use `[minStepsBetweenThumbs]="1"` to force a minimum gap.

### Signal Forms

`[forSlider]` implements `FormValueControl<readonly number[]>`. Pair with `[formField]` for auto-wiring with `@angular/forms/signals`:

```html
<div forSlider [formField]="form.opacity">…</div>
```

For native `<form>` submit, set `[name]` and the directive mirrors `value()` into N `<input type="hidden">` siblings (one per thumb). `data-touched` / `data-dirty` / `data-pending` / `data-invalid` are reflected on the host as boolean `data-*` attributes (present when `true`, absent otherwise).

## API

### `ForSlider`

| Property                | Type                                | Description                                                                                                                                                                                                                 |
| ----------------------- | ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `value`                 | `model<readonly number[]>`          | Two-way bindable value array. Required by `FormValueControl<readonly number[]>`. Output. Emits on drag, keyboard, and track click.<br>**Default:** —                                                                        |
| `min`                   | `input<number>`                     | Numeric minimum.<br>**Default:** `0`                                                                                                                                                                                        |
| `max`                   | `input<number>`                     | Numeric maximum.<br>**Default:** `100`                                                                                                                                                                                      |
| `step`                  | `input<number>`                     | Discrete value increment for arrows + drag.<br>**Default:** `1`                                                                                                                                                             |
| `largeStep`             | `input<number>`                     | Increment for `PageUp` / `PageDown`.<br>**Default:** `10`                                                                                                                                                                   |
| `orientation`           | `input<'horizontal' \| 'vertical'>` | `'horizontal'` or `'vertical'`.<br>**Default:** `'horizontal'`                                                                                                                                                              |
| `dir`                   | `input<'ltr' \| 'rtl'>`             | `'ltr'` or `'rtl'`. RTL flips horizontal pointer mapping and `ArrowLeft`/`ArrowRight` semantics.<br>**Default:** `'ltr'`                                                                                                    |
| `inverted`              | `input<boolean>`                    | Visually flips the value-to-position mapping (e.g. max on the left in horizontal LTR). Keyboard `Up`/`Right` (LTR) still moves toward `max` regardless.<br>**Default:** `false`                                             |
| `minStepsBetweenThumbs` | `input<number>`                     | Multi-thumb only: minimum gap between adjacent thumbs in step units.<br>**Default:** `0`                                                                                                                                    |
| `disabled`              | `input<boolean>`                    | Disables all interaction.<br>**Default:** `false`                                                                                                                                                                           |
| `readonly`              | `input<boolean>`                    | Allows focus + announcement, blocks updates.<br>**Default:** `false`                                                                                                                                                        |
| `name`                  | `input<string>`                     | If non-empty, mirrors `value()` into N `<input type="hidden">` siblings for native form submit.<br>**Default:** `''`                                                                                                        |
| `valueCommit`           | —                                   | Output. Fires once at the trailing edge of a value-changing interaction with the final value array — on `pointerup` / `pointercancel` after a drag, or on `keyup` after one or more keyboard adjustments.<br>**Default:** — |
| `touchedChange`         | —                                   | Output. Fires when focus leaves the slider region the first time.<br>**Default:** —                                                                                                                                         |

`(valueChange)` (from `model<readonly number[]>`) fires only on internal updates (drag, keyboard, track click). It stays silent on consumer writes via `[(value)]`.

`(valueCommit)` stays silent when the interaction did not actually change the value (e.g. press + release without movement, or arrow at the extreme).

| Data attribute     | Values                     |
| ------------------ | -------------------------- |
| `data-orientation` | `horizontal` \| `vertical` |
| `data-disabled`    | present \| absent          |
| `data-readonly`    | present \| absent          |
| `data-touched`     | present \| absent          |
| `data-dirty`       | present \| absent          |
| `data-pending`     | present \| absent          |
| `data-invalid`     | present \| absent          |

### `ForSliderTrack`

The clickable track surface. PointerDown anywhere on the track that isn't a thumb finds the nearest thumb, jumps it to that position, focuses it, and starts a drag.

| Data attribute     | Values                     |
| ------------------ | -------------------------- |
| `data-orientation` | `horizontal` \| `vertical` |
| `data-disabled`    | present \| absent          |

### `ForSliderRange`

Optional decorative band between the lowest and highest thumb (single-thumb: `0 → thumb`; multi-thumb: between the outermost thumbs). Exposes `--for-slider-range-start`, `--for-slider-range-end`, and `--for-slider-range-size` for sizing.

| Data attribute     | Values                     |
| ------------------ | -------------------------- |
| `data-orientation` | `horizontal` \| `vertical` |
| `data-disabled`    | present \| absent          |

### `ForSliderThumb`

| Property     | Type                     | Description                                                                                                                                                         |
| ------------ | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `index`      | `input.required<number>` | 0-based position in the parent slider's `value()` array. Pass the loop index when rendering N thumbs.<br>**Default:** —                                             |
| `label`      | `input<string>`          | Fixed accessible label, mirrored as `aria-label`.<br>**Default:** `''`                                                                                              |
| `labelledby` | `input<string>`          | Id of an existing element to label the thumb, mirrored as `aria-labelledby`. Use instead of `label` when the label lives elsewhere in the DOM.<br>**Default:** `''` |
| `valueText`  | `input<string>`          | Human-readable value override (e.g. `$1,200` instead of `1200`), mirrored as `aria-valuetext` only when non-empty.<br>**Default:** `''`                             |

| Data attribute     | Values                     |
| ------------------ | -------------------------- |
| `data-orientation` | `horizontal` \| `vertical` |
| `data-disabled`    | present \| absent          |
| `data-readonly`    | present \| absent          |
| `data-index`       | 0-based thumb index        |

## Keyboard

Focus a thumb, then:

| Key                                                            | Action                   |
| -------------------------------------------------------------- | ------------------------ |
| **ArrowRight** _(LTR)_ / **ArrowLeft** _(RTL)_ / **ArrowUp**   | Increase by `step`.      |
| **ArrowLeft** _(LTR)_ / **ArrowRight** _(RTL)_ / **ArrowDown** | Decrease by `step`.      |
| **PageUp**                                                     | Increase by `largeStep`. |
| **PageDown**                                                   | Decrease by `largeStep`. |
| **Home**                                                       | Set to `min`.            |
| **End**                                                        | Set to `max`.            |

`inverted` swaps "increase" / "decrease" on every key. Disabled and readonly thumbs are no-ops.

## Accessibility

Implements the [WAI-ARIA Slider pattern](https://www.w3.org/WAI/ARIA/apg/patterns/slider/) (single thumb) and the [WAI-ARIA Slider (Multi-Thumb) pattern](https://www.w3.org/WAI/ARIA/apg/patterns/slider-multi-thumb/) (range / N thumbs).

- `role="slider"` on each thumb with `aria-valuemin`, `aria-valuemax`, `aria-valuenow`, optional `aria-valuetext`, and `aria-orientation`.
- Multi-thumb non-passing: each thumb's `aria-valuemin` / `aria-valuemax` automatically squeeze to its neighbors' values, matching the APG multi-thumb guidance.
- The root has `role="group"` and `dir="rtl"` mirrored when `dir()==='rtl'`, so screen readers and CSS layout agree.
- `disabled` thumbs receive `tabindex="-1"` and `aria-disabled="true"`.
- Provide `[label]` (or `[labelledby]`) on every thumb — even single-thumb sliders benefit from explicit naming. The directive does not synthesize a label.

## Styling

forty-cdk ships no styles. Add your own class to each piece — the `for*` selectors are the behavior API, not a styling contract (see [Styling forty-cdk](../../../../../docs/styling.md)). Key your CSS off the reflected `data-*` attributes listed per piece in the [API](#api) section.

### CSS custom properties

| Property                      | Meaning                                                                                                            |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `--for-slider-thumb-position` | On `[forSliderThumb]`. Fraction `[0, 1]`, already accounting for `inverted`. The thumb's position along the track. |
| `--for-slider-range-start`    | On `[forSliderRange]`. Lowest fraction `[0, 1]` (single: pinned to the closer edge; multi: smallest thumb).        |
| `--for-slider-range-end`      | On `[forSliderRange]`. Highest fraction `[0, 1]`.                                                                  |
| `--for-slider-range-size`     | On `[forSliderRange]`. `end - start`. Useful for `width` / `height`.                                               |

Pair with `data-orientation` on every piece to pick the right axis from CSS.

```css
.thumb {
  inset-inline-start: calc(var(--for-slider-thumb-position) * 100%);
}

.range {
  inset-inline-start: calc(var(--for-slider-range-start) * 100%);
  inline-size: calc(var(--for-slider-range-size) * 100%);
}

.thumb[data-disabled] {
  opacity: 0.5;
}
```

## Wrapping in a design system

Both supported wrapper patterns — `hostDirectives` with the exported `FOR_SLIDER_HOST_DIRECTIVE_INPUTS` / `FOR_SLIDER_HOST_DIRECTIVE_OUTPUTS` name tuples, and subclassing — are documented in [Wrapping form primitives](../../../../../docs/wrapping-form-primitives.md).

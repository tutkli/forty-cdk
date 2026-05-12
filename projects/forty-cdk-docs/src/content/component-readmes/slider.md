---
title: Slider
slug: slider
source: projects/forty-cdk/src/lib/slider/README.md
---

# Slider

Headless slider implementing the [WAI-ARIA Slider pattern](https://www.w3.org/WAI/ARIA/apg/patterns/slider/) (single thumb) and the [WAI-ARIA Slider (Multi-Thumb) pattern](https://www.w3.org/WAI/ARIA/apg/patterns/slider-multi-thumb/) (range / N thumbs). Implements `FormValueControl&lt;readonly number[]&gt;` from `@angular/forms/signals`.

A single primitive supports single, range, and multi-thumb sliders — the shape comes from `value`'s array length and how many `[forSliderThumb]` you render.

## Pieces

| Class            | Selector           | Role                                                                                           |
| ---------------- | ------------------ | ---------------------------------------------------------------------------------------------- |
| `ForSlider`      | `[forSlider]`      | Root. Owns `[(value)]`, configuration, drag, form wiring.                                      |
| `ForSliderTrack` | `[forSliderTrack]` | Track surface. PointerDown moves the nearest thumb and starts a drag.                          |
| `ForSliderRange` | `[forSliderRange]` | Optional decorative band between min and the highest thumb (single) or between thumbs (multi). |
| `ForSliderThumb` | `[forSliderThumb]` | One thumb. `role="slider"`, full ARIA, keyboard, and drag.                                     |

## Single thumb

```html
<div forSlider [(value)]="volume">
  <span forSliderTrack>
    <span forSliderRange></span>
    <span forSliderThumb [index]="0" [label]="'Volume'"></span>
  </span>
</div>
```

Where `volume = signal&lt;readonly number[]&gt;([50])`.

## Range (two thumbs)

```html
<div forSlider [(value)]="priceRange" [min]="0" [max]="1000" [step]="10">
  <span forSliderTrack>
    <span forSliderRange></span>
    <span forSliderThumb [index]="0" [label]="'Minimum price'"></span>
    <span forSliderThumb [index]="1" [label]="'Maximum price'"></span>
  </span>
</div>
```

`priceRange = signal&lt;readonly number[]&gt;([200, 800])` — non-passing constraint is enforced automatically (the lower thumb can't go above the upper, and vice versa). Use `[minStepsBetweenThumbs]="1"` to force a minimum gap.

## Inputs

| Input                   | Default        | Description                                                                                                                                             |
| ----------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `min`                   | `0`            | Numeric minimum.                                                                                                                                        |
| `max`                   | `100`          | Numeric maximum.                                                                                                                                        |
| `step`                  | `1`            | Discrete value increment for arrows + drag.                                                                                                             |
| `largeStep`             | `10`           | Increment for `PageUp` / `PageDown`.                                                                                                                    |
| `orientation`           | `'horizontal'` | `'horizontal'` or `'vertical'`.                                                                                                                         |
| `dir`                   | `'ltr'`        | `'ltr'` or `'rtl'`. RTL flips horizontal pointer mapping and `ArrowLeft`/`ArrowRight` semantics.                                                        |
| `inverted`              | `false`        | Visually flips the value-to-position mapping (e.g. max on the left in horizontal LTR). Keyboard `Up`/`Right` (LTR) still moves toward `max` regardless. |
| `minStepsBetweenThumbs` | `0`            | Multi-thumb only: minimum gap between adjacent thumbs in step units.                                                                                    |
| `disabled`              | `false`        | Disables all interaction.                                                                                                                               |
| `readonly`              | `false`        | Allows focus + announcement, blocks updates.                                                                                                            |
| `name`                  | `''`           | If non-empty, mirrors `value()` into N `&lt;input type="hidden"&gt;` siblings for native form submit.                                                         |

## Outputs

`(valueChange)` (from `model&lt;readonly number[]&gt;`) fires only on internal updates (drag, keyboard, track click). It stays silent on consumer writes via `[(value)]`.

`(valueCommit)` fires once at the trailing edge of a value-changing interaction with the final value array — on `pointerup` / `pointercancel` after a drag, or on `keyup` after one or more keyboard adjustments. Use it to defer expensive work (network calls, history undo entries) without throttling `(valueChange)`. Stays silent when the interaction did not actually change the value (e.g. press + release without movement, or arrow at the extreme).

`(touchedChange)` fires when focus leaves the slider region the first time.

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

## CSS variables exposed

The directives expose the live position so consumers can paint with pure CSS:

| Element            | Custom property               | Range    | Notes                                                                                                                                                   |
| ------------------ | ----------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `[forSliderThumb]` | `--for-slider-thumb-position` | `[0, 1]` | Already accounts for `inverted`. Use with `inset-inline-start` (horizontal) or `bottom` (vertical) via `calc(var(--for-slider-thumb-position) * 100%)`. |
| `[forSliderRange]` | `--for-slider-range-start`    | `[0, 1]` | Lowest fraction (single: pinned to the closer edge; multi: smallest thumb).                                                                             |
| `[forSliderRange]` | `--for-slider-range-end`      | `[0, 1]` | Highest fraction.                                                                                                                                       |
| `[forSliderRange]` | `--for-slider-range-size`     | `[0, 1]` | `end - start`. Useful for `width` / `height`.                                                                                                           |

Pair with `data-orientation="horizontal" | "vertical"` on every piece to pick the right axis from CSS.

## Form integration

`[forSlider]` implements `FormValueControl&lt;readonly number[]&gt;`. Pair with `[formField]` for auto-wiring with `@angular/forms/signals`:

```html
<div forSlider [formField]="form.opacity">…</div>
```

For native `&lt;form&gt;` submit, set `[name]` and the directive mirrors `value()` into N `&lt;input type="hidden"&gt;` siblings (one per thumb). `data-touched` / `data-dirty` / `data-pending` / `data-invalid` are reflected on the host as boolean `data-*` attributes (present when `true`, absent otherwise).

## Accessibility notes

- `role="slider"` on each thumb with `aria-valuemin`, `aria-valuemax`, `aria-valuenow`, optional `aria-valuetext`, and `aria-orientation`.
- Multi-thumb non-passing: each thumb's `aria-valuemin` / `aria-valuemax` automatically squeeze to its neighbors' values, matching the APG multi-thumb guidance.
- The root has `role="group"` and `dir="rtl"` mirrored when `dir()==='rtl'`, so screen readers and CSS layout agree.
- `disabled` thumbs receive `tabindex="-1"` and `aria-disabled="true"`.
- Provide `[label]` (or `[labelledby]`) on every thumb — even single-thumb sliders benefit from explicit naming. The directive does not synthesize a label.

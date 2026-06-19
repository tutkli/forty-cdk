# ForCarousel

Headless, styleless carousel primitive implementing the
[WAI-ARIA APG Carousel pattern](https://www.w3.org/WAI/ARIA/apg/patterns/carousel/).
It ships slide tracking, keyboard navigation, focus management, and ARIA; you
supply the markup and CSS.

## Usage

```html
<div
  forCarousel
  [(activeIndex)]="index"
  loop
  orientation="horizontal"
  ariaLabel="Featured products"
>
  <button forCarouselPrevious aria-label="Previous slide">‹</button>

  <div forCarouselViewport>
    <div forCarouselTrack>
      @for (product of products(); track product.id) {
      <div forCarouselSlide>{{ product.name }}</div>
      }
    </div>
  </div>

  <button forCarouselNext aria-label="Next slide">›</button>

  <div forCarouselIndicators ariaLabel="Choose slide to display">
    @for (product of products(); track product.id; let i = $index) {
    <button forCarouselIndicator [attr.aria-label]="'Go to slide ' + (i + 1)"></button>
    }
  </div>
</div>
```

## Example CSS

The directive publishes geometry as CSS custom properties on the root element
so they cascade to the track. The consumer applies the transform and transition.

```css
[forCarouselViewport] {
  overflow: hidden;
}
[forCarouselTrack] {
  display: flex;
  transform: translateX(var(--for-carousel-offset));
  transition: transform 300ms ease;
}
[forCarousel][data-orientation='vertical'] [forCarouselTrack] {
  flex-direction: column;
  transform: translateY(var(--for-carousel-offset));
}
[forCarouselSlide] {
  flex: 0 0 calc(100% / var(--for-carousel-slides-per-view));
}
@media (prefers-reduced-motion: reduce) {
  [forCarouselTrack] {
    transition: none;
  }
}
```

## CSS custom properties

The following properties are set on the `[forCarousel]` host and cascade to
children, unless noted otherwise:

| Property                         | Host                    | Value         | Notes                                                                                                           |
| -------------------------------- | ----------------------- | ------------- | --------------------------------------------------------------------------------------------------------------- |
| `--for-carousel-offset`          | `[forCarousel]`         | e.g. `-100%`  | Pure arithmetic from `activeIndex`, `slidesPerView`, `align`.                                                   |
| `--for-carousel-active-index`    | `[forCarousel]`         | integer       | Current `activeIndex`.                                                                                          |
| `--for-carousel-slide-count`     | `[forCarousel]`         | integer       | Total registered slides.                                                                                        |
| `--for-carousel-slides-per-view` | `[forCarousel]`         | integer       | From the `slidesPerView` input.                                                                                 |
| `--for-carousel-viewport-width`  | `[forCarousel]`         | e.g. `640px`  | Measured via `ResizeObserver`. Absent on the server and before first measurement.                               |
| `--for-carousel-viewport-height` | `[forCarousel]`         | e.g. `400px`  | Same as above, for the block axis.                                                                              |
| `--for-carousel-drag`            | `[forCarouselViewport]` | e.g. `-128px` | Live px offset along the primary axis during a drag; absent at rest and under `prefers-reduced-motion: reduce`. |

## Autoplay

Add the `autoplay` attribute and a `[forCarouselRotationControl]` as the **first
focusable child** of the carousel to enable automatic slide rotation.

```html
<div forCarousel autoplay [autoplayInterval]="4000" ariaLabel="Featured products">
  <button forCarouselRotationControl>
    <!-- swap icon with [data-playing] in your CSS -->
  </button>
  <button forCarouselPrevious aria-label="Previous slide">‹</button>
  <div forCarouselViewport>…</div>
  <button forCarouselNext aria-label="Next slide">›</button>
  <div forCarouselIndicators ariaLabel="Choose slide to display">…</div>
</div>
```

**Behaviour:**

- Rotation pauses on hover, on keyboard focus anywhere inside the carousel, and
  while the browser tab is backgrounded. It resumes when none of those hold.
- An explicit user stop (clicking the rotation control or calling `pause()`) is
  **sticky**: hover-in/out and focus-in/out will not restart it. Only an explicit
  Start does.
- Under `prefers-reduced-motion: reduce`, rotation does **not** auto-start. The
  user can still start it manually by clicking the rotation control (explicit
  consent overrides the gate).
- While rotating, the viewport's `aria-live` is `"off"` (so advancing slides do
  not bombard the screen reader). When stopped or paused it is `"polite"` so
  manual navigation is announced.

**APG requirement:** if you enable `autoplay`, you **must** render a
`[forCarouselRotationControl]` and place it first in the tab order — an
auto-rotating carousel without a visible pause control fails WCAG 2.2.2 (Pause,
Stop, Hide). The directive does not enforce this, but your implementation does.

**Label inputs:** the control uses a label swap, not `aria-pressed`. Override
the defaults with `startLabel` / `stopLabel` inputs:

```html
<button forCarouselRotationControl startLabel="Play slideshow" stopLabel="Pause slideshow"></button>
```

**Styling hooks:**

```css
[forCarouselRotationControl]::before {
  content: '▶';
}
[forCarouselRotationControl][data-playing]::before {
  content: '⏸';
}
```

| Attribute       | When present                                            |
| --------------- | ------------------------------------------------------- |
| `data-playing`  | On `[forCarouselRotationControl]` — user intent is "on" |
| `data-rotating` | On `[forCarousel]` — actively rotating right now        |
| `data-autoplay` | On `[forCarousel]` — the `autoplay` input is `true`     |

**Programmatic control** via `exportAs`:

```html
<div forCarousel #car="forCarousel" autoplay>…</div>
```

```ts
car.play(); // start (explicit, sticky)
car.pause(); // stop (explicit, sticky)
car.toggleAutoplay(); // toggle
car.playing(); // Signal<boolean> — user intent
```

## Drag / swipe

Apply `forCarouselDrag` on the `[forCarouselViewport]` element to enable
pointer drag and touch swipe navigation. The directive is **opt-in and
tree-shakeable** — it adds nothing to the root `ForCarousel` for consumers who
don't use it.

```html
<div forCarousel [(activeIndex)]="index" ariaLabel="Featured products">
  <div forCarouselViewport forCarouselDrag>
    <div forCarouselTrack>…</div>
  </div>
  <!-- prev / next / indicators as before -->
</div>
```

### CSS contract

The directive publishes `--for-carousel-drag` (a raw px value) on the viewport
host during the gesture. Compose it with `--for-carousel-offset` on the track
transform:

```css
[forCarouselTrack] {
  transform: translateX(calc(var(--for-carousel-offset) + var(--for-carousel-drag, 0px)));
  transition: transform 300ms ease;
}
[forCarousel][data-orientation='vertical'] [forCarouselTrack] {
  transform: translateY(calc(var(--for-carousel-offset) + var(--for-carousel-drag, 0px)));
}
/* Kill the settle transition while the finger is down so the track follows 1:1 */
[forCarouselViewport][data-dragging] [forCarouselTrack] {
  transition: none;
}
[forCarouselViewport][data-dragging] {
  user-select: none;
}
```

### RTL

`--for-carousel-drag` is always the **physical** finger displacement, so compose
it **without** the `-1` factor the consumer may apply to `--for-carousel-offset`
in RTL:

```css
[dir='rtl'] [forCarouselTrack] {
  transform: translateX(calc(-1 * var(--for-carousel-offset) + var(--for-carousel-drag, 0px)));
}
```

### Reduced motion

Under `prefers-reduced-motion: reduce` the directive does **not** publish
`--for-carousel-drag` (no live track motion). The gesture still snaps
`activeIndex` on release — only the continuous live offset is suppressed.

### Cross-axis / touch

`touch-action` is set automatically on the viewport host — `pan-y` for
horizontal carousels (allows vertical page scroll) and `pan-x` for vertical
carousels (allows horizontal page scroll). A mostly-cross-axis swipe is never
captured, so page scrolling on the perpendicular axis is unaffected.

### Styling hooks

| Attribute       | Host                    | When present                           |
| --------------- | ----------------------- | -------------------------------------- |
| `data-dragging` | `[forCarouselViewport]` | Present while a drag gesture is armed. |

### Inputs on `[forCarouselDrag]`

| Input      | Type      | Default | Description                                                                  |
| ---------- | --------- | ------- | ---------------------------------------------------------------------------- |
| `disabled` | `boolean` | `false` | Disable pointer drag without removing the directive. Removes `touch-action`. |

## Inputs

All inputs are on `[forCarousel]` unless noted.

| Input                                            | Type                           | Default                        | Description                                                                                                                        |
| ------------------------------------------------ | ------------------------------ | ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| `activeIndex`                                    | `model<number>`                | `0`                            | Two-way bindable current slide index.                                                                                              |
| `orientation`                                    | `'horizontal' \| 'vertical'`   | `'horizontal'`                 | Scroll axis.                                                                                                                       |
| `loop`                                           | `boolean`                      | `false`                        | Wrap-around at the boundaries.                                                                                                     |
| `align`                                          | `'start' \| 'center' \| 'end'` | `'start'`                      | Alignment of the active slide.                                                                                                     |
| `slidesPerView`                                  | `number`                       | `1`                            | Visible slides at once.                                                                                                            |
| `containScroll`                                  | `boolean`                      | `false`                        | Clamp the track offset so trailing slides sit flush at the viewport edge (no overscroll) when `slidesPerView > 1` and not looping. |
| `autoplay`                                       | `boolean`                      | `false`                        | Enable auto-rotation (suppressed by `prefers-reduced-motion: reduce`).                                                             |
| `autoplayInterval`                               | `number`                       | `5000`                         | Ms between automatic slide advances. `<= 0` disables the timer.                                                                    |
| `ariaLabel`                                      | `string \| null`               | `null`                         | Accessible label for the carousel root.                                                                                            |
| `dir`                                            | `'ltr' \| 'rtl' \| null`       | `null` (inherits)              | Writing direction.                                                                                                                 |
| `ariaLabel` (on `[forCarouselIndicators]`)       | `string \| null`               | `null`                         | Label for the picker group.                                                                                                        |
| `ariaLabel` (on `[forCarouselSlide]`)            | `string \| null`               | `null`                         | Override the positional "N of M" label.                                                                                            |
| `disabled` (on `[forCarouselIndicator]`)         | `boolean`                      | `false`                        | Disable this indicator.                                                                                                            |
| `startLabel` (on `[forCarouselRotationControl]`) | `string`                       | `'Start automatic slide show'` | Accessible name while rotation is stopped.                                                                                         |
| `stopLabel` (on `[forCarouselRotationControl]`)  | `string`                       | `'Stop automatic slide show'`  | Accessible name while rotation is playing.                                                                                         |

### Contain scroll

With `slidesPerView > 1`, `align="start"`, and no `loop`, advancing to the last
slide overscrolls the track: the final page may show only one real slide followed
by empty space. Adding the `containScroll` attribute to `[forCarousel]` clamps
`--for-carousel-offset` so the last visible page always sits flush at the
viewport's trailing edge:

```html
<div forCarousel containScroll [slidesPerView]="3" ariaLabel="Featured products">…</div>
```

Every slide still has its own indicator; trailing indicators that would map to the
same clamped view simply share the same visual position. The clamp has no effect
when `loop` is enabled (the entire range is valid when wrapping) or when
`slidesPerView` is `1` (a single-view carousel never overscrolls).

## Localizing the default labels

Each slide's default `aria-label` is the positional `"N of M"` string, and each
indicator's is `"Go to slide N"`. Localize both centrally with
`provideForCarouselDefaults` instead of setting `ariaLabel` on every slide and
indicator:

```ts
providers: [
  provideForCarouselDefaults({
    slideLabel: (position, total) => `Diapositiva ${position} de ${total}`,
    indicatorLabel: (position) => `Ir a la diapositiva ${position}`,
  }),
];
```

`position` is the 1-based slide index and `total` is the slide count. Overrides
merge with the parent scope, so you can localize just the labels and inherit the
rest of the defaults. A per-element `ariaLabel` on `[forCarouselSlide]` /
`[forCarouselIndicator]` still takes precedence over the localized default.

## Keyboard interaction (indicator group)

Keyboard navigation lives on the indicator group. Only the current
indicator is in the tab order. Arrow keys move focus and activate the target slide
automatically.

| Key                        | Action                                                                |
| -------------------------- | --------------------------------------------------------------------- |
| `ArrowRight` / `ArrowLeft` | Next / previous indicator (horizontal). In RTL, direction is swapped. |
| `ArrowDown` / `ArrowUp`    | Next / previous indicator (vertical orientation).                     |
| `Home`                     | First indicator and slide.                                            |
| `End`                      | Last indicator and slide.                                             |
| `Enter` / `Space`          | Activate the focused indicator (via native button).                   |

## Accessibility notes

- The root carries `role="group"` and `aria-roledescription="carousel"`. The `ariaLabel` input
  should describe the carousel's purpose without using the word "carousel" (APG guidance).
- Each slide carries `role="group"`, `aria-roledescription="slide"`, and
  `aria-label="N of M"` by default. Override per slide with the `ariaLabel` input,
  or localize the default format app-wide with `provideForCarouselDefaults` (see
  [Localizing the default labels](#localizing-the-default-labels)).
- Off-view slides receive `aria-hidden="true"` and `inert` to remove them from the
  accessibility tree and focus order.
- The indicator group should be labelled (e.g. `ariaLabel="Choose slide to display"`).
- The current indicator is marked with `aria-current="true"`.
- Prev/next buttons use native `disabled` so they are removed from the tab order when
  at the boundary without loop.
- The viewport carries `aria-live` and `aria-atomic="false"`. While the carousel is actively
  auto-rotating, `aria-live` is `"off"` so advancing slides do not bombard the screen reader.
  When stopped or paused, it is `"polite"` so manual navigation announces. The per-slide
  `aria-roledescription`, `aria-label`, and `aria-hidden` toggle carry the screen-reader
  experience for non-auto-rotating carousels.

## Reduced-motion

The directive performs no animation itself. Add the following CSS to disable the transition
for users who prefer reduced motion:

```css
@media (prefers-reduced-motion: reduce) {
  [forCarouselTrack] {
    transition: none;
  }
}
```

## RTL support

Arrow-key direction (ArrowLeft/ArrowRight) is automatically swapped in RTL — handled by
`resolveListNavigation` and the reflected `dir` attribute. The **visual** track direction
in RTL is the consumer's CSS concern. For example, to flip the translate sign in RTL:

```css
[dir='rtl'] [forCarouselTrack] {
  transform: translateX(calc(-1 * var(--for-carousel-offset)));
}
```

The example CSS above is LTR-only by default.

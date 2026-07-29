# ForCarousel

A slideshow of content panels with previous / next controls, an indicator group, optional looping and multi-slide views, and an accessible autoplay mode with a pause control.

Headless and styleless: it ships slide tracking, keyboard navigation, focus management, and ARIA; you supply the markup and CSS.

## Anatomy

```html
<div forCarousel [(activeIndex)]="index" loop ariaLabel="Featured products">
  <button forCarouselPrevious aria-label="Previous slide">‹</button>

  <div forCarouselViewport>
    <div forCarouselTrack>
      <!-- one [forCarouselSlide] per item -->
      <div forCarouselSlide>Slide content</div>
    </div>
  </div>

  <button forCarouselNext aria-label="Next slide">›</button>

  <div forCarouselIndicators ariaLabel="Choose slide to display">
    <!-- one [forCarouselIndicator] per slide, same order -->
    <button forCarouselIndicator></button>
  </div>
</div>
```

## Examples

### Basic carousel

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

### Indicators map 1:1 to slides

The picker assumes **one `[forCarouselIndicator]` per `[forCarouselSlide]`**: the
indicator at DOM index `i` targets slide `i`. Iterate the same collection that
drives the slides (as above) so the counts always match. A mismatched count
desynchronizes the active-indicator state and is dev-guarded by a `console.warn`
in development builds. Grouped or summarized indicators (fewer dots than slides)
are not supported.

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

Both defaults come from the scope's `rotationStartLabel` / `rotationStopLabel`
(see [Localizing the default labels](#localizing-the-default-labels)); set either
input to `null` when the button carries a visible text label and you don't want
an `aria-label` overriding it.

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

The directive publishes the live displacement as `--for-carousel-swipe-movement-x`
(horizontal carousels) or `--for-carousel-swipe-movement-y` (vertical), a raw px
value on the viewport host; only the primary-axis property is written. Compose it
with `--for-carousel-offset` on the track transform:

```css
[forCarouselTrack] {
  transform: translateX(
    calc(var(--for-carousel-offset) + var(--for-carousel-swipe-movement-x, 0px))
  );
  transition: transform 300ms ease;
}
[forCarousel][data-orientation='vertical'] [forCarouselTrack] {
  transform: translateY(
    calc(var(--for-carousel-offset) + var(--for-carousel-swipe-movement-y, 0px))
  );
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

`--for-carousel-swipe-movement-x` is always the **physical** finger displacement,
so compose it **without** the `-1` factor the consumer may apply to
`--for-carousel-offset` in RTL:

```css
[dir='rtl'] [forCarouselTrack] {
  transform: translateX(
    calc(-1 * var(--for-carousel-offset) + var(--for-carousel-swipe-movement-x, 0px))
  );
}
```

### Reduced motion

Under `prefers-reduced-motion: reduce` the directive does **not** publish
`--for-carousel-swipe-movement-x` / `-y` (no live track motion). The gesture still snaps
`activeIndex` on release — only the continuous live offset is suppressed.

### Cross-axis / touch

`touch-action` is set automatically on the viewport host — `pan-y` for
horizontal carousels (allows vertical page scroll) and `pan-x` for vertical
carousels (allows horizontal page scroll). A mostly-cross-axis swipe is never
captured, so page scrolling on the perpendicular axis is unaffected.

## Localizing the default labels

Each slide's default `aria-label` is the positional `"N of M"` string, each
indicator's is `"Go to slide N"`, and the rotation control's swaps between
`"Start automatic slide show"` and `"Stop automatic slide show"`. Localize them
all centrally with `provideForCarouselDefaults` instead of setting `ariaLabel` on
every slide and indicator:

```ts
providers: [
  provideForCarouselDefaults({
    slideLabel: (position, total) => `Diapositiva ${position} de ${total}`,
    indicatorLabel: (position) => `Ir a la diapositiva ${position}`,
    rotationStartLabel: 'Iniciar la presentación',
    rotationStopLabel: 'Detener la presentación',
  }),
];
```

`position` is the 1-based slide index and `total` is the slide count. Overrides
merge with the parent scope, so you can localize just the labels and inherit the
rest of the defaults. A per-element `ariaLabel` on `[forCarouselSlide]` /
`[forCarouselIndicator]` still takes precedence over the localized default, as do
`[startLabel]` / `[stopLabel]` on `[forCarouselRotationControl]`.

## API

### `ForCarousel`

All inputs are on `[forCarousel]` unless noted.

| Property                                         | Type                           | Description                                                                                                                                                |
| ------------------------------------------------ | ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `activeIndex`                                    | `model<number>`                | Two-way bindable current slide index.<br>**Default:** `0`                                                                                                  |
| `orientation`                                    | `'horizontal' \| 'vertical'`   | Scroll axis.<br>**Default:** `'horizontal'`                                                                                                                |
| `loop`                                           | `boolean`                      | Wrap-around at the boundaries.<br>**Default:** `false`                                                                                                     |
| `align`                                          | `'start' \| 'center' \| 'end'` | Alignment of the active slide.<br>**Default:** `'start'`                                                                                                   |
| `slidesPerView`                                  | `number`                       | Visible slides at once.<br>**Default:** `1`                                                                                                                |
| `containScroll`                                  | `boolean`                      | Clamp the track offset so trailing slides sit flush at the viewport edge (no overscroll) when `slidesPerView > 1` and not looping.<br>**Default:** `false` |
| `autoplay`                                       | `boolean`                      | Enable auto-rotation (suppressed by `prefers-reduced-motion: reduce`).<br>**Default:** `false`                                                             |
| `autoplayInterval`                               | `number`                       | Ms between automatic slide advances. `<= 0` disables the timer.<br>**Default:** `5000`                                                                     |
| `ariaLabel`                                      | `string \| null`               | Accessible label for the carousel root.<br>**Default:** `null`                                                                                             |
| `dir`                                            | `'ltr' \| 'rtl' \| null`       | Writing direction.<br>**Default:** `null` (inherits)                                                                                                       |
| `ariaLabel` (on `[forCarouselIndicators]`)       | `string \| null`               | Label for the picker group.<br>**Default:** `null`                                                                                                         |
| `ariaLabel` (on `[forCarouselSlide]`)            | `string \| null`               | Override the positional "N of M" label.<br>**Default:** `null`                                                                                             |
| `disabled` (on `[forCarouselIndicator]`)         | `boolean`                      | Disable this indicator.<br>**Default:** `false`                                                                                                            |
| `startLabel` (on `[forCarouselRotationControl]`) | `string \| null`               | Accessible name while rotation is stopped.<br>**Default:** scope `rotationStartLabel` (`'Start automatic slide show'`)                                     |
| `stopLabel` (on `[forCarouselRotationControl]`)  | `string \| null`               | Accessible name while rotation is playing.<br>**Default:** scope `rotationStopLabel` (`'Stop automatic slide show'`)                                       |

Reflected on the `[forCarousel]` host:

| Data attribute     | Values                            |
| ------------------ | --------------------------------- |
| `data-orientation` | `horizontal` \| `vertical`        |
| `data-align`       | `start` \| `center` \| `end`      |
| `data-autoplay`    | present when `autoplay` is `true` |
| `data-rotating`    | present while actively rotating   |

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

### `ForCarouselDrag` inputs

| Property   | Type      | Description                                                                                          |
| ---------- | --------- | ---------------------------------------------------------------------------------------------------- |
| `disabled` | `boolean` | Disable pointer drag without removing the directive. Removes `touch-action`.<br>**Default:** `false` |

Reflected on the `[forCarouselViewport]` host this directive is applied to:

| Data attribute  | Values                                |
| --------------- | ------------------------------------- |
| `data-dragging` | present while a drag gesture is armed |

## Keyboard

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

## Accessibility

Implements the [WAI-ARIA Carousel pattern](https://www.w3.org/WAI/ARIA/apg/patterns/carousel/).

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
- Prev/next buttons never use the native `disabled` attribute. At a boundary without `loop`
  they reflect `aria-disabled="true"` + `data-disabled` and ignore activation, so a keyboard
  user who reaches the last slide keeps focus on the button instead of being dropped to
  `<body>`. Style the boundary state off `[data-disabled]`, never `:disabled`.
- The viewport carries `aria-live` and `aria-atomic="false"`. While the carousel is actively
  auto-rotating, `aria-live` is `"off"` so advancing slides do not bombard the screen reader.
  When stopped or paused, it is `"polite"` so manual navigation announces. The per-slide
  `aria-roledescription`, `aria-label`, and `aria-hidden` toggle carry the screen-reader
  experience for non-auto-rotating carousels.

## Styling

forty-cdk ships no styles. Add your own class to each piece — the `for*` selectors are the behavior API, not a styling contract (see [Styling forty-cdk](../../../docs/styling.md)). The directive publishes geometry as CSS custom properties on the root element so they cascade to the track. The consumer applies the transform and transition.

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

### CSS custom properties

The following properties are set on the `[forCarousel]` host and cascade to
children, unless noted otherwise:

| Property                          | Host                    | Value         | Notes                                                                                                                                                                                            |
| --------------------------------- | ----------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `--for-carousel-offset`           | `[forCarousel]`         | e.g. `-100%`  | Pure arithmetic from `activeIndex`, `slidesPerView`, `align`.                                                                                                                                    |
| `--for-carousel-active-index`     | `[forCarousel]`         | integer       | Current `activeIndex`.                                                                                                                                                                           |
| `--for-carousel-slide-count`      | `[forCarousel]`         | integer       | Total registered slides.                                                                                                                                                                         |
| `--for-carousel-slides-per-view`  | `[forCarousel]`         | integer       | From the `slidesPerView` input.                                                                                                                                                                  |
| `--for-carousel-viewport-width`   | `[forCarousel]`         | e.g. `640px`  | Measured via `ResizeObserver`. Absent on the server and before first measurement.                                                                                                                |
| `--for-carousel-viewport-height`  | `[forCarousel]`         | e.g. `400px`  | Same as above, for the block axis.                                                                                                                                                               |
| `--for-carousel-swipe-movement-x` | `[forCarouselViewport]` | e.g. `-128px` | Live px displacement along the primary axis during a swipe. Only the axis matching `orientation` is written; the other is absent, as is both at rest and under `prefers-reduced-motion: reduce`. |
| `--for-carousel-swipe-movement-y` | `[forCarouselViewport]` | e.g. `-128px` | Live px displacement along the primary axis during a swipe. Only the axis matching `orientation` is written; the other is absent, as is both at rest and under `prefers-reduced-motion: reduce`. |

### Autoplay styling hooks

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

### Boundary styling hooks

| Attribute       | When present                                              |
| --------------- | --------------------------------------------------------- |
| `data-disabled` | On `[forCarouselPrevious]` — at index 0 without `loop`    |
| `data-disabled` | On `[forCarouselNext]` — at the last index without `loop` |

### Drag styling hooks

| Attribute       | Host                    | When present                           |
| --------------- | ----------------------- | -------------------------------------- |
| `data-dragging` | `[forCarouselViewport]` | Present while a drag gesture is armed. |

### Reduced-motion

The directive performs no animation itself. Add the following CSS to disable the transition
for users who prefer reduced motion:

```css
@media (prefers-reduced-motion: reduce) {
  [forCarouselTrack] {
    transition: none;
  }
}
```

### RTL support

Arrow-key direction (ArrowLeft/ArrowRight) is automatically swapped in RTL — handled by
`resolveListNavigation` and the reflected `dir` attribute. The **visual** track direction
in RTL is the consumer's CSS concern. For example, to flip the translate sign in RTL:

```css
[dir='rtl'] [forCarouselTrack] {
  transform: translateX(calc(-1 * var(--for-carousel-offset)));
}
```

The example CSS above is LTR-only by default.

## Wrapping in a design system

Subclassing the root is the supported pattern; the subclass must spread `provideForCarousel(MyRoot)` into its own `providers` because Angular does not inherit a directive's `providers`, and every projected piece resolves its context through it. Re-providing `FOR_CAROUSEL_CONTEXT` by hand is not enough: the root also provides an unexported registration token the wrapper cannot name. See [Wrapping non-form roots](../../../docs/wrapping-non-form-roots.md).

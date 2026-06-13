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
children:

| Property                         | Value        | Notes                                                                             |
| -------------------------------- | ------------ | --------------------------------------------------------------------------------- |
| `--for-carousel-offset`          | e.g. `-100%` | Pure arithmetic from `activeIndex`, `slidesPerView`, `align`.                     |
| `--for-carousel-active-index`    | integer      | Current `activeIndex`.                                                            |
| `--for-carousel-slide-count`     | integer      | Total registered slides.                                                          |
| `--for-carousel-slides-per-view` | integer      | From the `slidesPerView` input.                                                   |
| `--for-carousel-viewport-width`  | e.g. `640px` | Measured via `ResizeObserver`. Absent on the server and before first measurement. |
| `--for-carousel-viewport-height` | e.g. `400px` | Same as above, for the block axis.                                                |

## Inputs

All inputs are on `[forCarousel]` unless noted.

| Input                                      | Type                           | Default           | Description                             |
| ------------------------------------------ | ------------------------------ | ----------------- | --------------------------------------- |
| `activeIndex`                              | `model<number>`                | `0`               | Two-way bindable current slide index.   |
| `orientation`                              | `'horizontal' \| 'vertical'`   | `'horizontal'`    | Scroll axis.                            |
| `loop`                                     | `boolean`                      | `false`           | Wrap-around at the boundaries.          |
| `align`                                    | `'start' \| 'center' \| 'end'` | `'start'`         | Alignment of the active slide.          |
| `slidesPerView`                            | `number`                       | `1`               | Visible slides at once.                 |
| `ariaLabel`                                | `string \| null`               | `null`            | Accessible label for the carousel root. |
| `dir`                                      | `'ltr' \| 'rtl' \| null`       | `null` (inherits) | Writing direction.                      |
| `ariaLabel` (on `[forCarouselIndicators]`) | `string \| null`               | `null`            | Label for the picker group.             |
| `ariaLabel` (on `[forCarouselSlide]`)      | `string \| null`               | `null`            | Override the positional "N of M" label. |
| `disabled` (on `[forCarouselIndicator]`)   | `boolean`                      | `false`           | Disable this indicator.                 |

## Keyboard interaction (indicator group)

Keyboard navigation lives on the indicator group (Ark-UI style). Only the current
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
  `aria-label="N of M"` by default. Override with the `ariaLabel` input.
- Off-view slides receive `aria-hidden="true"` and `inert` to remove them from the
  accessibility tree and focus order.
- The indicator group should be labelled (e.g. `ariaLabel="Choose slide to display"`).
- The current indicator is marked with `aria-current="true"`.
- Prev/next buttons use native `disabled` so they are removed from the tab order when
  at the boundary without loop.
- The viewport carries `aria-live="polite"` and `aria-atomic="false"` as the APG-prescribed
  live region. Note: because all slides stay mounted and only the track is translated,
  the DOM text does not change on navigation, so `aria-live` may not announce on its own in
  v1. The per-slide `aria-roledescription`, `aria-label`, and `aria-hidden` toggle carry the
  screen-reader experience. The `aria-live` attribute is the APG-prescribed slot and becomes
  load-bearing in the autoplay follow-up.

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

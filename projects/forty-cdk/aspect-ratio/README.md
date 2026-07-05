# AspectRatio

A container that keeps its content at a fixed width-to-height ratio.

Pure visual utility — it locks an element's box via the native CSS `aspect-ratio` property, with no ARIA semantics. Reach for it to reserve space for media before it loads (preventing layout shift), keep cards on a grid uniform, or wrap responsive iframes.

## Why this exists

A fixed, never-changing ratio is one line of CSS — you don't need this primitive for that:

```css
.card-cover {
  aspect-ratio: 16 / 9;
}
```

`[forAspectRatio]` earns its place when the ratio is **dynamic or must be validated**. It is more than the static declaration:

- **Reactive `ratio` input.** Bind `[ratio]="ratio()"` and the host style recomputes as the value changes — no manual style writes.
- **Invalid-value guarding.** `0`, negative, and non-finite ratios fall back to `1`, so a bad computed value never emits invalid CSS.
- **SSR-safe.** The `aspect-ratio` style is bound declaratively (never touched imperatively), so it renders identically on the server and hydrates cleanly.
- **Consistent headless API.** Same shape as the other primitives, so it composes the same way.

If your ratio is a literal constant, prefer the CSS property directly and keep the bundle leaner. Import `[forAspectRatio]` when reactivity or validation buys you something.

## Anatomy

```html
<div forAspectRatio [ratio]="16 / 9">
  <!-- your content fills the box -->
</div>
```

## Examples

```ts
import { Component } from '@angular/core';
import { ForAspectRatio } from 'forty-cdk/aspect-ratio';

@Component({
  selector: 'demo-aspect-ratio',
  imports: [ForAspectRatio],
  template: `
    <div forAspectRatio [ratio]="16 / 9" class="card-cover">
      <img src="cover.jpg" alt="" />
    </div>

    <div forAspectRatio ratio="1" class="avatar">
      <img src="me.jpg" alt="Me" />
    </div>

    <div forAspectRatio [ratio]="21 / 9" class="hero">
      <video src="hero.mp4" autoplay loop muted></video>
    </div>
  `,
  styles: [
    `
      .card-cover,
      .avatar,
      .hero {
        width: 100%;
      }
      .card-cover img,
      .avatar img,
      .hero video {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
    `,
  ],
})
export class DemoAspectRatio {}
```

## API

### `ForAspectRatio`

| Property | Type            | Description                                                                                                                                                                         |
| -------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ratio`  | `input<number>` | Width / height ratio (e.g. `16 / 9`, `4 / 3`, `1`). Accepts both numeric expressions and string attributes. Non-positive or non-finite values fall back to `1`.<br>**Default:** `1` |

| Data attribute     | Values  |
| ------------------ | ------- |
| `[forAspectRatio]` | present |

## Styling

forty-cdk ships no styles. Add your own class to each piece — the `for*` selectors are the behavior API, not a styling contract (see [Styling forty-cdk](../../../../../docs/styling.md)). This primitive is purely structural: its only host effect is the native `aspect-ratio` style, so it reflects no `data-*` attributes and writes no CSS custom properties. Style the host through your own class on `[forAspectRatio]`.

## Behavior notes

- **Browser support.** Native `aspect-ratio` is in Baseline 2021 (Chrome 88+, Firefox 89+, Safari 15+) — same target as Angular 20+, so no polyfill is needed.
- **Width still on you.** The directive only sets `aspect-ratio`; you decide width / max-width / display. The height is computed from the ratio.
- **Children fill the box.** Use `width: 100%; height: 100%; object-fit: cover` on inner media to fill without distortion. The directive imposes no styles on children.
- **No role, no a11y.** This is a layout utility. The element it sits on keeps whatever semantics you give it (`<div>`, `<figure>`, `<a>`, …).

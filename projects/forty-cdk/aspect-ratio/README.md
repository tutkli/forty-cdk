# AspectRatio

Pure visual utility — locks an element's box to a fixed `width / height` ratio via the native CSS `aspect-ratio` property.

No ARIA semantics. Use it to reserve space for media before it loads (preventing layout shift), to keep cards on a grid uniform, or to wrap responsive iframes.

## Pieces

| Class            | Selector           | Role                                                      |
| ---------------- | ------------------ | --------------------------------------------------------- |
| `ForAspectRatio` | `[forAspectRatio]` | Single attribute directive. Applies `style.aspect-ratio`. |

## Inputs

| API     | Type            | Description                                                                                                                                                                      |
| ------- | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ratio` | `input<number>` | Width / height ratio (e.g. `16 / 9`, `4 / 3`, `1`). Accepts both numeric expressions and string attributes. Defaults to `1`. Non-positive or non-finite values fall back to `1`. |

## Usage

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

## Notes

- **Browser support.** Native `aspect-ratio` is in Baseline 2021 (Chrome 88+, Firefox 89+, Safari 15+) — same target as Angular 20+, so no polyfill is needed.
- **Width still on you.** The directive only sets `aspect-ratio`; you decide width / max-width / display. The height is computed from the ratio.
- **Children fill the box.** Use `width: 100%; height: 100%; object-fit: cover` on inner media to fill without distortion. The directive imposes no styles on children.
- **No role, no a11y.** This is a layout utility. The element it sits on keeps whatever semantics you give it (`<div>`, `<figure>`, `<a>`, …).

## Styling

forty-cdk ships no styles. Add your own class to each piece — the `for*` selectors are the behavior API, not a styling contract (see [Styling forty-cdk](../../../../../docs/styling.md)). This primitive is purely structural: its only host effect is the native `aspect-ratio` style, so it reflects no `data-*` attributes and writes no CSS custom properties. Style the host through your own class on `[forAspectRatio]`.

### Data attributes

| Piece              | Attribute | Values |
| ------------------ | --------- | ------ |
| `[forAspectRatio]` | _(none)_  | —      |

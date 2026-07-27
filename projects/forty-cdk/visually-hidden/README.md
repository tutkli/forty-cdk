# VisuallyHidden

Hides its host visually while keeping it in the accessibility tree.

Screen readers reach the content; sighted users never see it. Reach for it when a control's only visible affordance is an icon, when a table needs a caption that the design has no room for, or when a live region must exist in the DOM without occupying layout.

## Why this exists

`display: none` and `visibility: hidden` also drop the element from the accessibility tree, so neither works for content meant for assistive tech. The correct technique is a clip rectangle, which is easy to get subtly wrong (a `width: 0` variant collapses text nodes; `text-indent: -9999px` breaks in RTL). `[forVisuallyHidden]` applies the well-tested declaration inline, so it works with no global stylesheet and no CSS import:

- **No stylesheet.** The clip is an inline style on the host, so it survives CSS-module scoping, shadow boundaries, and consumers with no global sheet.
- **Optional reveal on focus.** With `focusable`, the host un-clips while it (or a descendant) holds focus and re-clips on blur — the skip-link pattern.
- **SSR-safe.** The style is bound declaratively, so the server render matches and hydration is clean.

## Anatomy

```html
<span forVisuallyHidden>Delete invoice #4021</span>

<a forVisuallyHidden focusable href="#main">Skip to content</a>
```

## Examples

```ts
import { Component } from '@angular/core';
import { ForVisuallyHidden } from 'forty-cdk/visually-hidden';

@Component({
  selector: 'demo-visually-hidden',
  imports: [ForVisuallyHidden],
  template: `
    <a forVisuallyHidden focusable href="#main" class="skip-link">Skip to content</a>

    <button type="button">
      <svg aria-hidden="true" viewBox="0 0 16 16">…</svg>
      <span forVisuallyHidden>Delete invoice</span>
    </button>

    <p forVisuallyHidden>Sorted by due date, ascending.</p>
  `,
  styles: [
    `
      .skip-link:focus {
        position: static;
        padding: 0.5rem 1rem;
        background: canvas;
      }
    `,
  ],
})
export class DemoVisuallyHidden {}
```

Naming an icon-only button through a hidden `<span>` (rather than `aria-label`) keeps the name translatable by the same pipeline as the rest of your copy, and visible to text-only browsers.

## API

### `ForVisuallyHidden`

| Property    | Type             | Description                                                                                                                                                           |
| ----------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `focusable` | `input<boolean>` | When `true`, the host un-clips while it or a descendant holds focus, then re-clips on blur — the skip-link pattern. Accepts a bare attribute.<br>**Default:** `false` |

| Data attribute        | Values  |
| --------------------- | ------- |
| `[forVisuallyHidden]` | present |

## Styling

forty-cdk ships no styles. Add your own class to each piece — the `for*` selectors are the behavior API, not a styling contract (see [Styling forty-cdk](../../../../../docs/styling.md)). This primitive is the one exception to "no styles": it writes the clip rectangle as an inline style, because that is its entire purpose. With `focusable`, the inline style is dropped while focused, so your own `:focus` rules apply unopposed — style the revealed state through a class on the host.

## Behavior notes

- **Keep it in the flow.** The host stays in the DOM and in the accessibility tree, so it is announced in document order. Place it where you want it read, not at the end of the template.
- **Not a security boundary.** The content is in the DOM and readable by anyone inspecting the page. Never use it to hide sensitive data.
- **Focus tracking, not `:focus-within`.** `focusable` listens to `focusin` / `focusout` rather than relying on a CSS pseudo-class, because an inline style cannot express one. A `focusout` whose `relatedTarget` is still inside the host does not re-clip.
- **No role, no ARIA.** The element keeps whatever semantics you give it. Pair it with `aria-hidden="true"` on the decorative sibling (an icon, usually) so the name is not announced twice.

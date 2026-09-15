---
title: Avatar
group: primitives
archetype: [composable-ui]
---

# Avatar

A user image with a graceful fallback across its loading lifecycle.

Headless and presentational — it tracks the load lifecycle of an `<img>` and lets you choose what to show while loading or after an error. There is no WAI-ARIA pattern for avatars, so the directive imposes no `role` of its own.

## Anatomy

```html
<span forAvatar #avatar="forAvatar">
  <img forAvatarImage [src]="src" [alt]="name" />
  <!-- rendered only when avatar.shouldShowFallback() is true -->
  <span forAvatarFallback>{{ initials }}</span>
</span>
```

## Examples

Let the image load, then break its URL: `data-status` moves between `loading`, `loaded` and `error`, and the fallback only appears once the delay has passed without an image.

```ts
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ForAvatar, ForAvatarFallback, ForAvatarImage } from 'forty-cdk/avatar';

const AVATAR_SRC =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 72 72">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#6366f1" />
          <stop offset="1" stop-color="#ec4899" />
        </linearGradient>
      </defs>
      <rect width="72" height="72" fill="url(#g)" />
      <circle cx="36" cy="28" r="14" fill="#fff" opacity="0.92" />
      <path d="M14 64c0-12 9.8-20 22-20s22 8 22 20Z" fill="#fff" opacity="0.92" />
    </svg>`,
  );

@Component({
  selector: 'app-avatar-default-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForAvatar, ForAvatarImage, ForAvatarFallback],
  template: `
    <span forAvatar #avatar="forAvatar" class="avatar" [fallbackDelayMs]="500">
      <img forAvatarImage class="avatar-image" [src]="src" alt="Ada Lovelace" />
      @if (avatar.shouldShowFallback()) {
        <span forAvatarFallback class="avatar-fallback">AL</span>
      }
    </span>
  `,
})
export class AvatarDefaultExample {
  protected readonly src = AVATAR_SRC;
}
```

## API

### `ForAvatar`

| Property             | Type                      | Description                                                                                      |
| -------------------- | ------------------------- | ------------------------------------------------------------------------------------------------ |
| `fallbackDelayMs`    | `input<number>`           | ms to wait before `shouldShowFallback()` flips to `true` while idle/loading.<br>**Default:** `0` |
| `status`             | `Signal<ForAvatarStatus>` | Read-only current status.<br>**Default:** —                                                      |
| `shouldShowFallback` | `Signal<boolean>`         | `true` when the consumer should render the fallback. Drives `@if`.<br>**Default:** —             |

| Data attribute | Values                                     |
| -------------- | ------------------------------------------ |
| `data-status`  | `idle` \| `loading` \| `loaded` \| `error` |

### `ForAvatarImage`

| Property             | Type                      | Description                                                         |
| -------------------- | ------------------------- | ------------------------------------------------------------------- |
| `(loadStatusChange)` | `output<ForAvatarStatus>` | Output. Emits whenever the lifecycle transitions.<br>**Default:** — |

| Data attribute | Values                                     |
| -------------- | ------------------------------------------ |
| `data-status`  | `idle` \| `loading` \| `loaded` \| `error` |

### `ForAvatarFallback`

| Data attribute | Values                                     |
| -------------- | ------------------------------------------ |
| `data-status`  | `idle` \| `loading` \| `loaded` \| `error` |

## Accessibility

The directive does not impose a `role`. Pair the avatar with visible name text or `aria-label` on the surrounding element when identity matters. Set `alt=""` on the `<img>` for purely decorative avatars next to a name, or provide a meaningful `alt` description if the avatar stands alone.

## Styling

forty-cdk ships no styles. Add your own class to each piece — the `for*` selectors are the behavior API, not a styling contract (see [Styling forty-cdk](../../../docs/styling.md)). Key your CSS off the reflected `data-*` attributes listed per piece in the [API](#api) section.

```css
.avatar-image:not([data-status='loaded']) {
  display: none;
}
.avatar-fallback[data-status='error'] {
  color: #b00020;
}
```

## Behavior notes

- **Cached images are detected on first render.** If the browser already has the image cached, `load`/`error` may not fire — the directive checks `<img>.complete` and `naturalWidth` after the first render and reports `loaded` / `error` accordingly. A cached image that is `complete` but has zero intrinsic width (e.g. an SVG without explicit dimensions) is ambiguous, so the directive stays `loading` and confirms validity with `img.decode()` rather than pessimistically flagging `error`.
- **Multiple images per avatar are not supported.** Each `[forAvatar]` expects exactly one `[forAvatarImage]`. If you need cascading sources (CDN → fallback URL → fallback content), swap `src` on a single image.
- **`alt` is consumer territory.** Because `<img>` is the host element, the consumer keeps full control of `alt` — set `""` for purely decorative avatars next to a name, or describe the person if the avatar stands alone.
- **The image stays in the DOM.** Hide it via CSS `[data-status="loading"], [data-status="error"] { display: none }` if your consumer-side styling needs it gone. The fallback uses `@if`, so it only mounts when needed.

## Wrapping in a design system

Subclassing the root is the supported pattern; the subclass must re-provide `FOR_AVATAR_CONTEXT` because Angular does not inherit a directive's `providers`, and every projected piece resolves its context through it. See [Wrapping non-form roots](../../../docs/wrapping-non-form-roots.md).

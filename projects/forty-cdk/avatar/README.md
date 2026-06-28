# Avatar

Headless avatar that tracks the load lifecycle of an `<img>` and lets the consumer choose what to show during loading or after an error.

There is no WAI-ARIA pattern for "avatar" — it is a presentational composition. The directive does not impose a `role`; pair the avatar with visible name text or `aria-label` on the surrounding element when identity matters.

## Anatomy

| Class               | Selector              | Role                                                                   |
| ------------------- | --------------------- | ---------------------------------------------------------------------- |
| `ForAvatar`         | `[forAvatar]`         | Root. Owns `status`, `shouldShowFallback`, and `fallbackDelayMs`.      |
| `ForAvatarImage`    | `img[forAvatarImage]` | Observes the `<img>` and reports `idle \| loading \| loaded \| error`. |
| `ForAvatarFallback` | `[forAvatarFallback]` | Marker for fallback content. Reflects `data-status`.                   |

## Examples

```ts
import { Component, signal } from '@angular/core';
import { ForAvatar, ForAvatarFallback, ForAvatarImage } from 'forty-cdk/avatar';

@Component({
  selector: 'demo-avatar',
  imports: [ForAvatar, ForAvatarImage, ForAvatarFallback],
  template: `
    <span forAvatar #a="forAvatar" class="avatar" fallbackDelayMs="500">
      <img forAvatarImage class="avatar-image" [src]="user.avatarUrl" [alt]="user.name" />
      @if (a.shouldShowFallback()) {
        <span forAvatarFallback class="avatar-fallback">{{ initials() }}</span>
      }
    </span>
  `,
  styles: [
    `
      .avatar {
        display: inline-flex;
        width: 40px;
        height: 40px;
        border-radius: 999px;
        overflow: hidden;
        background: #eee;
        font: 600 14px/40px system-ui;
        align-items: center;
        justify-content: center;
      }
      .avatar-image {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .avatar-image[data-status='loading'],
      .avatar-image[data-status='error'] {
        display: none;
      }
    `,
  ],
})
export class DemoAvatar {
  readonly user = { name: 'Ada Lovelace', avatarUrl: '/api/avatar/ada.jpg' };
  readonly initials = signal('AL');
}
```

## API

### `ForAvatar`

| API                  | Type                      | Default | Description                                                                               |
| -------------------- | ------------------------- | ------- | ----------------------------------------------------------------------------------------- |
| `fallbackDelayMs`    | `input<number>`           | `0`     | ms to wait before `shouldShowFallback()` flips to `true` while idle/loading. Default `0`. |
| `status`             | `Signal<ForAvatarStatus>` | —       | Read-only current status.                                                                 |
| `shouldShowFallback` | `Signal<boolean>`         | —       | `true` when the consumer should render the fallback. Drives `@if`.                        |

### `ForAvatarImage`

| API                   | Type                      | Default | Description                                       |
| --------------------- | ------------------------- | ------- | ------------------------------------------------- |
| `(loadStatusChanged)` | `output<ForAvatarStatus>` | —       | Output. Emits whenever the lifecycle transitions. |

### Data attributes

| Piece                 | Attribute     | Values                                     |
| --------------------- | ------------- | ------------------------------------------ |
| `[forAvatar]`         | `data-status` | `idle` \| `loading` \| `loaded` \| `error` |
| `img[forAvatarImage]` | `data-status` | `idle` \| `loading` \| `loaded` \| `error` |
| `[forAvatarFallback]` | `data-status` | `idle` \| `loading` \| `loaded` \| `error` |

## Accessibility

The directive does not impose a `role`. Pair the avatar with visible name text or `aria-label` on the surrounding element when identity matters. Set `alt=""` on the `<img>` for purely decorative avatars next to a name, or provide a meaningful `alt` description if the avatar stands alone.

## Styling

forty-cdk ships no styles. Add your own class to each piece — the `for*` selectors are the behavior API, not a styling contract (see [Styling forty-cdk](../../../../../docs/styling.md)). Key your CSS off the reflected `data-*` attributes listed under [Data attributes](#data-attributes).

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

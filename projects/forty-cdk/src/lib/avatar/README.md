# Avatar

Headless avatar that tracks the load lifecycle of an `<img>` and lets the consumer choose what to show during loading or after an error.

There is no WAI-ARIA pattern for "avatar" — it is a presentational composition. The directive does not impose a `role`; pair the avatar with visible name text or `aria-label` on the surrounding element when identity matters.

## Pieces

| Class               | Selector              | Role                                                                   |
| ------------------- | --------------------- | ---------------------------------------------------------------------- |
| `ForAvatar`         | `[forAvatar]`         | Root. Owns `status`, `shouldShowFallback`, and `fallbackDelayMs`.      |
| `ForAvatarImage`    | `img[forAvatarImage]` | Observes the `<img>` and reports `idle \| loading \| loaded \| error`. |
| `ForAvatarFallback` | `[forAvatarFallback]` | Marker for fallback content. Reflects `data-status`.                   |

## Inputs / outputs / models

| API                       | Type                      | Owner            | Description                                                                               |
| ------------------------- | ------------------------- | ---------------- | ----------------------------------------------------------------------------------------- |
| `fallbackDelayMs`         | `input<number>`           | `ForAvatar`      | ms to wait before `shouldShowFallback()` flips to `true` while idle/loading. Default `0`. |
| `status`                  | `Signal<ForAvatarStatus>` | `ForAvatar`      | Read-only current status.                                                                 |
| `shouldShowFallback`      | `Signal<boolean>`         | `ForAvatar`      | `true` when the consumer should render the fallback. Drives `@if`.                        |
| `(onLoadingStatusChange)` | `output<ForAvatarStatus>` | `ForAvatarImage` | Emits whenever the lifecycle transitions.                                                 |

The host element of every piece carries `data-status="idle" \| "loading" \| "loaded" \| "error"`.

## Usage

```ts
import { Component, signal } from '@angular/core';
import { ForAvatar, ForAvatarImage, ForAvatarFallback } from 'forty-cdk';

@Component({
  selector: 'demo-avatar',
  imports: [ForAvatar, ForAvatarImage, ForAvatarFallback],
  template: `
    <span forAvatar #a="forAvatar" fallbackDelayMs="500">
      <img forAvatarImage [src]="user.avatarUrl" [alt]="user.name" />
      @if (a.shouldShowFallback()) {
        <span forAvatarFallback>{{ initials() }}</span>
      }
    </span>
  `,
  styles: [
    `
      [forAvatar] {
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
      [forAvatarImage] {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      [forAvatarImage][data-status='loading'],
      [forAvatarImage][data-status='error'] {
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

## Notes

- **Cached images are detected on first render.** If the browser already has the image cached, `load`/`error` may not fire — the directive checks `<img>.complete` and `naturalWidth` after the first render and reports `loaded` / `error` accordingly.
- **Multiple images per avatar are not supported.** Each `[forAvatar]` expects exactly one `[forAvatarImage]`. If you need cascading sources (CDN → fallback URL → fallback content), swap `src` on a single image.
- **`alt` is consumer territory.** Because `<img>` is the host element, the consumer keeps full control of `alt` — set `""` for purely decorative avatars next to a name, or describe the person if the avatar stands alone.
- **The image stays in the DOM.** Hide it via CSS `[data-status="loading"], [data-status="error"] { display: none }` if your consumer-side styling needs it gone. The fallback uses `@if`, so it only mounts when needed.

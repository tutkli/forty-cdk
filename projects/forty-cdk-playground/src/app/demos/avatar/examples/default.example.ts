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
  styles: `
    :host {
      display: contents;
    }

    .avatar {
      position: relative;
      display: inline-grid;
      place-items: center;
      width: 72px;
      height: 72px;
      border-radius: 50%;
      overflow: hidden;
      background: var(--pg-surface-2);
      box-shadow: var(--pg-shadow);
    }

    .avatar-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .avatar-image:not([data-status='loaded']) {
      display: none;
    }

    .avatar-fallback {
      display: grid;
      place-items: center;
      width: 100%;
      height: 100%;
      font-weight: 700;
      font-size: 1.3rem;
      color: #fff;
      background: linear-gradient(135deg, var(--pg-primary), #ec4899);
    }
  `,
})
export class AvatarDefaultExample {
  protected readonly src = AVATAR_SRC;
}

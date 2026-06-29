import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ForAvatar, ForAvatarFallback, ForAvatarImage } from 'forty-cdk/avatar';

@Component({
  selector: 'app-avatar-fallback-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForAvatar, ForAvatarImage, ForAvatarFallback],
  template: `
    <span forAvatar #avatar="forAvatar" class="avatar">
      <img forAvatarImage class="avatar-image" [src]="brokenSrc" alt="Grace Hopper" />
      @if (avatar.shouldShowFallback()) {
        <span forAvatarFallback class="avatar-fallback">GH</span>
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
      background: linear-gradient(135deg, #0ea5e9, #22c55e);
    }
  `,
})
export class AvatarFallbackExample {
  protected readonly brokenSrc = 'https://example.invalid/missing-avatar.png';
}

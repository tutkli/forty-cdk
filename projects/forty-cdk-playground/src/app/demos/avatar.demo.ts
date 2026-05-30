import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { ForAvatar, ForAvatarFallback, ForAvatarImage } from 'forty-cdk';

import { type ControlOption, ControlSelect } from '../ui/control-select';
import { DemoLayout } from '../ui/demo-layout';

type AvatarStatus = 'idle' | 'loading' | 'loaded' | 'error';

const LOADED_SRC =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='96' height='96'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0' stop-color='%234f46e5'/%3E%3Cstop offset='1' stop-color='%23ec4899'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='96' height='96' fill='url(%23g)'/%3E%3Ctext x='50%25' y='54%25' font-size='38' font-family='sans-serif' font-weight='700' fill='white' text-anchor='middle' dominant-baseline='middle'%3EAL%3C/text%3E%3C/svg%3E";

@Component({
  selector: 'app-avatar-demo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DemoLayout, ForAvatar, ForAvatarImage, ForAvatarFallback, ControlSelect],
  template: `
    <playground-demo
      title="Avatar"
      summary="An image with a graceful fallback. The directive tracks the four-step load lifecycle (idle → loading → loaded → error) on data-status; the fallback appears after an optional delay so a fast network never flashes initials."
    >
      <div demo class="av-demo">
        <div class="av-card">
          <span forAvatar #loaded="forAvatar" class="av" [fallbackDelayMs]="delay()">
            <img
              forAvatarImage
              class="av-img"
              [src]="loadedSrc"
              alt="Ada Lovelace"
              (loadStatusChanged)="loadedStatus.set($event)"
            />
            @if (loaded.shouldShowFallback()) {
              <span forAvatarFallback class="av-fallback">AL</span>
            }
          </span>
          <span class="av-status"><b>{{ loadedStatus() }}</b></span>
        </div>

        <div class="av-card">
          <span forAvatar #broken="forAvatar" class="av" [fallbackDelayMs]="delay()">
            <img
              forAvatarImage
              class="av-img"
              [src]="brokenSrc"
              alt="Grace Hopper"
              (loadStatusChanged)="brokenStatus.set($event)"
            />
            @if (broken.shouldShowFallback()) {
              <span forAvatarFallback class="av-fallback av-fallback--alt">GH</span>
            }
          </span>
          <span class="av-status"><b>{{ brokenStatus() }}</b></span>
        </div>

        <div class="av-card">
          <span forAvatar #empty="forAvatar" class="av">
            <img forAvatarImage class="av-img" alt="" (loadStatusChanged)="emptyStatus.set($event)" />
            @if (empty.shouldShowFallback()) {
              <span forAvatarFallback class="av-fallback av-fallback--muted">?</span>
            }
          </span>
          <span class="av-status"><b>{{ emptyStatus() }}</b></span>
        </div>
      </div>

      <div controls class="pg-controls">
        <app-control-select label="fallbackDelayMs" [options]="delayOptions" [(value)]="delayValue" />

        <p class="pg-hint">
          The first avatar loads an inline image, the second points at a broken URL, the third has no
          src at all.
        </p>
      </div>
    </playground-demo>
  `,
  styles: `
    .av-demo {
      display: flex;
      flex-wrap: wrap;
      gap: 2rem;
      justify-content: center;
    }

    .av-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.6rem;
    }

    .av {
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

    .av-img {
      display: none;
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .av-img[data-status='loaded'] {
      display: block;
    }

    .av-fallback {
      display: grid;
      place-items: center;
      width: 100%;
      height: 100%;
      font-weight: 700;
      font-size: 1.3rem;
      color: #fff;
      background: linear-gradient(135deg, var(--pg-primary), #ec4899);
    }

    .av-fallback--alt {
      background: linear-gradient(135deg, #0ea5e9, #22c55e);
    }

    .av-fallback--muted {
      color: var(--pg-text-muted);
      background: var(--pg-surface-2);
    }

    .av-status {
      font-family: var(--pg-font-mono);
      font-size: 0.74rem;
      color: var(--pg-text-muted);
    }

    .av-status b {
      color: var(--pg-text);
      font-weight: 600;
    }
  `,
})
export class AvatarDemo {
  protected readonly loadedSrc = LOADED_SRC;
  protected readonly brokenSrc = 'https://example.invalid/missing-avatar.png';

  protected readonly loadedStatus = signal<AvatarStatus>('idle');
  protected readonly brokenStatus = signal<AvatarStatus>('idle');
  protected readonly emptyStatus = signal<AvatarStatus>('idle');

  protected readonly delayOptions: readonly ControlOption[] = [
    { value: '0', label: '0 ms' },
    { value: '300', label: '300 ms' },
    { value: '600', label: '600 ms' },
  ];

  protected readonly delayValue = signal('0');
  protected readonly delay = computed<number>(() => Number(this.delayValue()));
}

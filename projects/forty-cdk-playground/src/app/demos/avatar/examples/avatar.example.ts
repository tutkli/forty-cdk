import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { ForAvatar, ForAvatarFallback, ForAvatarImage } from 'forty-cdk/avatar';

import { type ControlOption, ControlSelect } from '../../../ui/control-select';
import { DemoLayout } from '../../../ui/demo-layout';

type AvatarStatus = 'idle' | 'loading' | 'loaded' | 'error';

const LOADED_SRC = 'https://api.dicebear.com/10.x/glyphs/svg?seed=forty';
const BROKEN_SRC = 'https://example.invalid/missing-avatar.png';
const SIMULATED_LATENCY_MS = 1400;

@Component({
  selector: 'app-avatar-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DemoLayout, ForAvatar, ForAvatarImage, ForAvatarFallback, ControlSelect],
  template: `
    <playground-demo
      title="Image lifecycle"
      subtitle="An image with a graceful fallback. The directive tracks the four-step load lifecycle (idle → loading → loaded → error) on data-status; the fallback is held back for fallbackDelayMs so a fast load never flashes initials."
      sourcePath="projects/forty-cdk-playground/src/app/demos/avatar/examples/avatar.example.ts"
    >
      <div demo>
        @for (run of [cycle()]; track run) {
          <div class="av-demo">
            <div class="av-card">
              <span forAvatar #loaded="forAvatar" class="av" [fallbackDelayMs]="delay()">
                <img
                  forAvatarImage
                  class="av-img"
                  [attr.src]="loadedSrc() || null"
                  alt="forty glyph"
                  (loadStatusChanged)="loadedStatus.set($event)"
                />
                @if (loaded.shouldShowFallback()) {
                  <span forAvatarFallback class="av-fallback">F</span>
                }
              </span>
              <span class="av-status"
                >loads · <b>{{ loadedStatus() }}</b></span
              >
            </div>

            <div class="av-card">
              <span forAvatar #broken="forAvatar" class="av" [fallbackDelayMs]="delay()">
                <img
                  forAvatarImage
                  class="av-img"
                  [attr.src]="brokenSrc() || null"
                  alt="Grace Hopper"
                  (loadStatusChanged)="brokenStatus.set($event)"
                />
                @if (broken.shouldShowFallback()) {
                  <span forAvatarFallback class="av-fallback av-fallback--alt">GH</span>
                }
              </span>
              <span class="av-status"
                >fails · <b>{{ brokenStatus() }}</b></span
              >
            </div>

            <div class="av-card">
              <span forAvatar #empty="forAvatar" class="av" [fallbackDelayMs]="delay()">
                <img
                  forAvatarImage
                  class="av-img"
                  alt=""
                  (loadStatusChanged)="emptyStatus.set($event)"
                />
                @if (empty.shouldShowFallback()) {
                  <span forAvatarFallback class="av-fallback av-fallback--muted">?</span>
                }
              </span>
              <span class="av-status"
                >no src · <b>{{ emptyStatus() }}</b></span
              >
            </div>
          </div>
        }
      </div>

      <div controls class="pg-controls">
        <app-control-select
          label="fallbackDelayMs"
          hint="Milliseconds the fallback is held back during idle and loading, so a fast load never flashes initials. An error always shows its fallback immediately, ignoring this delay."
          [options]="delayOptions"
          [value]="delayValue()"
          (valueChange)="onDelayChange($event)"
        />
        <button type="button" class="pg-btn" (click)="reload()">Replay load</button>

        <p class="pg-hint">
          Changing the delay (or pressing Replay) restarts the load with a simulated
          {{ latencyMs }} ms latency. While the avatar has no image yet, the fallback is held back
          for fallbackDelayMs — raise it past the load time and the fallback never flashes. An error
          always shows its fallback at once, regardless of the delay.
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
export class AvatarExample {
  readonly #destroyRef = inject(DestroyRef);

  protected readonly latencyMs = SIMULATED_LATENCY_MS;

  protected readonly loadedStatus = signal<AvatarStatus>('idle');
  protected readonly brokenStatus = signal<AvatarStatus>('idle');
  protected readonly emptyStatus = signal<AvatarStatus>('idle');

  protected readonly loadedSrc = signal<string | null>(null);
  protected readonly brokenSrc = signal<string | null>(null);
  protected readonly cycle = signal(0);

  protected readonly delayOptions: readonly ControlOption[] = [
    { value: '0', label: '0 ms (flashes at once)' },
    { value: '600', label: '600 ms' },
    { value: '1000', label: '1000 ms' },
    { value: '2000', label: '2000 ms (outlasts load)' },
  ];

  protected readonly delayValue = signal('600');
  protected readonly delay = computed<number>(() => Number(this.delayValue()));

  #timer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.reload();
    this.#destroyRef.onDestroy(() => this.#clearTimer());
  }

  protected onDelayChange(value: string): void {
    this.delayValue.set(value);
    this.reload();
  }

  protected reload(): void {
    this.#clearTimer();
    this.loadedSrc.set(null);
    this.brokenSrc.set(null);
    this.cycle.update((n) => n + 1);
    this.#timer = setTimeout(() => {
      this.#timer = null;
      this.loadedSrc.set(LOADED_SRC);
      this.brokenSrc.set(BROKEN_SRC);
    }, SIMULATED_LATENCY_MS);
  }

  #clearTimer(): void {
    if (this.#timer !== null) {
      clearTimeout(this.#timer);
      this.#timer = null;
    }
  }
}

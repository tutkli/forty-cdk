import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ForSlider, ForSliderRange, ForSliderThumb, ForSliderTrack } from 'forty-cdk';

/**
 * Fixture for the pointer / drag math that Vitest can't cover (jsdom returns
 * zeros from `getBoundingClientRect()`). The track is given an explicit pixel
 * width/height so the browser produces a real laid-out rect; Playwright drives
 * mouse moves at known client coordinates and the consumer-visible signals
 * (last value, valueChange / valueCommit counters, touched flag) are mirrored
 * into `<output>` elements so specs can read them as plain text.
 *
 * Query params:
 *  - `?orientation=vertical` — switches to a vertical slider (and re-styles
 *    the track to a 200px-tall column so vertical clientY drags map cleanly).
 *  - `?dir=rtl` — sets `dir="rtl"` for the RTL pointer-mapping case.
 *  - `?initial=20,80` — comma-separated initial values (single thumb or N).
 *  - `?disabled=1` — applies `disabled` so pointer events are ignored.
 *  - `?min=N` — overrides the directive's default min (`0`).
 *  - `?max=N` — overrides the directive's default max (`100`).
 *  - `?step=N` — overrides the directive's default step (`1`). Used by the
 *    step-granularity / keyboard specs that need a coarser snap so an
 *    `ArrowRight` increments by `step` rather than `1`.
 */
@Component({
  selector: 'app-slider-fixture',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForSlider, ForSliderTrack, ForSliderRange, ForSliderThumb],
  styles: [
    `
      :host {
        display: block;
        padding: 24px;
      }
      [forSliderTrack] {
        display: block;
        position: relative;
        background: #ddd;
        border-radius: 4px;
      }
      [forSliderTrack][data-orientation='horizontal'] {
        width: 200px;
        height: 12px;
      }
      [forSliderTrack][data-orientation='vertical'] {
        width: 12px;
        height: 200px;
      }
      [forSliderRange] {
        position: absolute;
        background: #69c;
        border-radius: 4px;
      }
      [forSliderRange][data-orientation='horizontal'] {
        top: 0;
        bottom: 0;
        left: calc(var(--for-slider-range-start) * 100%);
        right: calc((1 - var(--for-slider-range-end)) * 100%);
      }
      [forSliderRange][data-orientation='vertical'] {
        left: 0;
        right: 0;
        bottom: calc(var(--for-slider-range-start) * 100%);
        top: calc((1 - var(--for-slider-range-end)) * 100%);
      }
      [forSliderThumb] {
        position: absolute;
        width: 20px;
        height: 20px;
        background: white;
        border: 2px solid #69c;
        border-radius: 50%;
        box-sizing: border-box;
      }
      [forSliderThumb][data-orientation='horizontal'] {
        top: 50%;
        left: calc(var(--for-slider-thumb-position) * 100%);
        transform: translate(-50%, -50%);
      }
      [forSliderThumb][data-orientation='vertical'] {
        left: 50%;
        bottom: calc(var(--for-slider-thumb-position) * 100%);
        transform: translate(-50%, 50%);
      }
    `,
  ],
  template: `
    <input id="before" placeholder="before-slider" />
    <div
      data-testid="root"
      forSlider
      [(value)]="value"
      [orientation]="orientation"
      [dir]="dir"
      [disabled]="disabled"
      [min]="min"
      [max]="max"
      [step]="step"
      (valueChange)="onValueChange($event)"
      (valueCommit)="onValueCommit($event)"
      (touchedChange)="onTouchedChange($event)"
    >
      <span data-testid="track" forSliderTrack>
        <span forSliderRange></span>
        @for (v of value(); let i = $index; track i) {
          <span
            forSliderThumb
            [index]="i"
            [label]="value().length > 1 ? (i === 0 ? 'Min' : 'Max') : 'Value'"
            [attr.data-testid]="'thumb-' + i"
          ></span>
        }
      </span>
    </div>
    <input id="after" placeholder="after-slider" />

    <output data-testid="last-value">{{ valueDisplay() }}</output>
    <output data-testid="value-change-count">{{ valueChangeCount() }}</output>
    <output data-testid="value-commit-count">{{ valueCommitCount() }}</output>
    <output data-testid="last-value-commit">{{ valueCommitDisplay() }}</output>
    <output data-testid="touched">{{ touched() }}</output>
  `,
})
export class SliderFixture {
  readonly #route = inject(ActivatedRoute);

  protected readonly orientation: 'horizontal' | 'vertical' =
    this.#route.snapshot.queryParamMap.get('orientation') === 'vertical'
      ? 'vertical'
      : 'horizontal';
  protected readonly dir: 'ltr' | 'rtl' =
    this.#route.snapshot.queryParamMap.get('dir') === 'rtl' ? 'rtl' : 'ltr';
  protected readonly disabled = this.#route.snapshot.queryParamMap.get('disabled') === '1';

  protected readonly min = parseFiniteNumber(this.#route.snapshot.queryParamMap.get('min')) ?? 0;
  protected readonly max = parseFiniteNumber(this.#route.snapshot.queryParamMap.get('max')) ?? 100;
  protected readonly step = parseFiniteNumber(this.#route.snapshot.queryParamMap.get('step')) ?? 1;

  protected readonly value = signal<readonly number[]>(
    parseInitial(this.#route.snapshot.queryParamMap.get('initial')) ?? [50],
  );
  protected readonly valueChangeCount = signal(0);
  protected readonly valueCommitCount = signal(0);
  protected readonly lastValueCommit = signal<readonly number[] | null>(null);
  protected readonly touched = signal(false);

  protected valueDisplay(): string {
    return this.value().join(',');
  }

  protected valueCommitDisplay(): string {
    const v = this.lastValueCommit();
    return v == null ? 'none' : v.join(',');
  }

  protected onValueChange(v: readonly number[]): void {
    this.value.set(v);
    this.valueChangeCount.update((n) => n + 1);
  }

  protected onValueCommit(v: readonly number[]): void {
    this.valueCommitCount.update((n) => n + 1);
    this.lastValueCommit.set(v);
  }

  protected onTouchedChange(t: boolean): void {
    this.touched.set(t);
  }
}

function parseInitial(raw: string | null): readonly number[] | null {
  if (!raw) return null;
  const parts = raw
    .split(',')
    .map((s) => Number.parseFloat(s.trim()))
    .filter((n) => Number.isFinite(n));
  return parts.length > 0 ? parts : null;
}

function parseFiniteNumber(raw: string | null): number | null {
  if (raw == null) return null;
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) ? n : null;
}

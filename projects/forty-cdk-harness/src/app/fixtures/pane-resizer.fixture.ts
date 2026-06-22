import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ForPaneResizer } from 'forty-cdk/pane-resizer';

/**
 * Fixture for `[forPaneResizer]`. The directive uses `setPointerCapture`, reads
 * `clientX` / `clientY` for drag deltas, and inverts the horizontal axis under
 * RTL — none of which jsdom can exercise (pane sizes are all zero and
 * `setPointerCapture` is a no-op).
 *
 * The fixture lays out two panes separated by a focusable resizer. The left
 * (or top, for horizontal orientation) pane's pixel size is bound to the
 * resizer's `[(value)]`, so dragging the resizer visibly resizes the pane.
 * The right (or bottom) pane uses `flex: 1` so its width is observable via
 * `getBoundingClientRect()` and tracks the inverse of the left pane.
 *
 * Query params:
 *  - `?orientation=vertical` — switch to a vertical separator (horizontal pane
 *    stack). The resize axis is horizontal → ArrowLeft / ArrowRight adjust it.
 *  - `?orientation=horizontal` — horizontal separator (vertical pane stack).
 *    The resize axis is vertical → ArrowUp / ArrowDown adjust it. Default is
 *    vertical (matches the most common split-pane layout).
 *  - `?dir=rtl` — sets `dir="rtl"` for the RTL pointer / arrow-key inversion.
 *  - `?leftMin=N` — lower bound for the value / left pane size. Default `100`.
 *  - `?leftMax=N` — upper bound for the value / left pane size. Default `400`.
 *  - `?initial=N` — starting value (and starting left-pane size). Default `200`.
 *  - `?step=N` — keyboard arrow step. Default `10`.
 *  - `?largeStep=N` — PageUp / PageDown step. Default `50`.
 */
@Component({
  selector: 'app-pane-resizer-fixture',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForPaneResizer],
  styles: [
    `
      :host {
        display: block;
        padding: 24px;
      }
      [data-testid='root'] {
        display: flex;
        border: 1px solid #ccc;
        background: #fafafa;
      }
      [data-testid='root'][data-orientation='vertical'] {
        flex-direction: row;
        width: 800px;
        height: 200px;
      }
      [data-testid='root'][data-orientation='horizontal'] {
        flex-direction: column;
        width: 200px;
        height: 800px;
      }
      [data-testid='left-pane'],
      [data-testid='right-pane'] {
        background: #eef;
        overflow: hidden;
      }
      [data-testid='right-pane'] {
        flex: 1 1 auto;
        background: #efe;
      }
      [data-testid='resizer'] {
        background: #69c;
      }
      [data-testid='resizer'][data-orientation='vertical'] {
        width: 8px;
        cursor: col-resize;
      }
      [data-testid='resizer'][data-orientation='horizontal'] {
        height: 8px;
        cursor: row-resize;
      }
      [data-testid='resizer']:focus-visible {
        outline: 2px solid currentColor;
        outline-offset: 1px;
      }
    `,
  ],
  template: `
    <input data-testid="before" placeholder="before-resizer" />
    <div
      data-testid="root"
      [attr.data-orientation]="orientation"
      [attr.dir]="dir === 'rtl' ? 'rtl' : null"
    >
      <div
        data-testid="left-pane"
        [style.width.px]="orientation === 'vertical' ? value() : null"
        [style.height.px]="orientation === 'horizontal' ? value() : null"
      ></div>
      <div
        data-testid="resizer"
        forPaneResizer
        [orientation]="orientation"
        [(value)]="value"
        [min]="leftMin"
        [max]="leftMax"
        [step]="step"
        [largeStep]="largeStep"
        [dir]="dir"
        (resizing)="onResize($event)"
        (resizeCommit)="onResizeCommit($event)"
      ></div>
      <div data-testid="right-pane"></div>
    </div>
    <input data-testid="after" placeholder="after-resizer" />

    <output data-testid="value">{{ value() }}</output>
    <output data-testid="resize-count">{{ resizeCount() }}</output>
    <output data-testid="resize-commit-count">{{ resizeCommitCount() }}</output>
    <output data-testid="last-resize-commit">{{ lastResizeCommitDisplay() }}</output>
  `,
})
export class PaneResizerFixture {
  readonly #route = inject(ActivatedRoute);

  protected readonly orientation: 'horizontal' | 'vertical' =
    this.#route.snapshot.queryParamMap.get('orientation') === 'horizontal'
      ? 'horizontal'
      : 'vertical';

  protected readonly dir: 'ltr' | 'rtl' =
    this.#route.snapshot.queryParamMap.get('dir') === 'rtl' ? 'rtl' : 'ltr';

  protected readonly leftMin = parseNumber(this.#route.snapshot.queryParamMap.get('leftMin'), 100);
  protected readonly leftMax = parseNumber(this.#route.snapshot.queryParamMap.get('leftMax'), 400);
  protected readonly step = parseNumber(this.#route.snapshot.queryParamMap.get('step'), 10);
  protected readonly largeStep = parseNumber(
    this.#route.snapshot.queryParamMap.get('largeStep'),
    50,
  );

  protected readonly value = signal(
    parseNumber(this.#route.snapshot.queryParamMap.get('initial'), 200),
  );
  protected readonly resizeCount = signal(0);
  protected readonly resizeCommitCount = signal(0);
  protected readonly lastResizeCommit = signal<number | null>(null);

  protected readonly lastResizeCommitDisplay = computed(() => {
    const v = this.lastResizeCommit();
    return v === null ? 'none' : String(v);
  });

  protected onResize(_v: number): void {
    // value is two-way bound via [(value)] so the signal is already updated;
    // we just observe the count.
    this.resizeCount.update((n) => n + 1);
  }

  protected onResizeCommit(v: number): void {
    this.resizeCommitCount.update((n) => n + 1);
    this.lastResizeCommit.set(v);
  }
}

function parseNumber(raw: string | null, fallback: number): number {
  if (!raw) return fallback;
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) ? n : fallback;
}

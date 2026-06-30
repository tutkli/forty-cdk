import { ChangeDetectionStrategy, Component } from '@angular/core';
import {
  ForScrollArea,
  ForScrollAreaContent,
  ForScrollAreaScrollbar,
  ForScrollAreaThumb,
  ForScrollAreaViewport,
} from 'forty-cdk/scroll-area';

@Component({
  selector: 'app-scroll-area-geometry-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ForScrollArea,
    ForScrollAreaViewport,
    ForScrollAreaContent,
    ForScrollAreaScrollbar,
    ForScrollAreaThumb,
  ],
  template: `
    <div class="ga-stage">
      <div forScrollArea #sa="forScrollArea" type="always" class="ga">
        <div forScrollAreaViewport class="ga-viewport">
          <div forScrollAreaContent class="ga-content">
            @for (row of rows; track row) {
              <p class="ga-row">
                <b>Row {{ row }}</b> — scroll me on either axis.
              </p>
            }
          </div>
        </div>
        <div forScrollAreaScrollbar orientation="vertical" class="ga-scrollbar ga-scrollbar--v">
          <div forScrollAreaThumb class="ga-thumb"></div>
        </div>
        <div forScrollAreaScrollbar orientation="horizontal" class="ga-scrollbar ga-scrollbar--h">
          <div forScrollAreaThumb class="ga-thumb"></div>
        </div>
      </div>

      <div class="ga-readout">
        <dl class="ga-stats">
          <dt>scrollTop</dt>
          <dd>{{ sa.scrollTop() }}</dd>
          <dt>scrollLeft</dt>
          <dd>{{ sa.scrollLeft() }}</dd>
          <dt>client</dt>
          <dd>{{ sa.clientWidth() }} × {{ sa.clientHeight() }}</dd>
          <dt>scroll</dt>
          <dd>{{ sa.scrollWidth() }} × {{ sa.scrollHeight() }}</dd>
          <dt>scrolling</dt>
          <dd>{{ sa.scrolling() }}</dd>
          <dt>hovering</dt>
          <dd>{{ sa.hovering() }}</dd>
        </dl>

        <div class="ga-meter" aria-hidden="true">
          <span class="ga-meter-fill" [style.width.%]="verticalPercent(sa)"></span>
        </div>
        <p class="ga-hint">scrolled {{ verticalPercent(sa) }}% down the vertical axis.</p>
      </div>
    </div>
  `,
  styles: `
    :host {
      display: contents;
    }

    .ga-stage {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-start;
      gap: 1.5rem;
    }

    .ga {
      position: relative;
      width: min(420px, 100%);
      height: 240px;
      background: var(--pg-surface);
      border: 1px solid var(--pg-border);
      border-radius: var(--pg-radius);
      overflow: hidden;
    }

    .ga-viewport {
      position: absolute;
      inset: 0;
    }

    .ga-content {
      width: 760px;
      padding: 1rem 1.1rem;
    }

    .ga-row {
      margin: 0 0 0.7rem;
      white-space: nowrap;
      color: var(--pg-text-muted);
    }

    .ga-scrollbar {
      position: absolute;
      background: var(--pg-surface-2);
      border-radius: 999px;
    }

    .ga-scrollbar--v {
      top: 0;
      inset-inline-end: 0;
      bottom: 11px;
      width: 11px;
    }

    .ga-scrollbar--h {
      left: 0;
      bottom: 0;
      inset-inline-end: 11px;
      height: 11px;
    }

    .ga-thumb {
      background: var(--pg-border-strong);
      border-radius: 999px;
      cursor: grab;
    }

    .ga-thumb[data-orientation='vertical'] {
      width: 7px;
      left: 2px;
    }

    .ga-thumb[data-orientation='horizontal'] {
      height: 7px;
      top: 2px;
    }

    .ga-readout {
      min-width: 200px;
      flex: 1;
    }

    .ga-stats {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 0.25rem 1rem;
      margin: 0 0 1rem;
      font-size: 0.85rem;
    }

    .ga-stats dt {
      color: var(--pg-text-muted);
    }

    .ga-stats dd {
      margin: 0;
      font-weight: 600;
      font-variant-numeric: tabular-nums;
      color: var(--pg-text);
    }

    .ga-meter {
      width: 100%;
      height: 8px;
      border-radius: 999px;
      background: var(--pg-surface-2);
      overflow: hidden;
    }

    .ga-meter-fill {
      display: block;
      height: 100%;
      border-radius: 999px;
      background: var(--pg-primary);
    }

    .ga-hint {
      margin: 0.5rem 0 0;
      font-size: 0.82rem;
      color: var(--pg-text-muted);
    }
  `,
})
export class ScrollAreaGeometryExample {
  protected readonly rows = Array.from({ length: 18 }, (_, index) => index + 1);

  protected verticalPercent(sa: ForScrollArea): number {
    const max = sa.scrollHeight() - sa.clientHeight();
    if (max <= 0) {
      return 0;
    }
    return Math.round((sa.scrollTop() / max) * 100);
  }
}

import { ChangeDetectionStrategy, Component } from '@angular/core';
import {
  ForScrollArea,
  ForScrollAreaContent,
  ForScrollAreaScrollbar,
  ForScrollAreaThumb,
  ForScrollAreaViewport,
} from 'forty-cdk';

import { DemoLayout } from '../../../ui/demo-layout';

@Component({
  selector: 'app-scroll-area-geometry-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DemoLayout,
    ForScrollArea,
    ForScrollAreaViewport,
    ForScrollAreaContent,
    ForScrollAreaScrollbar,
    ForScrollAreaThumb,
  ],
  template: `
    <playground-demo
      title="Geometry signals"
      subtitle="The root exposes its live scroll geometry as read-only signals via exportAs — scrollTop / scrollLeft, the client vs. scroll size on each axis, plus hovering and scrolling. Grab the reference with #sa='forScrollArea' and read them straight in the template; here they drive the panel and a scrolled-percentage bar without a single scroll listener of your own."
      sourcePath="projects/forty-cdk-playground/src/app/demos/scroll-area/examples/geometry.example.ts"
    >
      <div demo forScrollArea #sa="forScrollArea" type="always" class="ga">
        <div forScrollAreaViewport class="ga-viewport">
          <div forScrollAreaContent class="ga-content">
            @for (row of rows; track row) {
              <p class="ga-row"><b>Row {{ row }}</b> — scroll me on either axis.</p>
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

      <div controls class="pg-controls">
        <p class="pg-state">
          scrollTop: <b>{{ sa.scrollTop() }}</b
          ><br />
          scrollLeft: <b>{{ sa.scrollLeft() }}</b
          ><br />
          client: <b>{{ sa.clientWidth() }} × {{ sa.clientHeight() }}</b
          ><br />
          scroll: <b>{{ sa.scrollWidth() }} × {{ sa.scrollHeight() }}</b
          ><br />
          scrolling: <b>{{ sa.scrolling() }}</b
          ><br />
          hovering: <b>{{ sa.hovering() }}</b>
        </p>

        <div class="ga-meter" aria-hidden="true">
          <span class="ga-meter-fill" [style.width.%]="verticalPercent(sa)"></span>
        </div>
        <p class="pg-hint">scrolled {{ verticalPercent(sa) }}% down the vertical axis.</p>
      </div>
    </playground-demo>
  `,
  styles: `
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

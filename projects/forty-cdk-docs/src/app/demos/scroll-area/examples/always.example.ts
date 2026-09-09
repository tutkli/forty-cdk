import { ChangeDetectionStrategy, Component } from '@angular/core';
import {
  ForScrollArea,
  ForScrollAreaContent,
  ForScrollAreaCorner,
  ForScrollAreaScrollbar,
  ForScrollAreaThumb,
  ForScrollAreaViewport,
} from 'forty-cdk/scroll-area';

@Component({
  selector: 'app-scroll-area-always-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ForScrollArea,
    ForScrollAreaViewport,
    ForScrollAreaContent,
    ForScrollAreaScrollbar,
    ForScrollAreaThumb,
    ForScrollAreaCorner,
  ],
  template: `
    <div forScrollArea type="always" class="sa">
      <div forScrollAreaViewport class="sa-viewport">
        <div forScrollAreaContent class="sa-content">
          @for (row of rows; track row) {
            <p class="sa-row">
              <b>Row {{ row }}</b> — the track stays painted whether or not the axis overflows.
            </p>
          }
        </div>
      </div>
      <div forScrollAreaScrollbar orientation="vertical" class="sa-scrollbar sa-scrollbar--v">
        <div forScrollAreaThumb class="sa-thumb"></div>
      </div>
      <div forScrollAreaScrollbar orientation="horizontal" class="sa-scrollbar sa-scrollbar--h">
        <div forScrollAreaThumb class="sa-thumb"></div>
      </div>
      <div forScrollAreaCorner class="sa-corner"></div>
    </div>
  `,
  styles: `
    :host {
      display: contents;
    }

    .sa {
      display: grid;
      grid-template-columns: 1fr auto;
      grid-template-rows: 1fr auto;
      width: min(420px, 100%);
      height: 260px;
      background: var(--pg-surface);
      border: 1px solid var(--pg-border);
      border-radius: var(--pg-radius);
      overflow: hidden;
    }

    .sa-viewport {
      grid-column: 1;
      grid-row: 1;
      min-width: 0;
    }

    .sa-content {
      width: 720px;
      padding: 1rem 1.1rem;
    }

    .sa-row {
      margin: 0 0 0.7rem;
      white-space: nowrap;
      color: var(--pg-text-muted);
    }

    .sa-scrollbar {
      background: var(--pg-surface-2);
      border-radius: 999px;
    }

    .sa-scrollbar--v {
      grid-column: 2;
      grid-row: 1;
      width: 11px;
    }

    .sa-scrollbar--h {
      grid-column: 1;
      grid-row: 2;
      height: 11px;
    }

    .sa-thumb {
      background: var(--pg-border-strong);
      border-radius: 999px;
      cursor: grab;
    }

    .sa-thumb[data-orientation='vertical'] {
      width: 7px;
      left: 2px;
    }

    .sa-thumb[data-orientation='horizontal'] {
      height: 7px;
      top: 2px;
    }

    .sa-thumb:active {
      cursor: grabbing;
    }

    .sa-corner {
      grid-column: 2;
      grid-row: 2;
      background: var(--pg-surface-2);
    }
  `,
})
export class ScrollAreaAlwaysExample {
  protected readonly rows = Array.from({ length: 16 }, (_, index) => index + 1);
}

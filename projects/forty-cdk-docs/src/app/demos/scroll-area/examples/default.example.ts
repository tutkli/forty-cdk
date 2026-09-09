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
  selector: 'app-scroll-area-default-example',
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
    <div forScrollArea type="hover" class="sa">
      <div forScrollAreaViewport class="sa-viewport">
        <div forScrollAreaContent class="sa-content">
          @for (row of rows; track row) {
            <p class="sa-row">
              <b>Row {{ row }}</b> — headless primitives expose state and behavior; you bring the
              styles.
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
      position: relative;
      width: min(420px, 100%);
      height: 260px;
      background: var(--pg-surface);
      border: 1px solid var(--pg-border);
      border-radius: var(--pg-radius);
      overflow: hidden;
    }

    .sa-viewport {
      position: absolute;
      inset: 0;
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
      position: absolute;
      background: transparent;
      border-radius: 999px;
      transition:
        opacity 0.2s ease,
        background 0.2s ease;
    }

    .sa-scrollbar:hover {
      background: var(--pg-surface-2);
    }

    .sa-scrollbar--v {
      top: 0;
      inset-inline-end: 0;
      bottom: 11px;
      width: 11px;
    }

    .sa-scrollbar--h {
      left: 0;
      bottom: 0;
      inset-inline-end: 11px;
      height: 11px;
    }

    .sa-scrollbar[data-state='hidden'] {
      opacity: 0;
      pointer-events: none;
    }

    .sa-thumb {
      background: var(--pg-border-strong);
      border-radius: 999px;
      cursor: grab;
      transition: background 0.15s ease;
    }

    .sa-thumb[data-orientation='vertical'] {
      width: 7px;
      left: 2px;
    }

    .sa-thumb[data-orientation='horizontal'] {
      height: 7px;
      top: 2px;
    }

    .sa-thumb:hover {
      background: var(--pg-text-muted);
    }

    .sa-thumb:active {
      cursor: grabbing;
    }

    .sa-corner {
      position: absolute;
      inset-inline-end: 0;
      bottom: 0;
      width: 11px;
      height: 11px;
      background: transparent;
    }

    @media (prefers-reduced-motion: reduce) {
      .sa-scrollbar {
        transition: none;
      }
    }
  `,
})
export class ScrollAreaDefaultExample {
  protected readonly rows = Array.from({ length: 16 }, (_, index) => index + 1);
}

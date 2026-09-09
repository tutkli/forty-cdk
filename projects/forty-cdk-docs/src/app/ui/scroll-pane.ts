import { ChangeDetectionStrategy, Component } from '@angular/core';
import {
  ForScrollArea,
  ForScrollAreaContent,
  ForScrollAreaScrollbar,
  ForScrollAreaThumb,
  ForScrollAreaViewport,
} from 'forty-cdk/scroll-area';

@Component({
  selector: 'scroll-pane',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ForScrollArea,
    ForScrollAreaViewport,
    ForScrollAreaContent,
    ForScrollAreaScrollbar,
    ForScrollAreaThumb,
  ],
  template: `
    <div forScrollArea type="hover" class="sp">
      <div forScrollAreaViewport class="sp-viewport">
        <div forScrollAreaContent class="sp-content">
          <ng-content />
        </div>
      </div>
      <div forScrollAreaScrollbar orientation="vertical" class="sp-bar">
        <div forScrollAreaThumb class="sp-thumb"></div>
      </div>
    </div>
  `,
  styles: `
    :host {
      display: block;
      height: 100%;
      min-height: 0;
    }

    .sp {
      position: relative;
      height: 100%;
    }

    .sp-viewport {
      position: absolute;
      inset: 0;
    }

    .sp-content {
      min-height: 100%;
    }

    .sp-bar {
      position: absolute;
      top: 4px;
      bottom: 4px;
      inset-inline-end: 2px;
      width: 9px;
      border-radius: 999px;
      transition: opacity 0.2s ease;
    }

    .sp-bar[data-state='hidden'] {
      opacity: 0;
      pointer-events: none;
    }

    .sp-thumb {
      width: 7px;
      margin-inline: 1px;
      border-radius: 999px;
      background: var(--pg-border-strong);
      cursor: grab;
    }

    .sp-thumb:hover {
      background: var(--pg-text-muted);
    }

    .sp-thumb:active {
      cursor: grabbing;
    }

    @media (prefers-reduced-motion: reduce) {
      .sp-bar {
        transition: none;
      }
    }
  `,
})
export class ScrollPane {}

import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
  ForScrollArea,
  ForScrollAreaContent,
  ForScrollAreaCorner,
  ForScrollAreaScrollbar,
  ForScrollAreaThumb,
  ForScrollAreaViewport,
} from 'forty-cdk';

import { type ControlOption, ControlSelect } from '../ui/control-select';
import { DemoLayout } from '../ui/demo-layout';

@Component({
  selector: 'app-scroll-area-demo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DemoLayout,
    ForScrollArea,
    ForScrollAreaViewport,
    ForScrollAreaContent,
    ForScrollAreaScrollbar,
    ForScrollAreaThumb,
    ForScrollAreaCorner,
    ControlSelect,
  ],
  template: `
    <playground-demo
      title="Scroll Area"
      summary="Native scrolling with custom-styled scrollbars. The directive hides the platform bars and paints synthetic ones whose thumb size and position track the real scroll. The content overflows on both axes, so the corner fills the gap."
    >
      <div demo forScrollArea class="sa" [type]="type()" [dir]="dir()">
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

      <div controls class="pg-controls">
        <app-control-select label="type" [options]="typeOptions" [(value)]="type" />
        <app-control-select label="dir" [options]="dirOptions" [(value)]="dir" />

        <p class="pg-hint">
          always / auto keep the bars shown while content overflows; hover reveals them on pointer
          enter or scroll; scroll only shows them while scrolling.
        </p>
      </div>
    </playground-demo>
  `,
  styles: `
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
export class ScrollAreaDemo {
  protected readonly rows = Array.from({ length: 16 }, (_, index) => index + 1);

  protected readonly typeOptions: readonly ControlOption<'auto' | 'always' | 'scroll' | 'hover'>[] =
    [
      { value: 'always', label: 'always' },
      { value: 'auto', label: 'auto' },
      { value: 'hover', label: 'hover' },
      { value: 'scroll', label: 'scroll' },
    ];

  protected readonly dirOptions: readonly ControlOption<'ltr' | 'rtl'>[] = [
    { value: 'ltr', label: 'ltr' },
    { value: 'rtl', label: 'rtl' },
  ];

  protected readonly type = signal<'auto' | 'always' | 'scroll' | 'hover'>('always');
  protected readonly dir = signal<'ltr' | 'rtl'>('ltr');
}

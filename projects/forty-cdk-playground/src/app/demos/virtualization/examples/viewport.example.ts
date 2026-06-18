import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ForVirtualFor, ForVirtualViewport } from 'forty-cdk';

import { DemoLayout } from '../../../ui/demo-layout';

interface Row {
  readonly id: number;
  readonly label: string;
  readonly meta: string;
}

const TICKERS = ['AAPL', 'MSFT', 'GOOG', 'AMZN', 'NVDA', 'META', 'TSLA', 'NFLX'];

@Component({
  selector: 'app-virtualization-viewport-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DemoLayout, ForVirtualViewport, ForVirtualFor],
  template: `
    <playground-demo
      title="Ergonomic viewport (10,000 rows)"
      subtitle="The Shape A layer: [forVirtualViewport] owns the scroll container, the total-size sizer and the windowing core, while *forVirtualFor renders only the visible window plus overscan. The directive positions each row absolutely and binds aria-setsize / aria-posinset for you, so screen readers still announce the true list size — the consumer writes no spacer and no transform. Only a few dozen DOM nodes exist at any time."
      sourcePath="projects/forty-cdk-playground/src/app/demos/virtualization/examples/viewport.example.ts"
    >
      <div demo class="vz-demo">
        <div
          forVirtualViewport
          #vp="forVirtualViewport"
          class="vz-viewport"
          [virtualCount]="rows().length"
          [estimateSize]="46"
        >
          <div *forVirtualFor="let row of rows(); let item = virtualItem" class="vz-row">
            <span class="vz-index">{{ item.index + 1 }}</span>
            <span class="vz-label">{{ row.label }}</span>
            <span class="vz-meta">{{ row.meta }}</span>
          </div>
        </div>
      </div>

      <div controls class="pg-controls">
        <div class="pg-btn-row">
          <button type="button" class="pg-btn" (click)="vp.scrollToIndex(0, { align: 'start' })">
            Top
          </button>
          <button
            type="button"
            class="pg-btn"
            (click)="vp.scrollToIndex(5000, { align: 'center' })"
          >
            Jump to 5,000
          </button>
          <button
            type="button"
            class="pg-btn"
            (click)="vp.scrollToIndex(rows().length - 1, { align: 'end' })"
          >
            Bottom
          </button>
        </div>
        <p class="pg-hint">
          Scroll the list or use the buttons — scrollToIndex is exposed on the viewport via
          exportAs. Inspect the DOM: only the visible window is rendered.
        </p>
        <p class="pg-state">
          total rows: <b>{{ rows().length.toLocaleString() }}</b>
        </p>
      </div>
    </playground-demo>
  `,
  styles: `
    .vz-demo {
      width: min(420px, 100%);
    }

    .vz-viewport {
      height: 360px;
      border: 1px solid var(--pg-border);
      border-radius: var(--pg-radius-sm);
      background: var(--pg-surface);
    }

    .vz-row {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      height: 46px;
      padding: 0 0.85rem;
      border-bottom: 1px solid var(--pg-border);
      font-size: 0.88rem;
      box-sizing: border-box;
    }

    .vz-index {
      flex: none;
      width: 3.5rem;
      font-family: var(--pg-font-mono);
      font-size: 0.74rem;
      color: var(--pg-text-muted);
    }

    .vz-label {
      flex: 1;
      font-weight: 600;
    }

    .vz-meta {
      flex: none;
      font-family: var(--pg-font-mono);
      font-size: 0.78rem;
      color: var(--pg-text-muted);
    }
  `,
})
export class VirtualizationViewportExample {
  protected readonly rows = signal<readonly Row[]>(
    Array.from({ length: 10000 }, (_, i) => ({
      id: i,
      label: `${TICKERS[i % TICKERS.length]} order ${String(i + 1).padStart(5, '0')}`,
      meta: `$${(40 + ((i * 37) % 9600) / 10).toFixed(2)}`,
    })),
  );
}

import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ForVirtualFor, ForVirtualViewport } from 'forty-cdk/virtualization';

interface Row {
  readonly id: number;
  readonly label: string;
  readonly meta: string;
}

const TICKERS = ['AAPL', 'MSFT', 'GOOG', 'AMZN', 'NVDA', 'META', 'TSLA', 'NFLX'];

@Component({
  selector: 'app-virtualization-viewport-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForVirtualViewport, ForVirtualFor],
  template: `
    <div class="demo">
      <div class="toolbar">
        <button type="button" class="jump-btn" (click)="vp.scrollToIndex(0, { align: 'start' })">
          Top
        </button>
        <button
          type="button"
          class="jump-btn"
          (click)="vp.scrollToIndex(5000, { align: 'center' })"
        >
          Jump to 5,000
        </button>
        <button
          type="button"
          class="jump-btn"
          (click)="vp.scrollToIndex(rows().length - 1, { align: 'end' })"
        >
          Bottom
        </button>
      </div>

      <div
        forVirtualViewport
        #vp="forVirtualViewport"
        class="viewport"
        [virtualCount]="rows().length"
        [estimateSize]="46"
      >
        <div *forVirtualFor="let row of rows(); let item = virtualItem" class="row">
          <span class="index">{{ item.index + 1 }}</span>
          <span class="label">{{ row.label }}</span>
          <span class="meta">{{ row.meta }}</span>
        </div>
      </div>
    </div>
  `,
  styles: `
    :host {
      display: contents;
    }

    .demo {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      width: min(420px, 100%);
    }

    .toolbar {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .jump-btn {
      appearance: none;
      font: inherit;
      font-weight: 600;
      font-size: 0.9rem;
      padding: 0.5rem 0.9rem;
      border-radius: var(--pg-radius-sm);
      border: 1px solid var(--pg-border-strong);
      background: var(--pg-surface);
      color: var(--pg-text);
      cursor: pointer;
      transition: background 0.15s ease;
    }

    .jump-btn:hover {
      background: var(--pg-surface-2);
    }

    .jump-btn:active {
      transform: scale(0.95);
    }

    .viewport {
      height: 360px;
      border: 1px solid var(--pg-border);
      border-radius: var(--pg-radius-sm);
      background: var(--pg-surface);
    }

    .row {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      height: 46px;
      padding: 0 0.85rem;
      border-bottom: 1px solid var(--pg-border);
      font-size: 0.88rem;
      box-sizing: border-box;
    }

    .index {
      flex: none;
      width: 3.5rem;
      font-family: var(--pg-font-mono);
      font-size: 0.74rem;
      color: var(--pg-text-muted);
    }

    .label {
      flex: 1;
      font-weight: 600;
    }

    .meta {
      flex: none;
      font-family: var(--pg-font-mono);
      font-size: 0.78rem;
      color: var(--pg-text-muted);
    }

    @media (prefers-reduced-motion: reduce) {
      .jump-btn {
        transition: none;
      }

      .jump-btn:active {
        transform: none;
      }
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

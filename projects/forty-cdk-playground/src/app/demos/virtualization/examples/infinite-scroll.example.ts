import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { ForVirtualFor, ForVirtualViewport } from 'forty-cdk/virtualization';

import { DemoLayout } from '../../../ui/demo-layout';

interface Activity {
  readonly id: number;
  readonly who: string;
  readonly what: string;
}

const PEOPLE = ['Ada', 'Alan', 'Grace', 'Katherine', 'Edsger', 'Barbara', 'Margaret', 'Tim'];
const ACTIONS = [
  'opened a pull request',
  'merged a branch',
  'left a review',
  'closed an issue',
  'pushed 3 commits',
  'starred the repo',
];
const PAGE = 30;
const MAX = 600;
const LATENCY = 600;

function makePage(start: number, length: number): Activity[] {
  return Array.from({ length }, (_, k) => {
    const i = start + k;
    return {
      id: i,
      who: PEOPLE[i % PEOPLE.length]!,
      what: ACTIONS[(i * 3) % ACTIONS.length]!,
    };
  });
}

@Component({
  selector: 'app-virtualization-infinite-scroll-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DemoLayout, ForVirtualViewport, ForVirtualFor],
  template: `
    <playground-demo
      title="Infinite scroll (endReached)"
      subtitle="The Shape A turnkey path: bind (endReached) on [forVirtualViewport] and it builds the infinite-scroll detector internally, firing once when the rendered window comes within the overscan of the end. The consumer owns the fetch and appends the next page; the detector re-arms when the bound count grows. Scroll to the bottom to keep loading more, up to a cap."
      sourcePath="projects/forty-cdk-playground/src/app/demos/virtualization/examples/infinite-scroll.example.ts"
    >
      <div demo class="vz-demo">
        <div
          forVirtualViewport
          class="vz-viewport"
          [virtualCount]="rows().length"
          [estimateSize]="52"
          (endReached)="onEndReached()"
        >
          <div *forVirtualFor="let row of rows(); let item = virtualItem" class="vz-feed-row">
            <span class="vz-avatar" aria-hidden="true">{{ row.who.charAt(0) }}</span>
            <span class="vz-feed-text">
              <b>{{ row.who }}</b> {{ row.what }}
            </span>
            <span class="vz-feed-id">#{{ item.index + 1 }}</span>
          </div>
        </div>
      </div>

      <div controls class="pg-controls">
        <p class="pg-state">
          loaded: <b>{{ rows().length }}</b> / {{ max }}<br />
          status: <b>{{ statusLabel() }}</b>
        </p>
        <p class="pg-hint">
          Each page of {{ pageSize }} loads after a simulated {{ latency }}ms request. Loading stops
          once the cap of {{ max }} items is reached.
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

    .vz-feed-row {
      display: flex;
      align-items: center;
      gap: 0.7rem;
      height: 52px;
      padding: 0 0.85rem;
      border-bottom: 1px solid var(--pg-border);
      font-size: 0.88rem;
      box-sizing: border-box;
    }

    .vz-avatar {
      flex: none;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      font-size: 0.78rem;
      font-weight: 700;
      color: var(--pg-primary-contrast);
      background: var(--pg-primary);
    }

    .vz-feed-text {
      flex: 1;
      color: var(--pg-text-muted);
    }

    .vz-feed-text b {
      color: var(--pg-text);
    }

    .vz-feed-id {
      flex: none;
      font-family: var(--pg-font-mono);
      font-size: 0.72rem;
      color: var(--pg-text-muted);
    }
  `,
})
export class VirtualizationInfiniteScrollExample {
  protected readonly pageSize = PAGE;
  protected readonly max = MAX;
  protected readonly latency = LATENCY;

  protected readonly rows = signal<readonly Activity[]>(makePage(0, PAGE));
  protected readonly loading = signal(false);

  protected readonly statusLabel = computed(() => {
    if (this.rows().length >= MAX) {
      return 'all loaded';
    }
    return this.loading() ? 'loading…' : 'idle';
  });

  protected onEndReached(): void {
    if (this.loading() || this.rows().length >= MAX) {
      return;
    }
    this.loading.set(true);
    setTimeout(() => {
      this.rows.update((rows) => [...rows, ...makePage(rows.length, PAGE)]);
      this.loading.set(false);
    }, LATENCY);
  }
}

import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { ForVirtualFor, ForVirtualViewport } from 'forty-cdk/virtualization';

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
  imports: [ForVirtualViewport, ForVirtualFor],
  template: `
    <div class="demo">
      <p class="status">
        loaded: <b>{{ rows().length }}</b> / {{ max }} — status: <b>{{ statusLabel() }}</b>
      </p>

      <div
        forVirtualViewport
        class="viewport"
        [virtualCount]="rows().length"
        [estimateSize]="52"
        (endReached)="onEndReached()"
      >
        <div *forVirtualFor="let row of rows(); let item = virtualItem" class="feed-row">
          <span class="avatar" aria-hidden="true">{{ row.who.charAt(0) }}</span>
          <span class="feed-text">
            <b>{{ row.who }}</b> {{ row.what }}
          </span>
          <span class="feed-id">#{{ item.index + 1 }}</span>
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

    .status {
      margin: 0;
      font-family: var(--pg-font-mono);
      font-size: 0.78rem;
      color: var(--pg-text-muted);
    }

    .status b {
      color: var(--pg-text);
      font-weight: 600;
    }

    .viewport {
      height: 360px;
      border: 1px solid var(--pg-border);
      border-radius: var(--pg-radius-sm);
      background: var(--pg-surface);
    }

    .feed-row {
      display: flex;
      align-items: center;
      gap: 0.7rem;
      height: 52px;
      padding: 0 0.85rem;
      border-bottom: 1px solid var(--pg-border);
      font-size: 0.88rem;
      box-sizing: border-box;
    }

    .avatar {
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

    .feed-text {
      flex: 1;
      color: var(--pg-text-muted);
    }

    .feed-text b {
      color: var(--pg-text);
    }

    .feed-id {
      flex: none;
      font-family: var(--pg-font-mono);
      font-size: 0.72rem;
      color: var(--pg-text-muted);
    }
  `,
})
export class VirtualizationInfiniteScrollExample {
  protected readonly max = MAX;

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

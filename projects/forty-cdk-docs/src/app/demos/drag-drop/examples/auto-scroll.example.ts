import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
  type ForDragDropEvent,
  ForDragHandle,
  ForDragPlaceholder,
  ForDraggable,
  ForDropList,
  moveItemInArray,
  provideForDragDropDefaults,
} from 'forty-cdk/drag-drop';

interface Track {
  readonly id: number;
  readonly title: string;
}

const ARTISTS = [
  'Aphex Twin',
  'Boards of Canada',
  'Bonobo',
  'Four Tet',
  'Jon Hopkins',
  'Floating Points',
];

@Component({
  selector: 'app-drag-drop-auto-scroll-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [provideForDragDropDefaults({ autoScrollEdgeSize: 72, autoScrollMaxSpeed: 18 })],
  imports: [ForDropList, ForDraggable, ForDragHandle, ForDragPlaceholder],
  template: `
    <ul forDropList class="list" [liveSort]="true" (dragDrop)="onDrop($event)">
      @for (track of tracks(); track track.id) {
        <li forDraggable [dragData]="track" class="item">
          <span forDragHandle class="handle" aria-hidden="true">⠿</span>
          <span class="num">{{ $index + 1 }}</span>
          <span class="title">{{ track.title }}</span>
          <ng-template forDragPlaceholder>
            <div class="placeholder"></div>
          </ng-template>
        </li>
      }
    </ul>
  `,
  styles: `
    :host {
      display: contents;
    }

    .list {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
      width: min(340px, 100%);
      max-height: 280px;
      overflow-y: auto;
      margin: 0;
      padding: 0.5rem;
      list-style: none;
      background: var(--ex-surface-2, #f2eee6);
      border: 1px solid var(--ex-border, #e5e0d6);
      border-radius: var(--ex-radius-sm, 14px);
      user-select: none;
      -webkit-user-select: none;
    }

    .item {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      flex: none;
      padding: 0.6rem 0.75rem;
      background: var(--ex-surface, #ffffff);
      border: 1px solid var(--ex-border-strong, #d0c9bc);
      border-radius: var(--ex-radius-sm, 14px);
      box-shadow: var(
        --ex-shadow,
        0 2px 4px rgba(0, 0, 0, 0.04),
        0 20px 40px -18px rgba(0, 0, 0, 0.2)
      );
      font-size: 0.88rem;
    }

    .handle {
      flex: none;
      color: var(--ex-muted, #585d66);
      cursor: grab;
      line-height: 1;
    }

    .handle:active {
      cursor: grabbing;
    }

    .num {
      flex: none;
      width: 1.6rem;
      font-family: var(--ex-font-mono, ui-monospace, monospace);
      font-size: 0.74rem;
      color: var(--ex-muted, #585d66);
    }

    .title {
      flex: 1;
    }

    .placeholder {
      flex: none;
      height: 2.65rem;
      border: 2px dashed var(--ex-accent, #0e7c6b);
      border-radius: var(--ex-radius-sm, 14px);
      background: color-mix(in srgb, var(--ex-accent, #0e7c6b) 10%, transparent);
    }

    .item[data-dragging] {
      opacity: 0.35;
    }
  `,
})
export class DragDropAutoScrollExample {
  protected readonly tracks = signal<readonly Track[]>(
    Array.from({ length: 30 }, (_, i) => ({
      id: i,
      title: `${ARTISTS[i % ARTISTS.length]} — Track ${String(i + 1).padStart(2, '0')}`,
    })),
  );

  protected onDrop(event: ForDragDropEvent): void {
    this.tracks.update((tracks) =>
      moveItemInArray(tracks, event.previousIndex, event.currentIndex),
    );
  }
}

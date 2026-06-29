import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
  type ForDragDropEvent,
  ForDragHandle,
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
  imports: [ForDropList, ForDraggable, ForDragHandle],
  template: `
    <ul forDropList class="list" (dragDrop)="onDrop($event)">
      @for (track of tracks(); track track.id) {
        <li forDraggable [dragData]="track" class="item">
          <span forDragHandle class="handle" aria-hidden="true">⠿</span>
          <span class="num">{{ $index + 1 }}</span>
          <span class="title">{{ track.title }}</span>
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
      background: var(--pg-surface-2);
      border: 1px solid var(--pg-border);
      border-radius: var(--pg-radius-sm);
      user-select: none;
      -webkit-user-select: none;
    }

    .item {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      flex: none;
      padding: 0.6rem 0.75rem;
      background: var(--pg-surface);
      border: 1px solid var(--pg-border-strong);
      border-radius: var(--pg-radius-sm);
      box-shadow: var(--pg-shadow);
      font-size: 0.88rem;
    }

    .handle {
      flex: none;
      color: var(--pg-text-muted);
      cursor: grab;
      line-height: 1;
    }

    .handle:active {
      cursor: grabbing;
    }

    .num {
      flex: none;
      width: 1.6rem;
      font-family: var(--pg-font-mono);
      font-size: 0.74rem;
      color: var(--pg-text-muted);
    }

    .title {
      flex: 1;
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

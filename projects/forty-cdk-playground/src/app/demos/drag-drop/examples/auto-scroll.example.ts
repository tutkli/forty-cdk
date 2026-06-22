import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
  type ForDragDropEvent,
  ForDragHandle,
  ForDraggable,
  ForDropList,
  moveItemInArray,
  provideForDragDropDefaults,
} from 'forty-cdk/drag-drop';

import { ControlSwitch } from '../../../ui/control-switch';
import { DemoLayout } from '../../../ui/demo-layout';

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
  imports: [DemoLayout, ForDropList, ForDraggable, ForDragHandle, ControlSwitch],
  template: `
    <playground-demo
      title="Drag follows scroll (auto-scroll)"
      subtitle="When a pointer drag reaches the edge of the nearest scrollable container, [forDropList] auto-scrolls it toward that edge so you can drag across items far outside the visible window — speed scales with how close the pointer is to the edge. It's on by default; toggle it off to feel the difference. Here the edge zone and max speed are tuned via provideForDragDropDefaults. Keyboard dragging is unaffected (it never has a floating preview)."
      sourcePath="projects/forty-cdk-playground/src/app/demos/drag-drop/examples/auto-scroll.example.ts"
    >
      <div demo class="as-demo">
        <ul forDropList class="as-list" [autoScroll]="autoScroll()" (dragDrop)="onDrop($event)">
          @for (track of tracks(); track track.id) {
            <li forDraggable [dragData]="track" class="as-item">
              <span forDragHandle class="as-handle" aria-hidden="true">⠿</span>
              <span class="as-num">{{ $index + 1 }}</span>
              <span class="as-title">{{ track.title }}</span>
            </li>
          }
        </ul>
      </div>

      <div controls class="pg-controls">
        <app-control-switch
          label="autoScroll"
          hint="When on, dragging the preview toward the top or bottom edge of the scroll container scrolls it automatically. Turn it off and the list stays put, so you can only drop within the visible window."
          [(checked)]="autoScroll"
        />
        <p class="pg-hint">
          Grab the ⠿ grip of a track near the top, then drag toward the bottom edge and hold — the
          list scrolls so you can drop it dozens of rows down.
        </p>
        <p class="pg-state">
          tracks: <b>{{ tracks().length }}</b>
        </p>
      </div>
    </playground-demo>
  `,
  styles: `
    .as-demo {
      width: min(340px, 100%);
    }

    .as-list {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
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

    .as-item {
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

    .as-handle {
      flex: none;
      color: var(--pg-text-muted);
      cursor: grab;
      line-height: 1;
    }

    .as-handle:active {
      cursor: grabbing;
    }

    .as-num {
      flex: none;
      width: 1.6rem;
      font-family: var(--pg-font-mono);
      font-size: 0.74rem;
      color: var(--pg-text-muted);
    }

    .as-title {
      flex: 1;
    }

    .as-item[data-dragging] {
      opacity: 0.35;
    }
  `,
})
export class DragDropAutoScrollExample {
  protected readonly autoScroll = signal(true);

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

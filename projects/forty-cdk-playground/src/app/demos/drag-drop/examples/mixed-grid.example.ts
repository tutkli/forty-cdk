import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import {
  type ForDragDropEvent,
  ForDragPlaceholder,
  ForDraggable,
  ForDropList,
  moveItemInArray,
} from 'forty-cdk/drag-drop';

import { ControlSwitch } from '../../../ui/control-switch';
import { DemoLayout } from '../../../ui/demo-layout';

interface Tile {
  readonly id: string;
  readonly label: string;
}

@Component({
  selector: 'app-drag-drop-mixed-grid-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DemoLayout, ForDropList, ForDraggable, ForDragPlaceholder, ControlSwitch],
  template: `
    <playground-demo
      title="Wrapping grid (mixed orientation)"
      subtitle="A flex-wrap grid of uniformly-sized tiles with orientation='mixed'. The drop index is resolved in 2D, so a tile dragged across a wrapped row lands in the slot under the pointer's row and column instead of mis-resolving to the nearest single-axis slot. liveSort makes the placeholder reveal the live landing slot. Toggle 'mixed' off to feel a plain horizontal list mis-resolve once items wrap onto a second row. Pointer and keyboard both work; in mixed mode every arrow key steps the lifted tile linearly in DOM order."
      sourcePath="projects/forty-cdk-playground/src/app/demos/drag-drop/examples/mixed-grid.example.ts"
    >
      <div demo class="mg-demo">
        <ul
          forDropList
          [orientation]="orientation()"
          [liveSort]="true"
          class="mg-grid"
          (dragDrop)="onDrop($event)"
        >
          @for (tile of tiles(); track tile.id) {
            <li forDraggable [dragData]="tile" class="mg-tile">
              {{ tile.label }}
              <ng-template forDragPlaceholder>
                <div class="mg-slot"></div>
              </ng-template>
            </li>
          }
        </ul>
      </div>

      <div controls class="pg-controls">
        <app-control-switch
          label="mixed (2D resolution)"
          hint="When on, the drop index is resolved by row and column so a tile dragged across rows lands under the pointer. When off, the list resolves as 'horizontal' (single-axis) and mis-targets once the tiles wrap onto a second row."
          [(checked)]="mixed"
        />
        <p class="pg-hint">
          Drag a tile across rows, or focus one and press Space to lift, arrows to move, Space to
          drop.
        </p>
        <p class="pg-state">
          order: <b>{{ orderLabel() }}</b>
        </p>
      </div>
    </playground-demo>
  `,
  styles: `
    .mg-demo {
      width: min(300px, 100%);
    }

    .mg-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin: 0;
      padding: 0.75rem;
      list-style: none;
      background: var(--pg-surface-2);
      border: 1px solid var(--pg-border);
      border-radius: var(--pg-radius-sm);
    }

    .mg-tile {
      display: grid;
      place-items: center;
      width: 60px;
      height: 60px;
      background: var(--pg-surface);
      border: 1px solid var(--pg-border-strong);
      border-radius: var(--pg-radius-sm);
      box-shadow: var(--pg-shadow);
      font-size: 0.9rem;
      font-weight: 600;
      cursor: grab;
      user-select: none;
    }

    .mg-tile:active {
      cursor: grabbing;
    }

    .mg-tile[data-dragging] {
      opacity: 0.35;
    }

    .mg-slot {
      width: 60px;
      height: 60px;
      border: 2px dashed var(--pg-primary);
      border-radius: var(--pg-radius-sm);
      background: color-mix(in srgb, var(--pg-primary) 10%, transparent);
    }
  `,
})
export class DragDropMixedGridExample {
  protected readonly mixed = signal(true);

  protected readonly orientation = computed<'mixed' | 'horizontal'>(() =>
    this.mixed() ? 'mixed' : 'horizontal',
  );

  protected readonly tiles = signal<readonly Tile[]>([
    { id: 'a', label: 'A' },
    { id: 'b', label: 'B' },
    { id: 'c', label: 'C' },
    { id: 'd', label: 'D' },
    { id: 'e', label: 'E' },
    { id: 'f', label: 'F' },
    { id: 'g', label: 'G' },
    { id: 'h', label: 'H' },
  ]);

  protected readonly orderLabel = computed(() =>
    this.tiles()
      .map((tile) => tile.label)
      .join(' · '),
  );

  protected onDrop(event: ForDragDropEvent): void {
    this.tiles.update((tiles) => moveItemInArray(tiles, event.previousIndex, event.currentIndex));
  }
}

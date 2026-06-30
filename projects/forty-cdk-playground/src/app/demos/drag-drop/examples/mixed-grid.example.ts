import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
  type ForDragDropEvent,
  ForDragPlaceholder,
  ForDraggable,
  ForDropList,
  moveItemInArray,
} from 'forty-cdk/drag-drop';

interface Tile {
  readonly id: string;
  readonly label: string;
}

@Component({
  selector: 'app-drag-drop-mixed-grid-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForDropList, ForDraggable, ForDragPlaceholder],
  template: `
    <ul forDropList orientation="mixed" [liveSort]="true" class="grid" (dragDrop)="onDrop($event)">
      @for (tile of tiles(); track tile.id) {
        <li forDraggable [dragData]="tile" class="tile">
          {{ tile.label }}
          <ng-template forDragPlaceholder>
            <div class="slot"></div>
          </ng-template>
        </li>
      }
    </ul>
  `,
  styles: `
    :host {
      display: contents;
    }

    .grid {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      width: min(300px, 100%);
      margin: 0;
      padding: 0.75rem;
      list-style: none;
      background: var(--pg-surface-2);
      border: 1px solid var(--pg-border);
      border-radius: var(--pg-radius-sm);
    }

    .tile {
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

    .tile:active {
      cursor: grabbing;
    }

    .tile[data-dragging] {
      opacity: 0.35;
    }

    .slot {
      width: 60px;
      height: 60px;
      border: 2px dashed var(--pg-primary);
      border-radius: var(--pg-radius-sm);
      background: color-mix(in srgb, var(--pg-primary) 10%, transparent);
    }
  `,
})
export class DragDropMixedGridExample {
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

  protected onDrop(event: ForDragDropEvent): void {
    this.tiles.update((tiles) => moveItemInArray(tiles, event.previousIndex, event.currentIndex));
  }
}

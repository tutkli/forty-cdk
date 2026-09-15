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
      background: var(--ex-surface-2, #f2eee6);
      border: 1px solid var(--ex-border, #e5e0d6);
      border-radius: var(--ex-radius-sm, 14px);
    }

    .tile {
      display: grid;
      place-items: center;
      width: 60px;
      height: 60px;
      background: var(--ex-surface, #ffffff);
      border: 1px solid var(--ex-border-strong, #d0c9bc);
      border-radius: var(--ex-radius-sm, 14px);
      box-shadow: var(
        --ex-shadow,
        0 2px 4px rgba(0, 0, 0, 0.04),
        0 20px 40px -18px rgba(0, 0, 0, 0.2)
      );
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
      border: 2px dashed var(--ex-accent, #0e7c6b);
      border-radius: var(--ex-radius-sm, 14px);
      background: color-mix(in srgb, var(--ex-accent, #0e7c6b) 10%, transparent);
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

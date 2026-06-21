import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

import { ForDraggable, ForDropList, moveItemInArray, type ForDragDropEvent } from 'forty-cdk';

interface Item {
  id: number;
  label: string;
}

@Component({
  selector: 'app-drag-drop-grid-fixture',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForDropList, ForDraggable],
  styles: [
    `
      .grid {
        list-style: none;
        margin: 20px;
        padding: 0;
        display: flex;
        flex-wrap: wrap;
        width: 186px;
        background: #f5f5f5;
      }
      [forDraggable] {
        width: 60px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #fff;
        border: 1px solid #ddd;
        box-sizing: border-box;
        cursor: grab;
      }
      [forDraggable][data-dragging] {
        opacity: 0.4;
      }
    `,
  ],
  template: `
    <ul class="grid" forDropList orientation="mixed" data-testid="grid" (dragDrop)="onDrop($event)">
      @for (item of items(); track item.id; let i = $index) {
        <li forDraggable [dragData]="item" [attr.data-testid]="'item-' + i">
          {{ item.label }}
        </li>
      }
    </ul>
  `,
})
export class DragDropGridFixture {
  protected readonly items = signal<Item[]>([
    { id: 1, label: 'A' },
    { id: 2, label: 'B' },
    { id: 3, label: 'C' },
    { id: 4, label: 'D' },
    { id: 5, label: 'E' },
    { id: 6, label: 'F' },
  ]);

  protected onDrop(event: ForDragDropEvent): void {
    this.items.set(moveItemInArray(this.items(), event.previousIndex, event.currentIndex));
  }
}

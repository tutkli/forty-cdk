import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

import {
  ForDragPreview,
  ForDraggable,
  ForDropList,
  moveItemInArray,
  type ForDragDropEvent,
} from 'forty-cdk';

interface Item {
  id: number;
  label: string;
}

@Component({
  selector: 'app-drag-drop-animate-fixture',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForDropList, ForDraggable, ForDragPreview],
  styles: [
    `
      [forDropList] {
        list-style: none;
        margin: 0;
        padding: 20px;
        width: 200px;
        min-height: 40px;
        background: #f5f5f5;
      }
      [forDraggable] {
        height: 40px;
        display: flex;
        align-items: center;
        padding: 0 8px;
        background: #fff;
        border: 1px solid #ddd;
        box-sizing: border-box;
        cursor: grab;
      }
      [forDraggable][data-dragging] {
        opacity: 0.4;
      }
      [forDraggable][data-drag-animating] {
        transition: transform 150ms linear;
      }
      [data-for-drag-preview][data-settling] {
        transition: transform 150ms linear;
      }
    `,
  ],
  template: `
    <ul forDropList data-testid="list" [animateReorder]="true" (dragDrop)="onDrop($event)">
      @for (item of items(); track item.id; let i = $index) {
        <li forDraggable [dragData]="item" [attr.data-testid]="'item-' + i">
          {{ item.label }}
          <ng-template forDragPreview>
            <div data-testid="custom-preview">preview {{ item.label }}</div>
          </ng-template>
        </li>
      }
    </ul>
  `,
})
export class DragDropAnimateFixture {
  protected readonly items = signal<Item[]>([
    { id: 1, label: 'Alpha' },
    { id: 2, label: 'Beta' },
    { id: 3, label: 'Gamma' },
  ]);

  protected onDrop(event: ForDragDropEvent): void {
    this.items.set(moveItemInArray(this.items(), event.previousIndex, event.currentIndex));
  }
}

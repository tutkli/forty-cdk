import { ChangeDetectionStrategy, Component, signal, viewChild } from '@angular/core';

import {
  type ForDragDropEvent,
  ForDraggable,
  ForDropList,
  ForDropListGroup,
  moveItemInArray,
  transferArrayItem,
} from 'forty-cdk/drag-drop';

interface Item {
  id: string;
  label: string;
}

@Component({
  selector: 'app-drag-drop-stacked-fixture',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForDropList, ForDraggable, ForDropListGroup],
  styles: [
    `
      .panel {
        width: 220px;
        height: 300px;
        overflow: auto;
        margin-bottom: 20px;
        background: #f5f5f5;
      }
      [forDropList] {
        list-style: none;
        margin: 0;
        padding: 0;
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
    `,
  ],
  template: `
    <div forDropListGroup>
      <div class="panel" data-testid="panel-a">
        <ul
          forDropList
          #listA="forDropList"
          data-testid="stacked-list-a"
          [autoScroll]="false"
          (dragDrop)="onDrop($event)"
        >
          @for (item of itemsA(); track item.id; let i = $index) {
            <li forDraggable [dragData]="item" [attr.data-testid]="'sa-item-' + i">
              {{ item.label }}
            </li>
          }
        </ul>
      </div>
      <div class="panel" data-testid="panel-b">
        <ul
          forDropList
          data-testid="stacked-list-b"
          [autoScroll]="false"
          (dragDrop)="onDrop($event)"
        >
          @for (item of itemsB(); track item.id; let i = $index) {
            <li forDraggable [dragData]="item" [attr.data-testid]="'sb-item-' + i">
              {{ item.label }}
            </li>
          }
        </ul>
      </div>
    </div>
  `,
})
export class DragDropStackedFixture {
  private readonly listARef = viewChild.required<ForDropList>('listA');

  protected readonly itemsA = signal<Item[]>(
    Array.from({ length: 50 }, (_, i) => ({ id: `a${i + 1}`, label: `A${i + 1}` })),
  );

  protected readonly itemsB = signal<Item[]>(
    Array.from({ length: 3 }, (_, i) => ({ id: `b${i + 1}`, label: `B${i + 1}` })),
  );

  protected onDrop(event: ForDragDropEvent): void {
    const aHost = this.listARef().host;
    if (event.previousContainer === event.container) {
      const items = event.container.host === aHost ? this.itemsA : this.itemsB;
      items.set(moveItemInArray(items(), event.previousIndex, event.currentIndex));
      return;
    }
    const fromA = event.previousContainer.host === aHost;
    const from = fromA ? this.itemsA : this.itemsB;
    const to = fromA ? this.itemsB : this.itemsA;
    const result = transferArrayItem(from(), to(), event.previousIndex, event.currentIndex);
    from.set(result.from as Item[]);
    to.set(result.to as Item[]);
  }
}

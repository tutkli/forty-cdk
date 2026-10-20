import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import {
  type ForDragDropEvent,
  ForDraggable,
  ForDropList,
  moveItemInArray,
} from 'forty-cdk/drag-drop';

interface Item {
  id: number;
  label: string;
}

@Component({
  selector: 'app-drag-drop-scroll-fixture',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForDropList, ForDraggable],
  styles: [
    `
      [forDropList] {
        list-style: none;
        margin: 0;
        padding: 0;
        width: 200px;
        height: 300px;
        overflow: auto;
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
        user-select: none;
      }
      [forDraggable][data-dragging] {
        opacity: 0.4;
      }
      [forDropList].row {
        display: flex;
        width: 300px;
        height: 48px;
        margin-top: 16px;
        overflow-x: auto;
        overflow-y: hidden;
      }
      .row [forDraggable] {
        flex: 0 0 80px;
      }
    `,
  ],
  template: `
    <ul forDropList data-testid="scroll-list" [autoScroll]="autoScroll" (dragDrop)="onDrop($event)">
      @for (item of items(); track item.id; let i = $index) {
        <li forDraggable [dragData]="item" [attr.data-testid]="'s-item-' + i">
          {{ item.label }}
        </li>
      }
    </ul>
    <ul
      forDropList
      class="row"
      data-testid="scroll-row"
      orientation="horizontal"
      [dir]="rowDir"
      (dragDrop)="onRowDrop($event)"
    >
      @for (item of rowItems(); track item.id; let i = $index) {
        <li forDraggable [dragData]="item" [attr.data-testid]="'r-item-' + i">
          {{ item.label }}
        </li>
      }
    </ul>
  `,
})
export class DragDropScrollFixture {
  readonly #route = inject(ActivatedRoute);

  protected readonly autoScroll = this.#route.snapshot.queryParamMap.get('autoScroll') !== 'false';

  protected readonly items = signal<Item[]>(
    Array.from({ length: 20 }, (_, i) => ({ id: i + 1, label: `Item ${i + 1}` })),
  );

  protected readonly rowDir =
    this.#route.snapshot.queryParamMap.get('dir') === 'rtl' ? ('rtl' as const) : null;

  protected readonly rowItems = signal<Item[]>(
    Array.from({ length: 12 }, (_, i) => ({ id: i + 1, label: `Col ${i + 1}` })),
  );

  protected onDrop(event: ForDragDropEvent): void {
    this.items.set(moveItemInArray(this.items(), event.previousIndex, event.currentIndex));
  }

  protected onRowDrop(event: ForDragDropEvent): void {
    this.rowItems.set(moveItemInArray(this.rowItems(), event.previousIndex, event.currentIndex));
  }
}

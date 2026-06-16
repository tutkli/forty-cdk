import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { ForDraggable, ForDropList, moveItemInArray, type ForDragDropEvent } from 'forty-cdk';

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
      }
      [forDraggable][data-dragging] {
        opacity: 0.4;
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
  `,
})
export class DragDropScrollFixture {
  readonly #route = inject(ActivatedRoute);

  protected readonly autoScroll = this.#route.snapshot.queryParamMap.get('autoScroll') !== 'false';

  protected readonly items = signal<Item[]>(
    Array.from({ length: 20 }, (_, i) => ({ id: i + 1, label: `Item ${i + 1}` })),
  );

  protected onDrop(event: ForDragDropEvent): void {
    this.items.set(moveItemInArray(this.items(), event.previousIndex, event.currentIndex));
  }
}

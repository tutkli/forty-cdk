import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import {
  type ForDragDropEvent,
  ForDragPlaceholder,
  ForDragPreview,
  ForDraggable,
  ForDropList,
  moveItemInArray,
} from 'forty-cdk/drag-drop';

interface Item {
  id: number;
  label: string;
}

@Component({
  selector: 'app-drag-drop-templates-fixture',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForDropList, ForDraggable, ForDragPreview, ForDragPlaceholder],
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
      .custom-placeholder {
        height: 40px;
        background: #d0e8ff;
        border: 2px dashed #4a90e2;
        box-sizing: border-box;
      }
    `,
  ],
  template: `
    <ul forDropList data-testid="list" [liveSort]="liveSort" (dragDrop)="onDrop($event)">
      @for (item of items(); track item.id; let i = $index) {
        <li forDraggable [dragData]="item" [attr.data-testid]="'item-' + i">
          {{ item.label }}
          <ng-template forDragPreview>
            <div data-testid="custom-preview">preview {{ item.label }}</div>
          </ng-template>
          <ng-template forDragPlaceholder>
            <div data-testid="custom-placeholder" class="custom-placeholder"></div>
          </ng-template>
        </li>
      }
    </ul>
  `,
})
export class DragDropTemplatesFixture {
  readonly #route = inject(ActivatedRoute);

  protected readonly liveSort = this.#route.snapshot.queryParamMap.get('liveSort') === 'true';

  protected readonly items = signal<Item[]>([
    { id: 1, label: 'Alpha' },
    { id: 2, label: 'Beta' },
    { id: 3, label: 'Gamma' },
  ]);

  protected onDrop(event: ForDragDropEvent): void {
    this.items.set(moveItemInArray(this.items(), event.previousIndex, event.currentIndex));
  }
}

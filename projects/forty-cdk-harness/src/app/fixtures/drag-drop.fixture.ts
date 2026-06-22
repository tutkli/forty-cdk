import {
  ChangeDetectionStrategy,
  Component,
  type ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import {
  type ForDragDropEvent,
  ForDragHandle,
  ForDraggable,
  ForDropList,
  ForDropListGroup,
  moveItemInArray,
  transferArrayItem,
} from 'forty-cdk/drag-drop';

interface Item {
  id: number;
  label: string;
}

@Component({
  selector: 'app-drag-drop-fixture',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForDropList, ForDraggable, ForDragHandle, ForDropListGroup],
  styles: [
    `
      .lists {
        display: flex;
        gap: 40px;
        align-items: flex-start;
        padding: 20px;
      }
      [forDropList] {
        list-style: none;
        margin: 0;
        padding: 0;
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
      [forDragHandle] {
        cursor: grab;
        margin-right: 8px;
        user-select: none;
      }
      .boundary-box {
        position: relative;
        width: 240px;
        height: 220px;
        overflow: hidden;
        border: 2px solid #888;
      }
    `,
  ],
  template: `
    <div [class.boundary-box]="boundaryActive" #boundaryBox data-testid="boundary-box">
      <div class="lists" forDropListGroup>
        <ul
          forDropList
          #listA="forDropList"
          data-testid="list-a"
          [lockAxis]="lockAxis"
          [boundary]="boundaryEl"
          (dragDrop)="onDrop($event)"
        >
          @for (item of itemsA(); track item.id; let i = $index) {
            <li forDraggable [dragData]="item" [attr.data-testid]="'a-item-' + i">
              @if (i === 0) {
                <span forDragHandle [attr.data-testid]="'a-item-0-handle'" aria-hidden="true"
                  >::</span
                >
              }
              {{ item.label }}
            </li>
          }
        </ul>

        <ul forDropList #listB="forDropList" data-testid="list-b" (dragDrop)="onDrop($event)">
          @for (item of itemsB(); track item.id; let i = $index) {
            <li forDraggable [dragData]="item" [attr.data-testid]="'b-item-' + i">
              {{ item.label }}
            </li>
          }
        </ul>
      </div>
    </div>
  `,
})
export class DragDropFixture {
  readonly #route = inject(ActivatedRoute);
  private readonly boundaryBoxRef = viewChild.required<ElementRef<HTMLElement>>('boundaryBox');

  protected readonly listARef = viewChild.required<ForDropList>('listA');
  protected readonly listBRef = viewChild.required<ForDropList>('listB');

  protected readonly lockAxis: 'x' | 'y' | null = (() => {
    const v = this.#route.snapshot.queryParamMap.get('lockAxis');
    return v === 'x' || v === 'y' ? v : null;
  })();

  protected readonly boundaryActive = this.#route.snapshot.queryParamMap.get('boundary') === 'true';

  protected get boundaryEl(): HTMLElement | null {
    return this.boundaryActive ? this.boundaryBoxRef().nativeElement : null;
  }

  protected readonly itemsA = signal<Item[]>([
    { id: 1, label: 'Alpha' },
    { id: 2, label: 'Beta' },
    { id: 3, label: 'Gamma' },
    { id: 4, label: 'Delta' },
  ]);

  protected readonly itemsB = signal<Item[]>([
    { id: 5, label: 'Epsilon' },
    { id: 6, label: 'Zeta' },
  ]);

  protected onDrop(event: ForDragDropEvent): void {
    const aHost = this.listARef().host;
    if (event.previousContainer === event.container) {
      if (event.container.host === aHost) {
        this.itemsA.set(moveItemInArray(this.itemsA(), event.previousIndex, event.currentIndex));
      } else {
        this.itemsB.set(moveItemInArray(this.itemsB(), event.previousIndex, event.currentIndex));
      }
    } else {
      const fromA = event.previousContainer.host === aHost;
      const result = transferArrayItem(
        fromA ? this.itemsA() : this.itemsB(),
        fromA ? this.itemsB() : this.itemsA(),
        event.previousIndex,
        event.currentIndex,
      );
      if (fromA) {
        this.itemsA.set(result.from as Item[]);
        this.itemsB.set(result.to as Item[]);
      } else {
        this.itemsB.set(result.from as Item[]);
        this.itemsA.set(result.to as Item[]);
      }
    }
  }
}

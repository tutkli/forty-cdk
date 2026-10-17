import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

import {
  type ForDragDropEvent,
  ForDraggable,
  ForDropList,
  ForFreeDrag,
  moveItemInArray,
} from 'forty-cdk/drag-drop';

interface Item {
  id: number;
  label: string;
}

const THUMB =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAIAAAD8GO2jAAAAKklEQVR42mPwd3tKU8QwasGoBaMWjFowasGoBaMWjFowasGoBaMWjFowasGoBaMWDBULAE0y6EyFy2OWAAAAAElFTkSuQmCC';

@Component({
  selector: 'app-drag-drop-native-fixture',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForDropList, ForDraggable, ForFreeDrag],
  styles: [
    `
      ul {
        list-style: none;
        margin: 20px;
        padding: 0;
        width: 220px;
      }
      li {
        height: 48px;
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 0 8px;
        background: #fff;
        border: 1px solid #ddd;
        box-sizing: border-box;
      }
      img {
        width: 32px;
        height: 32px;
      }
      .stage {
        position: relative;
        width: 400px;
        height: 200px;
        margin: 20px;
        border: 1px solid #ccc;
      }
      .card {
        position: absolute;
        top: 20px;
        left: 20px;
        width: 120px;
        height: 60px;
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 0 8px;
        background: #fff;
        border: 1px solid #333;
      }
    `,
  ],
  template: `
    <ul forDropList data-testid="list" (dragDrop)="onDrop($event)">
      @for (item of items(); track item.id) {
        <li forDraggable [dragData]="item" [attr.data-testid]="'item-' + item.id">
          <img [src]="thumb" alt="" [attr.data-testid]="'thumb-' + item.id" />
          <a href="#native" [attr.data-testid]="'link-' + item.id">{{ item.label }}</a>
        </li>
      }
    </ul>

    <div class="stage">
      <div class="card" forFreeDrag boundary=".stage" data-testid="card">
        <img [src]="thumb" alt="" data-testid="card-thumb" />
        Card
      </div>
    </div>
  `,
})
export class DragDropNativeFixture {
  protected readonly thumb = THUMB;

  protected readonly items = signal<Item[]>([
    { id: 1, label: 'Alpha' },
    { id: 2, label: 'Beta' },
    { id: 3, label: 'Gamma' },
  ]);

  protected onDrop(event: ForDragDropEvent): void {
    this.items.set(moveItemInArray(this.items(), event.previousIndex, event.currentIndex));
  }
}

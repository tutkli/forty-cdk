import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ForDialog, ForDialogClose, ForDialogTrigger } from 'forty-cdk/dialog';
import {
  type ForDragDropEvent,
  ForDraggable,
  ForDropList,
  ForFreeDrag,
  moveItemInArray,
} from 'forty-cdk/drag-drop';
import { ForTree, ForTreeItem, ForTreeItemLabel, ForTreeNodeDrag } from 'forty-cdk/tree';
import { queryFlag } from './_query-flag';

interface Item {
  id: number;
  label: string;
}

/**
 * Fixture for #1411 — a drag gesture inside a modal `ForDialog`. Escape while a
 * drag is in flight must cancel the drag only; the enclosing dialog stays open
 * and a second Escape dismisses it (#1378 / #1410).
 *
 * Three variants share the route: the default renders a `[forDropList]` +
 * `[forDraggable]` list (pointer drag and keyboard lift), `?freeDrag=1`
 * renders a `[forFreeDrag]` box inside a bounded viewport, and `?tree=1` renders a
 * `[forTree][forTreeNodeDrag]` (#2265).
 */
@Component({
  selector: 'app-drag-in-dialog-fixture',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ForDialog,
    ForDialogTrigger,
    ForDialogClose,
    ForDropList,
    ForDraggable,
    ForFreeDrag,
    ForTree,
    ForTreeItem,
    ForTreeItemLabel,
    ForTreeNodeDrag,
  ],
  styles: [
    `
      [forDialog] {
        position: fixed;
        inset: 0;
        margin: auto;
        width: 360px;
        height: 340px;
        box-sizing: border-box;
        padding: 16px;
        background: #fff;
        border: 1px solid #ccc;
      }
      [forDropList] {
        list-style: none;
        margin: 0 0 12px;
        padding: 0;
        width: 240px;
        min-height: 40px;
        background: #f5f5f5;
      }
      [forDraggable] {
        height: 40px;
        display: flex;
        align-items: center;
        padding: 0 8px;
        box-sizing: border-box;
        background: #fff;
        border: 1px solid #ddd;
        cursor: grab;
      }
      [forDraggable][data-dragging] {
        opacity: 0.4;
      }
      .viewport {
        position: relative;
        width: 300px;
        height: 220px;
        margin-bottom: 12px;
        border: 1px solid #ccc;
        background: #fafafa;
      }
      .box {
        position: absolute;
        top: 20px;
        left: 20px;
        width: 60px;
        height: 60px;
        background: #4f46e5;
        touch-action: none;
        cursor: grab;
      }
    `,
  ],
  template: `
    <button data-testid="trigger" forDialogTrigger [(open)]="open" controls="drag-dialog">
      Open dialog
    </button>

    @if (open()) {
      <div
        forDialog
        id="drag-dialog"
        data-testid="dialog"
        ariaLabel="Drag dialog"
        (dismiss)="open.set(false)"
      >
        @if (freeDrag) {
          <div class="viewport" data-testid="viewport">
            <div class="box" forFreeDrag boundary=".viewport" data-testid="box"></div>
          </div>
        } @else if (tree) {
          <ul
            forTree
            forTreeNodeDrag
            aria-label="Files"
            data-testid="tree"
            style="list-style: none; padding: 0"
            (nodeDrop)="lastTreeDrop.set($event.node)"
          >
            @for (node of treeNodes; track node) {
              <li
                forTreeItem
                [value]="node"
                [attr.data-testid]="'tree-' + node"
                style="height: 40px"
              >
                <div forTreeItemLabel>{{ node }}</div>
              </li>
            }
          </ul>
          <div data-testid="tree-last-drop">{{ lastTreeDrop() }}</div>
        } @else {
          <ul forDropList data-testid="list" (dragDrop)="onDrop($event)">
            @for (item of items(); track item.id; let i = $index) {
              <li forDraggable [dragData]="item" [attr.data-testid]="'item-' + i">
                {{ item.label }}
              </li>
            }
          </ul>
        }
        <button data-testid="close-btn" forDialogClose>Close</button>
      </div>
    }
  `,
})
export class DragInDialogFixture {
  protected readonly open = signal(false);
  protected readonly freeDrag = queryFlag('freeDrag');
  protected readonly tree = queryFlag('tree');
  protected readonly treeNodes = ['alpha', 'beta', 'gamma'];
  protected readonly lastTreeDrop = signal('');

  protected readonly items = signal<Item[]>([
    { id: 1, label: 'Alpha' },
    { id: 2, label: 'Beta' },
    { id: 3, label: 'Gamma' },
    { id: 4, label: 'Delta' },
  ]);

  protected onDrop(event: ForDragDropEvent): void {
    this.items.set(moveItemInArray(this.items(), event.previousIndex, event.currentIndex));
  }
}

import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

import {
  type ForDragDropEvent,
  ForDraggable,
  ForDropList,
  ForFreeDrag,
  moveItemInArray,
} from 'forty-cdk/drag-drop';
import {
  ForListbox,
  ForListboxOption,
  ForListboxReorder,
  type ForListboxReorderEvent,
} from 'forty-cdk/listbox';
import {
  ForTree,
  type ForTreeDragDropEvent,
  ForTreeItem,
  ForTreeItemLabel,
  ForTreeNodeDrag,
  moveTreeNode,
} from 'forty-cdk/tree';

interface Item {
  id: number;
  label: string;
}

const THUMB =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAIAAAD8GO2jAAAAKklEQVR42mPwd3tKU8QwasGoBaMWjFowasGoBaMWjFowasGoBaMWjFowasGoBaMWDBULAE0y6EyFy2OWAAAAAElFTkSuQmCC';

function seed(): Item[] {
  return [
    { id: 1, label: 'Alpha' },
    { id: 2, label: 'Beta' },
    { id: 3, label: 'Gamma' },
  ];
}

@Component({
  selector: 'app-drag-drop-native-fixture',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ForDropList,
    ForDraggable,
    ForFreeDrag,
    ForTree,
    ForTreeItem,
    ForTreeItemLabel,
    ForTreeNodeDrag,
    ForListbox,
    ForListboxOption,
    ForListboxReorder,
  ],
  styles: [
    `
      ul,
      .listbox {
        list-style: none;
        margin: 20px;
        padding: 0;
        width: 220px;
      }
      li,
      .option {
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

    <ul
      forTree
      forTreeNodeDrag
      aria-label="Files"
      data-testid="tree"
      (nodeDrop)="onNodeDrop($event)"
    >
      @for (node of nodes(); track node.id) {
        <li forTreeItem [value]="node.label" [attr.data-testid]="'node-' + node.id">
          <img [src]="thumb" alt="" [attr.data-testid]="'node-thumb-' + node.id" />
          <a href="#native" forTreeItemLabel [attr.data-testid]="'node-link-' + node.id">{{
            node.label
          }}</a>
        </li>
      }
    </ul>

    <div
      class="listbox"
      forListbox
      forListboxReorder
      aria-label="Tags"
      data-testid="listbox"
      (optionReorder)="onOptionReorder($event)"
    >
      @for (option of options(); track option.id) {
        <div
          class="option"
          forListboxOption
          [value]="option.label"
          [attr.data-testid]="'option-' + option.id"
        >
          <img [src]="thumb" alt="" [attr.data-testid]="'option-thumb-' + option.id" />
          <a href="#native" [attr.data-testid]="'option-link-' + option.id">{{ option.label }}</a>
        </div>
      }
    </div>
  `,
})
export class DragDropNativeFixture {
  protected readonly thumb = THUMB;

  protected readonly items = signal<Item[]>(seed());
  protected readonly nodes = signal<Item[]>(seed());
  protected readonly options = signal<Item[]>(seed());

  protected onDrop(event: ForDragDropEvent): void {
    this.items.set(moveItemInArray(this.items(), event.previousIndex, event.currentIndex));
  }

  protected onNodeDrop(event: ForTreeDragDropEvent): void {
    this.nodes.set(
      moveTreeNode(this.nodes(), {
        event,
        trackBy: (node) => node.label,
        children: () => undefined,
        withChildren: (node) => node,
      }),
    );
  }

  protected onOptionReorder(event: ForListboxReorderEvent): void {
    this.options.set(moveItemInArray(this.options(), event.from, event.to));
  }
}

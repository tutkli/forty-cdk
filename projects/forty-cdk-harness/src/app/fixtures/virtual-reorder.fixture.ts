import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { ForDraggable, ForDragHandle, moveItemInArray } from 'forty-cdk/drag-drop';
import { ForVirtualReorder, type ForVirtualReorderEvent } from 'forty-cdk/virtual-reorder';
import { ForVirtualFor, ForVirtualViewport } from 'forty-cdk/virtualization';

import { queryFlag } from './_query-flag';

const ROW_COUNT = 10_000;
const ROW_HEIGHT = 44;

interface Row {
  readonly id: number;
  readonly name: string;
}

function buildRows(): readonly Row[] {
  return Array.from({ length: ROW_COUNT }, (_, i) => ({ id: i, name: `Row ${i}` }));
}

@Component({
  selector: 'app-virtual-reorder-fixture',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForVirtualViewport, ForVirtualFor, ForVirtualReorder, ForDraggable, ForDragHandle],
  styles: [
    `
      :host {
        display: block;
        padding: 24px;
      }
      .list-root {
        height: 400px;
        border: 1px solid #ccc;
      }
      [forDraggable] {
        height: ${ROW_HEIGHT}px;
        box-sizing: border-box;
        border-bottom: 1px solid #eee;
        background: #fff;
        padding: 8px;
      }
      [forDraggable][data-dragging] {
        background: #e0e7ff;
      }
      [forDragHandle] {
        display: inline-block;
        width: 24px;
        cursor: grab;
      }
    `,
  ],
  template: `
    <div data-testid="last-reorder">{{ lastReorderText() }}</div>

    <div
      class="list-root"
      data-testid="root"
      forVirtualViewport
      [virtualCount]="ROW_COUNT"
      [estimateSize]="ROW_HEIGHT"
      forVirtualReorder
      lockAxis="y"
      (itemReorder)="onReorder($event)"
      role="list"
      aria-label="Rows"
    >
      <div
        *forVirtualFor="let row of data(); let i = index"
        role="listitem"
        forDraggable
        [dragData]="i"
        [attr.data-testid]="'row-' + i"
      >
        @if (handles) {
          <span forDragHandle aria-hidden="true" [attr.data-testid]="'handle-' + i">⠿</span>
        }
        {{ row.name }}
      </div>
    </div>
  `,
})
export class VirtualReorderFixture {
  protected readonly ROW_COUNT = ROW_COUNT;
  protected readonly ROW_HEIGHT = ROW_HEIGHT;
  protected readonly handles = queryFlag('handles');

  protected readonly data = signal<readonly Row[]>(buildRows());

  protected readonly lastReorder = signal<ForVirtualReorderEvent | null>(null);
  protected readonly lastReorderText = computed(() => {
    const r = this.lastReorder();
    return r ? `${r.from}->${r.to}` : 'none';
  });

  protected onReorder(event: ForVirtualReorderEvent): void {
    this.lastReorder.set(event);
    this.data.update((rows) => moveItemInArray(rows, event.from, event.to));
  }
}

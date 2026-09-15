import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
  type ForDragDropEvent,
  ForDragHandle,
  ForDragPlaceholder,
  ForDraggable,
  ForDropList,
  moveItemInArray,
} from 'forty-cdk/drag-drop';

interface Task {
  readonly id: string;
  readonly label: string;
}

@Component({
  selector: 'app-drag-drop-sortable-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForDropList, ForDraggable, ForDragHandle, ForDragPlaceholder],
  template: `
    <ul
      forDropList
      class="list"
      [liveSort]="true"
      [animateReorder]="true"
      (dragDrop)="onDrop($event)"
    >
      @for (task of tasks(); track task.id) {
        <li forDraggable [dragData]="task" class="item">
          <span forDragHandle class="handle" aria-hidden="true">⠿</span>
          <span class="label">{{ task.label }}</span>
          <ng-template forDragPlaceholder>
            <div class="placeholder"></div>
          </ng-template>
        </li>
      }
    </ul>
  `,
  styles: `
    :host {
      display: contents;
    }

    .list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      width: min(320px, 100%);
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .item {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      padding: 0.7rem 0.85rem;
      background: var(--ex-surface, #ffffff);
      border: 1px solid var(--ex-border-strong, #d0c9bc);
      border-radius: var(--ex-radius-sm, 14px);
      box-shadow: var(
        --ex-shadow,
        0 2px 4px rgba(0, 0, 0, 0.04),
        0 20px 40px -18px rgba(0, 0, 0, 0.2)
      );
      font-size: 0.9rem;
    }

    .handle {
      flex: none;
      color: var(--ex-muted, #585d66);
      cursor: grab;
      line-height: 1;
    }

    .handle:active {
      cursor: grabbing;
    }

    .label {
      flex: 1;
    }

    .item[data-dragging] {
      opacity: 0.35;
    }

    .placeholder {
      height: 2.9rem;
      border: 2px dashed var(--ex-accent, #0e7c6b);
      border-radius: var(--ex-radius-sm, 14px);
      background: color-mix(in srgb, var(--ex-accent, #0e7c6b) 10%, transparent);
    }

    .item[data-drag-animating] {
      transition: transform 0.2s ease;
    }

    [data-for-drag-preview][data-settling] {
      transition: transform 0.2s ease;
    }

    @media (prefers-reduced-motion: reduce) {
      .item[data-drag-animating],
      [data-for-drag-preview][data-settling] {
        transition: none;
      }
    }
  `,
})
export class DragDropSortableExample {
  protected readonly tasks = signal<readonly Task[]>([
    { id: 'a', label: 'Draft the release notes' },
    { id: 'b', label: 'Review open pull requests' },
    { id: 'c', label: 'Update the changelog' },
    { id: 'd', label: 'Publish the npm package' },
    { id: 'e', label: 'Announce on the forum' },
  ]);

  protected onDrop(event: ForDragDropEvent): void {
    this.tasks.update((tasks) => moveItemInArray(tasks, event.previousIndex, event.currentIndex));
  }
}

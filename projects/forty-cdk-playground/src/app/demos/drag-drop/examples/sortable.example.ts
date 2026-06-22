import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import {
  type ForDragDropEvent,
  ForDragHandle,
  ForDragPlaceholder,
  ForDraggable,
  ForDropList,
  moveItemInArray,
} from 'forty-cdk/drag-drop';

import { ControlSwitch } from '../../../ui/control-switch';
import { DemoLayout } from '../../../ui/demo-layout';

interface Task {
  readonly id: string;
  readonly label: string;
}

@Component({
  selector: 'app-drag-drop-sortable-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DemoLayout,
    ForDropList,
    ForDraggable,
    ForDragHandle,
    ForDragPlaceholder,
    ControlSwitch,
  ],
  template: `
    <playground-demo
      title="Sortable list"
      subtitle="A vertical [forDropList] of [forDraggable] items, reorderable by pointer and keyboard. Pointer drags start from the [forDragHandle] grip; a fixed-position clone follows the pointer while the source slot dims via data-dragging. Keyboard: focus an item, Space lifts it, arrows step the drop position, Space drops, Escape cancels. liveSort makes the [forDragPlaceholder] follow the live drop index; animateReorder adds FLIP + drop-settle transitions."
      sourcePath="projects/forty-cdk-playground/src/app/demos/drag-drop/examples/sortable.example.ts"
    >
      <div demo class="dd-demo">
        <ul
          forDropList
          class="dd-list"
          [liveSort]="liveSort()"
          [animateReorder]="animateReorder()"
          (dragDrop)="onDrop($event)"
        >
          @for (task of tasks(); track task.id) {
            <li forDraggable [dragData]="task" class="dd-item">
              <span forDragHandle class="dd-handle" aria-hidden="true">⠿</span>
              <span class="dd-label">{{ task.label }}</span>
              <ng-template forDragPlaceholder>
                <div class="dd-placeholder"></div>
              </ng-template>
            </li>
          }
        </ul>
      </div>

      <div controls class="pg-controls">
        <app-control-switch
          label="liveSort"
          hint="Make the placeholder follow the live resolved drop index during a pointer drag, so the neighbours part to reveal where the item lands. With it off, the placeholder stays in the source slot."
          [(checked)]="liveSort"
        />
        <app-control-switch
          label="animateReorder"
          hint="Animate committed drops: displaced items glide to their new positions (FLIP) and the floating preview settles into the final slot. Skipped under prefers-reduced-motion."
          [(checked)]="animateReorder"
        />
        <p class="pg-hint">
          Drag the ⠿ grip, or focus an item and press Space to lift, arrows to move, Space to drop.
        </p>
        <p class="pg-state">
          order: <b>{{ orderLabel() }}</b>
        </p>
      </div>
    </playground-demo>
  `,
  styles: `
    .dd-demo {
      width: min(320px, 100%);
    }

    .dd-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .dd-item {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      padding: 0.7rem 0.85rem;
      background: var(--pg-surface);
      border: 1px solid var(--pg-border-strong);
      border-radius: var(--pg-radius-sm);
      box-shadow: var(--pg-shadow);
      font-size: 0.9rem;
    }

    .dd-handle {
      flex: none;
      color: var(--pg-text-muted);
      cursor: grab;
      line-height: 1;
    }

    .dd-handle:active {
      cursor: grabbing;
    }

    .dd-label {
      flex: 1;
    }

    .dd-item[data-dragging] {
      opacity: 0.35;
    }

    .dd-placeholder {
      height: 2.9rem;
      border: 2px dashed var(--pg-primary);
      border-radius: var(--pg-radius-sm);
      background: color-mix(in srgb, var(--pg-primary) 10%, transparent);
    }

    .dd-item[data-drag-animating] {
      transition: transform 0.2s ease;
    }

    [data-for-drag-preview][data-settling] {
      transition: transform 0.2s ease;
    }
  `,
})
export class DragDropSortableExample {
  protected readonly liveSort = signal(true);
  protected readonly animateReorder = signal(true);

  protected readonly tasks = signal<readonly Task[]>([
    { id: 'a', label: 'Draft the release notes' },
    { id: 'b', label: 'Review open pull requests' },
    { id: 'c', label: 'Update the changelog' },
    { id: 'd', label: 'Publish the npm package' },
    { id: 'e', label: 'Announce on the forum' },
  ]);

  protected readonly orderLabel = computed(() =>
    this.tasks()
      .map((task) => task.id)
      .join(' → '),
  );

  protected onDrop(event: ForDragDropEvent): void {
    this.tasks.update((tasks) => moveItemInArray(tasks, event.previousIndex, event.currentIndex));
  }
}

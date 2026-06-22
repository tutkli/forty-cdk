import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import {
  type ForDragDropEvent,
  ForDragPlaceholder,
  ForDragPreview,
  ForDraggable,
  ForDropList,
  moveItemInArray,
} from 'forty-cdk/drag-drop';

import { DemoLayout } from '../../../ui/demo-layout';

interface Swatch {
  readonly id: string;
  readonly name: string;
  readonly color: string;
}

@Component({
  selector: 'app-drag-drop-constraints-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DemoLayout, ForDropList, ForDraggable, ForDragPreview, ForDragPlaceholder],
  template: `
    <playground-demo
      title="Axis lock, boundary & custom preview"
      subtitle="A horizontal palette constrained by two opt-in visuals: lockAxis='x' pins the preview to its lift-time vertical position, and [boundary] (here a CSS selector resolved via closest()) clamps the preview inside the dashed frame. A <ng-template forDragPreview> replaces the default clone with a styled tile, and <ng-template forDragPlaceholder> fills the source slot. Both constraints affect only the pointer preview — never the resolved drop index or keyboard dragging."
      sourcePath="projects/forty-cdk-playground/src/app/demos/drag-drop/examples/constraints.example.ts"
    >
      <div demo class="dd-frame dd-bounds">
        <ul
          forDropList
          orientation="horizontal"
          lockAxis="x"
          [boundary]="'.dd-bounds'"
          class="dd-strip"
          (dragDrop)="onDrop($event)"
        >
          @for (swatch of swatches(); track swatch.id) {
            <li forDraggable [dragData]="swatch" class="dd-swatch" [style.--swatch]="swatch.color">
              <span class="dd-chip" [style.background]="swatch.color"></span>
              <span class="dd-name">{{ swatch.name }}</span>

              <ng-template forDragPreview>
                <div class="dd-preview">
                  <span class="dd-chip" [style.background]="swatch.color"></span>
                  <span class="dd-name">{{ swatch.name }}</span>
                </div>
              </ng-template>
              <ng-template forDragPlaceholder>
                <div class="dd-slot"></div>
              </ng-template>
            </li>
          }
        </ul>
      </div>

      <div controls class="pg-controls">
        <p class="pg-hint">
          Drag a tile sideways — it can't leave the dashed frame or drift vertically. The floating
          tile is the custom preview; the dashed gap is the custom placeholder.
        </p>
        <p class="pg-state">
          order: <b>{{ orderLabel() }}</b>
        </p>
      </div>
    </playground-demo>
  `,
  styles: `
    .dd-frame {
      width: min(520px, 100%);
      padding: 1.25rem;
      border: 2px dashed var(--pg-border-strong);
      border-radius: var(--pg-radius);
      background: var(--pg-surface-2);
    }

    .dd-strip {
      display: flex;
      gap: 0.6rem;
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .dd-swatch,
    .dd-preview {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.4rem;
      width: 84px;
      padding: 0.6rem;
      background: var(--pg-surface);
      border: 1px solid var(--pg-border-strong);
      border-radius: var(--pg-radius-sm);
      cursor: grab;
    }

    .dd-swatch:active {
      cursor: grabbing;
    }

    .dd-preview {
      box-shadow: var(--pg-shadow);
      cursor: grabbing;
    }

    .dd-chip {
      width: 100%;
      height: 36px;
      border-radius: var(--pg-radius-sm);
    }

    .dd-name {
      font-size: 0.78rem;
      color: var(--pg-text-muted);
    }

    .dd-swatch[data-dragging] {
      opacity: 0.35;
    }

    .dd-slot {
      width: 84px;
      align-self: stretch;
      border: 2px dashed var(--pg-primary);
      border-radius: var(--pg-radius-sm);
      background: color-mix(in srgb, var(--pg-primary) 10%, transparent);
    }
  `,
})
export class DragDropConstraintsExample {
  protected readonly swatches = signal<readonly Swatch[]>([
    { id: 'teal', name: 'Teal', color: '#0d9488' },
    { id: 'coral', name: 'Coral', color: '#ff7a59' },
    { id: 'indigo', name: 'Indigo', color: '#6366f1' },
    { id: 'amber', name: 'Amber', color: '#d97706' },
    { id: 'rose', name: 'Rose', color: '#e11d48' },
  ]);

  protected readonly orderLabel = computed(() =>
    this.swatches()
      .map((swatch) => swatch.name)
      .join(' · '),
  );

  protected onDrop(event: ForDragDropEvent): void {
    this.swatches.update((swatches) =>
      moveItemInArray(swatches, event.previousIndex, event.currentIndex),
    );
  }
}

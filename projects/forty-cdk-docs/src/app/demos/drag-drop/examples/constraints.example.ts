import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
  type ForDragDropEvent,
  ForDragPlaceholder,
  ForDragPreview,
  ForDraggable,
  ForDropList,
  moveItemInArray,
} from 'forty-cdk/drag-drop';

interface Swatch {
  readonly id: string;
  readonly name: string;
  readonly color: string;
}

@Component({
  selector: 'app-drag-drop-constraints-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForDropList, ForDraggable, ForDragPreview, ForDragPlaceholder],
  template: `
    <div class="frame bounds">
      <ul
        forDropList
        orientation="horizontal"
        lockAxis="x"
        [boundary]="'.bounds'"
        class="strip"
        (dragDrop)="onDrop($event)"
      >
        @for (swatch of swatches(); track swatch.id) {
          <li forDraggable [dragData]="swatch" class="swatch" [style.--swatch]="swatch.color">
            <span class="chip" [style.background]="swatch.color"></span>
            <span class="name">{{ swatch.name }}</span>

            <ng-template forDragPreview>
              <div class="preview">
                <span class="chip" [style.background]="swatch.color"></span>
                <span class="name">{{ swatch.name }}</span>
              </div>
            </ng-template>
            <ng-template forDragPlaceholder>
              <div class="slot"></div>
            </ng-template>
          </li>
        }
      </ul>
    </div>
  `,
  styles: `
    :host {
      display: contents;
    }

    .frame {
      width: min(520px, 100%);
      padding: 1.25rem;
      border: 2px dashed var(--pg-border-strong);
      border-radius: var(--pg-radius);
      background: var(--pg-surface-2);
    }

    .strip {
      display: flex;
      gap: 0.6rem;
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .swatch,
    .preview {
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

    .swatch:active {
      cursor: grabbing;
    }

    .preview {
      box-shadow: var(--pg-shadow);
      cursor: grabbing;
    }

    .chip {
      width: 100%;
      height: 36px;
      border-radius: var(--pg-radius-sm);
    }

    .name {
      font-size: 0.78rem;
      color: var(--pg-text-muted);
    }

    .swatch[data-dragging] {
      opacity: 0.35;
    }

    .slot {
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

  protected onDrop(event: ForDragDropEvent): void {
    this.swatches.update((swatches) =>
      moveItemInArray(swatches, event.previousIndex, event.currentIndex),
    );
  }
}

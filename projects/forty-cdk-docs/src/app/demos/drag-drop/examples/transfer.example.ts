import {
  ChangeDetectionStrategy,
  Component,
  type ElementRef,
  signal,
  viewChild,
} from '@angular/core';
import {
  type ForDragDropEvent,
  ForDraggable,
  ForDropList,
  ForDropListGroup,
  moveItemInArray,
  transferArrayItem,
} from 'forty-cdk/drag-drop';

interface Card {
  readonly id: string;
  readonly label: string;
}

@Component({
  selector: 'app-drag-drop-transfer-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForDropListGroup, ForDropList, ForDraggable],
  template: `
    <div class="board" forDropListGroup>
      <section class="column">
        <h3 class="column-title">To do · {{ todo().length }}</h3>
        <ul #todoList forDropList class="stack" (dragDrop)="onDrop($event)">
          @for (card of todo(); track card.id) {
            <li forDraggable [dragData]="card" class="card">{{ card.label }}</li>
          } @empty {
            <li class="empty">Drop cards here</li>
          }
        </ul>
      </section>

      <section class="column">
        <h3 class="column-title">Done · {{ done().length }}</h3>
        <ul #doneList forDropList class="stack" (dragDrop)="onDrop($event)">
          @for (card of done(); track card.id) {
            <li forDraggable [dragData]="card" class="card card--done">{{ card.label }}</li>
          } @empty {
            <li class="empty">Drop cards here</li>
          }
        </ul>
      </section>
    </div>
  `,
  styles: `
    :host {
      display: contents;
    }

    .board {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
      width: min(520px, 100%);
    }

    .column {
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
    }

    .column-title {
      margin: 0;
      font-size: 0.72rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--ex-muted, #585d66);
    }

    .stack {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      min-height: 160px;
      margin: 0;
      padding: 0.6rem;
      list-style: none;
      background: var(--ex-surface-2, #f2eee6);
      border: 1px solid var(--ex-border, #e5e0d6);
      border-radius: var(--ex-radius-sm, 14px);
    }

    .stack[data-drag-over] {
      border-color: var(--ex-accent, #0e7c6b);
      background: color-mix(in srgb, var(--ex-accent, #0e7c6b) 8%, var(--ex-surface-2, #f2eee6));
    }

    .card {
      padding: 0.65rem 0.8rem;
      background: var(--ex-surface, #ffffff);
      border: 1px solid var(--ex-border-strong, #d0c9bc);
      border-radius: var(--ex-radius-sm, 14px);
      box-shadow: var(
        --ex-shadow,
        0 2px 4px rgba(0, 0, 0, 0.04),
        0 20px 40px -18px rgba(0, 0, 0, 0.2)
      );
      font-size: 0.88rem;
      cursor: grab;
    }

    .card:active {
      cursor: grabbing;
    }

    .card--done {
      color: var(--ex-muted, #585d66);
      text-decoration: line-through;
    }

    .card[data-dragging] {
      opacity: 0.35;
    }

    .empty {
      padding: 0.65rem 0.8rem;
      font-size: 0.82rem;
      color: var(--ex-muted, #585d66);
      text-align: center;
    }
  `,
})
export class DragDropTransferExample {
  private readonly doneList = viewChild.required<ElementRef<HTMLElement>>('doneList');

  protected readonly todo = signal<readonly Card[]>([
    { id: '1', label: 'Sketch the wireframes' },
    { id: '2', label: 'Wire up the API' },
    { id: '3', label: 'Write the tests' },
  ]);
  protected readonly done = signal<readonly Card[]>([
    { id: '4', label: 'Set up the repo' },
    { id: '5', label: 'Pick the colour palette' },
  ]);

  protected onDrop(event: ForDragDropEvent): void {
    const targetIsDone = event.container.host === this.doneList().nativeElement;

    if (event.previousContainer === event.container) {
      const move = (cards: readonly Card[]) =>
        moveItemInArray(cards, event.previousIndex, event.currentIndex);
      if (targetIsDone) {
        this.done.update(move);
      } else {
        this.todo.update(move);
      }
      return;
    }

    const result = transferArrayItem(
      targetIsDone ? this.todo() : this.done(),
      targetIsDone ? this.done() : this.todo(),
      event.previousIndex,
      event.currentIndex,
    );
    if (targetIsDone) {
      this.todo.set(result.from);
      this.done.set(result.to);
    } else {
      this.done.set(result.from);
      this.todo.set(result.to);
    }
  }
}

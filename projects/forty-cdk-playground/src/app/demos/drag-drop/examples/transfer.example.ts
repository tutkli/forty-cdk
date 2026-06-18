import {
  ChangeDetectionStrategy,
  Component,
  type ElementRef,
  signal,
  viewChild,
} from '@angular/core';
import {
  ForDraggable,
  type ForDragDropEvent,
  ForDropList,
  ForDropListGroup,
  moveItemInArray,
  transferArrayItem,
} from 'forty-cdk';

import { DemoLayout } from '../../../ui/demo-layout';

interface Card {
  readonly id: string;
  readonly label: string;
}

@Component({
  selector: 'app-drag-drop-transfer-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DemoLayout, ForDropListGroup, ForDropList, ForDraggable],
  template: `
    <playground-demo
      title="Transfer between lists"
      subtitle="Wrap two [forDropList] columns in [forDropListGroup] and they connect automatically — items drag within a column or across to the other. The (dragDrop) event fires on the source list with previousContainer / container contexts; compare them to choose moveItemInArray (same list) or transferArrayItem (across lists). Works by pointer and keyboard alike."
      sourcePath="projects/forty-cdk-playground/src/app/demos/drag-drop/examples/transfer.example.ts"
    >
      <div demo class="dd-board" forDropListGroup>
        <section class="dd-column">
          <h3 class="dd-column-title">To do · {{ todo().length }}</h3>
          <ul #todoList forDropList class="dd-stack" (dragDrop)="onDrop($event)">
            @for (card of todo(); track card.id) {
              <li forDraggable [dragData]="card" class="dd-card">{{ card.label }}</li>
            } @empty {
              <li class="dd-empty">Drop cards here</li>
            }
          </ul>
        </section>

        <section class="dd-column">
          <h3 class="dd-column-title">Done · {{ done().length }}</h3>
          <ul #doneList forDropList class="dd-stack" (dragDrop)="onDrop($event)">
            @for (card of done(); track card.id) {
              <li forDraggable [dragData]="card" class="dd-card dd-card--done">{{ card.label }}</li>
            } @empty {
              <li class="dd-empty">Drop cards here</li>
            }
          </ul>
        </section>
      </div>

      <div controls class="pg-controls">
        <p class="pg-hint">
          Drag a card between columns, or use the keyboard: Space to lift, arrows to move (including
          across the gap to the other column), Space to drop.
        </p>
        <p class="pg-state">
          to do: <b>{{ todo().length }}</b
          ><br />
          done: <b>{{ done().length }}</b>
        </p>
      </div>
    </playground-demo>
  `,
  styles: `
    .dd-board {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
      width: min(520px, 100%);
    }

    .dd-column {
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
    }

    .dd-column-title {
      margin: 0;
      font-size: 0.72rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--pg-text-muted);
    }

    .dd-stack {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      min-height: 160px;
      margin: 0;
      padding: 0.6rem;
      list-style: none;
      background: var(--pg-surface-2);
      border: 1px solid var(--pg-border);
      border-radius: var(--pg-radius-sm);
    }

    .dd-stack[data-drag-over] {
      border-color: var(--pg-primary);
      background: color-mix(in srgb, var(--pg-primary) 8%, var(--pg-surface-2));
    }

    .dd-card {
      padding: 0.65rem 0.8rem;
      background: var(--pg-surface);
      border: 1px solid var(--pg-border-strong);
      border-radius: var(--pg-radius-sm);
      box-shadow: var(--pg-shadow);
      font-size: 0.88rem;
      cursor: grab;
    }

    .dd-card:active {
      cursor: grabbing;
    }

    .dd-card--done {
      color: var(--pg-text-muted);
      text-decoration: line-through;
    }

    .dd-card[data-dragging] {
      opacity: 0.35;
    }

    .dd-empty {
      padding: 0.65rem 0.8rem;
      font-size: 0.82rem;
      color: var(--pg-text-muted);
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

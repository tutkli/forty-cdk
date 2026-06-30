import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ForDragHandle, ForFreeDrag } from 'forty-cdk/drag-drop';

@Component({
  selector: 'app-drag-drop-free-drag-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForFreeDrag, ForDragHandle],
  template: `
    <div class="viewport">
      <div class="card" forFreeDrag boundary=".viewport" [(position)]="position">Drag me</div>

      <div class="dialog">
        <header forFreeDrag rootElement=".dialog" boundary=".viewport" class="dialog-bar">
          <span forDragHandle aria-hidden="true" class="grip">⠿</span>
          Drag by header
        </header>
        <div class="dialog-body">rootElement moves the whole panel.</div>
      </div>
    </div>
  `,
  styles: `
    :host {
      display: contents;
    }

    .viewport {
      position: relative;
      width: min(440px, 100%);
      height: 280px;
      border: 2px dashed var(--pg-border-strong);
      border-radius: var(--pg-radius);
      background: var(--pg-surface-2);
      overflow: hidden;
    }

    .card {
      position: absolute;
      top: 16px;
      left: 16px;
      display: grid;
      place-items: center;
      width: 96px;
      height: 96px;
      background: var(--pg-primary);
      color: var(--pg-on-primary, #fff);
      border-radius: var(--pg-radius-sm);
      box-shadow: var(--pg-shadow);
      font-size: 0.85rem;
      font-weight: 600;
      cursor: grab;
      user-select: none;
    }

    .card[data-dragging] {
      cursor: grabbing;
    }

    .card[data-disabled] {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .dialog {
      position: absolute;
      top: 40px;
      left: 220px;
      width: 180px;
      background: var(--pg-surface);
      border: 1px solid var(--pg-border-strong);
      border-radius: var(--pg-radius-sm);
      box-shadow: var(--pg-shadow);
      overflow: hidden;
    }

    .dialog-bar {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.5rem 0.6rem;
      background: var(--pg-surface-2);
      border-bottom: 1px solid var(--pg-border);
      font-size: 0.82rem;
      font-weight: 600;
      cursor: grab;
      user-select: none;
    }

    .dialog-bar[data-dragging] {
      cursor: grabbing;
    }

    .grip {
      flex: none;
      color: var(--pg-text-muted);
      line-height: 1;
      cursor: grab;
      touch-action: none;
    }

    .dialog-body {
      padding: 0.7rem 0.6rem;
      font-size: 0.78rem;
      color: var(--pg-text-muted);
    }
  `,
})
export class DragDropFreeDragExample {
  protected readonly position = signal<{ x: number; y: number }>({ x: 0, y: 0 });
}

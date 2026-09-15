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
      border: 2px dashed var(--ex-border-strong, #d0c9bc);
      border-radius: var(--ex-radius, 22px);
      corner-shape: squircle;
      background: var(--ex-surface-2, #f2eee6);
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
      background: var(--ex-accent, #0e7c6b);
      color: var(--ex-accent-contrast, #ffffff);
      border-radius: var(--ex-radius-sm, 14px);
      box-shadow: var(
        --ex-shadow,
        0 2px 4px rgba(0, 0, 0, 0.04),
        0 20px 40px -18px rgba(0, 0, 0, 0.2)
      );
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
      background: var(--ex-surface, #ffffff);
      border: 1px solid var(--ex-border-strong, #d0c9bc);
      border-radius: var(--ex-radius-sm, 14px);
      box-shadow: var(
        --ex-shadow,
        0 2px 4px rgba(0, 0, 0, 0.04),
        0 20px 40px -18px rgba(0, 0, 0, 0.2)
      );
      overflow: hidden;
    }

    .dialog-bar {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.5rem 0.6rem;
      background: var(--ex-surface-2, #f2eee6);
      border-bottom: 1px solid var(--ex-border, #e5e0d6);
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
      color: var(--ex-muted, #585d66);
      line-height: 1;
      cursor: grab;
      touch-action: none;
    }

    .dialog-body {
      padding: 0.7rem 0.6rem;
      font-size: 0.78rem;
      color: var(--ex-muted, #585d66);
    }
  `,
})
export class DragDropFreeDragExample {
  protected readonly position = signal<{ x: number; y: number }>({ x: 0, y: 0 });
}

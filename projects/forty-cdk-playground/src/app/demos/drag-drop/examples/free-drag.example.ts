import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { ForDragHandle, ForFreeDrag } from 'forty-cdk';

import { ControlSelect, type ControlOption } from '../../../ui/control-select';
import { ControlSwitch } from '../../../ui/control-switch';
import { DemoLayout } from '../../../ui/demo-layout';

type LockAxisChoice = 'none' | 'x' | 'y';

@Component({
  selector: 'app-drag-drop-free-drag-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DemoLayout, ForFreeDrag, ForDragHandle, ControlSelect, ControlSwitch],
  template: `
    <playground-demo
      title="Free drag (forFreeDrag)"
      subtitle="[forFreeDrag] repositions its host (or a resolved rootElement) by pointer drag via a CSS transform — no [forDropList], no reorder. The blue card moves itself, confined to the dashed boundary; lockAxis pins one axis and the two-way [(position)] is restorable (Reset). The panel is dragged by its header via rootElement, so a child handle moves the whole ancestor. Pointer-only by design (no WAI-ARIA pattern for 'reposition an element'); the moved element keeps its own semantics."
      sourcePath="projects/forty-cdk-playground/src/app/demos/drag-drop/examples/free-drag.example.ts"
    >
      <div demo class="fd-viewport">
        <div
          class="fd-card"
          forFreeDrag
          boundary=".fd-viewport"
          [lockAxis]="lockAxis()"
          [disabled]="disabled()"
          [(position)]="position"
          (dragStart)="dragging.set(true)"
          (dragEnd)="dragging.set(false)"
        >
          Drag me
        </div>

        <div class="fd-dialog">
          <header
            forFreeDrag
            rootElement=".fd-dialog"
            boundary=".fd-viewport"
            class="fd-dialog-bar"
          >
            <span forDragHandle aria-hidden="true" class="fd-grip">⠿</span>
            Drag by header
          </header>
          <div class="fd-dialog-body">rootElement moves the whole panel.</div>
        </div>
      </div>

      <div controls class="pg-controls">
        <app-control-select
          label="lockAxis"
          hint="Constrain the card to one axis. 'x' pins its lift-time y (horizontal-only); 'y' pins its lift-time x (vertical-only)."
          [options]="lockAxisOptions"
          [(value)]="lockAxisChoice"
        />
        <app-control-switch
          label="disabled"
          hint="When on, the card can't be dragged (the transform doesn't change). The header panel stays draggable."
          [(checked)]="disabled"
        />
        <button type="button" class="pg-btn" (click)="reset()">Reset position</button>
        <p class="pg-hint">
          Drag the blue card anywhere inside the frame, or drag the panel by its ⠿ header.
        </p>
        <p class="pg-state">
          position: <b>{{ posLabel() }}</b>
        </p>
        <p class="pg-state">
          dragging: <b>{{ dragging() ? 'yes' : 'no' }}</b>
        </p>
      </div>
    </playground-demo>
  `,
  styles: `
    .fd-viewport {
      position: relative;
      width: min(440px, 100%);
      height: 280px;
      border: 2px dashed var(--pg-border-strong);
      border-radius: var(--pg-radius);
      background: var(--pg-surface-2);
      overflow: hidden;
    }

    .fd-card {
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

    .fd-card[data-dragging] {
      cursor: grabbing;
    }

    .fd-card[data-disabled] {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .fd-dialog {
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

    .fd-dialog-bar {
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

    .fd-dialog-bar[data-dragging] {
      cursor: grabbing;
    }

    .fd-grip {
      flex: none;
      color: var(--pg-text-muted);
      line-height: 1;
      cursor: grab;
      touch-action: none;
    }

    .fd-dialog-body {
      padding: 0.7rem 0.6rem;
      font-size: 0.78rem;
      color: var(--pg-text-muted);
    }
  `,
})
export class DragDropFreeDragExample {
  protected readonly position = signal<{ x: number; y: number }>({ x: 0, y: 0 });
  protected readonly dragging = signal(false);
  protected readonly disabled = signal(false);
  protected readonly lockAxisChoice = signal<LockAxisChoice>('none');

  protected readonly lockAxisOptions: readonly ControlOption<LockAxisChoice>[] = [
    { value: 'none', label: 'None (free)' },
    { value: 'x', label: 'X (horizontal)' },
    { value: 'y', label: 'Y (vertical)' },
  ];

  protected readonly lockAxis = computed<'x' | 'y' | null>(() => {
    const choice = this.lockAxisChoice();
    return choice === 'none' ? null : choice;
  });

  protected readonly posLabel = computed(() => {
    const { x, y } = this.position();
    return `${Math.round(x)}, ${Math.round(y)}`;
  });

  protected reset(): void {
    this.position.set({ x: 0, y: 0 });
  }
}

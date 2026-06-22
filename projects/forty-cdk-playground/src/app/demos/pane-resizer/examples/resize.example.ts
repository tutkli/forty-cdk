import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ForPaneResizer } from 'forty-cdk/pane-resizer';

import { ControlSwitch } from '../../../ui/control-switch';
import { DemoLayout } from '../../../ui/demo-layout';

@Component({
  selector: 'app-pane-resizer-resize-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DemoLayout, ForPaneResizer, ControlSwitch],
  template: `
    <playground-demo
      title="Resizable panes"
      subtitle="A focusable Window Splitter between two panes. Drag the bar, or focus it and use the arrow keys, PageUp / PageDown and Home / End to resize. It reports aria-valuenow / aria-valuemin / aria-valuemax and commits the final size on release."
      sourcePath="projects/forty-cdk-playground/src/app/demos/pane-resizer/examples/resize.example.ts"
    >
      <div demo class="pr-split">
        <div id="pr-pane-a" class="pr-pane pr-pane-a" [style.flex-basis.px]="size()">
          {{ size() }}px
        </div>
        <div
          forPaneResizer
          orientation="vertical"
          class="pr-resizer"
          aria-label="Resize panes"
          controls="pr-pane-a pr-pane-b"
          [(value)]="size"
          [min]="120"
          [max]="520"
          [step]="8"
          [largeStep]="48"
          [disabled]="disabled()"
          (resizeCommit)="committed.set($event)"
        ></div>
        <div id="pr-pane-b" class="pr-pane pr-pane-b">flex: 1</div>
      </div>

      <div controls class="pg-controls">
        <app-control-switch label="disabled" [(checked)]="disabled" />

        <p class="pg-state">
          size: <b>{{ size() }}</b
          ><br />
          committed: <b>{{ committed() }}</b>
        </p>
      </div>
    </playground-demo>
  `,
  styles: `
    .pr-split {
      display: flex;
      align-items: stretch;
      width: min(560px, 100%);
      height: 180px;
      border: 1px solid var(--pg-border);
      border-radius: var(--pg-radius);
      overflow: hidden;
    }

    .pr-pane {
      display: grid;
      place-items: center;
      font-weight: 600;
      font-variant-numeric: tabular-nums;
      color: var(--pg-text-muted);
      background: var(--pg-surface-2);
    }

    .pr-pane-a {
      flex: 0 0 auto;
    }

    .pr-pane-b {
      flex: 1;
    }

    .pr-resizer {
      flex: none;
      width: 12px;
      padding: 0;
      border: 0;
      background: var(--pg-border);
      cursor: ew-resize;
      touch-action: none;
      position: relative;
    }

    .pr-resizer::after {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 2px;
      height: 28px;
      border-radius: 2px;
      background: var(--pg-border-strong);
    }

    .pr-resizer:hover {
      background: var(--pg-border-strong);
    }

    .pr-resizer:focus-visible {
      outline: 2px solid var(--pg-primary);
      outline-offset: -2px;
    }

    .pr-resizer[data-disabled] {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `,
})
export class PaneResizerResizeExample {
  protected readonly size = signal(240);
  protected readonly committed = signal(240);
  protected readonly disabled = signal(false);
}

import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ForSeparator } from 'forty-cdk';

import { ControlSwitch } from '../ui/control-switch';
import { DemoLayout } from '../ui/demo-layout';

@Component({
  selector: 'app-separator-demo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DemoLayout, ForSeparator, ControlSwitch],
  template: `
    <playground-demo
      title="Separator"
      summary="A decorative or semantic divider, plus a focusable resizer variant. Focus the bar between the panes and drag it, or use the arrow keys, PageUp / PageDown and Home / End to resize."
      apgUrl="https://www.w3.org/WAI/ARIA/apg/patterns/windowsplitter/"
    >
      <div demo class="sep-demo">
        <div class="sep-card">
          <span class="sep-label">Account</span>
          <hr forSeparator class="sep-h" />
          <span class="sep-label">Workspace</span>
          <hr forSeparator class="sep-h" />
          <div class="sep-inline">
            <span>Edit</span>
            <span forSeparator decorative orientation="vertical" class="sep-v"></span>
            <span>Share</span>
            <span forSeparator decorative orientation="vertical" class="sep-v"></span>
            <span>Delete</span>
          </div>
        </div>

        <div class="sep-split">
          <div id="sep-pane-a" class="sep-pane sep-pane-a" [style.flex-basis.px]="size()">
            {{ size() }}px
          </div>
          <div
            forSeparator
            focusable
            orientation="vertical"
            class="sep-resizer"
            aria-label="Resize panes"
            controls="sep-pane-a sep-pane-b"
            [(value)]="size"
            [min]="120"
            [max]="520"
            [step]="8"
            [largeStep]="48"
            [disabled]="disabled()"
            (resizeCommit)="committed.set($event)"
          ></div>
          <div id="sep-pane-b" class="sep-pane sep-pane-b">flex: 1</div>
        </div>
      </div>

      <div controls class="pg-controls">
        <app-control-switch label="disabled (resizer)" [(checked)]="disabled" />

        <p class="pg-state">
          size: <b>{{ size() }}</b
          ><br />
          committed: <b>{{ committed() }}</b>
        </p>
      </div>
    </playground-demo>
  `,
  styles: `
    .sep-demo {
      width: min(560px, 100%);
      display: flex;
      flex-direction: column;
      gap: 2rem;
    }

    .sep-card {
      display: flex;
      flex-direction: column;
      gap: 0.7rem;
      padding: 1rem 1.1rem;
      background: var(--pg-surface);
      border: 1px solid var(--pg-border);
      border-radius: var(--pg-radius);
    }

    .sep-label {
      font-weight: 600;
    }

    .sep-h {
      width: 100%;
      height: 1px;
      margin: 0;
      border: 0;
      background: var(--pg-border);
    }

    .sep-inline {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      color: var(--pg-text-muted);
    }

    .sep-v {
      width: 1px;
      height: 16px;
      background: var(--pg-border-strong);
    }

    .sep-split {
      display: flex;
      align-items: stretch;
      width: 100%;
      height: 150px;
      border: 1px solid var(--pg-border);
      border-radius: var(--pg-radius);
      overflow: hidden;
    }

    .sep-pane {
      display: grid;
      place-items: center;
      font-weight: 600;
      font-variant-numeric: tabular-nums;
      color: var(--pg-text-muted);
      background: var(--pg-surface-2);
    }

    .sep-pane-a {
      flex: 0 0 auto;
    }

    .sep-pane-b {
      flex: 1;
    }

    .sep-resizer {
      flex: none;
      width: 12px;
      padding: 0;
      border: 0;
      background: var(--pg-border);
      cursor: ew-resize;
      touch-action: none;
      position: relative;
    }

    .sep-resizer::after {
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

    .sep-resizer:hover {
      background: var(--pg-border-strong);
    }

    .sep-resizer:focus-visible {
      outline: 2px solid var(--pg-primary);
      outline-offset: -2px;
    }

    .sep-resizer[data-disabled] {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `,
})
export class SeparatorDemo {
  protected readonly size = signal(240);
  protected readonly committed = signal(240);
  protected readonly disabled = signal(false);
}

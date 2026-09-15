import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ForPaneResizer } from 'forty-cdk/pane-resizer';

@Component({
  selector: 'app-pane-resizer-states-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForPaneResizer],
  template: `
    <div class="states">
      <div class="state">
        <span class="state-label">Default</span>
        <div class="pr-split">
          <div id="pr-states-a" class="pr-pane pr-pane-a" [style.flex-basis.px]="size()">
            {{ size() }}px
          </div>
          <div
            forPaneResizer
            orientation="vertical"
            class="pr-resizer"
            aria-label="Resize panes"
            controls="pr-states-a pr-states-b"
            [(value)]="size"
            [min]="120"
            [max]="420"
            [step]="8"
            [largeStep]="48"
          ></div>
          <div id="pr-states-b" class="pr-pane pr-pane-b">flex: 1</div>
        </div>
      </div>

      <div class="state">
        <span class="state-label">Disabled</span>
        <div class="pr-split">
          <div id="pr-states-locked-a" class="pr-pane pr-pane-a" [style.flex-basis.px]="locked()">
            {{ locked() }}px
          </div>
          <div
            forPaneResizer
            orientation="vertical"
            class="pr-resizer"
            aria-label="Resize panes"
            controls="pr-states-locked-a pr-states-locked-b"
            [(value)]="locked"
            [min]="120"
            [max]="420"
            [step]="8"
            [largeStep]="48"
            disabled
          ></div>
          <div id="pr-states-locked-b" class="pr-pane pr-pane-b">flex: 1</div>
        </div>
      </div>
    </div>
  `,
  styles: `
    :host {
      display: contents;
    }

    .states {
      display: flex;
      flex-direction: column;
      gap: 1.4rem;
      width: min(480px, 100%);
    }

    .state {
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
    }

    .state-label {
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--ex-muted, #585d66);
    }

    .pr-split {
      display: flex;
      align-items: stretch;
      height: 120px;
      border: 1px solid var(--ex-border, #e5e0d6);
      border-radius: var(--ex-radius, 22px);
      corner-shape: squircle;
      overflow: hidden;
    }

    .pr-pane {
      display: grid;
      place-items: center;
      font-weight: 600;
      font-variant-numeric: tabular-nums;
      color: var(--ex-muted, #585d66);
      background: var(--ex-surface-2, #f2eee6);
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
      background: var(--ex-border, #e5e0d6);
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
      background: var(--ex-border-strong, #d0c9bc);
    }

    .pr-resizer:hover:not([data-disabled]) {
      background: var(--ex-border-strong, #d0c9bc);
    }

    .pr-resizer:focus-visible {
      outline: 2px solid var(--ex-accent, #0e7c6b);
      outline-offset: -2px;
    }

    .pr-resizer[data-disabled] {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `,
})
export class PaneResizerStatesExample {
  protected readonly size = signal(240);
  protected readonly locked = signal(200);
}

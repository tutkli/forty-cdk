import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { ForPaneResizer } from 'forty-cdk/pane-resizer';

@Component({
  selector: 'app-pane-resizer-collapsible-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForPaneResizer],
  template: `
    <div class="cs-split">
      <aside id="cs-side" class="cs-side" [style.flex-basis.px]="size()">
        @if (collapsed()) {
          <span class="cs-rail">⋮</span>
        } @else {
          <nav class="cs-nav">
            <span class="cs-item">Overview</span>
            <span class="cs-item">Activity</span>
            <span class="cs-item">Members</span>
            <span class="cs-item">Settings</span>
          </nav>
        }
      </aside>
      <div
        forPaneResizer
        orientation="vertical"
        class="cs-resizer"
        aria-label="Resize sidebar"
        controls="cs-side cs-main"
        [(value)]="size"
        [min]="0"
        [max]="320"
        [step]="8"
        [largeStep]="64"
        [collapsible]="true"
      ></div>
      <main id="cs-main" class="cs-main">
        <p>
          Focus the divider and press <kbd>Enter</kbd> to collapse the sidebar, then
          <kbd>Enter</kbd> again to bring it back to {{ size() }}px.
        </p>
      </main>
    </div>
  `,
  styles: `
    :host {
      display: contents;
    }

    .cs-split {
      display: flex;
      align-items: stretch;
      width: min(560px, 100%);
      height: 200px;
      border: 1px solid var(--ex-border, #e5e0d6);
      border-radius: var(--ex-radius, 22px);
      corner-shape: squircle;
      overflow: hidden;
    }

    .cs-side {
      flex: 0 0 auto;
      min-width: 0;
      overflow: hidden;
      background: var(--ex-surface-2, #f2eee6);
    }

    .cs-nav {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
      padding: 0.75rem;
    }

    .cs-item {
      padding: 0.4rem 0.6rem;
      border-radius: var(--ex-radius-sm, 14px);
      white-space: nowrap;
      color: var(--ex-text, #17191c);
    }

    .cs-rail {
      display: grid;
      place-items: center;
      height: 100%;
      color: var(--ex-muted, #585d66);
    }

    .cs-main {
      flex: 1;
      padding: 1rem 1.2rem;
      color: var(--ex-muted, #585d66);
    }

    .cs-main kbd {
      font: inherit;
      font-size: 0.8em;
      padding: 0.05rem 0.35rem;
      border: 1px solid var(--ex-border-strong, #d0c9bc);
      border-radius: 4px;
      background: var(--ex-surface, #ffffff);
    }

    .cs-resizer {
      flex: none;
      width: 12px;
      padding: 0;
      border: 0;
      background: var(--ex-border, #e5e0d6);
      cursor: ew-resize;
      touch-action: none;
      position: relative;
    }

    .cs-resizer::after {
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

    .cs-resizer:hover {
      background: var(--ex-border-strong, #d0c9bc);
    }

    .cs-resizer:focus-visible {
      outline: 2px solid var(--ex-accent, #0e7c6b);
      outline-offset: -2px;
    }
  `,
})
export class PaneResizerCollapsibleExample {
  protected readonly size = signal(220);

  protected readonly collapsed = computed(() => this.size() <= 0);
}

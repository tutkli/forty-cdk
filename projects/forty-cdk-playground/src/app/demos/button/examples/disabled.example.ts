import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ForButton } from 'forty-cdk/button';

import { DemoLayout } from '../../../ui/demo-layout';

@Component({
  selector: 'app-button-disabled-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DemoLayout, ForButton],
  template: `
    <playground-demo
      title="Disabled stays focusable"
      subtitle="Per the APG, a disabled button must stay reachable so assistive tech can announce it. forButton never sets the native disabled attribute — it reflects aria-disabled='true' + data-disabled and makes activation a no-op. Tab through both: the forButton is still reachable and announced, the native disabled button is skipped entirely."
      sourcePath="projects/forty-cdk-playground/src/app/demos/button/examples/disabled.example.ts"
    >
      <div demo class="stage">
        <div class="col">
          <span class="cap">forButton [disabled]</span>
          <button
            forButton
            class="btn"
            [disabled]="true"
            (activate)="count.update((n) => n + 1)"
            (focusin)="focused.set('forButton')"
          >
            Submit
          </button>
          <span class="tag tag--ok">focusable · aria-disabled</span>
        </div>

        <div class="col">
          <span class="cap">native &lt;button disabled&gt;</span>
          <button class="btn" disabled (focusin)="focused.set('native')">Submit</button>
          <span class="tag">removed from tab order</span>
        </div>
      </div>

      <div controls class="pg-controls">
        <p class="pg-state">
          last focused: <b>{{ focused() }}</b
          ><br />
          activations while disabled: <b>{{ count() }}</b>
        </p>
        <p class="pg-hint">
          Tab into the preview. The forButton receives focus (and stays a no-op on Enter / Space);
          the native disabled button cannot be focused at all.
        </p>
      </div>
    </playground-demo>
  `,
  styles: `
    .stage {
      display: flex;
      flex-wrap: wrap;
      gap: 2rem;
      align-items: stretch;
      justify-content: center;
    }

    .col {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.65rem;
      text-align: center;
    }

    .cap {
      font-family: var(--pg-font-mono);
      font-size: 0.78rem;
      color: var(--pg-text-muted);
    }

    .btn {
      font: inherit;
      font-weight: 600;
      padding: 0.55rem 1.4rem;
      border-radius: var(--pg-radius-sm);
      border: 1px solid var(--pg-primary);
      background: var(--pg-primary);
      color: var(--pg-primary-contrast);
      cursor: pointer;
      outline: none;
    }

    .btn[data-disabled],
    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn[data-focus-visible] {
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--pg-primary) 45%, transparent);
    }

    .tag {
      font-size: 0.74rem;
      font-weight: 600;
      color: var(--pg-text-muted);
      background: var(--pg-surface-2);
      border: 1px solid var(--pg-border);
      border-radius: 999px;
      padding: 0.15rem 0.6rem;
    }

    .tag--ok {
      color: var(--pg-success);
      border-color: color-mix(in srgb, var(--pg-success) 40%, transparent);
    }
  `,
})
export class ButtonDisabledExample {
  protected readonly count = signal(0);
  protected readonly focused = signal('—');
}

import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ForButton } from 'forty-cdk/button';

@Component({
  selector: 'app-button-disabled-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForButton],
  template: `
    <div class="stage">
      <div class="col">
        <span class="cap">forButton [disabled]</span>
        <button forButton class="btn" [disabled]="true">Submit</button>
        <span class="tag tag--ok">focusable · aria-disabled</span>
      </div>

      <div class="col">
        <span class="cap">native &lt;button disabled&gt;</span>
        <button class="btn" disabled>Submit</button>
        <span class="tag">removed from tab order</span>
      </div>
    </div>
  `,
  styles: `
    :host {
      display: contents;
    }

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
      font-family: var(--ex-font-mono, ui-monospace, monospace);
      font-size: 0.78rem;
      color: var(--ex-muted, #585d66);
    }

    .btn {
      font: inherit;
      font-weight: 600;
      padding: 0.55rem 1.4rem;
      border-radius: var(--ex-radius-sm, 14px);
      border: 1px solid var(--ex-accent, #0e7c6b);
      background: var(--ex-accent, #0e7c6b);
      color: var(--ex-accent-contrast, #ffffff);
      cursor: pointer;
      outline: none;
    }

    .btn[data-disabled],
    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn[data-focus-visible] {
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--ex-accent, #0e7c6b) 45%, transparent);
    }

    .tag {
      font-size: 0.74rem;
      font-weight: 600;
      color: var(--ex-muted, #585d66);
      background: var(--ex-surface-2, #f2eee6);
      border: 1px solid var(--ex-border, #e5e0d6);
      border-radius: 999px;
      padding: 0.15rem 0.6rem;
    }

    .tag--ok {
      color: var(--ex-success, #1f7a4d);
      border-color: color-mix(in srgb, var(--ex-success, #1f7a4d) 40%, transparent);
    }
  `,
})
export class ButtonDisabledExample {}

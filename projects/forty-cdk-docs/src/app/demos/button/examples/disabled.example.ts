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
export class ButtonDisabledExample {}

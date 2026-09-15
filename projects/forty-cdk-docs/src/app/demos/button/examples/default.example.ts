import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ForButton } from 'forty-cdk/button';

@Component({
  selector: 'app-button-default-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForButton],
  template: `
    <div class="stage">
      <button forButton class="btn btn--primary">Native &lt;button&gt;</button>
      <span forButton class="btn">Custom &lt;span&gt;</span>
    </div>
  `,
  styles: `
    :host {
      display: contents;
    }

    .stage {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
      align-items: center;
      justify-content: center;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font: inherit;
      font-weight: 600;
      padding: 0.55rem 1.1rem;
      border-radius: var(--ex-radius-sm, 14px);
      border: 1px solid var(--ex-border-strong, #d0c9bc);
      background: var(--ex-surface, #ffffff);
      color: var(--ex-text, #17191c);
      cursor: pointer;
      user-select: none;
      outline: none;
      transition:
        transform 0.12s ease,
        box-shadow 0.15s ease,
        background 0.15s ease;
    }

    .btn--primary {
      background: var(--ex-accent, #0e7c6b);
      border-color: var(--ex-accent, #0e7c6b);
      color: var(--ex-accent-contrast, #ffffff);
    }

    .btn[data-hovered] {
      background: var(--ex-surface-2, #f2eee6);
    }

    .btn--primary[data-hovered] {
      background: var(--ex-accent-hover, #0a5a4d);
      border-color: var(--ex-accent-hover, #0a5a4d);
    }

    .btn[data-pressed] {
      transform: scale(0.95);
    }

    .btn[data-focus-visible] {
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--ex-accent, #0e7c6b) 45%, transparent);
    }

    @media (prefers-reduced-motion: reduce) {
      .btn {
        transition: box-shadow 0.15s ease;
      }

      .btn[data-pressed] {
        transform: none;
      }
    }
  `,
})
export class ButtonDefaultExample {}

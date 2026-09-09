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
      border-radius: var(--pg-radius-sm);
      border: 1px solid var(--pg-border-strong);
      background: var(--pg-surface);
      color: var(--pg-text);
      cursor: pointer;
      user-select: none;
      outline: none;
      transition:
        transform 0.12s ease,
        box-shadow 0.15s ease,
        background 0.15s ease;
    }

    .btn--primary {
      background: var(--pg-primary);
      border-color: var(--pg-primary);
      color: var(--pg-primary-contrast);
    }

    .btn[data-hovered] {
      background: var(--pg-surface-2);
    }

    .btn--primary[data-hovered] {
      background: var(--pg-primary-hover);
      border-color: var(--pg-primary-hover);
    }

    .btn[data-pressed] {
      transform: scale(0.95);
    }

    .btn[data-focus-visible] {
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--pg-primary) 45%, transparent);
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

import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ForCheckbox } from 'forty-cdk/checkbox';

@Component({
  selector: 'app-checkbox-default-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForCheckbox],
  template: `
    <button forCheckbox class="cb-row" [(checked)]="checked">
      <span class="cb">
        <span class="cb-check" aria-hidden="true"></span>
      </span>
      I agree to the terms
    </button>
  `,
  styles: `
    :host {
      display: contents;
    }

    .cb-row {
      display: inline-flex;
      align-items: center;
      gap: 0.6rem;
      padding: 0;
      border: 0;
      background: transparent;
      font: inherit;
      color: var(--pg-text);
      cursor: pointer;
    }

    .cb {
      flex: none;
      width: 22px;
      height: 22px;
      display: grid;
      place-items: center;
      border: 2px solid var(--pg-border-strong);
      border-radius: 6px;
      background: var(--pg-surface);
      transition:
        background 0.15s ease,
        border-color 0.15s ease;
    }

    .cb-row[data-state='checked'] .cb {
      background: var(--pg-primary);
      border-color: var(--pg-primary);
    }

    .cb-check {
      display: none;
      width: 12px;
      height: 12px;
      border: solid var(--pg-primary-contrast);
      border-width: 0 2.5px 2.5px 0;
      transform: rotate(45deg) translate(-1px, -1px);
    }

    .cb-row[data-state='checked'] .cb-check {
      display: block;
    }

    @media (prefers-reduced-motion: reduce) {
      .cb {
        transition: none;
      }
    }
  `,
})
export class CheckboxDefaultExample {
  protected readonly checked = signal(false);
}

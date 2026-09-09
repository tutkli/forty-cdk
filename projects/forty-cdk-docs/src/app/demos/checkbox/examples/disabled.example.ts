import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ForCheckbox } from 'forty-cdk/checkbox';

@Component({
  selector: 'app-checkbox-disabled-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForCheckbox],
  template: `
    <button forCheckbox class="cb-row" [(checked)]="checked" disabled>
      <span class="cb">
        <span class="cb-check" aria-hidden="true"></span>
      </span>
      Subscribe to the newsletter
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

    .cb-row[data-disabled] {
      opacity: 0.5;
      cursor: not-allowed;
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
  `,
})
export class CheckboxDisabledExample {
  protected readonly checked = signal(true);
}

import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ForRadio, ForRadioGroup } from 'forty-cdk/radio-group';

interface RadioOption {
  readonly value: string;
  readonly label: string;
  readonly disabled?: boolean;
}

@Component({
  selector: 'app-radio-group-default-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForRadioGroup, ForRadio],
  template: `
    <div>
      <span id="rg-label" class="rg-label">Shipping method</span>
      <div forRadioGroup class="rg" [(value)]="value" aria-labelledby="rg-label">
        @for (opt of options; track opt.value) {
          <button
            type="button"
            forRadio
            class="rg-option"
            [value]="opt.value"
            [disabled]="opt.disabled ?? false"
          >
            <span class="rg-dot"></span>
            {{ opt.label }}
          </button>
        }
      </div>
    </div>
  `,
  styles: `
    :host {
      display: contents;
    }

    .rg-label {
      display: block;
      margin-bottom: 0.75rem;
      font-weight: 600;
    }

    .rg {
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
    }

    .rg-option {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0;
      border: 0;
      background: transparent;
      font: inherit;
      color: var(--pg-text);
      cursor: pointer;
    }

    .rg-option[data-disabled] {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .rg-dot {
      flex: none;
      position: relative;
      width: 20px;
      height: 20px;
      border: 2px solid var(--pg-border-strong);
      border-radius: 50%;
      background: var(--pg-surface);
      transition: border-color 0.15s ease;
    }

    .rg-option[data-state='checked'] .rg-dot {
      border-color: var(--pg-primary);
    }

    .rg-option[data-state='checked'] .rg-dot::after {
      content: '';
      position: absolute;
      inset: 3px;
      border-radius: 50%;
      background: var(--pg-primary);
    }

    @media (prefers-reduced-motion: reduce) {
      .rg-dot {
        transition: none;
      }
    }
  `,
})
export class RadioGroupDefaultExample {
  protected readonly options: readonly RadioOption[] = [
    { value: 'standard', label: 'Standard' },
    { value: 'express', label: 'Express' },
    { value: 'overnight', label: 'Overnight', disabled: true },
  ];

  protected readonly value = signal<string | null>('standard');
}

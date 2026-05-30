import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ForRadio, ForRadioGroup } from 'forty-cdk';

import { DemoLayout } from '../ui/demo-layout';

interface RadioOption {
  readonly value: string;
  readonly label: string;
}

@Component({
  selector: 'app-radio-group-demo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DemoLayout, ForRadioGroup, ForRadio],
  template: `
    <playground-demo
      title="Radio Group"
      summary="One-of-N selection with selection-on-focus: arrow keys move focus and change the value at once, wrapping at the ends. Home/End jump to the first/last enabled radio."
      apgUrl="https://www.w3.org/WAI/ARIA/apg/patterns/radio/"
    >
      <div demo>
        <span id="rg-label" class="rg-label">Shipping method</span>
        <div
          forRadioGroup
          class="rg"
          [(value)]="value"
          [orientation]="orientation()"
          [disabled]="disabled()"
          aria-labelledby="rg-label"
        >
          @for (opt of options; track opt.value) {
            <button
              type="button"
              forRadio
              class="rg-option"
              [value]="opt.value"
              [disabled]="opt.value === 'overnight' && disableLast()"
            >
              <span class="rg-dot"></span>
              {{ opt.label }}
            </button>
          }
        </div>
      </div>

      <div controls class="pg-controls">
        <div class="pg-field">
          <span class="pg-label">orientation</span>
          <select class="pg-select" [value]="orientation()" (change)="setOrientation($event)">
            <option value="vertical">vertical</option>
            <option value="horizontal">horizontal</option>
          </select>
        </div>
        <label class="pg-check">
          <input type="checkbox" [checked]="disabled()" (change)="disabled.set(isChecked($event))" />
          disabled (group)
        </label>
        <label class="pg-check">
          <input
            type="checkbox"
            [checked]="disableLast()"
            (change)="disableLast.set(isChecked($event))"
          />
          disable "Overnight"
        </label>

        <p class="pg-state">value: <b>{{ value() || 'none' }}</b></p>
      </div>
    </playground-demo>
  `,
  styles: `
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

    .rg[data-orientation='horizontal'] {
      flex-direction: row;
      gap: 1.25rem;
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
  `,
})
export class RadioGroupDemo {
  protected readonly options: readonly RadioOption[] = [
    { value: 'standard', label: 'Standard' },
    { value: 'express', label: 'Express' },
    { value: 'overnight', label: 'Overnight' },
  ];

  protected readonly value = signal('standard');
  protected readonly orientation = signal<'horizontal' | 'vertical'>('vertical');
  protected readonly disabled = signal(false);
  protected readonly disableLast = signal(false);

  protected isChecked(event: Event): boolean {
    return (event.target as HTMLInputElement).checked;
  }

  protected setOrientation(event: Event): void {
    this.orientation.set(
      (event.target as HTMLSelectElement).value === 'horizontal' ? 'horizontal' : 'vertical',
    );
  }
}

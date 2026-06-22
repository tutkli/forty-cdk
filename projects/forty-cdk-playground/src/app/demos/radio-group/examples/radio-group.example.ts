import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ForRadio, ForRadioGroup } from 'forty-cdk/radio-group';

import { type ControlOption, ControlSelect } from '../../../ui/control-select';
import { ControlSwitch } from '../../../ui/control-switch';
import { DemoLayout } from '../../../ui/demo-layout';

interface RadioOption {
  readonly value: string;
  readonly label: string;
}

@Component({
  selector: 'app-radio-group-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DemoLayout, ForRadioGroup, ForRadio, ControlSwitch, ControlSelect],
  template: `
    <playground-demo
      title="Selection follows focus"
      subtitle="Arrow keys move focus and change the value at once, wrapping at the ends. Home / End jump to the first / last enabled radio."
      sourcePath="projects/forty-cdk-playground/src/app/demos/radio-group/examples/radio-group.example.ts"
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
        <app-control-select
          label="orientation"
          hint="Sets which axis the arrow keys follow: vertical uses ArrowUp / ArrowDown, horizontal uses ArrowLeft / ArrowRight (swapped in RTL)."
          [options]="orientationOptions"
          [(value)]="orientation"
        />
        <app-control-switch label="disabled (group)" [(checked)]="disabled" />
        <app-control-switch label='disable "Overnight"' [(checked)]="disableLast" />

        <p class="pg-state">
          value: <b>{{ value() || 'none' }}</b>
        </p>
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
export class RadioGroupExample {
  protected readonly options: readonly RadioOption[] = [
    { value: 'standard', label: 'Standard' },
    { value: 'express', label: 'Express' },
    { value: 'overnight', label: 'Overnight' },
  ];

  protected readonly orientationOptions: readonly ControlOption<'vertical' | 'horizontal'>[] = [
    { value: 'vertical', label: 'vertical' },
    { value: 'horizontal', label: 'horizontal' },
  ];

  protected readonly value = signal('standard');
  protected readonly orientation = signal<'horizontal' | 'vertical'>('vertical');
  protected readonly disabled = signal(false);
  protected readonly disableLast = signal(false);
}

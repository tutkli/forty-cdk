import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { ForNumberInput } from 'forty-cdk';

import { type ControlOption, ControlSelect } from '../../../ui/control-select';
import { DemoLayout } from '../../../ui/demo-layout';

type Format = 'usd' | 'eur' | 'percent' | 'decimal';

@Component({
  selector: 'app-number-input-formatting-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DemoLayout, ControlSelect, ForNumberInput],
  template: `
    <playground-demo
      title="Formatting & precision"
      subtitle="formatOptions feeds an Intl.NumberFormat that renders the displayed text and aria-valuetext, while value() stays a raw number. The locale drives both formatting and parsing — type 1.234,5 under de-DE and it parses correctly. No stepper buttons here: the spinbutton is fully keyboard-driven."
      sourcePath="projects/forty-cdk-playground/src/app/demos/number-input/examples/formatting.example.ts"
    >
      <div demo class="stack">
        <input
          forNumberInput
          class="pg-input num"
          [(value)]="amount"
          [locale]="locale()"
          [formatOptions]="formatOptions()"
          [step]="step()"
        />
        <p class="hint">Use ↑ / ↓ to step, PageUp / PageDown for a larger step.</p>
      </div>

      <div controls class="pg-controls">
        <app-control-select
          label="format"
          hint="Switches the Intl.NumberFormat options and locale; the underlying value() is unchanged."
          [options]="formatOptionsList"
          [(value)]="format"
        />
        <p class="pg-state">
          value(): <b>{{ amount() ?? 'null' }}</b
          ><br />
          locale: <b>{{ locale() }}</b
          ><br />
          step: <b>{{ step() }}</b>
        </p>
      </div>
    </playground-demo>
  `,
  styles: `
    .stack {
      width: min(320px, 100%);
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .num {
      font-size: 1.05rem;
      font-variant-numeric: tabular-nums;
    }

    .hint {
      margin: 0;
      font-size: 0.78rem;
      color: var(--pg-text-muted);
    }
  `,
})
export class NumberInputFormattingExample {
  protected readonly amount = signal<number | null>(1234.5);
  protected readonly format = signal<Format>('usd');

  protected readonly formatOptionsList: readonly ControlOption<Format>[] = [
    { value: 'usd', label: 'Currency (USD)' },
    { value: 'eur', label: 'Currency (EUR)' },
    { value: 'percent', label: 'Percent' },
    { value: 'decimal', label: 'Decimal' },
  ];

  protected readonly locale = computed(() => (this.format() === 'eur' ? 'de-DE' : 'en-US'));

  protected readonly formatOptions = computed<Intl.NumberFormatOptions>(() => {
    switch (this.format()) {
      case 'usd':
        return { style: 'currency', currency: 'USD' };
      case 'eur':
        return { style: 'currency', currency: 'EUR' };
      case 'percent':
        return { style: 'percent', maximumFractionDigits: 0 };
      default:
        return { maximumFractionDigits: 2 };
    }
  });

  protected readonly step = computed(() => (this.format() === 'percent' ? 0.05 : 1));
}

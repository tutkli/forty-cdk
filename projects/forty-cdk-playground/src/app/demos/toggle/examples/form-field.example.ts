import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { form, FormField, requiredError, validate } from '@angular/forms/signals';
import { ForToggleGroup, ForToggleGroupItem } from 'forty-cdk';

import { DemoLayout } from '../../../ui/demo-layout';

interface Layout {
  readonly align: readonly string[];
}

@Component({
  selector: 'app-toggle-form-field-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DemoLayout, FormField, ForToggleGroup, ForToggleGroupItem],
  template: `
    <playground-demo
      title="Signal Forms"
      subtitle="ForToggleGroup implements FormValueControl<readonly string[]>, so [formField] binds the pressed-values array to a form field (ForToggle alone is the APG button pattern, not a form value). This single-select alignment group is required: clearing the choice and blurring marks the group data-invalid / data-touched."
      sourcePath="projects/forty-cdk-playground/src/app/demos/toggle/examples/form-field.example.ts"
    >
      <div demo class="tg-form">
        <span id="tg-label" class="tg-caption">Text alignment</span>
        <div
          forToggleGroup
          class="tg-group"
          [formField]="layoutForm.align"
          aria-labelledby="tg-label"
        >
          <button forToggleGroupItem class="tg-btn" value="left">Left</button>
          <button forToggleGroupItem class="tg-btn" value="center">Center</button>
          <button forToggleGroupItem class="tg-btn" value="right">Right</button>
        </div>
        @if (layoutForm.align().touched() && !layoutForm.align().valid()) {
          <p class="tg-error">Pick an alignment.</p>
        }
      </div>

      <div controls class="pg-controls">
        <p class="pg-state">
          value: <b>{{ layoutForm.align().value().join(', ') || '—' }}</b
          ><br />
          valid: <b>{{ layoutForm.align().valid() }}</b
          ><br />
          touched: <b>{{ layoutForm.align().touched() }}</b
          ><br />
          errors: <b>{{ errorKinds() || '—' }}</b>
        </p>
      </div>
    </playground-demo>
  `,
  styles: `
    .tg-form {
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
    }

    .tg-caption {
      font-size: 0.72rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--pg-text-muted);
    }

    .tg-group {
      display: inline-flex;
      align-self: flex-start;
      gap: 0.3rem;
      border-radius: var(--pg-radius-sm);
    }

    .tg-group[data-touched][data-invalid] {
      outline: 2px solid #ef4444;
      outline-offset: 3px;
    }

    .tg-btn {
      font: inherit;
      font-weight: 600;
      padding: 0.45rem 0.95rem;
      border-radius: var(--pg-radius-sm);
      border: 1px solid var(--pg-border-strong);
      background: var(--pg-surface);
      color: var(--pg-text);
      cursor: pointer;
      transition:
        background 0.15s ease,
        border-color 0.15s ease;
    }

    .tg-btn:hover {
      background: var(--pg-surface-2);
    }

    .tg-btn[data-state='checked'],
    .tg-btn[data-state='checked']:hover {
      background: var(--pg-primary);
      border-color: var(--pg-primary);
      color: var(--pg-primary-contrast);
    }

    .tg-error {
      margin: 0;
      font-size: 0.85rem;
      color: #ef4444;
    }
  `,
})
export class ToggleFormFieldExample {
  protected readonly model = signal<Layout>({ align: [] });
  protected readonly layoutForm = form(this.model, (path) => {
    validate(path.align, (ctx) =>
      ctx.value().length === 0 ? requiredError({ message: 'Pick an alignment' }) : undefined,
    );
  });

  protected errorKinds(): string {
    return this.layoutForm
      .align()
      .errors()
      .map((error) => error.kind)
      .join(', ');
  }
}

import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { form, FormField, requiredError, validate } from '@angular/forms/signals';
import { ForToggleGroup, ForToggleGroupItem } from 'forty-cdk/toggle';

interface Layout {
  readonly align: readonly string[];
}

@Component({
  selector: 'app-toggle-form-field-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormField, ForToggleGroup, ForToggleGroupItem],
  template: `
    <div class="field">
      <span id="tg-label" class="caption">Text alignment</span>
      <div forToggleGroup class="group" [formField]="layoutForm.align" aria-labelledby="tg-label">
        <button forToggleGroupItem class="toggle" value="left">Left</button>
        <button forToggleGroupItem class="toggle" value="center">Center</button>
        <button forToggleGroupItem class="toggle" value="right">Right</button>
      </div>
      @if (layoutForm.align().touched() && !layoutForm.align().valid()) {
        <p class="error">Pick an alignment.</p>
      }
    </div>
  `,
  styles: `
    :host {
      display: contents;
    }

    .field {
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
    }

    .caption {
      font-size: 0.72rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--pg-text-muted);
    }

    .group {
      display: inline-flex;
      align-self: flex-start;
      gap: 0.3rem;
      border-radius: var(--pg-radius-sm);
    }

    .group[data-touched][data-invalid] {
      outline: 2px solid #ef4444;
      outline-offset: 3px;
    }

    .toggle {
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

    .toggle:hover {
      background: var(--pg-surface-2);
    }

    .toggle[data-state='checked'],
    .toggle[data-state='checked']:hover {
      background: var(--pg-primary);
      border-color: var(--pg-primary);
      color: var(--pg-primary-contrast);
    }

    .error {
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
}

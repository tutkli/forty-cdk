import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { form, FormField, requiredError, validate } from '@angular/forms/signals';
import { ForField, ForFieldError } from 'forty-cdk/field';
import { ForToggleGroup, ForToggleGroupItem } from 'forty-cdk/toggle';

interface Layout {
  readonly align: readonly string[];
}

@Component({
  selector: 'app-toggle-form-field-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormField, ForToggleGroup, ForToggleGroupItem, ForField, ForFieldError],
  template: `
    <div forField class="field">
      <span id="tg-label" class="caption">Text alignment</span>
      <div forToggleGroup class="group" [formField]="layoutForm.align" aria-labelledby="tg-label">
        <button forToggleGroupItem class="toggle" value="left">Left</button>
        <button forToggleGroupItem class="toggle" value="center">Center</button>
        <button forToggleGroupItem class="toggle" value="right">Right</button>
      </div>
      @if (layoutForm.align().touched() && !layoutForm.align().valid()) {
        <p forFieldError #err="forFieldError" class="error">{{ err.messages().join(', ') }}</p>
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
      color: var(--ex-muted, #585d66);
    }

    .group {
      display: inline-flex;
      align-self: flex-start;
      gap: 0.3rem;
      border-radius: var(--ex-radius-sm, 14px);
    }

    .group[data-touched][data-invalid] {
      outline: 2px solid var(--ex-danger, #b3261e);
      outline-offset: 3px;
    }

    .toggle {
      font: inherit;
      font-weight: 600;
      padding: 0.45rem 0.95rem;
      border-radius: var(--ex-radius-sm, 14px);
      border: 1px solid var(--ex-border-strong, #d0c9bc);
      background: var(--ex-surface, #ffffff);
      color: var(--ex-text, #17191c);
      cursor: pointer;
      transition:
        background 0.15s ease,
        border-color 0.15s ease;
    }

    .toggle:hover {
      background: var(--ex-surface-2, #f2eee6);
    }

    .toggle[data-state='checked'],
    .toggle[data-state='checked']:hover {
      background: var(--ex-accent, #0e7c6b);
      border-color: var(--ex-accent, #0e7c6b);
      color: var(--ex-accent-contrast, #ffffff);
    }

    .error {
      margin: 0;
      font-size: 0.85rem;
      color: var(--ex-danger, #b3261e);
    }
  `,
})
export class ToggleFormFieldExample {
  protected readonly model = signal<Layout>({ align: [] });
  protected readonly layoutForm = form(this.model, (path) => {
    validate(path.align, (ctx) =>
      ctx.value().length === 0 ? requiredError({ message: 'Pick an alignment.' }) : undefined,
    );
  });
}

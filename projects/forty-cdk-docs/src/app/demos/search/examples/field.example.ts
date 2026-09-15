import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { form, FormField, minLength, required } from '@angular/forms/signals';
import { ForField, ForFieldError, ForLabel } from 'forty-cdk/field';
import { ForSearch, ForSearchClear, ForSearchGroup } from 'forty-cdk/search';

interface Filters {
  readonly term: string;
}

@Component({
  selector: 'app-search-field-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormField,
    ForField,
    ForLabel,
    ForSearchGroup,
    ForSearch,
    ForSearchClear,
    ForFieldError,
  ],
  template: `
    <div forField class="field">
      <label forLabel class="field-label">
        <span class="field-label-text">Search the docs</span>
        <div forSearchGroup class="search">
          <input
            forSearch
            class="search-input"
            placeholder="At least 3 characters…"
            [formField]="filtersForm.term"
          />
          <button forSearchClear class="search-clear" ariaLabel="Clear search">×</button>
        </div>
      </label>
      @if (filtersForm.term().touched() && !filtersForm.term().valid()) {
        <p forFieldError #err="forFieldError" class="field-error">
          {{ err.messages().join(', ') }}
        </p>
      }
    </div>
  `,
  styles: `
    :host {
      display: contents;
    }

    .field {
      width: min(360px, 100%);
      display: flex;
      flex-direction: column;
      gap: 0.45rem;
    }

    .field-label {
      display: flex;
      flex-direction: column;
      gap: 0.45rem;
    }

    .field-label-text {
      font-size: 0.9rem;
      font-weight: 600;
      color: var(--ex-text, #17191c);
    }

    .search {
      position: relative;
      display: flex;
      align-items: center;
    }

    .search-input {
      width: 100%;
      font: inherit;
      font-size: 0.95rem;
      padding: 0.6rem 2.2rem 0.6rem 0.85rem;
      color: var(--ex-text, #17191c);
      background: var(--ex-surface, #ffffff);
      border: 1px solid var(--ex-border-strong, #d0c9bc);
      border-radius: var(--ex-radius-sm, 14px);
      outline: none;
    }

    .search-input:focus-visible {
      border-color: var(--ex-accent, #0e7c6b);
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--ex-accent, #0e7c6b) 35%, transparent);
    }

    .field[data-touched][data-invalid] .search-input {
      border-color: var(--ex-danger, #b3261e);
    }

    .search-clear {
      position: absolute;
      right: 0.5rem;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 1.5rem;
      height: 1.5rem;
      font: inherit;
      font-size: 1.1rem;
      line-height: 1;
      color: var(--ex-muted, #585d66);
      background: var(--ex-surface-2, #f2eee6);
      border: 0;
      border-radius: 50%;
      cursor: pointer;
    }

    .search-clear:hover {
      color: var(--ex-text, #17191c);
    }

    .field-error {
      margin: 0;
      font-size: 0.85rem;
      font-weight: 500;
      color: var(--ex-danger, #b3261e);
    }
  `,
})
export class SearchFieldExample {
  protected readonly model = signal<Filters>({ term: '' });
  protected readonly filtersForm = form(this.model, (path) => {
    required(path.term, { message: 'Enter a search term' });
    minLength(path.term, 3, { message: 'Use at least 3 characters' });
  });
}

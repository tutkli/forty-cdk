import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { ForSearch, ForSearchClear, ForSearchGroup } from 'forty-cdk/search';

const PRIMITIVES = [
  'Accordion',
  'Breadcrumbs',
  'Combobox',
  'Date Picker',
  'Dialog',
  'File Upload',
  'Listbox',
  'Pagination',
  'Popover',
  'Slider',
  'Switch',
  'Tooltip',
];

@Component({
  selector: 'app-search-default-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForSearchGroup, ForSearch, ForSearchClear],
  template: `
    <div class="stage">
      <div forSearchGroup class="search">
        <svg class="search-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="none"
            stroke="currentColor"
            stroke-width="1.75"
            stroke-linecap="round"
            d="m21 21-4.35-4.35M19 11a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z"
          />
        </svg>
        <input
          forSearch
          class="search-input"
          [(value)]="query"
          placeholder="Search primitives…"
          aria-label="Search primitives"
        />
        <button forSearchClear class="search-clear" ariaLabel="Clear search">×</button>
      </div>

      <ul class="results">
        @for (item of results(); track item) {
          <li>{{ item }}</li>
        } @empty {
          <li class="empty">No matches for “{{ query() }}”</li>
        }
      </ul>
    </div>
  `,
  styles: `
    :host {
      display: contents;
    }

    .stage {
      width: min(360px, 100%);
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .search {
      position: relative;
      display: flex;
      align-items: center;
    }

    .search-icon {
      position: absolute;
      left: 0.7rem;
      width: 18px;
      height: 18px;
      color: var(--ex-muted, #585d66);
      pointer-events: none;
    }

    .search-input {
      width: 100%;
      font: inherit;
      font-size: 0.95rem;
      padding: 0.6rem 2.2rem;
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

    .results {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
      margin: 0;
      padding: 0;
      list-style: none;
      font-size: 0.9rem;
    }

    .results li {
      padding: 0.4rem 0.6rem;
      border-radius: var(--ex-radius-sm, 14px);
      background: var(--ex-surface, #ffffff);
      border: 1px solid var(--ex-border, #e5e0d6);
      color: var(--ex-text, #17191c);
    }

    .results .empty {
      background: transparent;
      border-style: dashed;
      color: var(--ex-muted, #585d66);
    }
  `,
})
export class SearchDefaultExample {
  protected readonly query = signal('');

  protected readonly results = computed(() => {
    const q = this.query().trim().toLowerCase();
    if (!q) {
      return PRIMITIVES;
    }
    return PRIMITIVES.filter((item) => item.toLowerCase().includes(q));
  });
}

import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { ForSearch, ForSearchClear } from 'forty-cdk';

import { DemoLayout } from '../../../ui/demo-layout';

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
  selector: 'app-search-basic-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DemoLayout, ForSearch, ForSearchClear],
  template: `
    <playground-demo
      title="Search with a clear button"
      subtitle="forSearch is a role='searchbox' input that mirrors its value to a signal. The companion [forSearchClear] takes the exported instance, self-hides while the field is empty, and refocuses the input after clearing — no extra @if needed."
      sourcePath="projects/forty-cdk-playground/src/app/demos/search/examples/basic.example.ts"
    >
      <div demo class="stage">
        <div class="search">
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
            #s="forSearch"
            class="search-input"
            [(value)]="query"
            placeholder="Search primitives…"
            aria-label="Search primitives"
          />
          <button [forSearchClear]="s" class="search-clear" aria-label="Clear search">×</button>
        </div>

        <ul class="results">
          @for (item of results(); track item) {
            <li>{{ item }}</li>
          } @empty {
            <li class="empty">No matches for “{{ query() }}”</li>
          }
        </ul>
      </div>

      <div controls class="pg-controls">
        <p class="pg-state">
          value: <b>{{ query() || '∅' }}</b
          ><br />
          matches: <b>{{ results().length }}</b>
        </p>
        <p class="pg-hint">The × button appears only once there is something to clear.</p>
      </div>
    </playground-demo>
  `,
  styles: `
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
      color: var(--pg-text-muted);
      pointer-events: none;
    }

    .search-input {
      width: 100%;
      font: inherit;
      font-size: 0.95rem;
      padding: 0.6rem 2.2rem;
      color: var(--pg-text);
      background: var(--pg-surface);
      border: 1px solid var(--pg-border-strong);
      border-radius: var(--pg-radius-sm);
      outline: none;
    }

    .search-input:focus-visible {
      border-color: var(--pg-primary);
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--pg-primary) 35%, transparent);
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
      color: var(--pg-text-muted);
      background: var(--pg-surface-2);
      border: 0;
      border-radius: 50%;
      cursor: pointer;
    }

    .search-clear:hover {
      color: var(--pg-text);
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
      border-radius: var(--pg-radius-sm);
      background: var(--pg-surface);
      border: 1px solid var(--pg-border);
      color: var(--pg-text);
    }

    .results .empty {
      background: transparent;
      border-style: dashed;
      color: var(--pg-text-muted);
    }
  `,
})
export class SearchBasicExample {
  protected readonly query = signal('');

  protected readonly results = computed(() => {
    const q = this.query().trim().toLowerCase();
    if (!q) {
      return PRIMITIVES;
    }
    return PRIMITIVES.filter((item) => item.toLowerCase().includes(q));
  });
}

import { ChangeDetectionStrategy, Component, computed, linkedSignal, signal } from '@angular/core';
import { ForInput } from 'forty-cdk/input';
import { ForTree, expandToReveal } from 'forty-cdk/tree';

import {
  buildAncestorsMap,
  buildDescendantsMap,
  CATEGORIES,
  collectMatchIds,
  filterNodes,
} from './category-data';
import { CheckboxTreeNode } from './checkbox-tree-node';

@Component({
  selector: 'app-tree-filter-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForTree, ForInput, CheckboxTreeNode],
  template: `
    <div class="filter-stack">
      <input
        forInput
        class="input"
        type="search"
        placeholder="Filter categories…"
        aria-label="Filter categories"
        [(value)]="query"
      />

      @if (filtered().length) {
        <ul
          forTree
          class="tree"
          selectionMode="checkbox"
          cascade
          [descendantsOf]="descendantsOf"
          [(value)]="value"
          [(expanded)]="expanded"
          [ariaLabel]="'Categories'"
        >
          @for (node of filtered(); track node.id) {
            <app-checkbox-tree-node [node]="node" [expandedIds]="expanded()" [query]="query()" />
          }
        </ul>
      } @else {
        <p class="filter-empty">No categories match “{{ query() }}”.</p>
      }
    </div>
  `,
  styles: `
    :host {
      display: contents;
    }

    .filter-stack {
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
      width: min(360px, 100%);
    }

    .input {
      width: 100%;
      font: inherit;
      font-size: 0.9rem;
      padding: 0.5rem 0.7rem;
      border-radius: var(--pg-radius-sm);
      border: 1px solid var(--pg-border-strong);
      background: var(--pg-surface);
      color: var(--pg-text);
    }

    .tree {
      margin: 0;
      padding: 6px;
      list-style: none;
      background: var(--pg-surface);
      border: 1px solid var(--pg-border);
      border-radius: var(--pg-radius-sm);
      box-shadow: var(--pg-shadow);
      color: var(--pg-text);
    }

    .filter-empty {
      margin: 0;
      padding: 0.75rem 0.55rem;
      font-size: 0.875rem;
      color: var(--pg-text-muted);
    }
  `,
})
export class TreeFilterExample {
  protected readonly query = signal('');

  readonly #descendants = buildDescendantsMap(CATEGORIES);
  readonly #ancestors = buildAncestorsMap(CATEGORIES);

  protected readonly descendantsOf = (id: string): readonly string[] =>
    this.#descendants.get(id) ?? [];
  protected readonly ancestorsOf = (id: string): readonly string[] => this.#ancestors.get(id) ?? [];

  protected readonly filtered = computed(() => filterNodes(CATEGORIES, this.query()));

  protected readonly value = signal<readonly string[]>([]);

  protected readonly expanded = linkedSignal<string, readonly string[]>({
    source: this.query,
    computation: (query) => {
      if (!query.trim()) {
        return ['engineering'];
      }
      return expandToReveal(collectMatchIds(CATEGORIES, query), this.ancestorsOf);
    },
  });
}

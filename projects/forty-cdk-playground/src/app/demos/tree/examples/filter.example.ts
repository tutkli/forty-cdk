import { ChangeDetectionStrategy, Component, computed, linkedSignal, signal } from '@angular/core';
import { expandToReveal, ForInput, ForTree } from 'forty-cdk';

import { DemoLayout } from '../../../ui/demo-layout';
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
  imports: [DemoLayout, ForTree, ForInput, CheckboxTreeNode],
  template: `
    <playground-demo
      title="Filter picker"
      subtitle="The mtx-style filter picker: a search box narrows the tree while cascade checkboxes pick values. forty-cdk ships no filtering engine — you filter your own data and re-render, then call the pure expandToReveal(matches, ancestorsOf) helper to expand just the ancestors that make each match visible. Matched text is highlighted with your own <mark>. Cascade reaches descendants even when they're filtered out of view."
      sourcePath="projects/forty-cdk-playground/src/app/demos/tree/examples/filter.example.ts"
    >
      <div demo class="tree-demo">
        <div class="filter-stack">
          <input
            forInput
            class="pg-input"
            type="search"
            placeholder="Filter categories…"
            aria-label="Filter categories"
            [(value)]="query"
          />

          @if (filtered().length) {
            <ul
              forTree
              class="pg-tree"
              selectionMode="checkbox"
              cascade
              [descendantsOf]="descendantsOf"
              [(value)]="value"
              [(expanded)]="expanded"
              [ariaLabel]="'Categories'"
            >
              @for (node of filtered(); track node.id) {
                <app-checkbox-tree-node
                  [node]="node"
                  [expandedIds]="expanded()"
                  [query]="query()"
                />
              }
            </ul>
          } @else {
            <p class="filter-empty">No categories match “{{ query() }}”.</p>
          }
        </div>
      </div>

      <div controls class="pg-controls">
        <p class="pg-hint">
          Try “re” (React, Research) or “o” — matching ancestors expand automatically through
          expandToReveal, and checking a hidden parent still selects its filtered-out children.
        </p>
        <p class="pg-state">
          query: <b>{{ query() || '—' }}</b
          ><br />
          checked: <b>{{ value().length }}</b>
        </p>
      </div>
    </playground-demo>
  `,
  styles: `
    .tree-demo {
      display: flex;
      justify-content: center;
      width: 100%;
      padding: 1rem 0;
    }

    .filter-stack {
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
      width: min(360px, 100%);
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

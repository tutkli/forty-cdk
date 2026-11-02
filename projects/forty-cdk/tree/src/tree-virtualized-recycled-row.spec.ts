import { Component, computed, signal } from '@angular/core';

import { pressKey } from 'forty-cdk/testing';

import { flush, renderHost } from '../../src/test-utils';
import { ForTree } from './tree';
import { ForTreeItem } from './tree-item';
import { ForTreeItemLabel } from './tree-item-label';
import { ForTreeVirtualized } from './tree-virtualized';

interface FlatNode {
  readonly value: string;
  readonly label: string;
  readonly level: number;
  readonly setSize: number;
  readonly posInSet: number;
  readonly itemIndex: number;
}

function buildFlat(expanded: readonly string[]): FlatNode[] {
  const result: FlatNode[] = [];
  for (let r = 0; r < 3; r++) {
    const rootValue = `root-${r}`;
    result.push({
      value: rootValue,
      label: `Root ${r}`,
      level: 1,
      setSize: 3,
      posInSet: r + 1,
      itemIndex: result.length,
    });
    if (expanded.includes(rootValue)) {
      for (let c = 0; c < 2; c++) {
        result.push({
          value: `child-${r}-${c}`,
          label: `Child ${r}-${c}`,
          level: 2,
          setSize: 2,
          posInSet: c + 1,
          itemIndex: result.length,
        });
      }
    }
  }
  return result;
}

@Component({
  imports: [ForTree, ForTreeItem, ForTreeItemLabel, ForTreeVirtualized],
  template: `
    <ul
      forTree
      forTreeVirtualized
      data-test-tree
      [(value)]="picked"
      [(expanded)]="open"
      [totalCount]="flat().length"
      [visibleRange]="range()"
      aria-label="Virtual"
    >
      @for (node of flat(); track node.itemIndex) {
        <li
          forTreeItem
          [value]="node.value"
          [level]="node.level"
          [setSize]="node.setSize"
          [posInSet]="node.posInSet"
          [itemIndex]="node.itemIndex"
          [attr.data-test-id]="node.value"
        >
          <div forTreeItemLabel>{{ node.label }}</div>
        </li>
      }
    </ul>
  `,
})
class IndexKeyedVirtualHost {
  readonly picked = signal<readonly string[]>([]);
  readonly open = signal<readonly string[]>(['root-0']);
  readonly flat = computed(() => buildFlat(this.open()));
  readonly range = computed<readonly [number, number]>(() => [0, this.flat().length]);
}

describe('ForTreeVirtualized with index-keyed rows', () => {
  async function onSecondChild() {
    const result = renderHost(IndexKeyedVirtualHost);
    await flush(result.fixture);
    const tree = result.el.querySelector<HTMLElement>('[data-test-tree]')!;
    tree.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    await flush(result.fixture);
    pressKey(tree, 'ArrowDown');
    await flush(result.fixture);
    pressKey(tree, 'ArrowDown');
    await flush(result.fixture);
    expect(activeTestId(result.el, tree)).toBe('child-0-1');
    return { ...result, tree };
  }

  function activeTestId(el: HTMLElement, tree: HTMLElement): string | null {
    const id = tree.getAttribute('aria-activedescendant');
    return id
      ? (el.querySelector<HTMLElement>(`[id="${id}"]`)?.getAttribute('data-test-id') ?? null)
      : null;
  }

  it('never leaves aria-activedescendant on a recycled row showing another node after a collapse', async () => {
    const { el, fixture, instance, tree } = await onSecondChild();

    instance.open.set([]);
    await flush(fixture);
    await flush(fixture);

    const after = activeTestId(el, tree);
    expect(after === null || after === 'root-0', `active node is ${after}`).toBe(true);
  });

  it('re-seeds the collapsed ancestor when focus re-enters the tree', async () => {
    const { el, fixture, instance, tree } = await onSecondChild();

    instance.open.set([]);
    await flush(fixture);
    tree.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    tree.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    await flush(fixture);

    expect(activeTestId(el, tree)).toBe('root-0');
  });

  it('moves from the collapsed ancestor on the next arrow key', async () => {
    const { el, fixture, instance, tree } = await onSecondChild();

    instance.open.set([]);
    await flush(fixture);
    pressKey(tree, 'ArrowDown');
    await flush(fixture);

    expect(activeTestId(el, tree)).toBe('root-1');
  });

  it('follows the active node to its new row when a collapse above it shifts the rows', async () => {
    const { el, fixture, instance, tree } = await onSecondChild();
    pressKey(tree, 'ArrowDown');
    await flush(fixture);
    expect(activeTestId(el, tree)).toBe('root-1');

    instance.open.set([]);
    await flush(fixture);
    await flush(fixture);

    expect(activeTestId(el, tree)).toBe('root-1');
  });
});

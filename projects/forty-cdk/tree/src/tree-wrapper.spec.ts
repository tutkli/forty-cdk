import { Component, Directive, signal, viewChild } from '@angular/core';
import { describe, expect, it } from 'vitest';

import { pressKey } from 'forty-cdk/testing';

import { flush, renderHost } from '../../src/test-utils';
import { ForTree } from './tree';
import { FOR_TREE_CONTAINER_CONTEXT, FOR_TREE_CONTEXT } from './tree-context';
import { ForTreeItem } from './tree-item';
import { ForTreeItemLabel } from './tree-item-label';

@Directive({
  selector: '[wrapperTree]',
  exportAs: 'wrapperTree',
  providers: [
    { provide: FOR_TREE_CONTEXT, useExisting: WrapperTree },
    { provide: FOR_TREE_CONTAINER_CONTEXT, useExisting: WrapperTree },
  ],
})
class WrapperTree<T = string> extends ForTree<T> {}

@Directive({
  selector: '[halfWrappedTree]',
  providers: [{ provide: FOR_TREE_CONTEXT, useExisting: HalfWrappedTree }],
})
class HalfWrappedTree extends ForTree {}

@Component({
  imports: [WrapperTree, ForTreeItem, ForTreeItemLabel],
  template: `
    <ul wrapperTree (itemActivate)="activated.set($event.value)" aria-label="Files">
      <li forTreeItem value="a" data-test-id="a">
        <div forTreeItemLabel data-test-label="a">Alpha</div>
      </li>
      <li forTreeItem value="b" data-test-id="b">
        <div forTreeItemLabel data-test-label="b">Beta</div>
      </li>
    </ul>
  `,
})
class WrapperHost {
  readonly tree = viewChild.required(WrapperTree);
  readonly activated = signal<string | null>(null);
}

@Component({
  imports: [HalfWrappedTree, ForTreeItem],
  template: `
    <ul halfWrappedTree aria-label="Files">
      <li forTreeItem value="a">Alpha</li>
    </ul>
  `,
})
class HalfWrappedHost {}

const itemOf = (host: HTMLElement, id: string) =>
  host.querySelector<HTMLElement>(`[data-test-id="${id}"]`)!;

describe('ForTree subclass wrapper (#2075)', () => {
  it('registers root-level items with a subclass re-providing both tokens', async () => {
    const { el, fixture } = renderHost(WrapperHost);
    await flush(fixture);

    expect(itemOf(el, 'a').getAttribute('aria-posinset')).toBe('1');
    expect(itemOf(el, 'b').getAttribute('aria-posinset')).toBe('2');
    expect(itemOf(el, 'b').getAttribute('aria-setsize')).toBe('2');
  });

  it('selects and reports activations through the subclassed root', async () => {
    const { el, instance, fixture } = renderHost(WrapperHost);
    await flush(fixture);

    el.querySelector<HTMLElement>('[data-test-label="b"]')!.click();
    await flush(fixture);

    expect(instance.activated()).toBe('b');
    expect(instance.tree().value()).toEqual(['b']);
    expect(itemOf(el, 'b').getAttribute('aria-selected')).toBe('true');
  });

  it('navigates between the items registered with the subclass', async () => {
    const { el, fixture } = renderHost(WrapperHost);
    await flush(fixture);

    itemOf(el, 'a').focus();
    pressKey(itemOf(el, 'a'), 'ArrowDown');

    expect(document.activeElement).toBe(itemOf(el, 'b'));
  });

  it('fails the first root-level item when FOR_TREE_CONTAINER_CONTEXT is left out', () => {
    expect(() => renderHost(HalfWrappedHost)).toThrow(
      /FORCDK-TREE-002: ForTreeItem must be used inside a \[forTree\] or \[forTreeGroup\]/,
    );
  });
});

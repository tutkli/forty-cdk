import { Component, signal, viewChild } from '@angular/core';
import { describe, expect, it } from 'vitest';

import { flush, pressKey, renderHost } from '../../src/test-utils';
import { ForTree } from './tree';
import { ForTreeItem } from './tree-item';
import type { ForTreeItemActivateEvent } from './tree-item-activate-event';
import { ForTreeItemCheckbox } from './tree-item-checkbox';
import { ForTreeItemLabel } from './tree-item-label';

interface Recorded {
  readonly value: string;
  readonly event: MouseEvent | KeyboardEvent;
}

@Component({
  imports: [ForTree, ForTreeItem, ForTreeItemLabel, ForTreeItemCheckbox],
  template: `
    <ul
      forTree
      [selectionMode]="mode()"
      [disabled]="rootDisabled()"
      [value]="picked()"
      (valueChange)="onValueChange($event)"
      (itemActivate)="onActivate($event)"
      aria-label="Files"
    >
      <li forTreeItem value="a" [disabled]="disabledA()" data-test-id="a">
        <div forTreeItemLabel data-test-label="a">
          <span forTreeItemCheckbox data-test-checkbox="a"></span>
          <span>Alpha</span>
        </div>
      </li>
      <li forTreeItem value="b" data-test-id="b">
        <div forTreeItemLabel data-test-label="b">
          <span forTreeItemCheckbox data-test-checkbox="b"></span>
          <span>Beta</span>
        </div>
      </li>
      <li forTreeItem value="group" [selectable]="false" data-test-id="group">
        <div forTreeItemLabel data-test-label="group"><span>Group</span></div>
      </li>
    </ul>
  `,
})
class RovingHost {
  readonly tree = viewChild.required(ForTree);
  readonly mode = signal<'highlight' | 'checkbox'>('highlight');
  readonly rootDisabled = signal(false);
  readonly disabledA = signal(false);
  readonly veto = signal(false);
  readonly picked = signal<readonly string[]>([]);
  readonly activations: Recorded[] = [];
  readonly valueChanges: (readonly string[])[] = [];

  onActivate(activation: ForTreeItemActivateEvent): void {
    this.activations.push({ value: activation.value, event: activation.event });
    if (this.veto()) {
      activation.preventDefault();
    }
  }

  onValueChange(next: readonly string[]): void {
    this.valueChanges.push(next);
    this.picked.set(next);
  }
}

const itemOf = (host: HTMLElement, id: string) =>
  host.querySelector<HTMLElement>(`[data-test-id="${id}"]`)!;
const labelOf = (host: HTMLElement, id: string) =>
  host.querySelector<HTMLElement>(`[data-test-label="${id}"]`)!;
const checkboxOf = (host: HTMLElement, id: string) =>
  host.querySelector<HTMLElement>(`[data-test-checkbox="${id}"]`)!;

function click(target: HTMLElement, init: MouseEventInit = {}): MouseEvent {
  const event = new MouseEvent('click', { bubbles: true, cancelable: true, ...init });
  target.dispatchEvent(event);
  return event;
}

async function setup(configure?: (host: RovingHost) => void) {
  const result = renderHost(RovingHost);
  configure?.(result.instance);
  await flush(result.fixture);
  return result;
}

describe('ForTree (itemActivate)', () => {
  describe('roving path', () => {
    it('emits once for a label click, carrying the click, and then selects', async () => {
      const { el, instance, fixture } = await setup();

      const event = click(labelOf(el, 'a'));
      await flush(fixture);

      expect(instance.activations).toEqual([{ value: 'a', event }]);
      expect(instance.picked()).toEqual(['a']);
      expect(instance.valueChanges).toEqual([['a']]);
    });

    it('emits once for a checkbox click, not a second time for the enclosing label', async () => {
      const { el, instance, fixture } = await setup((host) => host.mode.set('checkbox'));

      const event = click(checkboxOf(el, 'b'));
      await flush(fixture);

      expect(instance.activations).toEqual([{ value: 'b', event }]);
      expect(instance.picked()).toEqual(['b']);
    });

    it('emits once for Enter and for Space on the focused node, carrying the keydown', async () => {
      const { el, instance, fixture } = await setup((host) => host.mode.set('checkbox'));
      const item = itemOf(el, 'a');
      item.focus();

      const enter = pressKey(item, 'Enter');
      await flush(fixture);
      const space = pressKey(item, ' ');
      await flush(fixture);

      expect(instance.activations).toEqual([
        { value: 'a', event: enter },
        { value: 'a', event: space },
      ]);
      expect(instance.valueChanges).toEqual([['a'], []]);
    });

    it('exposes the Ctrl / Cmd state of the press on every path', async () => {
      const { el, instance, fixture } = await setup();
      const item = itemOf(el, 'a');
      item.focus();

      click(labelOf(el, 'a'), { ctrlKey: true });
      click(checkboxOf(el, 'b'), { metaKey: true });
      pressKey(item, 'Enter', { ctrlKey: true });
      pressKey(item, ' ', { metaKey: true });
      await flush(fixture);

      expect(instance.activations.map(({ event }) => [event.ctrlKey, event.metaKey])).toEqual([
        [true, false],
        [false, true],
        [true, false],
        [false, true],
      ]);
    });

    it('keeps the selection unchanged after preventDefault(), while focus still moves', async () => {
      const { el, instance, fixture } = await setup((host) => host.veto.set(true));

      click(labelOf(el, 'b'));
      await flush(fixture);
      itemOf(el, 'a').focus();
      pressKey(itemOf(el, 'a'), 'Enter');
      pressKey(itemOf(el, 'a'), ' ');
      click(checkboxOf(el, 'b'));
      await flush(fixture);

      expect(instance.activations.map(({ value }) => value)).toEqual(['b', 'a', 'a', 'b']);
      expect(instance.picked()).toEqual([]);
      expect(instance.valueChanges).toEqual([]);
      expect(document.activeElement).toBe(itemOf(el, 'b'));
      expect(itemOf(el, 'b').hasAttribute('data-selected')).toBe(false);
    });

    it('moves focus to the clicked node even when the activation is vetoed', async () => {
      const { el, fixture } = await setup((host) => host.veto.set(true));

      click(labelOf(el, 'b'));
      await flush(fixture);

      expect(document.activeElement).toBe(itemOf(el, 'b'));
    });

    it('emits nothing for a node disabled by its own [disabled]', async () => {
      const { el, instance, fixture } = await setup((host) => host.disabledA.set(true));

      click(labelOf(el, 'a'));
      click(checkboxOf(el, 'a'));
      pressKey(itemOf(el, 'a'), 'Enter');
      await flush(fixture);

      expect(instance.activations).toEqual([]);
      expect(instance.valueChanges).toEqual([]);
    });

    it("emits nothing while the root's [disabled] is set", async () => {
      const { el, instance, fixture } = await setup((host) => host.rootDisabled.set(true));

      click(labelOf(el, 'b'));
      click(checkboxOf(el, 'b'));
      pressKey(itemOf(el, 'b'), ' ');
      await flush(fixture);

      expect(instance.activations).toEqual([]);
    });

    it('emits for a [selectable]="false" node without selecting it', async () => {
      const { el, instance, fixture } = await setup();
      const group = itemOf(el, 'group');

      click(labelOf(el, 'group'));
      group.focus();
      pressKey(group, 'Enter');
      await flush(fixture);

      expect(instance.activations.map(({ value }) => value)).toEqual(['group', 'group']);
      expect(instance.picked()).toEqual([]);
      expect(instance.valueChanges).toEqual([]);
    });

    it('does not emit for ForTree.select() called directly', async () => {
      const { instance, fixture } = await setup();

      instance.tree().select('a');
      await flush(fixture);

      expect(instance.activations).toEqual([]);
      expect(instance.picked()).toEqual(['a']);
    });
  });

  describe('virtualized path', () => {
    @Component({
      imports: [ForTree, ForTreeItem, ForTreeItemLabel],
      template: `
        <ul
          forTree
          data-test-tree
          [totalCount]="values.length"
          [visibleRange]="range"
          [value]="picked()"
          (valueChange)="onValueChange($event)"
          (itemActivate)="onActivate($event)"
          aria-label="Virtual"
        >
          @for (v of values; track v; let i = $index) {
            <li
              forTreeItem
              [value]="v"
              [itemIndex]="i"
              [level]="1"
              [setSize]="values.length"
              [posInSet]="i + 1"
              [attr.data-test-id]="v"
            >
              <div forTreeItemLabel [attr.data-test-label]="v">{{ v }}</div>
            </li>
          }
        </ul>
      `,
    })
    class VirtualHost {
      readonly values = ['a', 'b', 'c'];
      readonly range: readonly [number, number] = [0, 3];
      readonly veto = signal(false);
      readonly picked = signal<readonly string[]>([]);
      readonly activations: Recorded[] = [];
      readonly valueChanges: (readonly string[])[] = [];

      onActivate(activation: ForTreeItemActivateEvent): void {
        this.activations.push({ value: activation.value, event: activation.event });
        if (this.veto()) {
          activation.preventDefault();
        }
      }

      onValueChange(next: readonly string[]): void {
        this.valueChanges.push(next);
        this.picked.set(next);
      }
    }

    async function setupVirtual(configure?: (host: VirtualHost) => void) {
      const result = renderHost(VirtualHost);
      configure?.(result.instance);
      await flush(result.fixture);
      return result;
    }

    const treeOf = (host: HTMLElement) => host.querySelector<HTMLElement>('[data-test-tree]')!;

    it('emits once for Enter and Space on the active descendant, carrying the keydown', async () => {
      const { el, instance, fixture } = await setupVirtual();
      const tree = treeOf(el);
      tree.focus();
      await flush(fixture);

      const enter = pressKey(tree, 'Enter', { ctrlKey: true });
      await flush(fixture);
      pressKey(tree, 'ArrowDown');
      await flush(fixture);
      const space = pressKey(tree, ' ', { metaKey: true });
      await flush(fixture);

      expect(instance.activations).toEqual([
        { value: 'a', event: enter },
        { value: 'b', event: space },
      ]);
      expect(enter.ctrlKey).toBe(true);
      expect(space.metaKey).toBe(true);
      expect(instance.picked()).toEqual(['b']);
    });

    it('emits once for a label click, carrying the click', async () => {
      const { el, instance, fixture } = await setupVirtual();

      const event = click(el.querySelector<HTMLElement>('[data-test-label="c"]')!, {
        ctrlKey: true,
      });
      await flush(fixture);

      expect(instance.activations).toEqual([{ value: 'c', event }]);
      expect(instance.picked()).toEqual(['c']);
    });

    it('keeps the selection after preventDefault(), while aria-activedescendant moves', async () => {
      const { el, instance, fixture } = await setupVirtual((host) => host.veto.set(true));
      const tree = treeOf(el);

      click(el.querySelector<HTMLElement>('[data-test-label="b"]')!);
      await flush(fixture);
      pressKey(tree, 'Enter');
      await flush(fixture);

      const b = el.querySelector<HTMLElement>('[data-test-id="b"]')!;
      expect(instance.activations.map(({ value }) => value)).toEqual(['b', 'b']);
      expect(instance.picked()).toEqual([]);
      expect(instance.valueChanges).toEqual([]);
      expect(tree.getAttribute('aria-activedescendant')).toBe(b.id);
    });
  });
});

describe('ForTreeItemCheckbox (data-disabled)', () => {
  it('carries no data-disabled while its node is enabled', async () => {
    const { el } = await setup();

    expect(checkboxOf(el, 'a').hasAttribute('data-disabled')).toBe(false);
  });

  it("reflects the item's own [disabled], and drops it when re-enabled", async () => {
    const { el, instance, fixture } = await setup((host) => host.disabledA.set(true));

    expect(checkboxOf(el, 'a').getAttribute('data-disabled')).toBe('');
    expect(checkboxOf(el, 'b').hasAttribute('data-disabled')).toBe(false);

    instance.disabledA.set(false);
    await flush(fixture);

    expect(checkboxOf(el, 'a').hasAttribute('data-disabled')).toBe(false);
  });

  it("reflects the root's [disabled] on every box", async () => {
    const { el } = await setup((host) => host.rootDisabled.set(true));

    expect(checkboxOf(el, 'a').getAttribute('data-disabled')).toBe('');
    expect(checkboxOf(el, 'b').getAttribute('data-disabled')).toBe('');
  });
});

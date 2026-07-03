import {
  Component,
  computed,
  ErrorHandler,
  provideZonelessChangeDetection,
  signal,
  viewChild,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { flush, pressKey, renderHost } from '../../src/test-utils';
import { ForTree } from './tree';
import { ForTreeGroup } from './tree-group';
import { ForTreeItem } from './tree-item';
import { ForTreeItemCheckbox } from './tree-item-checkbox';
import { ForTreeItemCheckboxIndicator } from './tree-item-checkbox-indicator';
import { ForTreeItemLabel } from './tree-item-label';
import { ForTreeItemToggle } from './tree-item-toggle';

@Component({
  imports: [ForTree, ForTreeItem, ForTreeItemLabel, ForTreeItemToggle, ForTreeGroup],
  template: `
    <ul
      forTree
      [(value)]="picked"
      [(expanded)]="open"
      [multiple]="isMulti()"
      [disabled]="rootDisabled()"
      [orientation]="orientation()"
      [dir]="dir()"
      [selectionFollowsFocus]="follow()"
      [ariaLabel]="label()"
    >
      <li
        forTreeItem
        value="documents"
        [disabled]="disabledIds().includes('documents')"
        data-test-id="documents"
      >
        <div forTreeItemLabel data-test-label="documents">
          <span forTreeItemToggle data-test-toggle="documents">▸</span>
          <span>Documents</span>
        </div>
        @if (open().includes('documents')) {
          <ul forTreeGroup>
            <li
              forTreeItem
              value="report"
              [disabled]="disabledIds().includes('report')"
              data-test-id="report"
            >
              <div forTreeItemLabel data-test-label="report"><span>Report</span></div>
            </li>
            <li
              forTreeItem
              value="photos"
              [disabled]="disabledIds().includes('photos')"
              data-test-id="photos"
            >
              <div forTreeItemLabel data-test-label="photos">
                <span forTreeItemToggle data-test-toggle="photos">▸</span>
                <span>Photos</span>
              </div>
              @if (open().includes('photos')) {
                <ul forTreeGroup>
                  <li forTreeItem value="vacation" data-test-id="vacation">
                    <div forTreeItemLabel data-test-label="vacation"><span>Vacation</span></div>
                  </li>
                  <li forTreeItem value="work" data-test-id="work">
                    <div forTreeItemLabel data-test-label="work"><span>Work</span></div>
                  </li>
                </ul>
              }
            </li>
          </ul>
        }
      </li>

      <li
        forTreeItem
        value="downloads"
        [disabled]="disabledIds().includes('downloads')"
        data-test-id="downloads"
      >
        <div forTreeItemLabel data-test-label="downloads">
          <span forTreeItemToggle data-test-toggle="downloads">▸</span>
          <span>Downloads</span>
        </div>
        @if (open().includes('downloads')) {
          <ul forTreeGroup>
            <li forTreeItem value="setup" data-test-id="setup">
              <div forTreeItemLabel data-test-label="setup"><span>Setup</span></div>
            </li>
          </ul>
        }
      </li>

      <li
        forTreeItem
        value="readme"
        [disabled]="disabledIds().includes('readme')"
        data-test-id="readme"
      >
        <div forTreeItemLabel data-test-label="readme"><span>Readme</span></div>
      </li>
    </ul>
  `,
})
class TreeHost {
  readonly tree = viewChild.required(ForTree);

  readonly picked = signal<readonly string[]>([]);
  readonly open = signal<readonly string[]>([]);
  readonly isMulti = signal(false);
  readonly rootDisabled = signal(false);
  readonly disabledIds = signal<readonly string[]>([]);
  readonly orientation = signal<'vertical' | 'horizontal'>('vertical');
  readonly dir = signal<'ltr' | 'rtl'>('ltr');
  readonly follow = signal(false);
  readonly label = signal<string | null>('Files');
}

const treeOf = (host: HTMLElement) => host.querySelector<HTMLElement>('[forTree]')!;
const itemOf = (host: HTMLElement, id: string) =>
  host.querySelector<HTMLElement>(`[data-test-id="${id}"]`)!;
const labelOf = (host: HTMLElement, id: string) =>
  host.querySelector<HTMLElement>(`[data-test-label="${id}"]`)!;
const toggleOf = (host: HTMLElement, id: string) =>
  host.querySelector<HTMLElement>(`[data-test-toggle="${id}"]`)!;

async function setup(configure?: (instance: TreeHost) => void) {
  const result = renderHost(TreeHost);
  configure?.(result.instance);
  await flush(result.fixture);
  return result;
}

describe('ForTree', () => {
  describe('roles and structure', () => {
    it('sets role=tree on the root and role=treeitem on every node', async () => {
      const { el } = await setup((i) => i.open.set(['documents']));
      expect(treeOf(el).getAttribute('role')).toBe('tree');
      expect(itemOf(el, 'documents').getAttribute('role')).toBe('treeitem');
      expect(itemOf(el, 'report').getAttribute('role')).toBe('treeitem');
      expect(itemOf(el, 'readme').getAttribute('role')).toBe('treeitem');
    });

    it('renders role=group for the nested container of an expanded parent', async () => {
      const { el } = await setup((i) => i.open.set(['documents']));
      const group = itemOf(el, 'documents').querySelector('[forTreeGroup]')!;
      expect(group.getAttribute('role')).toBe('group');
    });

    it('emits aria-label from the ariaLabel input, omitting it when null', async () => {
      const { el, fixture } = await setup();
      expect(treeOf(el).getAttribute('aria-label')).toBe('Files');
      fixture.componentInstance.label.set(null);
      await flush(fixture);
      expect(treeOf(el).hasAttribute('aria-label')).toBe(false);
    });
  });

  describe('reorder follows DOM order, not registration order', () => {
    @Component({
      imports: [ForTree, ForTreeItem, ForTreeItemLabel],
      template: `
        <ul forTree>
          @for (id of ids(); track id) {
            <li forTreeItem [value]="id" [attr.data-test-id]="id">
              <div forTreeItemLabel>
                <span>{{ id }}</span>
              </div>
            </li>
          }
        </ul>
      `,
    })
    class ReorderHost {
      readonly ids = signal<readonly string[]>(['a', 'b', 'c']);
    }

    async function setupReorder() {
      const result = renderHost(ReorderHost);
      await flush(result.fixture);
      return result;
    }

    it('updates aria-posinset / aria-setsize after the list is sorted', async () => {
      const { el, fixture } = await setupReorder();

      expect(itemOf(el, 'a').getAttribute('aria-posinset')).toBe('1');
      expect(itemOf(el, 'c').getAttribute('aria-posinset')).toBe('3');
      expect(itemOf(el, 'a').getAttribute('aria-setsize')).toBe('3');

      fixture.componentInstance.ids.set(['c', 'a', 'b']);
      await flush(fixture);

      expect(itemOf(el, 'c').getAttribute('aria-posinset')).toBe('1');
      expect(itemOf(el, 'a').getAttribute('aria-posinset')).toBe('2');
      expect(itemOf(el, 'b').getAttribute('aria-posinset')).toBe('3');
      expect(itemOf(el, 'b').getAttribute('aria-setsize')).toBe('3');
    });

    it('moves arrow-key navigation order to match the visible order after a sort', async () => {
      const { el, fixture } = await setupReorder();

      fixture.componentInstance.ids.set(['c', 'a', 'b']);
      await flush(fixture);

      pressKey(itemOf(el, 'c'), 'ArrowDown');
      await flush(fixture);

      expect(itemOf(el, 'a').getAttribute('tabindex')).toBe('0');
      expect(itemOf(el, 'a').hasAttribute('data-highlighted')).toBe(true);
      expect(itemOf(el, 'c').getAttribute('tabindex')).toBe('-1');
    });
  });

  describe('dynamic node set (consumer-owned filtering)', () => {
    @Component({
      imports: [ForTree, ForTreeItem, ForTreeItemLabel, ForTreeItemToggle, ForTreeGroup],
      template: `
        <ul forTree [(expanded)]="open" [(value)]="picked">
          @for (node of visible(); track node.id) {
            <li forTreeItem [value]="node.id" [attr.data-test-id]="node.id">
              <div forTreeItemLabel>
                @if (node.children.length) {
                  <span forTreeItemToggle>▸</span>
                }
                <span>{{ node.id }}</span>
              </div>
              @if (node.children.length && open().includes(node.id)) {
                <ul forTreeGroup>
                  @for (child of node.children; track child) {
                    <li forTreeItem [value]="child" [attr.data-test-id]="child">
                      <div forTreeItemLabel>
                        <span>{{ child }}</span>
                      </div>
                    </li>
                  }
                </ul>
              }
            </li>
          }
        </ul>
      `,
    })
    class FilterHost {
      readonly nodes = [
        { id: 'fruit', children: ['apple', 'pear'] },
        { id: 'veg', children: ['carrot'] },
        { id: 'misc', children: [] as string[] },
      ];
      readonly query = signal('');
      readonly visible = computed(() => {
        const q = this.query();
        if (!q) {
          return this.nodes;
        }
        return this.nodes.filter((n) => n.id.includes(q) || n.children.some((c) => c.includes(q)));
      });
      readonly open = signal<readonly string[]>(['fruit', 'veg']);
      readonly picked = signal<readonly string[]>([]);
    }

    it('prunes then restores nodes at runtime without throwing when value inputs rebind', async () => {
      const result = renderHost(FilterHost);
      await flush(result.fixture);
      const { el, fixture } = result;
      const host = fixture.componentInstance;

      // Arm the roving-tabindex effect, which walks every visible node's value.
      pressKey(itemOf(el, 'fruit'), 'ArrowDown');
      await flush(fixture);

      // Filter down to a single branch — the active node is pruned away.
      host.query.set('carrot');
      await flush(fixture);
      expect(el.querySelector('[data-test-id="fruit"]')).toBeNull();
      expect(el.querySelector('[data-test-id="carrot"]')).not.toBeNull();

      // Clear the filter, re-adding the pruned nodes (the reported repro path).
      host.query.set('');
      await flush(fixture);

      expect(itemOf(el, 'fruit').getAttribute('aria-posinset')).toBe('1');
      expect(itemOf(el, 'misc').getAttribute('aria-posinset')).toBe('3');
      expect(itemOf(el, 'misc').getAttribute('aria-setsize')).toBe('3');
    });
  });

  describe('aria-level / aria-setsize / aria-posinset', () => {
    it('computes level / posinset / setsize across two nesting levels', async () => {
      const { el } = await setup((i) => i.open.set(['documents', 'photos']));

      expect(itemOf(el, 'documents').getAttribute('aria-level')).toBe('1');
      expect(itemOf(el, 'documents').getAttribute('aria-posinset')).toBe('1');
      expect(itemOf(el, 'documents').getAttribute('aria-setsize')).toBe('3');
      expect(itemOf(el, 'readme').getAttribute('aria-posinset')).toBe('3');

      expect(itemOf(el, 'report').getAttribute('aria-level')).toBe('2');
      expect(itemOf(el, 'report').getAttribute('aria-posinset')).toBe('1');
      expect(itemOf(el, 'report').getAttribute('aria-setsize')).toBe('2');

      expect(itemOf(el, 'vacation').getAttribute('aria-level')).toBe('3');
      expect(itemOf(el, 'work').getAttribute('aria-posinset')).toBe('2');
      expect(itemOf(el, 'work').getAttribute('aria-setsize')).toBe('2');
    });
  });

  describe('expansion (aria-expanded + data-state on parents only)', () => {
    it('emits aria-expanded / data-state on parents and neither on leaves', async () => {
      const { el } = await setup((i) => i.open.set(['documents']));

      const documents = itemOf(el, 'documents');
      expect(documents.getAttribute('aria-expanded')).toBe('true');
      expect(documents.getAttribute('data-state')).toBe('open');

      const readme = itemOf(el, 'readme');
      expect(readme.hasAttribute('aria-expanded')).toBe(false);
      expect(readme.hasAttribute('data-state')).toBe(false);

      const report = itemOf(el, 'report');
      expect(report.hasAttribute('aria-expanded')).toBe(false);
      expect(report.hasAttribute('data-state')).toBe(false);
    });

    it('reports closed parents with aria-expanded=false / data-state=closed', async () => {
      const { el } = await setup();
      const documents = itemOf(el, 'documents');
      expect(documents.getAttribute('aria-expanded')).toBe('false');
      expect(documents.getAttribute('data-state')).toBe('closed');
    });

    it('clicking a toggle expands the parent and renders its group', async () => {
      const { el, fixture } = await setup();
      expect(itemOf(el, 'documents').querySelector('[forTreeGroup]')).toBeNull();

      toggleOf(el, 'documents').click();
      await flush(fixture);

      expect(fixture.componentInstance.open()).toEqual(['documents']);
      expect(itemOf(el, 'documents').getAttribute('aria-expanded')).toBe('true');
      expect(itemOf(el, 'documents').querySelector('[forTreeGroup]')).not.toBeNull();
    });

    it('clicking a toggle again collapses the parent and drops the group', async () => {
      const { el, fixture } = await setup((i) => i.open.set(['documents']));
      toggleOf(el, 'documents').click();
      await flush(fixture);

      expect(fixture.componentInstance.open()).toEqual([]);
      expect(itemOf(el, 'documents').querySelector('[forTreeGroup]')).toBeNull();
    });

    it('toggling a node does not change the selection', async () => {
      const { el, fixture } = await setup();
      toggleOf(el, 'documents').click();
      await flush(fixture);
      expect(fixture.componentInstance.picked()).toEqual([]);
    });
  });

  describe('selection (aria-selected always emitted, data-selected present/absent)', () => {
    it('emits aria-selected=false / no data-selected by default', async () => {
      const { el } = await setup();
      const documents = itemOf(el, 'documents');
      expect(documents.getAttribute('aria-selected')).toBe('false');
      expect(documents.hasAttribute('data-selected')).toBe(false);
    });

    it('clicking a label selects the node (aria-selected=true + data-selected)', async () => {
      const { el, fixture } = await setup();
      labelOf(el, 'documents').click();
      await flush(fixture);

      expect(fixture.componentInstance.picked()).toEqual(['documents']);
      const documents = itemOf(el, 'documents');
      expect(documents.getAttribute('aria-selected')).toBe('true');
      expect(documents.getAttribute('data-selected')).toBe('');
    });
  });

  describe('single vs multi select', () => {
    it('single mode keeps the value array at length <= 1 (replaces)', async () => {
      const { el, fixture } = await setup();
      labelOf(el, 'documents').click();
      await flush(fixture);
      labelOf(el, 'readme').click();
      await flush(fixture);
      expect(fixture.componentInstance.picked()).toEqual(['readme']);
    });

    it('exposes a derived selected accessor (sole value, else null)', async () => {
      const { el, fixture } = await setup();
      const tree = fixture.componentInstance.tree();

      expect(tree.selected()).toBeNull();

      labelOf(el, 'documents').click();
      await flush(fixture);
      expect(tree.selected()).toBe('documents');
    });

    it('multi mode accumulates and toggles selection immutably', async () => {
      const { el, fixture } = await setup((i) => i.isMulti.set(true));
      const first = fixture.componentInstance.picked();

      labelOf(el, 'documents').click();
      await flush(fixture);
      labelOf(el, 'readme').click();
      await flush(fixture);
      expect(fixture.componentInstance.picked()).toEqual(['documents', 'readme']);

      labelOf(el, 'documents').click();
      await flush(fixture);
      expect(fixture.componentInstance.picked()).toEqual(['readme']);

      expect(fixture.componentInstance.picked()).not.toBe(first);
    });

    it('multi: selected accessor is null when more than one is selected', async () => {
      const { el, fixture } = await setup((i) => i.isMulti.set(true));
      labelOf(el, 'documents').click();
      await flush(fixture);
      labelOf(el, 'readme').click();
      await flush(fixture);
      expect(fixture.componentInstance.tree().selected()).toBeNull();
    });
  });

  describe('multi-select keyboard wiring', () => {
    it('Ctrl+A selects every visible enabled node, then clears on repeat', async () => {
      const { el, fixture } = await setup((i) => i.isMulti.set(true));

      pressKey(itemOf(el, 'documents'), 'a', { ctrlKey: true });
      await flush(fixture);
      expect(fixture.componentInstance.picked()).toEqual(['documents', 'downloads', 'readme']);

      pressKey(itemOf(el, 'documents'), 'a', { ctrlKey: true });
      await flush(fixture);
      expect(fixture.componentInstance.picked()).toEqual([]);
    });

    it('Shift+Space selects the contiguous range from the anchor to the focused node', async () => {
      const { el, fixture } = await setup((i) => i.isMulti.set(true));
      labelOf(el, 'documents').click();
      await flush(fixture);

      pressKey(itemOf(el, 'readme'), ' ', { shiftKey: true });
      await flush(fixture);
      expect(fixture.componentInstance.picked()).toEqual(['documents', 'downloads', 'readme']);
    });

    it('Shift+ArrowDown toggles the next visible node selection', async () => {
      const { el, fixture } = await setup((i) => i.isMulti.set(true));
      pressKey(itemOf(el, 'documents'), 'ArrowDown', { shiftKey: true });
      await flush(fixture);
      expect(fixture.componentInstance.picked()).toEqual(['downloads']);
    });

    it('Shift+Arrow establishes the anchor so a following Shift+Space ranges from the extend origin (#590 F2)', async () => {
      const { el, fixture } = await setup((i) => i.isMulti.set(true));
      // Extend from documents → downloads with no prior click anchor.
      pressKey(itemOf(el, 'documents'), 'ArrowDown', { shiftKey: true });
      await flush(fixture);
      expect(fixture.componentInstance.picked()).toEqual(['downloads']);

      // Shift+Space at readme must span documents..readme (the extend origin),
      // not just readme from a stale/absent anchor.
      pressKey(itemOf(el, 'readme'), ' ', { shiftKey: true });
      await flush(fixture);
      expect(fixture.componentInstance.picked()).toEqual(['downloads', 'documents', 'readme']);
    });
  });

  describe('aria-multiselectable / orientation / dir reflection', () => {
    it('emits aria-multiselectable only in multi mode', async () => {
      const { el, fixture } = await setup();
      expect(treeOf(el).hasAttribute('aria-multiselectable')).toBe(false);

      fixture.componentInstance.isMulti.set(true);
      await flush(fixture);
      expect(treeOf(el).getAttribute('aria-multiselectable')).toBe('true');
    });

    it('reflects orientation on aria-orientation + data-orientation', async () => {
      const { el, fixture } = await setup();
      expect(treeOf(el).getAttribute('aria-orientation')).toBe('vertical');
      expect(treeOf(el).getAttribute('data-orientation')).toBe('vertical');

      fixture.componentInstance.orientation.set('horizontal');
      await flush(fixture);
      expect(treeOf(el).getAttribute('aria-orientation')).toBe('horizontal');
      expect(treeOf(el).getAttribute('data-orientation')).toBe('horizontal');
    });

    it('reflects the resolved dir on the host dir attribute', async () => {
      const { el, fixture } = await setup();
      expect(treeOf(el).getAttribute('dir')).toBe('ltr');

      fixture.componentInstance.dir.set('rtl');
      await flush(fixture);
      expect(treeOf(el).getAttribute('dir')).toBe('rtl');
    });
  });

  describe('disabled', () => {
    it('reflects aria-disabled / data-disabled on a disabled node and blocks selection', async () => {
      const { el, fixture } = await setup((i) => i.disabledIds.set(['readme']));
      const readme = itemOf(el, 'readme');
      expect(readme.getAttribute('aria-disabled')).toBe('true');
      expect(readme.getAttribute('data-disabled')).toBe('');

      labelOf(el, 'readme').click();
      await flush(fixture);
      expect(fixture.componentInstance.picked()).toEqual([]);
      expect(readme.getAttribute('aria-selected')).toBe('false');
    });

    it('a disabled root marks every node disabled and blocks selection', async () => {
      const { el, fixture } = await setup((i) => i.rootDisabled.set(true));
      expect(treeOf(el).getAttribute('aria-disabled')).toBe('true');
      expect(treeOf(el).getAttribute('data-disabled')).toBe('');
      expect(itemOf(el, 'documents').getAttribute('aria-disabled')).toBe('true');

      labelOf(el, 'documents').click();
      await flush(fixture);
      expect(fixture.componentInstance.picked()).toEqual([]);
    });
  });

  describe('roving tabindex entry point', () => {
    it('makes exactly one treeitem tabbable (the first enabled node)', async () => {
      const { el } = await setup();
      const tabbable = Array.from(el.querySelectorAll<HTMLElement>('[role="treeitem"]')).filter(
        (node) => node.getAttribute('tabindex') === '0',
      );
      expect(tabbable).toHaveLength(1);
      expect(tabbable[0]).toBe(itemOf(el, 'documents'));
    });

    it('promotes the selected node to the tab stop instead of the first', async () => {
      const { el } = await setup((i) => i.picked.set(['readme']));
      expect(itemOf(el, 'readme').getAttribute('tabindex')).toBe('0');
      expect(itemOf(el, 'documents').getAttribute('tabindex')).toBe('-1');
    });

    it('collapsing a parent that holds the active descendant moves the tab stop to the parent', async () => {
      const { el, fixture } = await setup((i) => i.open.set(['documents', 'photos']));

      itemOf(el, 'vacation').focus();
      await flush(fixture);
      expect(itemOf(el, 'vacation').getAttribute('tabindex')).toBe('0');

      // Collapse `documents` via its toggle (the widget collapse funnel),
      // hiding the active `vacation` node.
      toggleOf(el, 'documents').click();
      await flush(fixture);

      const tabbable = Array.from(el.querySelectorAll<HTMLElement>('[role="treeitem"]')).filter(
        (node) => node.getAttribute('tabindex') === '0',
      );
      expect(tabbable).toHaveLength(1);
      expect(tabbable[0]).toBe(itemOf(el, 'documents'));
    });

    it('disabling the active node re-engages the first-enabled fallback', async () => {
      const { el, fixture } = await setup();

      itemOf(el, 'readme').focus();
      await flush(fixture);
      expect(itemOf(el, 'readme').getAttribute('tabindex')).toBe('0');

      fixture.componentInstance.disabledIds.set(['readme']);
      await flush(fixture);

      expect(itemOf(el, 'readme').getAttribute('tabindex')).toBe('-1');
      const tabbable = Array.from(el.querySelectorAll<HTMLElement>('[role="treeitem"]')).filter(
        (node) => node.getAttribute('tabindex') === '0',
      );
      expect(tabbable).toHaveLength(1);
      expect(tabbable[0]).toBe(itemOf(el, 'documents'));
    });

    it('keeps a tab stop on the first visible item when the selection points to an unmounted node', async () => {
      const { el } = await setup((i) => i.picked.set(['report']));

      expect(el.querySelector('[data-test-id="report"]')).toBeNull();
      const tabbable = Array.from(el.querySelectorAll<HTMLElement>('[role="treeitem"]')).filter(
        (node) => node.getAttribute('tabindex') === '0',
      );
      expect(tabbable).toHaveLength(1);
      expect(tabbable[0]).toBe(itemOf(el, 'documents'));
    });

    it('falls back to the first enabled item when the only selected node is disabled', async () => {
      const { el } = await setup((i) => {
        i.picked.set(['documents']);
        i.disabledIds.set(['documents']);
      });

      expect(itemOf(el, 'documents').getAttribute('tabindex')).toBe('-1');
      const tabbable = Array.from(el.querySelectorAll<HTMLElement>('[role="treeitem"]')).filter(
        (node) => node.getAttribute('tabindex') === '0',
      );
      expect(tabbable).toHaveLength(1);
      expect(tabbable[0]).toBe(itemOf(el, 'downloads'));
    });
  });

  describe('zoneless reactivity', () => {
    it('updates DOM state without Zone.js after a signal write', async () => {
      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
      const fixture = TestBed.createComponent(TreeHost);
      fixture.detectChanges();
      await flush(fixture);

      const el = fixture.nativeElement as HTMLElement;
      expect(itemOf(el, 'documents').getAttribute('aria-expanded')).toBe('false');

      fixture.componentInstance.open.set(['documents']);
      await flush(fixture);
      expect(itemOf(el, 'documents').getAttribute('aria-expanded')).toBe('true');
      expect(itemOf(el, 'documents').getAttribute('data-state')).toBe('open');
    });
  });

  describe('checkbox selection mode', () => {
    @Component({
      imports: [
        ForTree,
        ForTreeItem,
        ForTreeItemLabel,
        ForTreeItemCheckbox,
        ForTreeItemCheckboxIndicator,
      ],
      template: `
        <ul forTree selectionMode="checkbox" [(value)]="picked" aria-label="Categories">
          <li forTreeItem value="a" data-test-id="a">
            <div forTreeItemLabel data-test-label="a">
              <span forTreeItemCheckbox data-test-checkbox="a">
                <span forTreeItemCheckboxIndicator data-test-indicator="a">✓</span>
              </span>
              <span>Alpha</span>
            </div>
          </li>
          <li forTreeItem value="b" data-test-id="b">
            <div forTreeItemLabel data-test-label="b">
              <span forTreeItemCheckbox data-test-checkbox="b">
                <span forTreeItemCheckboxIndicator data-test-indicator="b">✓</span>
              </span>
              <span>Beta</span>
            </div>
          </li>
        </ul>
      `,
    })
    class CheckboxTreeHost {
      readonly picked = signal<readonly string[]>([]);
    }

    async function setupCheckbox() {
      const result = renderHost(CheckboxTreeHost);
      await flush(result.fixture);
      return result;
    }

    const checkboxItemOf = (host: HTMLElement, id: string) =>
      host.querySelector<HTMLElement>(`[data-test-id="${id}"]`)!;
    const checkboxOf = (host: HTMLElement, id: string) =>
      host.querySelector<HTMLElement>(`[data-test-checkbox="${id}"]`)!;
    const indicatorOf = (host: HTMLElement, id: string) =>
      host.querySelector<HTMLElement>(`[data-test-indicator="${id}"]`)!;

    it('default state: aria-checked="false", no aria-selected, data-checked="false"', async () => {
      const { el } = await setupCheckbox();
      const itemA = checkboxItemOf(el, 'a');
      expect(itemA.getAttribute('aria-checked')).toBe('false');
      expect(itemA.hasAttribute('aria-selected')).toBe(false);
      expect(itemA.getAttribute('data-checked')).toBe('false');
    });

    it('clicking the checkbox toggles on: aria-checked="true", data-checked="true", no aria-selected', async () => {
      const { el, fixture } = await setupCheckbox();
      checkboxOf(el, 'a').click();
      await flush(fixture);
      const itemA = checkboxItemOf(el, 'a');
      expect(fixture.componentInstance.picked()).toEqual(['a']);
      expect(itemA.getAttribute('aria-checked')).toBe('true');
      expect(itemA.getAttribute('data-checked')).toBe('true');
      expect(itemA.hasAttribute('aria-selected')).toBe(false);
    });

    it('clicking the checkbox again toggles off', async () => {
      const { el, fixture } = await setupCheckbox();
      checkboxOf(el, 'a').click();
      await flush(fixture);
      checkboxOf(el, 'a').click();
      await flush(fixture);
      expect(fixture.componentInstance.picked()).toEqual([]);
      expect(checkboxItemOf(el, 'a').getAttribute('aria-checked')).toBe('false');
    });

    it('checkbox surface data-state: unchecked → "unchecked", checked → "checked"', async () => {
      const { el, fixture } = await setupCheckbox();
      expect(checkboxOf(el, 'a').getAttribute('data-state')).toBe('unchecked');
      checkboxOf(el, 'a').click();
      await flush(fixture);
      expect(checkboxOf(el, 'a').getAttribute('data-state')).toBe('checked');
    });

    it('indicator self-hides while unchecked and shows while checked', async () => {
      const { el, fixture } = await setupCheckbox();
      const ind = indicatorOf(el, 'a');
      expect(ind.hasAttribute('hidden')).toBe(true);
      expect(ind.style.display).toBe('none');
      checkboxOf(el, 'a').click();
      await flush(fixture);
      expect(ind.hasAttribute('hidden')).toBe(false);
      expect(ind.style.display).toBe('');
    });

    it('inherently multi: without multiple input, two nodes can both be checked', async () => {
      const { el, fixture } = await setupCheckbox();
      checkboxOf(el, 'a').click();
      await flush(fixture);
      checkboxOf(el, 'b').click();
      await flush(fixture);
      expect(fixture.componentInstance.picked()).toEqual(['a', 'b']);
    });

    it('highlight mode is unaffected: aria-selected present, no aria-checked', async () => {
      @Component({
        imports: [ForTree, ForTreeItem, ForTreeItemLabel],
        template: `
          <ul forTree selectionMode="highlight" [(value)]="picked" aria-label="Files">
            <li forTreeItem value="x" data-test-id="x">
              <div forTreeItemLabel data-test-label="x"><span>X</span></div>
            </li>
          </ul>
        `,
      })
      class HighlightTreeHost {
        readonly picked = signal<readonly string[]>([]);
      }

      const result = renderHost(HighlightTreeHost);
      await flush(result.fixture);
      const { el, fixture } = result;
      const item = el.querySelector<HTMLElement>('[data-test-id="x"]')!;
      expect(item.hasAttribute('aria-checked')).toBe(false);
      expect(item.getAttribute('aria-selected')).toBe('false');
      el.querySelector<HTMLElement>('[data-test-label="x"]')!.click();
      await flush(fixture);
      expect(item.getAttribute('aria-selected')).toBe('true');
      expect(item.hasAttribute('aria-checked')).toBe(false);
    });

    it('zoneless reactivity: aria-checked flips without Zone.js', async () => {
      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
      const fixture = TestBed.createComponent(CheckboxTreeHost);
      fixture.detectChanges();
      await flush(fixture);
      const el = fixture.nativeElement as HTMLElement;
      const itemA = el.querySelector<HTMLElement>('[data-test-id="a"]')!;
      expect(itemA.getAttribute('aria-checked')).toBe('false');
      el.querySelector<HTMLElement>('[data-test-checkbox="a"]')!.click();
      await flush(fixture);
      expect(itemA.getAttribute('aria-checked')).toBe('true');
    });
  });

  describe('cascade checkbox selection', () => {
    const DESCENDANTS: Record<string, readonly string[]> = {
      g: ['g1', 'g2', 'g2a', 'g2b'],
      g2: ['g2a', 'g2b'],
      g1: [],
      g2a: [],
      g2b: [],
    };

    @Component({
      imports: [
        ForTree,
        ForTreeItem,
        ForTreeItemLabel,
        ForTreeItemToggle,
        ForTreeGroup,
        ForTreeItemCheckbox,
        ForTreeItemCheckboxIndicator,
      ],
      template: `
        <ul
          forTree
          selectionMode="checkbox"
          cascade
          [descendantsOf]="descendantsFn"
          [(value)]="picked"
          [(expanded)]="open"
          aria-label="Groups"
        >
          <li forTreeItem value="g" data-test-id="g">
            <div forTreeItemLabel>
              <span forTreeItemToggle data-test-toggle="g">▸</span>
              <span forTreeItemCheckbox data-test-checkbox="g">
                <span forTreeItemCheckboxIndicator data-test-indicator="g">✓</span>
              </span>
              G
            </div>
            @if (open().includes('g')) {
              <ul forTreeGroup>
                <li forTreeItem value="g1" data-test-id="g1">
                  <div forTreeItemLabel>
                    <span forTreeItemCheckbox data-test-checkbox="g1">
                      <span forTreeItemCheckboxIndicator data-test-indicator="g1">✓</span>
                    </span>
                    G1
                  </div>
                </li>
                <li forTreeItem value="g2" data-test-id="g2">
                  <div forTreeItemLabel>
                    <span forTreeItemToggle data-test-toggle="g2">▸</span>
                    <span forTreeItemCheckbox data-test-checkbox="g2">
                      <span forTreeItemCheckboxIndicator data-test-indicator="g2">✓</span>
                    </span>
                    G2
                  </div>
                  @if (open().includes('g2')) {
                    <ul forTreeGroup>
                      <li forTreeItem value="g2a" data-test-id="g2a">
                        <div forTreeItemLabel>
                          <span forTreeItemCheckbox data-test-checkbox="g2a">
                            <span forTreeItemCheckboxIndicator data-test-indicator="g2a">✓</span>
                          </span>
                          G2A
                        </div>
                      </li>
                      <li forTreeItem value="g2b" data-test-id="g2b">
                        <div forTreeItemLabel>
                          <span forTreeItemCheckbox data-test-checkbox="g2b">
                            <span forTreeItemCheckboxIndicator data-test-indicator="g2b">✓</span>
                          </span>
                          G2B
                        </div>
                      </li>
                    </ul>
                  }
                </li>
              </ul>
            }
          </li>
        </ul>
      `,
    })
    class CascadeHost {
      readonly picked = signal<readonly string[]>([]);
      readonly open = signal<readonly string[]>([]);
      readonly descendantsFn = (v: string): readonly string[] => DESCENDANTS[v] ?? [];
    }

    const cascadeItemOf = (host: HTMLElement, id: string) =>
      host.querySelector<HTMLElement>(`[data-test-id="${id}"]`)!;
    const cascadeCheckboxOf = (host: HTMLElement, id: string) =>
      host.querySelector<HTMLElement>(`[data-test-checkbox="${id}"]`)!;
    const cascadeIndicatorOf = (host: HTMLElement, id: string) =>
      host.querySelector<HTMLElement>(`[data-test-indicator="${id}"]`)!;

    async function setupCascade(configure?: (i: CascadeHost) => void) {
      const result = renderHost(CascadeHost);
      configure?.(result.instance);
      await flush(result.fixture);
      return result;
    }

    it('checking a collapsed parent selects it and all descendants', async () => {
      const { el, fixture } = await setupCascade();
      cascadeCheckboxOf(el, 'g').click();
      await flush(fixture);

      const picked = fixture.componentInstance.picked();
      expect(picked).toContain('g');
      expect(picked).toContain('g1');
      expect(picked).toContain('g2');
      expect(picked).toContain('g2a');
      expect(picked).toContain('g2b');
      expect(picked.length).toBe(5);

      fixture.componentInstance.open.set(['g', 'g2']);
      await flush(fixture);

      expect(cascadeItemOf(el, 'g1').getAttribute('aria-checked')).toBe('true');
      expect(cascadeItemOf(el, 'g2').getAttribute('aria-checked')).toBe('true');
      expect(cascadeItemOf(el, 'g2a').getAttribute('aria-checked')).toBe('true');
      expect(cascadeItemOf(el, 'g2b').getAttribute('aria-checked')).toBe('true');
    });

    it('partial selection produces mixed on parent: aria-checked, data-checked, checkbox data-state, indicator visible and indeterminate', async () => {
      const { el, fixture } = await setupCascade();
      fixture.componentInstance.picked.set(['g', 'g2', 'g2a', 'g2b']);
      fixture.componentInstance.open.set(['g', 'g2']);
      await flush(fixture);

      const g = cascadeItemOf(el, 'g');
      expect(g.getAttribute('aria-checked')).toBe('mixed');
      expect(g.getAttribute('data-checked')).toBe('mixed');

      const gCheckbox = cascadeCheckboxOf(el, 'g');
      expect(gCheckbox.getAttribute('data-state')).toBe('indeterminate');

      const gIndicator = cascadeIndicatorOf(el, 'g');
      expect(gIndicator.hasAttribute('hidden')).toBe(false);
      expect(gIndicator.style.display).toBe('');
      expect(gIndicator.getAttribute('data-state')).toBe('indeterminate');
    });

    it('unchecking a parent clears it and all descendants', async () => {
      const { el, fixture } = await setupCascade();
      fixture.componentInstance.picked.set(['g', 'g1', 'g2', 'g2a', 'g2b']);
      await flush(fixture);

      cascadeCheckboxOf(el, 'g').click();
      await flush(fixture);

      const picked = fixture.componentInstance.picked();
      expect(picked.includes('g')).toBe(false);
      expect(picked.includes('g1')).toBe(false);
      expect(picked.includes('g2')).toBe(false);
      expect(picked.includes('g2a')).toBe(false);
      expect(picked.includes('g2b')).toBe(false);
    });

    it('checking the last unchecked descendant flips the parent to true', async () => {
      const { el, fixture } = await setupCascade();
      fixture.componentInstance.picked.set(['g', 'g2', 'g2a', 'g2b']);
      fixture.componentInstance.open.set(['g']);
      await flush(fixture);

      expect(cascadeItemOf(el, 'g').getAttribute('aria-checked')).toBe('mixed');

      cascadeCheckboxOf(el, 'g1').click();
      await flush(fixture);

      expect(cascadeItemOf(el, 'g').getAttribute('aria-checked')).toBe('true');
    });

    it('cascade without descendantsOf throws a prefixed error on detectChanges', () => {
      @Component({
        imports: [ForTree, ForTreeItem, ForTreeItemLabel, ForTreeItemCheckbox],
        template: `
          <ul forTree selectionMode="checkbox" cascade aria-label="G">
            <li forTreeItem value="x" data-test-id="x">
              <div forTreeItemLabel>
                <span forTreeItemCheckbox>X</span>
              </div>
            </li>
          </ul>
        `,
      })
      class MissingDescendants {}

      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
      expect(() => {
        const f = TestBed.createComponent(MissingDescendants);
        f.detectChanges();
      }).toThrowError(/\[forty-cdk\/tree\]/);
    });

    it('zoneless: cascade checkbox click flips descendant aria-checked without Zone.js', async () => {
      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
      const fixture = TestBed.createComponent(CascadeHost);
      fixture.detectChanges();
      await flush(fixture);

      const el = fixture.nativeElement as HTMLElement;
      fixture.componentInstance.open.set(['g']);
      await flush(fixture);

      expect(cascadeItemOf(el, 'g1').getAttribute('aria-checked')).toBe('false');
      cascadeCheckboxOf(el, 'g').click();
      await flush(fixture);
      expect(cascadeItemOf(el, 'g1').getAttribute('aria-checked')).toBe('true');
    });
  });

  describe('orphan usage', () => {
    it('throws a prefixed error when ForTreeItem is used outside a tree', () => {
      @Component({
        imports: [ForTreeItem],
        template: `<li forTreeItem value="x"></li>`,
      })
      class Orphan {}

      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
      expect(() => TestBed.createComponent(Orphan)).toThrow(
        /\[forty-cdk\/tree\] ForTreeItem must be used inside a \[forTree\] element\./,
      );
    });

    it('throws a prefixed error when ForTreeGroup is used outside an item', () => {
      @Component({
        imports: [ForTreeGroup],
        template: `<ul forTreeGroup></ul>`,
      })
      class Orphan {}

      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
      expect(() => TestBed.createComponent(Orphan)).toThrow(
        /\[forty-cdk\/tree\] ForTreeGroup must be used inside a \[forTreeItem\] element\./,
      );
    });
  });

  describe('virtualized node windowing (Shape C)', () => {
    interface FlatNode {
      readonly value: string;
      readonly label: string;
      readonly level: number;
      readonly setSize: number;
      readonly posInSet: number;
      readonly itemIndex: number;
      readonly expandable: boolean;
    }

    const ROOT_COUNT = 3;
    const CHILD_COUNT = 2;

    function buildFlat(expanded: readonly string[]): FlatNode[] {
      const result: FlatNode[] = [];
      for (let r = 0; r < ROOT_COUNT; r++) {
        const rootValue = `root-${r}`;
        result.push({
          value: rootValue,
          label: `Root ${r}`,
          level: 1,
          setSize: ROOT_COUNT,
          posInSet: r + 1,
          itemIndex: result.length,
          expandable: true,
        });
        if (expanded.includes(rootValue)) {
          for (let c = 0; c < CHILD_COUNT; c++) {
            const childValue = `child-${r}-${c}`;
            result.push({
              value: childValue,
              label: `Child ${r}-${c}`,
              level: 2,
              setSize: CHILD_COUNT,
              posInSet: c + 1,
              itemIndex: result.length,
              expandable: false,
            });
          }
        }
      }
      return result;
    }

    @Component({
      imports: [ForTree, ForTreeItem, ForTreeItemLabel, ForTreeItemToggle],
      template: `
        <ul
          forTree
          data-test-tree
          [(value)]="picked"
          [(expanded)]="open"
          [totalCount]="flat().length"
          [visibleRange]="range()"
          (scrollToIndex)="onScroll($event)"
          [selectionMode]="selectionMode()"
          [cascade]="cascade()"
          [descendantsOf]="descendantsFn"
          aria-label="Virtual"
        >
          @for (node of window(); track node.value) {
            <li
              forTreeItem
              [value]="node.value"
              [level]="node.level"
              [setSize]="node.setSize"
              [posInSet]="node.posInSet"
              [itemIndex]="node.itemIndex"
              [attr.data-test-id]="node.value"
            >
              @if (node.expandable) {
                <span forTreeItemToggle [attr.data-test-toggle]="node.value">▸</span>
              }
              <div forTreeItemLabel [attr.data-test-label]="node.value">{{ node.label }}</div>
            </li>
          }
        </ul>
      `,
    })
    class VirtualHost {
      readonly picked = signal<readonly string[]>([]);
      readonly open = signal<readonly string[]>([]);
      readonly scrolledToIndex = signal<number | null>(null);
      readonly selectionMode = signal<'highlight' | 'checkbox'>('highlight');
      readonly cascade = signal(false);

      readonly flat = computed(() => buildFlat(this.open()));

      readonly windowStart = signal(0);
      readonly windowSize = signal(5);

      readonly range = computed<readonly [number, number]>(() => {
        const start = this.windowStart();
        const end = Math.min(start + this.windowSize(), this.flat().length);
        return [start, end];
      });

      readonly window = computed(() => {
        const [start, end] = this.range();
        return this.flat().slice(start, end);
      });

      onScroll(index: number): void {
        this.scrolledToIndex.set(index);
        const maxStart = Math.max(0, this.flat().length - this.windowSize());
        this.windowStart.set(Math.min(index, maxStart));
      }

      readonly descendantsFn = (value: string): readonly string[] => {
        if (value.startsWith('root-')) {
          const r = value.split('-')[1];
          return Array.from({ length: CHILD_COUNT }, (_, c) => `child-${r}-${c}`);
        }
        return [];
      };
    }

    async function setupVirtual(configure?: (i: VirtualHost) => void) {
      const result = renderHost(VirtualHost);
      configure?.(result.instance);
      await flush(result.fixture);
      return result;
    }

    const treeEl = (host: HTMLElement) => host.querySelector<HTMLElement>('[data-test-tree]')!;

    it('1. focus-model switch — virtualized host has tabindex="0"; items have tabindex="-1"', async () => {
      const { el } = await setupVirtual();
      expect(treeEl(el).getAttribute('tabindex')).toBe('0');
      const items = el.querySelectorAll('[forTreeItem]');
      for (const item of Array.from(items)) {
        expect(item.getAttribute('tabindex')).toBe('-1');
      }
    });

    it('1b. non-virtualized host has no tabindex; first item has tabindex="0"', async () => {
      const { el } = await setup();
      const tree = treeOf(el);
      expect(tree.hasAttribute('tabindex')).toBe(false);
      expect(itemOf(el, 'documents').getAttribute('tabindex')).toBe('0');
    });

    it('2. per-level ARIA — consumer-supplied values are reflected on items', async () => {
      const { el } = await setupVirtual();
      const firstRoot = el.querySelector<HTMLElement>('[data-test-id="root-0"]')!;
      expect(firstRoot.getAttribute('aria-level')).toBe('1');
      expect(firstRoot.getAttribute('aria-setsize')).toBe(String(ROOT_COUNT));
      expect(firstRoot.getAttribute('aria-posinset')).toBe('1');

      const secondRoot = el.querySelector<HTMLElement>('[data-test-id="root-1"]')!;
      expect(secondRoot.getAttribute('aria-posinset')).toBe('2');
    });

    it('2b. non-virtualized tree derives ARIA from container (unchanged)', async () => {
      const { el } = await setup((i) => i.open.set(['documents']));
      const report = itemOf(el, 'report');
      expect(report.getAttribute('aria-level')).toBe('2');
      expect(report.getAttribute('aria-setsize')).toBe('2');
      expect(report.getAttribute('aria-posinset')).toBe('1');
    });

    it('3. focusin seeds aria-activedescendant to the first enabled item', async () => {
      const { el, fixture } = await setupVirtual();
      const tree = treeEl(el);
      tree.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
      await flush(fixture);
      const activeId = tree.getAttribute('aria-activedescendant');
      expect(activeId).toBeTruthy();
      const firstItem = el.querySelector<HTMLElement>('[data-test-id="root-0"]')!;
      expect(firstItem.id).toBe(activeId);
      expect(firstItem.hasAttribute('data-highlighted')).toBe(true);
    });

    it('4. ArrowDown moves aria-activedescendant to the next rendered item', async () => {
      const { el, fixture } = await setupVirtual();
      const tree = treeEl(el);
      tree.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
      await flush(fixture);
      await pressKey(tree, 'ArrowDown');
      await flush(fixture);
      const activeId = tree.getAttribute('aria-activedescendant');
      const secondRoot = el.querySelector<HTMLElement>('[data-test-id="root-1"]')!;
      expect(activeId).toBe(secondRoot.id);
      expect(secondRoot.hasAttribute('data-highlighted')).toBe(true);
    });

    it('5. End to off-window index emits scrollToIndex; item resolves after window update', async () => {
      const { el, fixture, instance } = await setupVirtual((i) => {
        i.windowSize.set(2);
      });
      const tree = treeEl(el);
      tree.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
      await flush(fixture);
      await pressKey(tree, 'End');
      await flush(fixture);
      expect(instance.scrolledToIndex()).not.toBeNull();
      await flush(fixture);
      const lastIndex = instance.flat().length - 1;
      const lastNode = instance.flat()[lastIndex]!;
      const lastItem = el.querySelector<HTMLElement>(`[data-test-id="${lastNode.value}"]`)!;
      expect(tree.getAttribute('aria-activedescendant')).toBe(lastItem.id);
    });

    it('6. ArrowRight on closed expandable calls setExpanded; ArrowRight on open enters child', async () => {
      const { el, fixture, instance } = await setupVirtual();
      const tree = treeEl(el);
      tree.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
      await flush(fixture);
      expect(instance.open()).not.toContain('root-0');
      await pressKey(tree, 'ArrowRight');
      await flush(fixture);
      expect(instance.open()).toContain('root-0');

      await flush(fixture);
      await pressKey(tree, 'ArrowRight');
      await flush(fixture);
      const activeId = tree.getAttribute('aria-activedescendant');
      const firstChild = el.querySelector<HTMLElement>('[data-test-id="child-0-0"]')!;
      expect(activeId).toBe(firstChild.id);
    });

    it('6b. ArrowLeft on open expandable collapses it', async () => {
      const { el, fixture, instance } = await setupVirtual((i) => i.open.set(['root-0']));
      const tree = treeEl(el);
      tree.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
      await flush(fixture);
      expect(instance.open()).toContain('root-0');
      await pressKey(tree, 'ArrowLeft');
      await flush(fixture);
      expect(instance.open()).not.toContain('root-0');
    });

    it('7. Enter activates the active descendant (single-select)', async () => {
      const { el, fixture, instance } = await setupVirtual();
      const tree = treeEl(el);
      tree.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
      await flush(fixture);
      await pressKey(tree, 'Enter');
      await flush(fixture);
      expect(instance.picked()).toContain('root-0');
    });

    it('7b. Enter in checkbox+cascade mode cascades to off-window descendants', async () => {
      const { el, fixture, instance } = await setupVirtual((i) => {
        i.selectionMode.set('checkbox');
        i.cascade.set(true);
        i.open.set(['root-0']);
        i.windowSize.set(1);
      });
      const tree = treeEl(el);
      tree.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
      await flush(fixture);
      expect(el.querySelector('[data-test-id="child-0-0"]')).toBeNull();

      await pressKey(tree, 'Enter');
      await flush(fixture);
      expect(instance.picked()).toContain('root-0');
      expect(instance.picked()).toContain('child-0-0');
      expect(instance.picked()).toContain('child-0-1');
    });

    it('8. unmounting the active item (shrink window past it) clears aria-activedescendant', async () => {
      const { el, fixture, instance } = await setupVirtual();
      const tree = treeEl(el);
      tree.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
      await flush(fixture);
      await pressKey(tree, 'ArrowDown');
      await flush(fixture);
      await pressKey(tree, 'ArrowDown');
      await flush(fixture);

      instance.windowStart.set(0);
      instance.windowSize.set(0);
      await flush(fixture);
      expect(tree.getAttribute('aria-activedescendant')).toBeFalsy();
    });

    it('8b. after the active item unmounts, ArrowDown resumes from the retained position, not the edge', async () => {
      const { el, fixture, instance } = await setupVirtual((i) => {
        i.windowSize.set(2);
      });
      const tree = treeEl(el);
      tree.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
      await flush(fixture);
      await pressKey(tree, 'ArrowDown');
      await flush(fixture);
      expect(tree.getAttribute('aria-activedescendant')).toBe(
        el.querySelector<HTMLElement>('[data-test-id="root-1"]')!.id,
      );

      instance.windowStart.set(2);
      await flush(fixture);
      expect(el.querySelector('[data-test-id="root-1"]')).toBeNull();
      expect(tree.getAttribute('aria-activedescendant')).toBeFalsy();

      await pressKey(tree, 'ArrowDown');
      await flush(fixture);
      const lastNode = instance.flat()[instance.flat().length - 1]!;
      const resumed = el.querySelector<HTMLElement>(`[data-test-id="${lastNode.value}"]`)!;
      expect(tree.getAttribute('aria-activedescendant')).toBe(resumed.id);
      expect(resumed.getAttribute('data-test-id')).toBe('root-2');
    });

    it('8c. after the active item unmounts, ArrowUp resumes from the retained position going backwards', async () => {
      const { el, fixture, instance } = await setupVirtual((i) => {
        i.windowSize.set(3);
      });
      const tree = treeEl(el);
      tree.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
      await flush(fixture);
      await pressKey(tree, 'ArrowDown');
      await flush(fixture);
      expect(tree.getAttribute('aria-activedescendant')).toBe(
        el.querySelector<HTMLElement>('[data-test-id="root-1"]')!.id,
      );

      instance.windowStart.set(2);
      instance.windowSize.set(1);
      await flush(fixture);
      expect(el.querySelector('[data-test-id="root-1"]')).toBeNull();
      expect(tree.getAttribute('aria-activedescendant')).toBeFalsy();

      await pressKey(tree, 'ArrowUp');
      await flush(fixture);
      const resumed = el.querySelector<HTMLElement>('[data-test-id="root-0"]')!;
      expect(tree.getAttribute('aria-activedescendant')).toBe(resumed.id);
    });

    it('8d. zoneless — resume-from-retained-position works without Zone.js', async () => {
      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
      const fixture = TestBed.createComponent(VirtualHost);
      fixture.componentInstance.windowSize.set(2);
      fixture.detectChanges();
      await flush(fixture);
      const el = fixture.nativeElement as HTMLElement;
      const tree = el.querySelector<HTMLElement>('[data-test-tree]')!;
      tree.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
      await flush(fixture);
      await pressKey(tree, 'ArrowDown');
      await flush(fixture);

      fixture.componentInstance.windowStart.set(2);
      await flush(fixture);
      expect(tree.getAttribute('aria-activedescendant')).toBeFalsy();

      await pressKey(tree, 'ArrowDown');
      await flush(fixture);
      const resumed = el.querySelector<HTMLElement>('[data-test-id="root-2"]')!;
      expect(tree.getAttribute('aria-activedescendant')).toBe(resumed.id);
    });

    it('9. non-virtualized path unchanged — no aria-activedescendant; ArrowDown moves DOM focus', async () => {
      const { el, fixture } = await setup();
      const tree = treeOf(el);
      expect(tree.hasAttribute('aria-activedescendant')).toBe(false);
      const firstItem = itemOf(el, 'documents');
      firstItem.focus();
      await flush(fixture);
      await pressKey(firstItem, 'ArrowDown');
      await flush(fixture);
      expect(document.activeElement).toBe(itemOf(el, 'downloads'));
    });

    it('10. zoneless — ArrowDown updates aria-activedescendant without Zone.js', async () => {
      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
      const fixture = TestBed.createComponent(VirtualHost);
      fixture.detectChanges();
      await flush(fixture);
      const el = fixture.nativeElement as HTMLElement;
      const tree = el.querySelector<HTMLElement>('[data-test-tree]')!;
      tree.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
      await flush(fixture);
      await pressKey(tree, 'ArrowDown');
      await flush(fixture);
      const activeId = tree.getAttribute('aria-activedescendant');
      const secondRoot = el.querySelector<HTMLElement>('[data-test-id="root-1"]')!;
      expect(activeId).toBe(secondRoot.id);
    });

    it('static id on forTreeItem is preserved (hostId contract)', async () => {
      @Component({
        imports: [ForTree, ForTreeItem, ForTreeItemLabel],
        template: `
          <ul forTree [totalCount]="1" aria-label="Static">
            <li
              forTreeItem
              value="a"
              id="my-node"
              [itemIndex]="0"
              [level]="1"
              [setSize]="1"
              [posInSet]="1"
            >
              <div forTreeItemLabel>A</div>
            </li>
          </ul>
        `,
      })
      class StaticIdHost {}

      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
      const fixture = TestBed.createComponent(StaticIdHost);
      fixture.detectChanges();
      await flush(fixture);
      const item = (fixture.nativeElement as HTMLElement).querySelector('[forTreeItem]')!;
      expect(item.id).toBe('my-node');
    });
  });

  describe('selectionFollowsFocus + virtualization guard', () => {
    @Component({
      imports: [ForTree, ForTreeItem, ForTreeItemLabel],
      template: `
        <ul
          forTree
          [(value)]="picked"
          [totalCount]="total()"
          [selectionFollowsFocus]="followsFocus()"
          aria-label="Guard"
        >
          <li
            forTreeItem
            value="a"
            [itemIndex]="0"
            [level]="1"
            [setSize]="1"
            [posInSet]="1"
            data-test-id="node-a"
          >
            <div forTreeItemLabel>A</div>
          </li>
        </ul>
      `,
    })
    class GuardHost {
      readonly picked = signal<readonly string[]>([]);
      readonly total = signal<number | undefined>(undefined);
      readonly followsFocus = signal(false);
    }

    it('throws in dev mode when selectionFollowsFocus is combined with totalCount', () => {
      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
      const fixture = TestBed.createComponent(GuardHost);
      fixture.componentInstance.total.set(50);
      fixture.componentInstance.followsFocus.set(true);
      expect(() => fixture.detectChanges()).toThrow(
        /\[forty-cdk\/tree\] `selectionFollowsFocus` is not supported together with virtualization/,
      );
    });

    it('does not throw when selectionFollowsFocus is set without virtualization', async () => {
      const r = renderHost(GuardHost);
      r.instance.followsFocus.set(true);
      await flush(r.fixture);
      const tree = r.el.querySelector<HTMLElement>('[forTree]')!;
      expect(tree.hasAttribute('aria-activedescendant')).toBe(false);
      expect(tree.hasAttribute('tabindex')).toBe(false);
    });

    it('does not throw when virtualized without selectionFollowsFocus', async () => {
      const r = renderHost(GuardHost);
      r.instance.total.set(50);
      await flush(r.fixture);
      const tree = r.el.querySelector<HTMLElement>('[forTree]')!;
      expect(tree.getAttribute('tabindex')).toBe('0');
    });
  });

  describe('multi-select keyboard + virtualization guard', () => {
    @Component({
      imports: [ForTree, ForTreeItem, ForTreeItemLabel],
      template: `
        <ul
          forTree
          data-test-tree
          [(value)]="picked"
          [multiple]="true"
          [totalCount]="total()"
          aria-label="MultiVirtual"
        >
          @for (i of indices; track i) {
            <li
              forTreeItem
              [value]="'n-' + i"
              [itemIndex]="i"
              [level]="1"
              [setSize]="3"
              [posInSet]="i + 1"
              [attr.data-test-id]="'n-' + i"
            >
              <div forTreeItemLabel>Node {{ i }}</div>
            </li>
          }
        </ul>
      `,
    })
    class MultiVirtualHost {
      readonly picked = signal<readonly string[]>([]);
      readonly total = signal<number | undefined>(3);
      readonly indices = [0, 1, 2];
    }

    async function setupMulti(captured: unknown[]) {
      class CapturingHandler implements ErrorHandler {
        handleError(err: unknown): void {
          captured.push(err);
        }
      }
      TestBed.configureTestingModule({
        rethrowApplicationErrors: false,
        providers: [
          provideZonelessChangeDetection(),
          { provide: ErrorHandler, useClass: CapturingHandler },
        ],
      });
      const fixture = TestBed.createComponent(MultiVirtualHost);
      fixture.detectChanges();
      await flush(fixture);
      const el = fixture.nativeElement as HTMLElement;
      const tree = el.querySelector<HTMLElement>('[data-test-tree]')!;
      tree.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
      await flush(fixture);
      return { fixture, el, tree };
    }

    const throwsUnsupported = (captured: readonly unknown[]) =>
      captured.some(
        (e) =>
          e instanceof Error && /\[forty-cdk\/tree\] Multi-select range keyboard/.test(e.message),
      );

    it('throws in dev mode on Shift+ArrowDown in a virtualized multi-select tree', async () => {
      const captured: unknown[] = [];
      const { tree } = await setupMulti(captured);
      pressKey(tree, 'ArrowDown', { shiftKey: true });
      expect(throwsUnsupported(captured)).toBe(true);
    });

    it('throws in dev mode on Shift+ArrowUp in a virtualized multi-select tree', async () => {
      const captured: unknown[] = [];
      const { tree } = await setupMulti(captured);
      pressKey(tree, 'ArrowUp', { shiftKey: true });
      expect(throwsUnsupported(captured)).toBe(true);
    });

    it('throws in dev mode on Shift+Space in a virtualized multi-select tree', async () => {
      const captured: unknown[] = [];
      const { tree } = await setupMulti(captured);
      pressKey(tree, ' ', { shiftKey: true });
      expect(throwsUnsupported(captured)).toBe(true);
    });

    it('throws in dev mode on Ctrl+A in a virtualized multi-select tree', async () => {
      const captured: unknown[] = [];
      const { tree } = await setupMulti(captured);
      pressKey(tree, 'a', { ctrlKey: true });
      expect(throwsUnsupported(captured)).toBe(true);
    });

    it('throws in dev mode on Meta+A (Cmd) in a virtualized multi-select tree', async () => {
      const captured: unknown[] = [];
      const { tree } = await setupMulti(captured);
      pressKey(tree, 'A', { metaKey: true });
      expect(throwsUnsupported(captured)).toBe(true);
    });

    it('preventDefault is called on the intercepted multi-select shortcut', async () => {
      const captured: unknown[] = [];
      const { tree } = await setupMulti(captured);
      const event = pressKey(tree, 'a', { ctrlKey: true });
      expect(event.defaultPrevented).toBe(true);
    });

    it('does not intercept a plain ArrowDown (navigation still works)', async () => {
      const captured: unknown[] = [];
      const { el, fixture, tree } = await setupMulti(captured);
      const first = el.querySelector<HTMLElement>('[data-test-id="n-0"]')!;
      expect(tree.getAttribute('aria-activedescendant')).toBe(first.id);
      pressKey(tree, 'ArrowDown');
      await flush(fixture);
      const second = el.querySelector<HTMLElement>('[data-test-id="n-1"]')!;
      expect(tree.getAttribute('aria-activedescendant')).toBe(second.id);
      expect(throwsUnsupported(captured)).toBe(false);
    });

    it('does not throw when the multi tree is not virtualized (roving path keeps range keys)', async () => {
      const r = renderHost(MultiVirtualHost);
      r.instance.total.set(undefined);
      await flush(r.fixture);
      const first = r.el.querySelector<HTMLElement>('[data-test-id="n-0"]')!;
      first.focus();
      await flush(r.fixture);
      expect(() => pressKey(first, 'ArrowDown', { shiftKey: true })).not.toThrow();
      await flush(r.fixture);
      expect(r.instance.picked()).toContain('n-1');
    });
  });
});

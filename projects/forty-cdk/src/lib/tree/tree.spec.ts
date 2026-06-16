import { Component, provideZonelessChangeDetection, signal, viewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { flush, pressKey, renderHost } from '../../test-utils';
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
});

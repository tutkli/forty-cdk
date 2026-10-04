import { ChangeDetectionStrategy, Component, signal, type Type } from '@angular/core';

import { ForListbox, ForListboxOption } from 'forty-cdk/listbox';
import { ForSelect, ForSelectContent, ForSelectOption, ForSelectTrigger } from 'forty-cdk/select';
import { pressKey } from 'forty-cdk/testing';
import { ForTree, ForTreeItem, ForTreeItemLabel } from 'forty-cdk/tree';

import { afterEachOverlayCleanup, flush, renderHost, type RenderResult } from '../test-utils';
import { LIBRARY_CODE } from '../test-utils/source-scan';

const TOTAL = 20;

abstract class WindowedHost {
  readonly picked = signal<readonly string[]>([]);
  readonly range = signal<readonly [number, number]>([0, 5]);
  readonly scrolled = signal<number | null>(null);

  windowRows(): readonly { readonly index: number }[] {
    const [start, end] = this.range();
    return Array.from({ length: end - start }, (_, k) => ({ index: start + k }));
  }

  onScrollToIndex(index: number): void {
    this.scrolled.set(index);
    const start = Math.max(0, Math.min(index - 2, TOTAL - 5));
    this.range.set([start, start + 5]);
  }
}

@Component({
  imports: [ForListbox, ForListboxOption],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      forListbox
      data-container
      aria-label="Rows"
      [(value)]="picked"
      [totalCount]="20"
      [visibleRange]="range()"
      (scrollToIndex)="onScrollToIndex($event)"
    >
      @for (row of windowRows(); track row.index) {
        <button type="button" forListboxOption [value]="'row-' + row.index" [posInSet]="row.index">
          Row {{ row.index }}
        </button>
      }
    </div>
  `,
})
class ListboxHost extends WindowedHost {}

@Component({
  imports: [ForSelect, ForSelectTrigger, ForSelectContent, ForSelectOption],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      forSelect
      [(open)]="open"
      [(value)]="picked"
      [totalCount]="20"
      [visibleRange]="range()"
      (scrollToIndex)="onScrollToIndex($event)"
    >
      <button forSelectTrigger>Rows</button>
      @if (open()) {
        <div forSelectContent data-container>
          @for (row of windowRows(); track row.index) {
            <button forSelectOption [value]="'row-' + row.index" [posInSet]="row.index">
              Row {{ row.index }}
            </button>
          }
        </div>
      }
    </div>
  `,
})
class SelectHost extends WindowedHost {
  readonly open = signal(true);
}

@Component({
  imports: [ForTree, ForTreeItem, ForTreeItemLabel],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ul
      forTree
      data-container
      aria-label="Rows"
      [(value)]="picked"
      [totalCount]="20"
      [visibleRange]="range()"
      (scrollToIndex)="onScrollToIndex($event)"
    >
      @for (row of windowRows(); track row.index) {
        <li
          forTreeItem
          [value]="'row-' + row.index"
          [itemIndex]="row.index"
          [level]="1"
          [setSize]="20"
          [posInSet]="row.index + 1"
        >
          <div forTreeItemLabel>Row {{ row.index }}</div>
        </li>
      }
    </ul>
  `,
})
class TreeHost extends WindowedHost {}

interface ResumeCase {
  readonly name: string;
  readonly owner: string;
  readonly host: Type<WindowedHost>;
}

const CASES: readonly ResumeCase[] = [
  { name: 'listbox', owner: 'listbox/src/listbox.ts', host: ListboxHost },
  { name: 'select', owner: 'select/src/select.ts', host: SelectHost },
  { name: 'tree', owner: 'tree/src/tree.ts', host: TreeHost },
];

const container = (): HTMLElement => document.querySelector<HTMLElement>('[data-container]')!;

async function strandSecondRow(r: RenderResult<WindowedHost>): Promise<HTMLElement> {
  await r.flush();
  const host = container();
  host.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
  await r.flush();
  await pressKey(host, 'ArrowDown');
  await r.flush();
  await pressKey(host, 'ArrowDown');
  await r.flush();
  expect(host.getAttribute('aria-activedescendant')).toBeTruthy();

  r.instance.range.set([10, 15]);
  await flush(r.fixture);
  expect(host.hasAttribute('aria-activedescendant')).toBe(false);
  return host;
}

describe('virtualized resume position adopters (issue #2123)', () => {
  afterEachOverlayCleanup();

  for (const testCase of CASES) {
    describe(testCase.name, () => {
      it('Enter activates the option the user was on after it scrolled out of the window', async () => {
        const r = renderHost(testCase.host);
        const host = await strandSecondRow(r);

        await pressKey(host, 'Enter');
        await flush(r.fixture);

        expect(r.instance.picked()).toEqual(['row-2']);
      });

      it('ArrowDown continues from the option the user was on after it scrolled out of the window', async () => {
        const r = renderHost(testCase.host);
        const host = await strandSecondRow(r);

        await pressKey(host, 'ArrowDown');
        await flush(r.fixture);

        expect(r.instance.scrolled()).toBe(3);
      });
    });
  }

  it('covers every root that clears its active descendant when the active item unmounts', () => {
    const clearsOnUnmount = [...LIBRARY_CODE]
      .filter(([, code]) => /#activeId\(\) === handle\.id\(\)/.test(code))
      .map(([path]) => path)
      .sort();

    expect(clearsOnUnmount.length).toBeGreaterThan(2);
    expect(CASES.map((c) => c.owner).sort()).toEqual(clearsOnUnmount);
  });

  it('retains the position through the shared VirtualizedResume in every covered root', () => {
    for (const { owner } of CASES) {
      const code = LIBRARY_CODE.get(owner)!;
      expect(code, owner).toMatch(/new VirtualizedResume</);
      expect(code, owner).toMatch(/#resume\.retain\(/);
      expect(code, owner).toMatch(/#resume\.clear\(\)/);
    }
  });

  it('feeds every navigator resume position from a VirtualizedResume', () => {
    const sites = [...LIBRARY_CODE].flatMap(([path, code]) =>
      [...code.matchAll(/getResumePos: \(\) => ([\w.#]+\(\))/g)].map((m) => `${path}: ${m[1]}`),
    );

    expect(sites.length).toBe(CASES.length);
    for (const site of sites) {
      expect(site).toMatch(/resume\.pos\(\)$/);
    }
  });
});

import { Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { installObserverPolyfills, renderHost } from '../../src/test-utils';
import { ForTableVirtualized } from 'forty-cdk/table-virtualization';

import { ForTable } from './table';
import { ForTableCell } from './table-cell';
import { ForTableHeaderCell } from './table-header-cell';
import { ForTableHeaderRow } from './table-header-row';
import { ForTableRow } from './table-row';
import { ForTableVariantCell } from './table-variant-cell';
import { type TableMode } from './table-context';

@Component({
  imports: [
    ForTable,
    ForTableHeaderRow,
    ForTableHeaderCell,
    ForTableRow,
    ForTableCell,
    ForTableVariantCell,
  ],
  template: `
    <div forTable [mode]="mode()" ariaLabel="People">
      <div forTableHeaderRow>
        @for (col of cols(); track col) {
          <div forTableHeaderCell [name]="col" [attr.data-testid]="'h-' + col">{{ col }}</div>
        }
      </div>
      <div role="rowgroup">
        @for (row of rows(); track row.id) {
          @if (withSeparators() && separatorsBefore().has(row.id)) {
            <div forTableRow [attr.data-testid]="'sep-row-' + row.id">
              <div forTableVariantCell [attr.data-testid]="'sep-' + row.id">Group {{ row.id }}</div>
            </div>
          }
          <div forTableRow>
            @for (col of cols(); track col) {
              <div forTableCell [name]="col" [attr.data-testid]="'c-' + col + row.id">
                {{ col }}{{ row.id }}
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
})
class SeparatorGridHost {
  readonly cols = signal<readonly string[]>(['a', 'b']);
  readonly rows = signal([{ id: 0 }, { id: 1 }, { id: 2 }, { id: 3 }]);
  readonly separatorsBefore = signal<ReadonlySet<number>>(new Set([0, 2]));
  readonly withSeparators = signal(true);
  readonly mode = signal<TableMode>('grid');
}

@Component({
  imports: [ForTable, ForTableRow, ForTableVariantCell],
  template: `
    <div forTable mode="grid" ariaLabel="Groups">
      <div role="rowgroup">
        <div forTableRow>
          <div forTableVariantCell data-testid="sep">Group</div>
        </div>
      </div>
    </div>
  `,
})
class SeparatorOnlyGridHost {}

@Component({
  imports: [
    ForTable,
    ForTableVirtualized,
    ForTableHeaderRow,
    ForTableHeaderCell,
    ForTableRow,
    ForTableCell,
    ForTableVariantCell,
  ],
  template: `
    <div forTable forTableVirtualized mode="grid" [rowCount]="200" ariaLabel="People">
      <div forTableHeaderRow>
        @for (col of cols(); track col) {
          <div forTableHeaderCell [name]="col" [attr.data-testid]="'h-' + col">{{ col }}</div>
        }
      </div>
      <div role="rowgroup">
        @for (vi of windowIndices(); track vi) {
          @if (variantIndices().has(vi)) {
            <div forTableRow [virtualIndex]="vi">
              <div forTableVariantCell [attr.data-testid]="'variant-' + vi">group {{ vi }}</div>
            </div>
          } @else {
            <div forTableRow [virtualIndex]="vi">
              <div forTableCell name="a" [attr.data-testid]="'cell-' + vi + '-a'">{{ vi }}a</div>
              <div forTableCell name="b" [attr.data-testid]="'cell-' + vi + '-b'">{{ vi }}b</div>
            </div>
          }
        }
      </div>
    </div>
  `,
})
class VirtualizedSeparatorWindowHost {
  readonly cols = signal<readonly string[]>(['a', 'b']);
  readonly windowIndices = signal<readonly number[]>([25, 26, 27, 28]);
  readonly variantIndices = signal<ReadonlySet<number>>(new Set([25]));
}

const rootEl = (el: HTMLElement) => el.querySelector<HTMLElement>('[forTable]')!;
const byId = (el: HTMLElement, id: string) =>
  el.querySelector<HTMLElement>(`[data-testid="${id}"]`)!;
const cells = (el: HTMLElement) => Array.from(el.querySelectorAll<HTMLElement>('[forTableCell]'));

const press = (cell: HTMLElement, key: string) =>
  cell.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));

async function walk(
  el: HTMLElement,
  startId: string,
  keys: readonly string[],
  flush: () => Promise<void>,
): Promise<readonly string[]> {
  const start = byId(el, startId);
  start.focus();
  await flush();

  const path: string[] = [];
  for (const key of keys) {
    press(document.activeElement as HTMLElement, key);
    await flush();
    path.push((document.activeElement as HTMLElement).getAttribute('data-testid') ?? '<none>');
  }
  return path;
}

describe('ForTableVariantCell', () => {
  let restoreObservers: () => void;
  beforeAll(() => {
    restoreObservers = installObserverPolyfills();
  });
  afterAll(() => restoreObservers());

  describe('emitted markup', () => {
    it('stamps role=gridcell, aria-colindex=1, aria-colspan over the grid columns and data-row-variant', () => {
      const { el } = renderHost(SeparatorGridHost);
      const separator = byId(el, 'sep-0');
      expect(separator.getAttribute('role')).toBe('gridcell');
      expect(separator.getAttribute('aria-colindex')).toBe('1');
      expect(separator.getAttribute('aria-colspan')).toBe('2');
      expect(separator.getAttribute('data-row-variant')).toBe('');
    });

    it('stamps role=cell in table mode', async () => {
      const { el, instance, flush } = renderHost(SeparatorGridHost);
      instance.mode.set('table');
      await flush();
      expect(byId(el, 'sep-0').getAttribute('role')).toBe('cell');
    });

    it('tracks the column count reactively', async () => {
      const { el, instance, flush } = renderHost(SeparatorGridHost);
      expect(byId(el, 'sep-0').getAttribute('aria-colspan')).toBe('2');

      instance.cols.set(['a', 'b', 'c']);
      await flush();
      expect(byId(el, 'sep-0').getAttribute('aria-colspan')).toBe('3');
    });

    it('omits aria-colspan when no cell has registered a column count', () => {
      const { el } = renderHost(SeparatorOnlyGridHost);
      expect(byId(el, 'sep').hasAttribute('aria-colspan')).toBe(false);
      expect(rootEl(el).getAttribute('aria-colcount')).toBe('-1');
    });

    it('takes no part in the roving tab order', () => {
      const { el } = renderHost(SeparatorGridHost);
      expect(byId(el, 'sep-0').hasAttribute('tabindex')).toBe(false);
      expect(byId(el, 'sep-2').hasAttribute('tabindex')).toBe(false);
    });

    it('still counts towards the row index space', () => {
      const { el } = renderHost(SeparatorGridHost);
      expect(byId(el, 'sep-row-0').getAttribute('aria-rowindex')).toBe('2');
      expect(byId(el, 'c-a0').closest('[forTableRow]')!.getAttribute('aria-rowindex')).toBe('3');
    });

    it('throws a prefixed orphan error outside [forTable]', () => {
      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

      @Component({
        imports: [ForTableVariantCell],
        template: `<td forTableVariantCell></td>`,
      })
      class Orphan {}

      expect(() => TestBed.createComponent(Orphan)).toThrow(
        /\[forty-cdk\/table\] FORCDK-TABLE-009: ForTableVariantCell must be used inside a \[forTable\] element\./,
      );
    });
  });

  describe('grid navigation', () => {
    it('a leading full-span row leaves aria-colcount on the data columns', () => {
      const { el } = renderHost(SeparatorGridHost);
      expect(rootEl(el).getAttribute('aria-colcount')).toBe('2');
      expect(cells(el).length).toBe(8);
    });

    it('a leading full-span row leaves the header row in the composite tab stop', async () => {
      const { el, flush } = renderHost(SeparatorGridHost);
      expect(byId(el, 'h-a').getAttribute('tabindex')).toBe('0');

      press(byId(el, 'h-a'), 'ArrowDown');
      await flush();
      expect(document.activeElement).toBe(byId(el, 'c-a0'));
    });

    it('interleaved full-span rows land arrow navigation on the same cells as a grid without them', async () => {
      const keys = ['ArrowDown', 'ArrowDown', 'ArrowRight', 'ArrowDown', 'End', 'Home'] as const;

      const { el, instance, flush } = renderHost(SeparatorGridHost);
      const withPath = await walk(el, 'h-a', keys, flush);

      instance.withSeparators.set(false);
      await flush();
      const withoutPath = await walk(el, 'h-a', keys, flush);

      expect(withoutPath).toEqual(['c-a0', 'c-a1', 'c-b1', 'c-b2', 'c-b2', 'c-a2']);
      expect(withPath).toEqual(withoutPath);
    });

    it('Ctrl+End reaches the last data cell, not a full-span row', async () => {
      const { el, flush } = renderHost(SeparatorGridHost);
      const start = byId(el, 'c-a0');
      start.focus();
      await flush();

      start.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'End',
          ctrlKey: true,
          bubbles: true,
          cancelable: true,
        }),
      );
      await flush();
      expect(document.activeElement).toBe(byId(el, 'c-b3'));
    });
  });

  describe('virtualized window starting on a full-span row', () => {
    it('reads the column count past the leading full-span row', () => {
      const { el } = renderHost(VirtualizedSeparatorWindowHost);
      expect(rootEl(el).getAttribute('aria-colcount')).toBe('2');
      expect(byId(el, 'variant-25').getAttribute('aria-colspan')).toBe('2');
    });

    it('keeps the header row in the composite tab stop', () => {
      const { el } = renderHost(VirtualizedSeparatorWindowHost);
      expect(byId(el, 'h-a').getAttribute('tabindex')).toBe('0');
      expect(byId(el, 'h-b').getAttribute('aria-colindex')).toBe('2');
    });

    it('ArrowDown preserves the column instead of collapsing the grid to one', async () => {
      const { el, flush } = renderHost(VirtualizedSeparatorWindowHost);
      const start = byId(el, 'cell-26-b');
      start.focus();
      await flush();

      press(start, 'ArrowDown');
      await flush();
      expect(document.activeElement).toBe(byId(el, 'cell-27-b'));
    });
  });
});

import { Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { installObserverPolyfills, renderHost } from '../../test-utils';
import { ForTable } from './table';
import { ForTableCell } from './table-cell';
import { ForTableHeaderCell } from './table-header-cell';
import { ForTableHeaderRow } from './table-header-row';
import { ForTableRow } from './table-row';
import { FOR_TABLE_DEFAULTS, provideForTableDefaults } from './table-defaults';
import { type TableMode } from './table-context';

const TABLE_IMPORTS = [
  ForTable,
  ForTableHeaderRow,
  ForTableRow,
  ForTableHeaderCell,
  ForTableCell,
] as const;

@Component({
  imports: [...TABLE_IMPORTS],
  template: `
    <table forTable [mode]="mode()" [ariaLabel]="ariaLabel()" [dir]="dir()">
      <thead>
        <tr forTableHeaderRow>
          <th forTableHeaderCell [name]="colName()" [sticky]="sticky()">Name</th>
        </tr>
      </thead>
      <tbody>
        <tr forTableRow>
          <td forTableCell [name]="colName()" [sticky]="stickyCell()">Ada</td>
        </tr>
      </tbody>
    </table>
  `,
})
class TableHost {
  readonly mode = signal<TableMode>('table');
  readonly ariaLabel = signal<string | null>(null);
  readonly dir = signal<'ltr' | 'rtl' | null>(null);
  readonly colName = signal('name');
  readonly sticky = signal<boolean | 'end'>(false);
  readonly stickyCell = signal<boolean | 'end'>(false);
}

@Component({
  imports: [...TABLE_IMPORTS],
  template: `
    <div forTable [mode]="mode()" [ariaLabel]="ariaLabel()">
      <div role="rowgroup">
        <div forTableHeaderRow>
          <div forTableHeaderCell name="id">ID</div>
        </div>
      </div>
      <div role="rowgroup">
        <div forTableRow>
          <div forTableCell name="id">1</div>
        </div>
      </div>
    </div>
  `,
})
class DivTableHost {
  readonly mode = signal<TableMode>('table');
  readonly ariaLabel = signal<string | null>(null);
}

@Component({
  imports: [ForTable, ForTableRow, ForTableCell],
  template: `
    <table forTable mode="grid" [dir]="dir()" [rowCount]="rowCount()" [colCount]="colCount()">
      <tbody>
        @for (row of rows(); track row.id) {
          <tr forTableRow>
            @for (col of cols; track col) {
              <td
                forTableCell
                [name]="col"
                [disabled]="row.id === disabledRow() && col === disabledCol()"
              >
                {{ col }}{{ row.id }}
              </td>
            }
          </tr>
        }
      </tbody>
    </table>
  `,
})
class GridTableHost {
  readonly cols = ['a', 'b', 'c'] as const;
  readonly rows = signal([{ id: 0 }, { id: 1 }, { id: 2 }]);
  readonly dir = signal<'ltr' | 'rtl' | null>(null);
  readonly rowCount = signal<number | undefined>(undefined);
  readonly colCount = signal<number | undefined>(undefined);
  readonly disabledRow = signal<number | null>(null);
  readonly disabledCol = signal<string | null>(null);
}

const rootEl = (el: HTMLElement) => el.querySelector<HTMLElement>('[forTable]')!;
const headerRowEl = (el: HTMLElement) => el.querySelector<HTMLElement>('[forTableHeaderRow]')!;
const headerCellEl = (el: HTMLElement) => el.querySelector<HTMLElement>('[forTableHeaderCell]')!;
const rowEl = (el: HTMLElement) => el.querySelector<HTMLElement>('[forTableRow]')!;
const cellEl = (el: HTMLElement) => el.querySelector<HTMLElement>('[forTableCell]')!;

const cells = (el: HTMLElement) => Array.from(el.querySelectorAll<HTMLElement>('[forTableCell]'));
const press = (cell: HTMLElement, key: string, modifiers: Partial<KeyboardEventInit> = {}) => {
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
    ...modifiers,
  });
  cell.dispatchEvent(event);
  return event;
};

describe('ForTable', () => {
  let restoreObservers: () => void;
  beforeAll(() => {
    restoreObservers = installObserverPolyfills();
  });
  afterAll(() => restoreObservers());

  describe('roles, table mode', () => {
    it('sets role=table on root, role=row on rows, role=columnheader on header cell, role=cell on data cell', () => {
      const { el } = renderHost(TableHost);
      expect(rootEl(el).getAttribute('role')).toBe('table');
      expect(headerRowEl(el).getAttribute('role')).toBe('row');
      expect(rowEl(el).getAttribute('role')).toBe('row');
      expect(headerCellEl(el).getAttribute('role')).toBe('columnheader');
      expect(cellEl(el).getAttribute('role')).toBe('cell');
    });

    it('applies the same roles in <div> DOM mode', () => {
      const { el } = renderHost(DivTableHost);
      expect(rootEl(el).getAttribute('role')).toBe('table');
      expect(headerRowEl(el).getAttribute('role')).toBe('row');
      expect(rowEl(el).getAttribute('role')).toBe('row');
      expect(headerCellEl(el).getAttribute('role')).toBe('columnheader');
      expect(cellEl(el).getAttribute('role')).toBe('cell');
    });
  });

  describe('role cascade', () => {
    it('keeps data cell role=cell in the default table mode', () => {
      const { el } = renderHost(TableHost);
      expect(cellEl(el).getAttribute('role')).toBe('cell');
    });

    it('flips root to role=grid and data cell to role=gridcell when mode="grid"', () => {
      const { el, instance, flush } = renderHost(TableHost);
      instance.mode.set('grid');
      flush();
      expect(rootEl(el).getAttribute('role')).toBe('grid');
      expect(cellEl(el).getAttribute('role')).toBe('gridcell');
    });

    it('flips root to role=treegrid and data cell to role=gridcell when mode="treegrid"', () => {
      const { el, instance, flush } = renderHost(TableHost);
      instance.mode.set('treegrid');
      flush();
      expect(rootEl(el).getAttribute('role')).toBe('treegrid');
      expect(cellEl(el).getAttribute('role')).toBe('gridcell');
    });

    it('reverts data cell back to role=cell when mode changes back to table', () => {
      const { el, instance, flush } = renderHost(TableHost);
      instance.mode.set('grid');
      flush();
      expect(cellEl(el).getAttribute('role')).toBe('gridcell');

      instance.mode.set('table');
      flush();
      expect(cellEl(el).getAttribute('role')).toBe('cell');
    });
  });

  describe('ariaLabel truthy-only', () => {
    it('is absent by default', () => {
      const { el } = renderHost(TableHost);
      expect(rootEl(el).hasAttribute('aria-label')).toBe(false);
    });

    it('is present when ariaLabel is set', () => {
      const { el, instance, flush } = renderHost(TableHost);
      instance.ariaLabel.set('People');
      flush();
      expect(rootEl(el).getAttribute('aria-label')).toBe('People');
    });

    it('is removed when ariaLabel is cleared', () => {
      const { el, instance, flush } = renderHost(TableHost);
      instance.ariaLabel.set('People');
      flush();
      instance.ariaLabel.set(null);
      flush();
      expect(rootEl(el).hasAttribute('aria-label')).toBe(false);
    });
  });

  describe('dir', () => {
    it('reflects an explicit [dir]="rtl"', () => {
      const { el, instance, flush } = renderHost(TableHost);
      instance.dir.set('rtl');
      flush();
      expect(rootEl(el).getAttribute('dir')).toBe('rtl');
    });

    it('resolves the ambient direction to ltr with no ancestor dir attribute', () => {
      const { el } = renderHost(TableHost);
      expect(rootEl(el).getAttribute('dir')).toBe('ltr');
    });
  });

  describe('data-column', () => {
    it('reflects name() on the header cell', () => {
      const { el } = renderHost(TableHost);
      expect(headerCellEl(el).getAttribute('data-column')).toBe('name');
    });

    it('reflects name() on the data cell', () => {
      const { el } = renderHost(TableHost);
      expect(cellEl(el).getAttribute('data-column')).toBe('name');
    });

    it('updates data-column when the name signal changes', () => {
      const { el, instance, flush } = renderHost(TableHost);
      instance.colName.set('email');
      flush();
      expect(headerCellEl(el).getAttribute('data-column')).toBe('email');
      expect(cellEl(el).getAttribute('data-column')).toBe('email');
    });
  });

  describe('data-sticky', () => {
    it('emits data-sticky="" for sticky=true on the header cell', () => {
      const { el, instance, flush } = renderHost(TableHost);
      instance.sticky.set(true);
      flush();
      expect(headerCellEl(el).getAttribute('data-sticky')).toBe('');
    });

    it('emits data-sticky="end" for sticky="end" on the header cell', () => {
      const { el, instance, flush } = renderHost(TableHost);
      instance.sticky.set('end');
      flush();
      expect(headerCellEl(el).getAttribute('data-sticky')).toBe('end');
    });

    it('emits no data-sticky for sticky=false on the header cell', () => {
      const { el } = renderHost(TableHost);
      expect(headerCellEl(el).hasAttribute('data-sticky')).toBe(false);
    });

    it('emits data-sticky="" for sticky=true on the data cell', () => {
      const { el, instance, flush } = renderHost(TableHost);
      instance.stickyCell.set(true);
      flush();
      expect(cellEl(el).getAttribute('data-sticky')).toBe('');
    });

    it('emits data-sticky="end" for sticky="end" on the data cell', () => {
      const { el, instance, flush } = renderHost(TableHost);
      instance.stickyCell.set('end');
      flush();
      expect(cellEl(el).getAttribute('data-sticky')).toBe('end');
    });

    it('emits no data-sticky for sticky=false on the data cell', () => {
      const { el } = renderHost(TableHost);
      expect(cellEl(el).hasAttribute('data-sticky')).toBe(false);
    });
  });

  describe('orphan errors', () => {
    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: [provideZonelessChangeDetection()],
      });
    });

    it('throws a prefixed error from ForTableHeaderRow', () => {
      @Component({
        imports: [ForTableHeaderRow],
        template: `<tr forTableHeaderRow></tr>`,
      })
      class Orphan {}
      expect(() => TestBed.createComponent(Orphan)).toThrow(
        /\[forty-cdk\/table\] ForTableHeaderRow must be used inside a \[forTable\] element\./,
      );
    });

    it('throws a prefixed error from ForTableRow', () => {
      @Component({
        imports: [ForTableRow],
        template: `<tr forTableRow></tr>`,
      })
      class Orphan {}
      expect(() => TestBed.createComponent(Orphan)).toThrow(
        /\[forty-cdk\/table\] ForTableRow must be used inside a \[forTable\] element\./,
      );
    });

    it('throws a prefixed error from ForTableHeaderCell', () => {
      @Component({
        imports: [ForTableHeaderCell],
        template: `<th forTableHeaderCell name="x"></th>`,
      })
      class Orphan {}
      expect(() => TestBed.createComponent(Orphan)).toThrow(
        /\[forty-cdk\/table\] ForTableHeaderCell must be used inside a \[forTable\] element\./,
      );
    });

    it('throws a prefixed error from ForTableCell', () => {
      @Component({
        imports: [ForTableCell],
        template: `<td forTableCell name="x"></td>`,
      })
      class Orphan {}
      expect(() => TestBed.createComponent(Orphan)).toThrow(
        /\[forty-cdk\/table\] ForTableCell must be used inside a \[forTable\] element\./,
      );
    });
  });

  describe('defaults', () => {
    it('resolves an empty defaults object at the root injector', () => {
      TestBed.configureTestingModule({
        providers: [provideZonelessChangeDetection()],
      });
      const resolved = TestBed.runInInjectionContext(() => TestBed.inject(FOR_TABLE_DEFAULTS));
      expect(resolved).toEqual({});
    });

    it('provideForTableDefaults() with no overrides resolves an empty defaults object', () => {
      TestBed.configureTestingModule({
        providers: [provideZonelessChangeDetection(), ...provideForTableDefaults()],
      });
      const resolved = TestBed.runInInjectionContext(() => TestBed.inject(FOR_TABLE_DEFAULTS));
      expect(resolved).toEqual({});
    });
  });

  describe('grid mode', () => {
    it('single tab stop (initial): exactly one cell has tabindex=0 and it is the first; all others -1', () => {
      const { el } = renderHost(GridTableHost);
      const allCells = cells(el);
      expect(allCells.length).toBe(9);
      const zeros = allCells.filter((c) => c.getAttribute('tabindex') === '0');
      expect(zeros.length).toBe(1);
      expect(zeros[0]).toBe(allCells[0]);
      for (let i = 1; i < allCells.length; i++) {
        expect(allCells[i].getAttribute('tabindex')).toBe('-1');
      }
    });

    it('table mode has no tabindex on data cell', () => {
      const { el } = renderHost(TableHost);
      expect(cellEl(el).hasAttribute('tabindex')).toBe(false);
    });

    it('aria-rowcount / aria-colcount default to rendered counts', () => {
      const { el } = renderHost(GridTableHost);
      expect(rootEl(el).getAttribute('aria-rowcount')).toBe('3');
      expect(rootEl(el).getAttribute('aria-colcount')).toBe('3');
    });

    it('aria-rowcount / aria-colcount respect overrides', () => {
      const { el, instance, flush } = renderHost(GridTableHost);
      instance.rowCount.set(100);
      instance.colCount.set(5);
      flush();
      expect(rootEl(el).getAttribute('aria-rowcount')).toBe('100');
      expect(rootEl(el).getAttribute('aria-colcount')).toBe('5');
    });

    it('aria-rowindex on data rows is 1-based', () => {
      const { el } = renderHost(GridTableHost);
      const rows = Array.from(el.querySelectorAll<HTMLElement>('[forTableRow]'));
      expect(rows[0].getAttribute('aria-rowindex')).toBe('1');
      expect(rows[1].getAttribute('aria-rowindex')).toBe('2');
      expect(rows[2].getAttribute('aria-rowindex')).toBe('3');
    });

    it('aria-colindex on data cells of first row is 1-based', () => {
      const { el } = renderHost(GridTableHost);
      const firstRowCells = cells(el).slice(0, 3);
      expect(firstRowCells[0].getAttribute('aria-colindex')).toBe('1');
      expect(firstRowCells[1].getAttribute('aria-colindex')).toBe('2');
      expect(firstRowCells[2].getAttribute('aria-colindex')).toBe('3');
    });

    it('no index attrs in table mode', () => {
      const { el } = renderHost(TableHost);
      expect(rootEl(el).hasAttribute('aria-rowcount')).toBe(false);
      expect(rootEl(el).hasAttribute('aria-colcount')).toBe(false);
      expect(cellEl(el).hasAttribute('aria-colindex')).toBe(false);
      expect(rowEl(el).hasAttribute('aria-rowindex')).toBe(false);
    });

    it('ArrowRight moves focus to next cell, ArrowLeft moves back', () => {
      const { el, flush } = renderHost(GridTableHost);
      const allCells = cells(el);
      const ev = press(allCells[0], 'ArrowRight');
      flush();
      expect(ev.defaultPrevented).toBe(true);
      expect(allCells[1].getAttribute('data-highlighted')).toBe('');
      expect(allCells[1].getAttribute('tabindex')).toBe('0');
      expect(allCells[0].getAttribute('tabindex')).toBe('-1');

      press(allCells[1], 'ArrowLeft');
      flush();
      expect(allCells[0].getAttribute('data-highlighted')).toBe('');
      expect(allCells[0].getAttribute('tabindex')).toBe('0');
    });

    it('ArrowDown moves one row down, ArrowUp moves back', () => {
      const { el, flush } = renderHost(GridTableHost);
      const allCells = cells(el);
      press(allCells[0], 'ArrowDown');
      flush();
      expect(allCells[3].getAttribute('data-highlighted')).toBe('');

      press(allCells[3], 'ArrowUp');
      flush();
      expect(allCells[0].getAttribute('data-highlighted')).toBe('');
    });

    it('End moves to last cell in row, Home moves back to first', () => {
      const { el, flush } = renderHost(GridTableHost);
      const allCells = cells(el);
      press(allCells[0], 'End');
      flush();
      expect(allCells[2].getAttribute('data-highlighted')).toBe('');

      press(allCells[2], 'Home');
      flush();
      expect(allCells[0].getAttribute('data-highlighted')).toBe('');
    });

    it('Ctrl+End moves to last cell of grid, Ctrl+Home moves to first', () => {
      const { el, flush } = renderHost(GridTableHost);
      const allCells = cells(el);
      press(allCells[0], 'End', { ctrlKey: true });
      flush();
      expect(allCells[8].getAttribute('data-highlighted')).toBe('');

      press(allCells[8], 'Home', { ctrlKey: true });
      flush();
      expect(allCells[0].getAttribute('data-highlighted')).toBe('');
    });

    it('PageDown moves to last cell, PageUp moves to first', () => {
      const { el, flush } = renderHost(GridTableHost);
      const allCells = cells(el);
      press(allCells[0], 'PageDown');
      flush();
      expect(allCells[8].getAttribute('data-highlighted')).toBe('');

      press(allCells[8], 'PageUp');
      flush();
      expect(allCells[0].getAttribute('data-highlighted')).toBe('');
    });

    it('edge does not wrap: ArrowUp from first cell does not move when roving is active', () => {
      const { el, flush } = renderHost(GridTableHost);
      const allCells = cells(el);
      press(allCells[0], 'ArrowDown');
      flush();
      expect(allCells[3].getAttribute('data-highlighted')).toBe('');

      press(allCells[3], 'ArrowUp');
      flush();
      expect(allCells[0].getAttribute('data-highlighted')).toBe('');

      press(allCells[0], 'ArrowUp');
      flush();
      expect(allCells[0].getAttribute('data-highlighted')).toBe('');
    });

    it('RTL mirrors horizontal arrows', () => {
      const { el, instance, flush } = renderHost(GridTableHost);
      instance.dir.set('rtl');
      flush();
      const allCells = cells(el);
      press(allCells[0], 'ArrowLeft');
      flush();
      expect(allCells[1].getAttribute('data-highlighted')).toBe('');

      press(allCells[1], 'ArrowRight');
      flush();
      expect(allCells[0].getAttribute('data-highlighted')).toBe('');
    });

    it('disabled cell is skipped during navigation and reflects aria-disabled/data-disabled', () => {
      const { el, instance, flush } = renderHost(GridTableHost);
      instance.disabledRow.set(1);
      instance.disabledCol.set('b');
      flush();
      const allCells = cells(el);
      const disabledCell = allCells[4];
      expect(disabledCell.getAttribute('aria-disabled')).toBe('true');
      expect(disabledCell.getAttribute('data-disabled')).toBe('');
      expect(disabledCell.getAttribute('tabindex')).toBe('-1');

      press(allCells[1], 'ArrowDown');
      flush();
      expect(allCells[7].getAttribute('data-highlighted')).toBe('');
    });
  });

  describe('zoneless reactivity', () => {
    it('reflects a mode change on the cell role without Zone.js', () => {
      const { el, instance, flush } = renderHost(TableHost);
      expect(cellEl(el).getAttribute('role')).toBe('cell');

      instance.mode.set('grid');
      flush();

      expect(cellEl(el).getAttribute('role')).toBe('gridcell');
    });

    it('reflects an ariaLabel change without Zone.js', () => {
      const { el, instance, flush } = renderHost(TableHost);
      expect(rootEl(el).hasAttribute('aria-label')).toBe(false);

      instance.ariaLabel.set('My Table');
      flush();

      expect(rootEl(el).getAttribute('aria-label')).toBe('My Table');
    });

    it('grid navigation reacts without Zone.js', () => {
      const { el, flush } = renderHost(GridTableHost);
      const allCells = cells(el);
      press(allCells[0], 'ArrowRight');
      flush();
      expect(allCells[1].getAttribute('data-highlighted')).toBe('');
      expect(allCells[1].getAttribute('tabindex')).toBe('0');
    });
  });
});

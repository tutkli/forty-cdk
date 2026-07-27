import { Component, Directive, input } from '@angular/core';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { installObserverPolyfills, renderHost } from '../../src/test-utils';

import { ForTable, provideForTable } from './table';
import { ForTableCell } from './table-cell';
import { ForTableHeaderCell } from './table-header-cell';
import { ForTableHeaderRow } from './table-header-row';
import { ForTableRow } from './table-row';

@Directive({
  selector: '[wrapperTable]',
  exportAs: 'wrapperTable',
  providers: provideForTable(WrapperTable),
  host: { class: 'wrapper-table' },
})
class WrapperTable extends ForTable {
  readonly columns = input<string>('');
}

@Directive({ selector: '[wrapperTableHeaderRow]', hostDirectives: [ForTableHeaderRow] })
class WrapperTableHeaderRow {}

@Directive({
  selector: '[wrapperTableHeaderCell]',
  hostDirectives: [{ directive: ForTableHeaderCell, inputs: ['name'] }],
})
class WrapperTableHeaderCell {}

@Directive({ selector: '[wrapperTableRow]', hostDirectives: [ForTableRow] })
class WrapperTableRow {}

@Directive({
  selector: '[wrapperTableCell]',
  hostDirectives: [{ directive: ForTableCell, inputs: ['name'] }],
})
class WrapperTableCell {}

@Component({
  imports: [
    WrapperTable,
    WrapperTableHeaderRow,
    WrapperTableHeaderCell,
    WrapperTableRow,
    WrapperTableCell,
  ],
  template: `
    <div wrapperTable mode="grid" columns="1fr 1fr">
      <div wrapperTableHeaderRow>
        <div wrapperTableHeaderCell name="a">A</div>
        <div wrapperTableHeaderCell name="b">B</div>
      </div>
      <div wrapperTableRow>
        <div wrapperTableCell name="a">1</div>
        <div wrapperTableCell name="b">2</div>
      </div>
    </div>
  `,
})
class WrapperHost {}

describe('ForTable subclass wrapper (#1399)', () => {
  let restoreObservers: () => void;
  beforeAll(() => {
    restoreObservers = installObserverPolyfills();
  });
  afterAll(() => restoreObservers());

  it('mounts a subclassed root whose own providers come from provideForTable', () => {
    const { el } = renderHost(WrapperHost);

    expect(el.querySelector('[wrapperTable]')?.getAttribute('role')).toBe('grid');
  });

  it('registers the header row and data rows through the subclassed root', () => {
    const { el } = renderHost(WrapperHost);

    const headerRow = el.querySelector('[wrapperTableHeaderRow]');
    const dataRow = el.querySelector('[wrapperTableRow]');

    expect(headerRow?.getAttribute('aria-rowindex')).toBe('1');
    expect(dataRow?.getAttribute('aria-rowindex')).toBe('2');
  });

  it('builds the roving cell grid from the pieces registered with the subclass', () => {
    const { el } = renderHost(WrapperHost);

    const cells = Array.from(el.querySelectorAll('[wrapperTableHeaderCell], [wrapperTableCell]'));
    const tabStops = cells.filter((cell) => cell.getAttribute('tabindex') === '0');

    expect(cells).toHaveLength(4);
    expect(tabStops).toHaveLength(1);
  });
});

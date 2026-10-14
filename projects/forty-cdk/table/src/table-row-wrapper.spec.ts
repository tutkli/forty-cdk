import { Component, Directive } from '@angular/core';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { installObserverPolyfills } from 'forty-cdk/testing';

import { renderHost } from '../../src/test-utils';

import { ForTable } from './table';
import { ForTableCell } from './table-cell';
import { ForTableHeaderCell } from './table-header-cell';
import { ForTableHeaderRow } from './table-header-row';
import { ForTableRow, provideForTableRow } from './table-row';

@Directive({
  selector: '[wrapperTableRow]',
  exportAs: 'wrapperTableRow',
  providers: provideForTableRow(WrapperTableRow),
  host: { class: 'wrapper-row' },
})
class WrapperTableRow extends ForTableRow {}

@Directive({ selector: '[bareTableRow]' })
class BareTableRow extends ForTableRow {}

@Component({
  imports: [ForTable, ForTableHeaderRow, ForTableHeaderCell, WrapperTableRow, ForTableCell],
  template: `
    <div forTable mode="grid">
      <div forTableHeaderRow>
        <div forTableHeaderCell name="a">A</div>
        <div forTableHeaderCell name="b">B</div>
      </div>
      <div wrapperTableRow>
        <div forTableCell name="a">1</div>
        <div forTableCell name="b">2</div>
      </div>
    </div>
  `,
})
class WrapperHost {}

@Component({
  imports: [ForTable, BareTableRow, ForTableCell],
  template: `
    <div forTable mode="grid">
      <div bareTableRow>
        <div forTableCell name="a">1</div>
      </div>
    </div>
  `,
})
class BareHost {}

describe('ForTableRow subclass wrapper', () => {
  let restoreObservers: () => void;
  beforeAll(() => {
    restoreObservers = installObserverPolyfills();
  });
  afterAll(() => restoreObservers());

  it('registers its cells with a subclassed row whose providers come from provideForTableRow', async () => {
    const { el, flush } = renderHost(WrapperHost);
    await flush();

    const row = el.querySelector('[wrapperTableRow]')!;
    const cells = Array.from(row.querySelectorAll('[forTableCell]'));
    expect(row.getAttribute('role')).toBe('row');
    expect(row.getAttribute('aria-rowindex')).toBe('2');
    expect(cells.map((cell) => cell.getAttribute('aria-colindex'))).toEqual(['1', '2']);
  });

  it('keeps one roving tab stop across the header and the subclassed row', async () => {
    const { el, flush } = renderHost(WrapperHost);
    await flush();

    const cells = Array.from(el.querySelectorAll('[forTableHeaderCell], [forTableCell]'));
    expect(cells.filter((cell) => cell.getAttribute('tabindex') === '0')).toHaveLength(1);
  });

  it('fails a subclass that re-provides nothing with the row orphan error', () => {
    expect(() => renderHost(BareHost)).toThrow(/FORCDK-TABLE-012/);
  });
});

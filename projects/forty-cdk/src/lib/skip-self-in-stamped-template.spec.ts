import { Component, signal } from '@angular/core';

import { renderHost } from '../test-utils';

import { ForFieldset } from 'forty-cdk/fieldset';
import {
  ForTable,
  ForTableBody,
  ForTableCellDef,
  ForTableColumnDef,
  ForTableHeaderCellDef,
} from 'forty-cdk/table';
import { installObserverPolyfills } from 'forty-cdk/testing';

interface Row {
  id: number;
}

@Component({
  imports: [
    ForTable,
    ForTableBody,
    ForTableColumnDef,
    ForTableHeaderCellDef,
    ForTableCellDef,
    ForFieldset,
  ],
  template: `
    <div forFieldset data-testid="form">
      <div forTable mode="grid" ariaLabel="Stamped">
        <for-table-body [rows]="rows()" [rowKey]="rowKey">
          <ng-container forTableColumnDef="group">
            <ng-template forTableHeaderCellDef>
              <div forFieldset disabled data-testid="header-outer">
                <div forFieldset data-testid="header-inner"></div>
              </div>
            </ng-template>
            <ng-template forTableCellDef [forTableCellDefRow]="rows()">
              <div forFieldset disabled data-testid="cell-outer">
                <div forFieldset data-testid="cell-inner"></div>
              </div>
            </ng-template>
          </ng-container>
        </for-table-body>
      </div>
    </div>
  `,
})
class StampedFieldsetHost {
  readonly rows = signal<Row[]>([{ id: 1 }]);
  readonly rowKey = (row: Row): number => row.id;
}

describe('skipSelf parent lookup inside a template stamped with a custom injector that also resolves the token', () => {
  let restoreObservers: () => void;
  beforeAll(() => {
    restoreObservers = installObserverPolyfills();
  });
  afterAll(() => restoreObservers());

  it('a nested [forFieldset] in a <for-table-body> cell template resolves the nearest enclosing [forFieldset], not the one around the table', () => {
    const { query } = renderHost(StampedFieldsetHost);
    expect(query('[data-testid="form"]')!.getAttribute('data-disabled')).toBeNull();
    expect(query('[data-testid="cell-outer"]')!.getAttribute('data-disabled')).toBe('');
    expect(query('[data-testid="cell-inner"]')!.getAttribute('data-disabled')).toBe('');
  });

  it('a nested [forFieldset] in a <for-table-body> header template resolves the nearest enclosing [forFieldset], not the one around the table', () => {
    const { query } = renderHost(StampedFieldsetHost);
    expect(query('[data-testid="header-outer"]')!.getAttribute('data-disabled')).toBe('');
    expect(query('[data-testid="header-inner"]')!.getAttribute('data-disabled')).toBe('');
  });
});

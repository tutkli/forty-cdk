import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { installObserverPolyfills, renderHost } from '../../src/test-utils';

import { FOR_TABLE_DEF_REGISTRY, provideForTableDefRegistry } from './def-registry';
import { ForTable } from './table';
import { ForTableBody } from './table-body';

interface Row {
  id: number;
  name: string;
}

function buildRows(): Row[] {
  return [
    { id: 1, name: 'Ada' },
    { id: 2, name: 'Linus' },
  ];
}

@Component({
  selector: 'hand-written-body',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    { provide: FOR_TABLE_DEF_REGISTRY, useValue: { columnNames: signal<readonly string[]>([]) } },
  ],
  template: ``,
})
class HandWrittenProviderBody extends ForTableBody<Row> {}

@Component({
  selector: 'helper-body',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: provideForTableDefRegistry(),
  template: ``,
})
class HelperProviderBody extends ForTableBody<Row> {}

@Component({
  imports: [ForTable, HandWrittenProviderBody],
  template: `
    <div forTable mode="grid" ariaLabel="Hand-written">
      <hand-written-body [rows]="rows()" />
    </div>
  `,
})
class HandWrittenProviderHost {
  readonly rows = signal<Row[]>(buildRows());
}

@Component({
  imports: [ForTable, HelperProviderBody],
  template: `
    <div forTable mode="grid" ariaLabel="Helper">
      <helper-body [rows]="rows()" />
    </div>
  `,
})
class HelperProviderHost {
  readonly rows = signal<Row[]>(buildRows());
}

@Component({
  imports: [ForTable, ForTableBody],
  template: `
    <div forTable mode="grid" ariaLabel="Composed">
      <for-table-body [rows]="rows()" />
    </div>
  `,
})
class ComposedBodyHost {
  readonly rows = signal<Row[]>(buildRows());
}

describe('ForTableBody wrapping guard (#1563)', () => {
  let restoreObservers: () => void;
  beforeAll(() => {
    restoreObservers = installObserverPolyfills();
  });
  afterAll(() => restoreObservers());

  it('fails a hand-written provider list with an actionable [forty-cdk/table] error', () => {
    expect(() => renderHost(HandWrittenProviderHost)).toThrow(
      /\[forty-cdk\/table\].*no def registry of its own.*provideForTableDefRegistry\(\)/s,
    );
  });

  it('names the supported composition shape in the failure', () => {
    expect(() => renderHost(HandWrittenProviderHost)).toThrow(
      /subclass inherits no template.*Compose <for-table-body> inside a wrapper's template/s,
    );
  });

  it('constructs a subclass whose providers come from provideForTableDefRegistry', () => {
    expect(() => renderHost(HelperProviderHost)).not.toThrow();
  });

  it('renders none of the body through that subclass — a subclass inherits no template', () => {
    const { query } = renderHost(HelperProviderHost);

    expect(query('[forTableHeaderRow]')).toBeNull();
    expect(query('[role="rowgroup"]')).toBeNull();
  });

  it('renders both through the composed body the wrapping recipe uses', () => {
    const { query } = renderHost(ComposedBodyHost);

    expect(query('[forTableHeaderRow]')).not.toBeNull();
    expect(query('[role="rowgroup"]')).not.toBeNull();
  });
});

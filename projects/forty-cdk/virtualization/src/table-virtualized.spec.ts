import {
  Component,
  provideZonelessChangeDetection,
  signal,
  viewChild,
  type WritableSignal,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';

import {
  TABLE_REGISTRATION_CONTEXT,
  type ForTableRowHandle,
  type TableRegistrationContext,
} from 'forty-cdk/core';
import { FOR_TABLE_CONTEXT, type ForTableContext } from 'forty-cdk/table';

import { flush } from '../../src/test-utils';
import { ForTableVirtualized } from './table-virtualized';

describe('ForTableVirtualized', () => {
  it('throws a virtualization-prefixed error when used outside [forTable]', () => {
    @Component({
      imports: [ForTableVirtualized],
      template: `<div forTableVirtualized></div>`,
    })
    class Orphan {}

    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    });

    expect(() => TestBed.createComponent(Orphan)).toThrow(
      /\[forty-cdk\/virtualization\] ForTableVirtualized must be used inside a \[forTable\] element\./,
    );
  });
});

describe('ForTableVirtualized — retained row offset under measureRows', () => {
  @Component({
    imports: [ForTableVirtualized],
    template: `<div
      forTableVirtualized
      [estimateRowSize]="44"
      style="height:200px; overflow:auto"
    ></div>`,
  })
  class Host {
    readonly virt = viewChild.required(ForTableVirtualized);
  }

  let fakeCtx: {
    rowCount: WritableSignal<number | undefined>;
    rows: WritableSignal<readonly ForTableRowHandle[]>;
    focusedRowIndex: WritableSignal<number | null>;
    reorderingRowIndex: WritableSignal<number | null>;
    registerVirtualNavigation: () => void;
    registerVirtualWindow: () => void;
  };

  beforeEach(() => {
    fakeCtx = {
      rowCount: signal<number | undefined>(1000),
      rows: signal<readonly ForTableRowHandle[]>([]),
      focusedRowIndex: signal<number | null>(null),
      reorderingRowIndex: signal<number | null>(null),
      registerVirtualNavigation: () => {},
      registerVirtualWindow: () => {},
    };
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: FOR_TABLE_CONTEXT, useValue: fakeCtx as unknown as ForTableContext },
        {
          provide: TABLE_REGISTRATION_CONTEXT,
          useValue: fakeCtx as unknown as TableRegistrationContext,
        },
      ],
    });
  });

  function fakeLayout(el: HTMLElement, main = 200): void {
    Object.defineProperty(el, 'offsetHeight', { configurable: true, value: main });
    Object.defineProperty(el, 'clientHeight', { configurable: true, value: main });
    Object.defineProperty(el, 'offsetWidth', { configurable: true, value: main });
    Object.defineProperty(el, 'clientWidth', { configurable: true, value: main });
    Object.defineProperty(el, 'scrollHeight', { configurable: true, value: main * 200 });
    Object.defineProperty(el, 'scrollWidth', { configurable: true, value: main * 200 });
  }

  async function mount(): Promise<ReturnType<typeof TestBed.createComponent<Host>>> {
    const fixture = TestBed.createComponent(Host);
    const host = fixture.nativeElement.querySelector('[forTableVirtualized]') as HTMLElement;
    fakeLayout(host, 200);
    fixture.detectChanges();
    await flush(fixture);
    return fixture;
  }

  function measureRowZero(virt: ForTableVirtualized): void {
    const el = document.createElement('div');
    el.setAttribute('data-index', '0');
    Object.defineProperty(el, 'offsetHeight', { configurable: true, value: 100 });
    Object.defineProperty(el, 'offsetWidth', { configurable: true, value: 100 });
    virt.measureRow(el);
  }

  it('positions a retained focused row on its measured offset once earlier rows are measured', async () => {
    const fixture = await mount();
    const virt = fixture.componentInstance.virt();

    measureRowZero(virt);
    await flush(fixture);

    fakeCtx.focusedRowIndex.set(900);
    await flush(fixture);

    const retained = virt.virtualRows().find((row) => row.index === 900);
    expect(retained).toBeDefined();
    expect(retained?.start).toBe(39656);
  });

  it('positions a retained reordering row on its measured offset', async () => {
    const fixture = await mount();
    const virt = fixture.componentInstance.virt();

    measureRowZero(virt);
    await flush(fixture);

    fakeCtx.reorderingRowIndex.set(900);
    await flush(fixture);

    const retained = virt.virtualRows().find((row) => row.index === 900);
    expect(retained).toBeDefined();
    expect(retained?.start).toBe(39656);
  });

  it('falls back to the estimate offset for an unmeasured retained row', async () => {
    const fixture = await mount();
    const virt = fixture.componentInstance.virt();

    fakeCtx.focusedRowIndex.set(900);
    await flush(fixture);

    const retained = virt.virtualRows().find((row) => row.index === 900);
    expect(retained).toBeDefined();
    expect(retained?.start).toBe(39600);
  });
});

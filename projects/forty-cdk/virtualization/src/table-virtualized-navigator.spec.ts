import { signal } from '@angular/core';

import { type ForTableCellHandle, type ForTableRowHandle } from 'forty-cdk/table';
import { TableVirtualizedNavigator } from './table-virtualized-navigator';

describe('TableVirtualizedNavigator', () => {
  function fakeRow(virtualIndex: number, columns: number): ForTableRowHandle {
    const cells: ForTableCellHandle[] = Array.from({ length: columns }, () => ({
      host: document.createElement('div'),
      disabled: signal(false),
    }));
    return {
      host: document.createElement('div'),
      cells: signal(cells),
      value: signal(undefined),
      level: signal(1),
      expandable: signal(false),
      virtualIndex: signal(virtualIndex),
    };
  }

  it('navigateTo focuses an already-rendered target cell immediately, without scrolling', () => {
    const rows = signal<readonly ForTableRowHandle[]>([fakeRow(10, 2), fakeRow(11, 2)]);
    const scrollToRow = vi.fn();
    const nav = new TableVirtualizedNavigator({
      rows,
      scrollToRow,
      scrollViewportRect: () => null,
    });
    const focusSpy = vi.spyOn(rows()[1]!.cells()[1]!.host, 'focus');

    nav.navigateTo(11, 1);

    expect(focusSpy).toHaveBeenCalledTimes(1);
    expect(scrollToRow).not.toHaveBeenCalled();
  });

  it('navigateTo stashes the pending target and scrolls when the row is outside the window', () => {
    const rows = signal<readonly ForTableRowHandle[]>([fakeRow(10, 2), fakeRow(11, 2)]);
    const scrollToRow = vi.fn();
    const nav = new TableVirtualizedNavigator({
      rows,
      scrollToRow,
      scrollViewportRect: () => null,
    });

    nav.navigateTo(50, 0);

    expect(scrollToRow).toHaveBeenCalledWith(50);
    // No rendered row carries index 50 yet, so it cannot resolve.
    expect(nav.tryResolvePending()).toBe(false);
  });

  it('tryResolvePending focuses the target cell and clears the pending target once the row mounts', () => {
    const rows = signal<readonly ForTableRowHandle[]>([fakeRow(10, 2)]);
    const nav = new TableVirtualizedNavigator({
      rows,
      scrollToRow: vi.fn(),
      scrollViewportRect: () => null,
    });
    nav.navigateTo(50, 1);

    const mounted = fakeRow(50, 2);
    const focusSpy = vi.spyOn(mounted.cells()[1]!.host, 'focus');
    rows.set([fakeRow(49, 2), mounted, fakeRow(51, 2)]);

    expect(nav.tryResolvePending()).toBe(true);
    expect(focusSpy).toHaveBeenCalledTimes(1);
    // The pending target is consumed: a second resolve is a no-op.
    expect(nav.tryResolvePending()).toBe(false);
  });

  it('tryResolvePending is a no-op with no pending target', () => {
    const nav = new TableVirtualizedNavigator({
      rows: signal<readonly ForTableRowHandle[]>([]),
      scrollToRow: vi.fn(),
      scrollViewportRect: () => null,
    });

    expect(nav.tryResolvePending()).toBe(false);
  });

  it('scrollViewportRect delegates to the injected accessor', () => {
    const rect = { top: 10, bottom: 410 } as DOMRect;
    const nav = new TableVirtualizedNavigator({
      rows: signal<readonly ForTableRowHandle[]>([]),
      scrollToRow: vi.fn(),
      scrollViewportRect: () => rect,
    });

    expect(nav.scrollViewportRect()).toBe(rect);
  });

  it('falls back to the last cell when the requested column is out of range', () => {
    const row = fakeRow(5, 2);
    const rows = signal<readonly ForTableRowHandle[]>([row]);
    const nav = new TableVirtualizedNavigator({
      rows,
      scrollToRow: vi.fn(),
      scrollViewportRect: () => null,
    });
    const lastCellSpy = vi.spyOn(row.cells()[1]!.host, 'focus');

    nav.navigateTo(5, 9);

    expect(lastCellSpy).toHaveBeenCalledTimes(1);
  });
});

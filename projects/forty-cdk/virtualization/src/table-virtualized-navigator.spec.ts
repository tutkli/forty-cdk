import { signal } from '@angular/core';

import {
  type ForTableCellHandle,
  type ForTableRowHandle,
  type TableVirtualRow,
  type TableVirtualRowNavigation,
  type TableVirtualWindow,
} from 'forty-cdk/table';
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

  function fakeVariantRow(virtualIndex: number): ForTableRowHandle {
    return fakeRow(virtualIndex, 0);
  }

  it('navigateTo focuses an already-rendered target cell immediately, without scrolling', () => {
    const rows = signal<readonly ForTableRowHandle[]>([fakeRow(10, 2), fakeRow(11, 2)]);
    const scrollToRow = vi.fn();
    const nav = new TableVirtualizedNavigator({
      rows,
      scrollToRow,
      scrollViewportRect: () => null,
      rowCount: () => 100,
    });
    const focusSpy = vi.spyOn(rows()[1]!.cells()[1]!.host, 'focus');

    nav.navigateTo(11, 1, 1);

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
      rowCount: () => 100,
    });

    nav.navigateTo(50, 0, 1);

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
      rowCount: () => 100,
    });
    nav.navigateTo(50, 1, 1);

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
      rowCount: () => 100,
    });

    expect(nav.tryResolvePending()).toBe(false);
  });

  it('scrollViewportRect delegates to the injected accessor', () => {
    const rect = { top: 10, bottom: 410 } as DOMRect;
    const nav = new TableVirtualizedNavigator({
      rows: signal<readonly ForTableRowHandle[]>([]),
      scrollToRow: vi.fn(),
      scrollViewportRect: () => rect,
      rowCount: () => 100,
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
      rowCount: () => 100,
    });
    const lastCellSpy = vi.spyOn(row.cells()[1]!.host, 'focus');

    nav.navigateTo(5, 9, 1);

    expect(lastCellSpy).toHaveBeenCalledTimes(1);
  });

  it('steps over a mounted variant row onto the next data row when travelling down', () => {
    const rows = signal<readonly ForTableRowHandle[]>([
      fakeRow(10, 2),
      fakeVariantRow(11),
      fakeRow(12, 2),
    ]);
    const scrollToRow = vi.fn();
    const nav = new TableVirtualizedNavigator({
      rows,
      scrollToRow,
      scrollViewportRect: () => null,
      rowCount: () => 100,
    });
    const nextRowSpy = vi.spyOn(rows()[2]!.cells()[0]!.host, 'focus');

    nav.navigateTo(11, 0, 1);

    expect(nextRowSpy).toHaveBeenCalledTimes(1);
    expect(scrollToRow).not.toHaveBeenCalled();
  });

  it('steps over a mounted variant row onto the previous data row when travelling up', () => {
    const rows = signal<readonly ForTableRowHandle[]>([
      fakeRow(10, 2),
      fakeVariantRow(11),
      fakeRow(12, 2),
    ]);
    const scrollToRow = vi.fn();
    const nav = new TableVirtualizedNavigator({
      rows,
      scrollToRow,
      scrollViewportRect: () => null,
      rowCount: () => 100,
    });
    const prevRowSpy = vi.spyOn(rows()[0]!.cells()[1]!.host, 'focus');

    nav.navigateTo(11, 1, -1);

    expect(prevRowSpy).toHaveBeenCalledTimes(1);
    expect(scrollToRow).not.toHaveBeenCalled();
  });

  it('steps over a variant row then scrolls when the adjacent data row is outside the window', () => {
    const rows = signal<readonly ForTableRowHandle[]>([fakeVariantRow(50)]);
    const scrollToRow = vi.fn();
    const nav = new TableVirtualizedNavigator({
      rows,
      scrollToRow,
      scrollViewportRect: () => null,
      rowCount: () => 100,
    });

    nav.navigateTo(50, 0, 1);

    expect(scrollToRow).toHaveBeenCalledWith(51);

    const mounted = fakeRow(51, 2);
    const focusSpy = vi.spyOn(mounted.cells()[0]!.host, 'focus');
    rows.set([fakeVariantRow(50), mounted]);

    expect(nav.tryResolvePending()).toBe(true);
    expect(focusSpy).toHaveBeenCalledTimes(1);
  });

  it('clears the pending target (no later focus steal) when stepping over a variant hits the dataset bound', () => {
    const rows = signal<readonly ForTableRowHandle[]>([fakeVariantRow(2)]);
    const scrollToRow = vi.fn();
    const nav = new TableVirtualizedNavigator({
      rows,
      scrollToRow,
      scrollViewportRect: () => null,
      rowCount: () => 3,
    });

    nav.navigateTo(2, 0, 1);

    expect(scrollToRow).not.toHaveBeenCalled();
    expect(nav.tryResolvePending()).toBe(false);

    const remounted = fakeRow(2, 2);
    const focusSpy = vi.spyOn(remounted.cells()[0]!.host, 'focus');
    rows.set([remounted]);

    expect(nav.tryResolvePending()).toBe(false);
    expect(focusSpy).not.toHaveBeenCalled();
  });

  describe('virtualization-seam contract types (forty-cdk/table barrel)', () => {
    it('the navigator satisfies the exported TableVirtualRowNavigation seam', () => {
      const nav = new TableVirtualizedNavigator({
        rows: signal<readonly ForTableRowHandle[]>([]),
        scrollToRow: vi.fn(),
        scrollViewportRect: () => null,
        rowCount: () => 0,
      });
      const seam: TableVirtualRowNavigation = nav;

      expect(typeof seam.navigateTo).toBe('function');
      expect(typeof seam.scrollToRow).toBe('function');
      expect(typeof seam.scrollViewportRect).toBe('function');
    });

    it('a companion can name TableVirtualWindow / TableVirtualRow to publish a window', () => {
      const rows = signal<readonly TableVirtualRow[]>([
        { index: 0, start: 0 },
        { index: 1, start: 44 },
      ]);
      const virtualWindow: TableVirtualWindow = {
        rows,
        totalSize: signal(88),
        measureRow: () => undefined,
      };

      expect(virtualWindow.rows()[1]!.index).toBe(1);
      expect(virtualWindow.rows()[1]!.start).toBe(44);
      expect(virtualWindow.totalSize()).toBe(88);
    });
  });
});

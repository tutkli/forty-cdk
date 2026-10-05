import {
  ChangeDetectionStrategy,
  Component,
  provideZonelessChangeDetection,
  signal,
  type Type,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { flush } from '../../src/test-utils';
import { ForDraggable, moveItemInArray } from 'forty-cdk/drag-drop';
import { ForTableVirtualized } from 'forty-cdk/table-virtualization';

import { ForTable } from './table';
import { ForTableCell } from './table-cell';
import { type TableMode } from './table-context';
import { ForTableRow } from './table-row';
import { ForTableRowReorder, type TableRowReorderDescriptor } from './table-row-reorder';
import { ForTableRowSelector } from './table-row-selector';

const ROW_COUNT = 10_000;
const ROW_HEIGHT = 44;

function fakeLayout(el: HTMLElement, main = 200): void {
  Object.defineProperty(el, 'offsetHeight', { configurable: true, value: main });
  Object.defineProperty(el, 'clientHeight', { configurable: true, value: main });
  Object.defineProperty(el, 'offsetWidth', { configurable: true, value: main });
  Object.defineProperty(el, 'clientWidth', { configurable: true, value: main });
  Object.defineProperty(el, 'scrollHeight', { configurable: true, value: ROW_COUNT * ROW_HEIGHT });
  Object.defineProperty(el, 'scrollWidth', { configurable: true, value: main });
}

function installFakeScroll(el: HTMLElement): void {
  let top = 0;
  Object.defineProperty(el, 'scrollTop', {
    configurable: true,
    get: () => top,
    set: (value: number) => {
      top = value;
    },
  });
  el.scrollTo = ((options: ScrollToOptions | number) => {
    top = typeof options === 'number' ? options : (options.top ?? top);
    el.dispatchEvent(new Event('scroll'));
  }) as typeof el.scrollTo;
}

function press(el: Element, key: string, modifiers: Partial<KeyboardEventInit> = {}): void {
  el.dispatchEvent(
    new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...modifiers }),
  );
}

function focusOut(el: HTMLElement, relatedTarget: HTMLElement | null = null): void {
  el.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget }));
}

function pointer(
  type: string,
  x: number,
  y: number,
  init: Partial<PointerEventInit> = {},
): PointerEvent {
  return new PointerEvent(type, {
    clientX: x,
    clientY: y,
    button: 0,
    pointerId: 1,
    bubbles: true,
    cancelable: true,
    ...init,
  });
}

@Component({
  imports: [
    ForTable,
    ForTableVirtualized,
    ForTableRow,
    ForTableCell,
    ForTableRowReorder,
    ForDraggable,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      forTable
      forTableVirtualized
      mode="grid"
      ariaLabel="Virtualized reorderable rows"
      [rowCount]="rowCount"
      [estimateRowSize]="rowHeight"
      #v="forTableVirtualized"
      style="height: 200px; overflow: auto"
    >
      <div
        role="rowgroup"
        forTableRowReorder
        [style.height.px]="v.totalSize()"
        (rowReorder)="onReorder($event)"
      >
        @for (vrow of v.virtualRows(); track vrow.index) {
          <div
            forTableRow
            [virtualIndex]="vrow.index"
            forDraggable
            [dragData]="vrow.index"
            [attr.data-index]="vrow.index"
          >
            <div forTableCell name="a" [attr.data-testid]="'cell-' + vrow.index">
              {{ vrow.index }}
            </div>
          </div>
        }
      </div>
    </div>
    <button type="button" data-testid="outside">outside</button>
  `,
})
class VirtualizedRowReorderHost {
  protected readonly rowCount = ROW_COUNT;
  protected readonly rowHeight = ROW_HEIGHT;
  last: TableRowReorderDescriptor | null = null;
  reorders = 0;

  protected onReorder(descriptor: TableRowReorderDescriptor): void {
    this.last = descriptor;
    this.reorders++;
  }
}

async function render<T>(host: Type<T>) {
  TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
  const fixture = TestBed.createComponent(host);
  const root = fixture.nativeElement as HTMLElement;
  const scroller = root.querySelector<HTMLElement>('[forTable]')!;
  fakeLayout(scroller);
  installFakeScroll(scroller);
  fixture.detectChanges();
  await flush(fixture);

  const settle = async (): Promise<void> => {
    await flush(fixture);
    await flush(fixture);
  };
  const indices = (): number[] =>
    Array.from(root.querySelectorAll<HTMLElement>('[data-index]')).map((el) =>
      Number(el.getAttribute('data-index')),
    );

  return {
    fixture,
    instance: fixture.componentInstance,
    scroller,
    settle,
    indices,
    cell: (index: number) => root.querySelector<HTMLElement>(`[data-testid="cell-${index}"]`)!,
    query: (selector: string) => root.querySelector<HTMLElement>(selector)!,
    scrollTo: async (top: number): Promise<number[]> => {
      scroller.scrollTo({ top });
      await settle();
      return indices();
    },
  };
}

function mount() {
  return render(VirtualizedRowReorderHost);
}

function liveRegionText(): string {
  return Array.from(document.querySelectorAll('[aria-live="assertive"]'))
    .map((node) => node.textContent ?? '')
    .join(' ');
}

describe('ForTableRowReorder — a keyboard jump at the window edge keeps the lift alive (#1671)', () => {
  afterEach(() => {
    document.querySelectorAll('[aria-live]').forEach((node) => node.remove());
  });

  it('End on a lift of the LAST rendered row keeps that cell focused and drops at the dataset end', async () => {
    const { instance, settle, indices, cell } = await mount();
    const from = Math.max(...indices());
    const lifted = cell(from);
    lifted.focus();

    press(lifted, ' ', { ctrlKey: true });
    await settle();
    press(lifted, 'End');
    await settle();

    expect(indices()).toContain(ROW_COUNT - 1);
    expect(indices()).toContain(from);
    expect(document.activeElement).toBe(lifted);

    press(lifted, ' ');
    await settle();

    expect(instance.last).toEqual({ from, to: ROW_COUNT - 1 });
  });

  it('Home on a lift of the FIRST rendered row keeps that cell focused and drops at the dataset start', async () => {
    const { instance, settle, indices, cell, scrollTo } = await mount();
    const window = await scrollTo(200 * ROW_HEIGHT);
    const from = Math.min(...window);
    expect(from).toBeGreaterThan(100);

    const lifted = cell(from);
    lifted.focus();
    press(lifted, ' ', { ctrlKey: true });
    await settle();
    press(lifted, 'Home');
    await settle();

    expect(indices()).toContain(0);
    expect(document.activeElement).toBe(lifted);

    press(lifted, ' ');
    await settle();

    expect(instance.last).toEqual({ from, to: 0 });
  });

  it('PageDown on a lift of the LAST rendered row keeps that cell focused across the jump', async () => {
    const { instance, settle, indices, cell } = await mount();
    const from = Math.max(...indices());
    const lifted = cell(from);
    lifted.focus();

    press(lifted, ' ', { ctrlKey: true });
    await settle();
    const page = indices().length;
    expect(from + page).toBeGreaterThan(Math.max(...indices()));

    press(lifted, 'PageDown');
    await settle();
    expect(document.activeElement).toBe(lifted);

    press(lifted, ' ');
    await settle();

    expect(instance.last).toEqual({ from, to: from + page });
  });

  it('PageUp on a lift of the FIRST rendered row keeps that cell focused across the jump', async () => {
    const { instance, settle, indices, cell, scrollTo } = await mount();
    const window = await scrollTo(200 * ROW_HEIGHT);
    const from = Math.min(...window);

    const lifted = cell(from);
    lifted.focus();
    press(lifted, ' ', { ctrlKey: true });
    await settle();
    const page = indices().length;
    expect(from - page).toBeLessThan(Math.min(...indices()));

    press(lifted, 'PageUp');
    await settle();
    expect(document.activeElement).toBe(lifted);

    press(lifted, ' ');
    await settle();

    expect(instance.last).toEqual({ from, to: from - page });
  });

  it('announces the drop, never a cancel, when the jump recycles the window', async () => {
    const { settle, indices, cell } = await mount();
    const from = Math.max(...indices());
    const lifted = cell(from);
    lifted.focus();

    press(lifted, ' ', { ctrlKey: true });
    await settle();
    press(lifted, 'End');
    await settle();
    press(lifted, ' ');
    await settle();

    expect(liveRegionText()).toContain(`dropped at position ${ROW_COUNT} of ${ROW_COUNT}`);
    expect(liveRegionText()).not.toContain('cancelled');
  });
});

describe('ForTableRowReorder — a focusout only cancels when focus really left the rowgroup', () => {
  afterEach(() => {
    document.querySelectorAll('[aria-live]').forEach((node) => node.remove());
  });

  it('keeps the lift when the focusout reports no destination and focus is still inside', async () => {
    const { instance, settle, indices, cell } = await mount();
    const from = Math.max(...indices());
    const lifted = cell(from);
    lifted.focus();

    press(lifted, ' ', { ctrlKey: true });
    await settle();
    focusOut(lifted);
    await settle();

    expect(liveRegionText()).not.toContain('cancelled');

    press(lifted, 'ArrowDown');
    press(lifted, ' ');
    await settle();

    expect(instance.last).toEqual({ from, to: from + 1 });
  });

  it('keeps the lift when focus moves to another cell inside the rowgroup', async () => {
    const { instance, settle, indices, cell } = await mount();
    const from = Math.max(...indices());
    const lifted = cell(from);
    lifted.focus();

    press(lifted, ' ', { ctrlKey: true });
    await settle();

    const sibling = cell(from - 1);
    focusOut(lifted, sibling);
    await settle();

    expect(liveRegionText()).not.toContain('cancelled');

    press(lifted, 'ArrowDown');
    press(lifted, ' ');
    await settle();

    expect(instance.last).toEqual({ from, to: from + 1 });
  });

  it('cancels the lift when focus lands on an element outside the rowgroup', async () => {
    const { instance, settle, indices, cell, query } = await mount();
    const from = Math.max(...indices());
    const lifted = cell(from);
    lifted.focus();

    press(lifted, ' ', { ctrlKey: true });
    await settle();

    focusOut(lifted, query('[data-testid="outside"]'));
    await settle();

    expect(liveRegionText()).toContain('movement cancelled');

    press(lifted, ' ');
    await settle();

    expect(instance.reorders).toBe(0);
    expect(instance.last).toBeNull();
  });

  it('cancels the lift when the focusout reports no destination and focus left the rowgroup', async () => {
    const { instance, settle, indices, cell } = await mount();
    const from = Math.max(...indices());
    const lifted = cell(from);
    lifted.focus();

    press(lifted, ' ', { ctrlKey: true });
    await settle();

    lifted.blur();
    focusOut(lifted);
    await settle();

    expect(liveRegionText()).toContain('movement cancelled');
    expect(instance.reorders).toBe(0);
  });
});

@Component({
  imports: [
    ForTable,
    ForTableVirtualized,
    ForTableRow,
    ForTableCell,
    ForTableRowReorder,
    ForDraggable,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      forTable
      forTableVirtualized
      mode="grid"
      ariaLabel="Rows grabbed by an icon"
      [rowCount]="rowCount"
      [estimateRowSize]="rowHeight"
      #v="forTableVirtualized"
      style="height: 200px; overflow: auto"
    >
      <div role="rowgroup" forTableRowReorder [style.height.px]="v.totalSize()">
        @for (vrow of v.virtualRows(); track vrow.index) {
          <div
            forTableRow
            [virtualIndex]="vrow.index"
            forDraggable
            [dragData]="vrow.index"
            [attr.data-index]="vrow.index"
            [attr.data-testid]="'row-' + vrow.index"
          >
            <div forTableCell name="a">
              <svg viewBox="0 0 8 8" aria-hidden="true">
                <rect [attr.data-testid]="'icon-' + vrow.index" width="8" height="8"></rect>
              </svg>
              {{ vrow.index }}
            </div>
          </div>
        }
      </div>
    </div>
  `,
})
class SvgGrabTargetHost {
  protected readonly rowCount = ROW_COUNT;
  protected readonly rowHeight = ROW_HEIGHT;
}

describe('ForTableRowReorder — a pointer grab target is an Element, not an HTMLElement (#1677)', () => {
  it('pins the pressed row when the drag that arms started on an SVG icon inside a cell', async () => {
    const { fixture, scroller, settle } = await render(SvgGrabTargetHost);
    const root = fixture.nativeElement as HTMLElement;
    const icon = root.querySelector<SVGElement>('[data-testid="icon-2"]')!;
    expect(icon instanceof HTMLElement).toBe(false);

    icon.dispatchEvent(pointer('pointerdown', 0, 100));
    document.dispatchEvent(pointer('pointermove', 0, 120));

    scroller.scrollTo({ top: 20000 });
    await settle();

    expect(root.querySelector('[data-testid="row-3"]')).toBeNull();
    expect(root.querySelector('[data-testid="row-2"]')!.getAttribute('data-index')).toBe('2');

    document.dispatchEvent(pointer('pointerup', 0, 120));
  });
});

describe('ForTableRowReorder — the pointer pin follows the armed session (#1695)', () => {
  afterEach(() => {
    document.querySelectorAll('[aria-live]').forEach((node) => node.remove());
  });

  async function pinHarness() {
    const harness = await render(SvgGrabTargetHost);
    const root = harness.fixture.nativeElement as HTMLElement;
    return {
      ...harness,
      press: (index: number, y: number) =>
        root
          .querySelector<HTMLElement>(`[data-testid="row-${index}"]`)!
          .dispatchEvent(pointer('pointerdown', 0, y)),
      scrollAway: async (): Promise<void> => {
        harness.scroller.scrollTo({ top: 20000 });
        await harness.settle();
      },
    };
  }

  it('a press that never crosses the arm threshold leaves no row pinned', async () => {
    const { press, indices, scrollAway, settle } = await pinHarness();

    press(2, 100);
    document.dispatchEvent(pointer('pointerup', 0, 100));
    await settle();
    await scrollAway();

    expect(indices()).not.toContain(2);
    expect(Math.min(...indices())).toBeGreaterThan(100);
  });

  it('an armed drag pins the dragged row for the gesture and the release unpins it', async () => {
    const { press, indices, scrollAway, settle } = await pinHarness();

    press(2, 100);
    document.dispatchEvent(pointer('pointermove', 0, 120));
    await scrollAway();

    expect(indices()).toContain(2);

    document.dispatchEvent(pointer('pointerup', 0, 120));
    await settle();

    expect(indices()).not.toContain(2);
  });

  it('a cancelled drag unpins the row it had pinned', async () => {
    const { press, indices, scrollAway, settle } = await pinHarness();

    press(2, 100);
    document.dispatchEvent(pointer('pointermove', 0, 120));
    await scrollAway();

    expect(indices()).toContain(2);

    document.dispatchEvent(pointer('pointercancel', 0, 120));
    await settle();

    expect(indices()).not.toContain(2);
  });

  it('the row retained off-window keeps the rendered indices in ascending DOM order', async () => {
    const { press, indices, scrollAway } = await pinHarness();

    press(2, 100);
    document.dispatchEvent(pointer('pointermove', 0, 120));
    await scrollAway();

    const rendered = indices();
    expect(rendered[0]).toBe(2);
    expect(rendered).toEqual([...rendered].sort((a, b) => a - b));

    document.dispatchEvent(pointer('pointerup', 0, 120));
  });

  it('a press during a keyboard lift pins no second row and leaves the gesture committable', async () => {
    const { instance, settle, indices, cell, scrollTo } = await mount();
    const from = Math.max(...indices());
    const pressed = from - 2;
    const lifted = cell(from);
    lifted.focus();

    press(lifted, ' ', { ctrlKey: true });
    await settle();

    cell(pressed).dispatchEvent(pointer('pointerdown', 0, 140));
    await settle();

    const rendered = await scrollTo(200 * ROW_HEIGHT);

    expect(rendered).toContain(from);
    expect(rendered).not.toContain(pressed);
    expect(document.activeElement).toBe(lifted);

    document.dispatchEvent(pointer('pointerup', 0, 140));
    press(lifted, ' ');
    await settle();

    expect(instance.last).toEqual({ from, to: from });
  });

  it('a lift key pressed during an armed pointer drag starts no keyboard gesture', async () => {
    const { settle, indices, cell, query } = await mount();
    const dragged = Math.min(...indices());
    const other = Math.max(...indices());

    cell(dragged).dispatchEvent(pointer('pointerdown', 0, 100));
    document.dispatchEvent(pointer('pointermove', 0, 120));
    await settle();

    cell(other).focus();
    press(cell(other), ' ', { ctrlKey: true });
    await settle();

    expect(query(`[data-index="${other}"]`).hasAttribute('data-dragging')).toBe(false);
    expect(query(`[data-index="${dragged}"]`).getAttribute('data-dragging')).toBe('');

    document.dispatchEvent(pointer('pointercancel', 0, 120));
  });
});

@Component({
  imports: [
    ForTable,
    ForTableVirtualized,
    ForTableRow,
    ForTableCell,
    ForTableRowReorder,
    ForDraggable,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      forTable
      forTableVirtualized
      mode="grid"
      ariaLabel="Rows with a focusable icon control"
      [rowCount]="rowCount"
      [estimateRowSize]="rowHeight"
      #v="forTableVirtualized"
      style="height: 200px; overflow: auto"
    >
      <div
        role="rowgroup"
        forTableRowReorder
        [style.height.px]="v.totalSize()"
        (rowReorder)="onReorder($event)"
      >
        @for (vrow of v.virtualRows(); track vrow.index) {
          <div
            forTableRow
            [virtualIndex]="vrow.index"
            forDraggable
            [dragData]="vrow.index"
            [attr.data-index]="vrow.index"
            [attr.data-testid]="'row-' + vrow.index"
          >
            <div forTableCell name="a" [attr.data-testid]="'cell-' + vrow.index">
              <svg
                viewBox="0 0 8 8"
                tabindex="0"
                role="img"
                [attr.aria-label]="'Drag handle for row ' + vrow.index"
                [attr.data-testid]="'icon-' + vrow.index"
              >
                <rect width="8" height="8"></rect>
              </svg>
              {{ vrow.index }}
            </div>
          </div>
        }
      </div>
    </div>
  `,
})
class SvgFocusTargetHost {
  protected readonly rowCount = ROW_COUNT;
  protected readonly rowHeight = ROW_HEIGHT;
  last: TableRowReorderDescriptor | null = null;

  protected onReorder(descriptor: TableRowReorderDescriptor): void {
    this.last = descriptor;
  }
}

@Component({
  imports: [ForTable, ForTableRow, ForTableCell, ForTableRowReorder, ForDraggable],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div forTable mode="grid" ariaLabel="Reorderable rows">
      <div role="rowgroup" forTableRowReorder (rowReorder)="onReorder($event)">
        @for (row of rows; track row) {
          <div forTableRow forDraggable [dragData]="row" [attr.data-testid]="'row-' + row">
            <div forTableCell name="a" [attr.data-testid]="'cell-' + row">{{ row }}</div>
          </div>
        }
      </div>
    </div>
  `,
})
class ListRowReorderHost {
  protected readonly rows = [0, 1, 2, 3];
  last: TableRowReorderDescriptor | null = null;

  protected onReorder(descriptor: TableRowReorderDescriptor): void {
    this.last = descriptor;
  }
}

describe('ForTableRowReorder — the lifted row reflects data-dragging (#1693)', () => {
  afterEach(() => {
    document.querySelectorAll('[aria-live]').forEach((node) => node.remove());
  });

  it('a virtualized keyboard lift marks the lifted row and the rowgroup, and the drop clears both', async () => {
    const { instance, settle, indices, cell, query } = await mount();
    const from = Math.max(...indices());
    const lifted = cell(from);
    const rowgroup = query('[forTableRowReorder]');
    lifted.focus();

    expect(query(`[data-index="${from}"]`).hasAttribute('data-dragging')).toBe(false);

    press(lifted, ' ', { ctrlKey: true });
    await settle();

    expect(query(`[data-index="${from}"]`).getAttribute('data-dragging')).toBe('');
    expect(rowgroup.getAttribute('data-dragging')).toBe('');
    expect(query(`[data-index="${from - 1}"]`).hasAttribute('data-dragging')).toBe(false);

    press(lifted, ' ');
    await settle();

    expect(instance.last).toEqual({ from, to: from });
    expect(query(`[data-index="${from}"]`).hasAttribute('data-dragging')).toBe(false);
    expect(rowgroup.hasAttribute('data-dragging')).toBe(false);
  });

  it('Escape clears the mark from the lifted row and the rowgroup', async () => {
    const { settle, indices, cell, query } = await mount();
    const from = Math.max(...indices());
    const lifted = cell(from);
    const rowgroup = query('[forTableRowReorder]');
    lifted.focus();

    press(lifted, ' ', { ctrlKey: true });
    await settle();
    expect(query(`[data-index="${from}"]`).getAttribute('data-dragging')).toBe('');

    press(lifted, 'Escape');
    await settle();

    expect(query(`[data-index="${from}"]`).hasAttribute('data-dragging')).toBe(false);
    expect(rowgroup.hasAttribute('data-dragging')).toBe(false);
  });

  it('a focus leave that cancels the gesture clears the mark', async () => {
    const { settle, indices, cell, query } = await mount();
    const from = Math.max(...indices());
    const lifted = cell(from);
    lifted.focus();

    press(lifted, ' ', { ctrlKey: true });
    await settle();
    expect(query(`[data-index="${from}"]`).getAttribute('data-dragging')).toBe('');

    focusOut(lifted, query('[data-testid="outside"]'));
    await settle();

    expect(liveRegionText()).toContain('movement cancelled');
    expect(query(`[data-index="${from}"]`).hasAttribute('data-dragging')).toBe(false);
    expect(query('[forTableRowReorder]').hasAttribute('data-dragging')).toBe(false);
  });

  it('a focus leave that keeps the gesture alive keeps the mark', async () => {
    const { settle, indices, cell, query } = await mount();
    const from = Math.max(...indices());
    const lifted = cell(from);
    lifted.focus();

    press(lifted, ' ', { ctrlKey: true });
    await settle();

    focusOut(lifted, cell(from - 1));
    await settle();

    expect(liveRegionText()).not.toContain('cancelled');
    expect(query(`[data-index="${from}"]`).getAttribute('data-dragging')).toBe('');
  });

  it('the non-virtualized branch keeps marking the row it lifts through the drop list', async () => {
    const { instance, settle, query } = await render(ListRowReorderHost);
    const lifted = query('[data-testid="cell-1"]');
    lifted.focus();

    press(lifted, ' ', { ctrlKey: true });
    await settle();

    expect(query('[data-testid="row-1"]').getAttribute('data-dragging')).toBe('');
    expect(query('[forTableRowReorder]').getAttribute('data-dragging')).toBe('');

    press(lifted, 'ArrowDown');
    press(lifted, ' ');
    await settle();

    expect(instance.last).toEqual({ from: 1, to: 2 });
    expect(query('[data-testid="row-1"]').hasAttribute('data-dragging')).toBe(false);
    expect(query('[forTableRowReorder]').hasAttribute('data-dragging')).toBe(false);
  });
});

@Component({
  imports: [
    ForTable,
    ForTableVirtualized,
    ForTableRow,
    ForTableCell,
    ForTableRowReorder,
    ForDraggable,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      forTable
      forTableVirtualized
      mode="grid"
      ariaLabel="Guarded reorderable rows"
      [rowCount]="rowCount"
      [estimateRowSize]="rowHeight"
      #v="forTableVirtualized"
      style="height: 200px; overflow: auto"
    >
      <div
        role="rowgroup"
        forTableRowReorder
        [disabled]="listDisabled()"
        [style.height.px]="v.totalSize()"
      >
        @for (vrow of v.virtualRows(); track vrow.index) {
          <div
            forTableRow
            [virtualIndex]="vrow.index"
            forDraggable
            [dragData]="vrow.index"
            [dragDisabled]="disabledRow() === vrow.index"
            [attr.data-index]="vrow.index"
            [attr.data-testid]="'row-' + vrow.index"
          >
            <div forTableCell name="a">{{ vrow.index }}</div>
          </div>
        }
      </div>
    </div>
  `,
})
class GuardedRowReorderHost {
  protected readonly rowCount = ROW_COUNT;
  protected readonly rowHeight = ROW_HEIGHT;
  readonly listDisabled = signal(false);
  readonly disabledRow = signal<number | null>(null);
}

@Component({
  imports: [ForTable, ForTableVirtualized, ForTableRow, ForTableCell, ForTableRowReorder],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      forTable
      forTableVirtualized
      mode="grid"
      ariaLabel="Rows with no draggable"
      [rowCount]="rowCount"
      [estimateRowSize]="rowHeight"
      #v="forTableVirtualized"
      style="height: 200px; overflow: auto"
    >
      <div role="rowgroup" forTableRowReorder [style.height.px]="v.totalSize()">
        @for (vrow of v.virtualRows(); track vrow.index) {
          <div
            forTableRow
            [virtualIndex]="vrow.index"
            [attr.data-index]="vrow.index"
            [attr.data-testid]="'row-' + vrow.index"
          >
            <div forTableCell name="a">{{ vrow.index }}</div>
          </div>
        }
      </div>
    </div>
  `,
})
class UndraggableRowReorderHost {
  protected readonly rowCount = ROW_COUNT;
  protected readonly rowHeight = ROW_HEIGHT;
}

describe('ForTableRowReorder — the pointer guard set matches the sibling coordinators (#1697)', () => {
  afterEach(() => {
    document.querySelectorAll('[aria-live]').forEach((node) => node.remove());
  });

  async function guardHarness() {
    const harness = await render(GuardedRowReorderHost);
    const root = harness.fixture.nativeElement as HTMLElement;
    return {
      ...harness,
      press: (index: number, init: Partial<PointerEventInit> = {}): PointerEvent => {
        const event = pointer('pointerdown', 0, 100, { pointerType: 'mouse', ...init });
        root.querySelector<HTMLElement>(`[data-testid="row-${index}"]`)!.dispatchEvent(event);
        return event;
      },
      arm: () => document.dispatchEvent(pointer('pointermove', 0, 120)),
      scrollAway: async (): Promise<void> => {
        harness.scroller.scrollTo({ top: 20000 });
        await harness.settle();
      },
    };
  }

  it('pins nothing when the press lands on a row of a disabled rowgroup', async () => {
    const { instance, press, arm, indices, scrollAway, settle } = await guardHarness();
    instance.listDisabled.set(true);
    await settle();

    press(2);
    arm();
    await scrollAway();

    expect(indices()).not.toContain(2);
    expect(Math.min(...indices())).toBeGreaterThan(100);
  });

  it('pins nothing when a mouse press uses a non-primary button', async () => {
    const { press, arm, indices, scrollAway } = await guardHarness();

    const event = press(3, { button: 2 });
    expect(event.pointerType).toBe('mouse');
    arm();
    await scrollAway();

    expect(indices()).not.toContain(3);
    expect(Math.min(...indices())).toBeGreaterThan(100);
  });

  it('still pins for a touch press reporting a non-zero button', async () => {
    const { press, arm, indices, scrollAway } = await guardHarness();

    const event = press(3, { pointerType: 'touch', button: 2 });
    expect(event.pointerType).toBe('touch');
    arm();
    await scrollAway();

    expect(indices()).toContain(3);

    document.dispatchEvent(pointer('pointerup', 0, 120));
  });

  it('pins nothing when the pressed row is dragDisabled', async () => {
    const { instance, press, arm, indices, scrollAway, settle } = await guardHarness();
    instance.disabledRow.set(2);
    await settle();

    press(2);
    arm();
    await scrollAway();

    expect(indices()).not.toContain(2);
    expect(Math.min(...indices())).toBeGreaterThan(100);
  });

  it('pins nothing when the pressed row carries no registered draggable', async () => {
    const { fixture, scroller, settle, indices } = await render(UndraggableRowReorderHost);
    const row = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(
      '[data-testid="row-2"]',
    )!;
    expect(row.hasAttribute('forDraggable')).toBe(false);

    row.dispatchEvent(pointer('pointerdown', 0, 100, { pointerType: 'mouse' }));
    document.dispatchEvent(pointer('pointermove', 0, 120));
    scroller.scrollTo({ top: 20000 });
    await settle();

    expect(indices()).not.toContain(2);
    expect(Math.min(...indices())).toBeGreaterThan(100);
  });
});

describe('ForTableRowReorder — the restored focus target may be an SVGElement (#1679)', () => {
  afterEach(() => {
    document.querySelectorAll('[aria-live]').forEach((node) => node.remove());
  });

  it('End on a lift started from a focusable SVG returns focus to the SVG, not to the row host', async () => {
    const { fixture, instance, settle, indices } = await render(SvgFocusTargetHost);
    const root = fixture.nativeElement as HTMLElement;
    const from = Math.max(...indices());
    const icon = root.querySelector<SVGElement>(`[data-testid="icon-${from}"]`)!;
    const rowHost = root.querySelector<HTMLElement>(`[data-testid="row-${from}"]`)!;
    expect(icon instanceof SVGElement).toBe(true);
    expect(icon instanceof HTMLElement).toBe(false);

    icon.focus();
    expect(document.activeElement).toBe(icon);

    press(icon, ' ', { ctrlKey: true });
    await settle();
    press(icon, 'End');
    await settle();

    expect(indices()).toContain(ROW_COUNT - 1);
    expect(document.activeElement).not.toBe(rowHost);
    expect(document.activeElement).toBe(icon);

    press(icon, ' ');
    await settle();

    expect(instance.last).toEqual({ from, to: ROW_COUNT - 1 });
  });
});

@Component({
  imports: [
    ForTable,
    ForTableVirtualized,
    ForTableRow,
    ForTableCell,
    ForTableRowReorder,
    ForDraggable,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      forTable
      forTableVirtualized
      mode="grid"
      ariaLabel="Virtualized rows with drag outputs"
      [rowCount]="rowCount"
      [estimateRowSize]="rowHeight"
      #v="forTableVirtualized"
      style="height: 200px; overflow: auto"
    >
      <div
        role="rowgroup"
        forTableRowReorder
        [style.height.px]="v.totalSize()"
        (rowReorder)="last = $event"
      >
        @for (vrow of v.virtualRows(); track vrow.index) {
          <div
            forTableRow
            [virtualIndex]="vrow.index"
            forDraggable
            [dragData]="vrow.index"
            [attr.data-index]="vrow.index"
            (dragStart)="starts.push($event.index)"
            (dragEnd)="ends.push($event.dropped)"
          >
            <div forTableCell name="a" [attr.data-testid]="'cell-' + vrow.index">
              <span aria-hidden="true">⠿</span>Row {{ vrow.index }}
            </div>
          </div>
        }
      </div>
    </div>
  `,
})
class VirtualizedDragOutputsHost {
  protected readonly rowCount = ROW_COUNT;
  protected readonly rowHeight = ROW_HEIGHT;
  last: TableRowReorderDescriptor | null = null;
  readonly starts: number[] = [];
  readonly ends: boolean[] = [];
}

@Component({
  imports: [ForTable, ForTableRow, ForTableCell, ForTableRowReorder, ForDraggable],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div forTable mode="grid" ariaLabel="Reorderable rows with drag outputs">
      <div role="rowgroup" forTableRowReorder (rowReorder)="last = $event">
        @for (row of rows; track row) {
          <div
            forTableRow
            forDraggable
            [dragData]="row"
            (dragStart)="starts.push($event.index)"
            (dragEnd)="ends.push($event.dropped)"
          >
            <div forTableCell name="a" [attr.data-testid]="'cell-' + row">{{ row }}</div>
          </div>
        }
      </div>
    </div>
  `,
})
class ListDragOutputsHost {
  readonly rows = [0, 1, 2, 3];
  last: TableRowReorderDescriptor | null = null;
  readonly starts: number[] = [];
  readonly ends: boolean[] = [];
}

describe('ForTableRowReorder — announcements and drag outputs (#2124)', () => {
  afterEach(() => {
    document.querySelectorAll('[aria-live]').forEach((node) => node.remove());
  });

  it('a virtualized keyboard lift emits dragStart with the dataset index, and the drop emits dragEnd', async () => {
    const { instance, settle, indices, cell } = await render(VirtualizedDragOutputsHost);
    const from = Math.max(...indices());
    const lifted = cell(from);
    lifted.focus();

    press(lifted, ' ', { ctrlKey: true });
    await settle();
    expect(instance.starts).toEqual([from]);
    expect(instance.ends).toEqual([]);

    press(lifted, ' ');
    await settle();

    expect(instance.last).toEqual({ from, to: from });
    expect(instance.ends).toEqual([true]);
  });

  it('a virtualized keyboard cancel emits dragEnd with dropped false', async () => {
    const { instance, settle, indices, cell } = await render(VirtualizedDragOutputsHost);
    const from = Math.max(...indices());
    const lifted = cell(from);
    lifted.focus();

    press(lifted, ' ', { ctrlKey: true });
    press(lifted, 'Escape');
    await settle();

    expect(instance.starts).toEqual([from]);
    expect(instance.ends).toEqual([false]);
  });

  it('the non-virtualized grid lift emits dragStart and dragEnd on the lifted row', async () => {
    const { instance, settle, query } = await render(ListDragOutputsHost);
    const lifted = query('[data-testid="cell-1"]');
    lifted.focus();

    press(lifted, ' ', { ctrlKey: true });
    press(lifted, 'ArrowDown');
    press(lifted, ' ');
    await settle();

    expect(instance.last).toEqual({ from: 1, to: 2 });
    expect(instance.starts).toEqual([1]);
    expect(instance.ends).toEqual([true]);
  });

  it('keyboard announcements leave an aria-hidden glyph out of the row name', async () => {
    const { settle, indices, cell } = await render(VirtualizedDragOutputsHost);
    const from = Math.max(...indices());
    const lifted = cell(from);
    lifted.focus();

    press(lifted, ' ', { ctrlKey: true });
    await settle();

    expect(liveRegionText()).toContain(`Row ${from}, lifted. ${from + 1} of ${ROW_COUNT}.`);
    expect(liveRegionText()).not.toContain('⠿');
    press(lifted, 'Escape');
  });

  it('a virtualized pointer lift announces the dataset position against the row count', async () => {
    const { settle, indices, cell, scrollTo } = await render(VirtualizedDragOutputsHost);
    await scrollTo(200 * ROW_HEIGHT);
    const rendered = indices();
    const target = rendered[Math.floor(rendered.length / 2)]!;
    expect(target).toBeGreaterThan(100);

    cell(target).dispatchEvent(pointer('pointerdown', 0, 100));
    document.dispatchEvent(pointer('pointermove', 0, 120));
    await settle();

    expect(liveRegionText()).toContain(`Row ${target}, lifted. ${target + 1} of ${ROW_COUNT}.`);
    expect(indices().length).toBeLessThan(100);
    document.dispatchEvent(pointer('pointercancel', 0, 120));
    await settle();
  });
});

@Component({
  imports: [ForTable, ForTableRow, ForTableCell, ForTableRowReorder, ForDraggable],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div forTable mode="grid" ariaLabel="Reorderable rows">
      <div role="rowgroup" forTableRowReorder (rowReorder)="onReorder($event)">
        @for (row of rows(); track row) {
          <div forTableRow forDraggable [dragData]="row" [attr.data-testid]="'row-' + row">
            <div forTableCell name="a" [attr.data-testid]="'cell-' + row">{{ row }}</div>
            <div forTableCell name="b" [attr.data-testid]="'cell-b-' + row">{{ row }}</div>
          </div>
        }
      </div>
    </div>
  `,
})
class AppliedListRowReorderHost {
  readonly rows = signal<readonly number[]>([0, 1, 2, 3, 4]);

  protected onReorder(descriptor: TableRowReorderDescriptor): void {
    this.rows.update((rows) => moveItemInArray(rows, descriptor.from, descriptor.to));
  }
}

describe('ForTableRowReorder — focus follows the dropped row (#2118)', () => {
  afterEach(() => {
    document.querySelectorAll('[aria-live]').forEach((node) => node.remove());
  });

  it('a virtualized in-window drop focuses the same cell of the target row', async () => {
    const { instance, settle, cell } = await mount();
    const lifted = cell(2);
    lifted.focus();

    press(lifted, ' ', { ctrlKey: true });
    await settle();
    press(lifted, 'ArrowDown');
    await settle();
    press(lifted, ' ');
    await settle();

    expect(instance.last).toEqual({ from: 2, to: 3 });
    expect(document.activeElement).toBe(cell(3));
  });

  it('a virtualized drop after an End jump focuses the target row, not <body>', async () => {
    const { instance, settle, indices, cell } = await mount();
    const from = Math.max(...indices());
    const lifted = cell(from);
    lifted.focus();

    press(lifted, ' ', { ctrlKey: true });
    await settle();
    press(lifted, 'End');
    await settle();
    press(lifted, ' ');
    await settle();

    expect(instance.last).toEqual({ from, to: ROW_COUNT - 1 });
    expect(document.activeElement).toBe(cell(ROW_COUNT - 1));
  });

  it('a virtualized drop releases the pin once focus has landed', async () => {
    const { settle, indices, cell } = await mount();
    const from = Math.max(...indices());
    const lifted = cell(from);
    lifted.focus();

    press(lifted, ' ', { ctrlKey: true });
    await settle();
    press(lifted, 'End');
    await settle();
    press(lifted, ' ');
    await settle();

    const rendered = indices();
    expect(Math.max(...rendered) - Math.min(...rendered)).toBe(rendered.length - 1);
  });

  it('a non-virtualized grid drop moving a row up keeps focus on the cell it was lifted from', async () => {
    const { settle, query } = await render(AppliedListRowReorderHost);
    const lifted = query('[data-testid="cell-b-3"]');
    lifted.focus();

    press(lifted, ' ', { ctrlKey: true });
    await settle();
    press(lifted, 'ArrowUp');
    await settle();
    press(lifted, ' ');
    await settle();

    const rows = Array.from(query('[role="rowgroup"]').querySelectorAll('[forTableRow]'));
    expect(rows.map((r) => r.getAttribute('data-testid'))).toEqual([
      'row-0',
      'row-1',
      'row-3',
      'row-2',
      'row-4',
    ]);
    expect(document.activeElement).toBe(query('[data-testid="cell-b-3"]'));
  });

  it('a non-virtualized grid drop keeps focus on the cell it was lifted from', async () => {
    const { settle, query } = await render(AppliedListRowReorderHost);
    const lifted = query('[data-testid="cell-b-1"]');
    lifted.focus();

    press(lifted, ' ', { ctrlKey: true });
    await settle();
    press(lifted, 'ArrowDown');
    await settle();
    press(lifted, ' ');
    await settle();

    const rows = Array.from(query('[role="rowgroup"]').querySelectorAll('[forTableRow]'));
    expect(rows.map((r) => r.getAttribute('data-testid'))).toEqual([
      'row-0',
      'row-2',
      'row-1',
      'row-3',
      'row-4',
    ]);
    expect(document.activeElement).toBe(query('[data-testid="cell-b-1"]'));
  });
});

const IN_ROW_CONTROLS_TEMPLATE = `
  <div
    forTable
    forTableVirtualized
    [mode]="mode"
    selectionMode="multiple"
    [(value)]="selection"
    ariaLabel="Virtualized rows with in-row controls"
    [rowCount]="rowCount"
    [estimateRowSize]="rowHeight"
    #v="forTableVirtualized"
    style="height: 200px; overflow: auto"
  >
    <div
      role="rowgroup"
      forTableRowReorder
      [style.height.px]="v.totalSize()"
      (rowReorder)="last = $event"
    >
      @for (vrow of v.virtualRows(); track vrow.index) {
        <div
          forTableRow
          [virtualIndex]="vrow.index"
          [value]="vrow.index"
          forDraggable
          [dragData]="vrow.index"
          [attr.data-testid]="'row-' + vrow.index"
        >
          <div forTableCell name="a" [attr.data-testid]="'cell-' + vrow.index">
            <span forTableRowSelector [attr.data-testid]="'selector-' + vrow.index"></span>
            <button type="button" [attr.data-testid]="'edit-' + vrow.index">Edit</button>
            <input [attr.data-testid]="'field-' + vrow.index" />
          </div>
        </div>
      }
    </div>
  </div>
`;

@Component({
  imports: [
    ForTable,
    ForTableVirtualized,
    ForTableRow,
    ForTableCell,
    ForTableRowReorder,
    ForTableRowSelector,
    ForDraggable,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: IN_ROW_CONTROLS_TEMPLATE,
})
class TableModeInRowControlsHost {
  protected readonly mode: TableMode = 'table';
  protected readonly rowCount = ROW_COUNT;
  protected readonly rowHeight = ROW_HEIGHT;
  readonly selection = signal<readonly unknown[]>([]);
  last: TableRowReorderDescriptor | null = null;
}

@Component({
  imports: [
    ForTable,
    ForTableVirtualized,
    ForTableRow,
    ForTableCell,
    ForTableRowReorder,
    ForTableRowSelector,
    ForDraggable,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'data-fixture': 'grid-mode-in-row-controls' },
  template: IN_ROW_CONTROLS_TEMPLATE,
})
class GridModeInRowControlsHost {
  protected readonly mode: TableMode = 'grid';
  protected readonly rowCount = ROW_COUNT;
  protected readonly rowHeight = ROW_HEIGHT;
  readonly selection = signal<readonly unknown[]>([]);
  last: TableRowReorderDescriptor | null = null;
}

describe('ForTableRowReorder — a lift key on an in-row control is left to that control (#2115)', () => {
  afterEach(() => {
    document.querySelectorAll('[aria-live]').forEach((node) => node.remove());
  });

  it('Space on a row selector toggles the selection instead of lifting the row', async () => {
    const { instance, settle, indices, query } = await render(TableModeInRowControlsHost);
    const index = Math.min(...indices());
    const selector = query(`[data-testid="selector-${index}"]`);
    selector.focus();

    press(selector, ' ');
    await settle();

    expect(instance.selection()).toEqual([index]);
    expect(query(`[data-testid="row-${index}"]`).hasAttribute('data-dragging')).toBe(false);
  });

  it('Enter on an in-row button leaves the key to the button', async () => {
    const { settle, indices, query } = await render(TableModeInRowControlsHost);
    const index = Math.min(...indices());
    const button = query(`[data-testid="edit-${index}"]`);
    button.focus();

    const enter = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    button.dispatchEvent(enter);
    await settle();

    expect(enter.defaultPrevented).toBe(false);
    expect(query(`[data-testid="row-${index}"]`).hasAttribute('data-dragging')).toBe(false);
  });

  it('Space on the focused row itself still lifts it', async () => {
    const { settle, indices, query } = await render(TableModeInRowControlsHost);
    const index = Math.min(...indices());
    const row = query(`[data-testid="row-${index}"]`);
    row.focus();

    press(row, ' ');
    await settle();

    expect(row.getAttribute('data-dragging')).toBe('');
  });

  it('Ctrl+Space typed in a cell input leaves the key to the input', async () => {
    const { settle, indices, query } = await render(GridModeInRowControlsHost);
    const index = Math.min(...indices());
    const field = query(`[data-testid="field-${index}"]`);
    field.focus();

    const space = new KeyboardEvent('keydown', {
      key: ' ',
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    });
    field.dispatchEvent(space);
    await settle();

    expect(space.defaultPrevented).toBe(false);
    expect(query(`[data-testid="row-${index}"]`).hasAttribute('data-dragging')).toBe(false);
  });

  it('Ctrl+Space on the cell itself still lifts the row', async () => {
    const { settle, indices, query } = await render(GridModeInRowControlsHost);
    const index = Math.min(...indices());
    const cell = query(`[data-testid="cell-${index}"]`);
    cell.focus();

    press(cell, ' ', { ctrlKey: true });
    await settle();

    expect(query(`[data-testid="row-${index}"]`).getAttribute('data-dragging')).toBe('');
  });
});

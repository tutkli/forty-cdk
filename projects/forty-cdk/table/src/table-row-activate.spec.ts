import { Component, signal } from '@angular/core';

import { renderHost } from '../../src/test-utils';
import { pressKey, pressWithMouse } from 'forty-cdk/testing';
import { ForTable, type TableCellActivateEvent } from './table';
import { ForTableCell } from './table-cell';
import { ForTableRow, type TableRawRowActivateEvent } from './table-row';
import type { TableMode, TableSelectionMode } from './table-context';

@Component({
  imports: [ForTable, ForTableRow, ForTableCell],
  template: `
    <div
      forTable
      [mode]="mode()"
      [selectionMode]="selectionMode()"
      [(value)]="selection"
      (cellActivate)="cellActivations.push($event)"
    >
      <div role="rowgroup">
        @for (row of rows; track row.id) {
          <div
            forTableRow
            [value]="row.id"
            [attr.data-testid]="'row-' + row.id"
            (activate)="activations.push($event)"
          >
            <div forTableCell name="a" [attr.data-testid]="'c-a-' + row.id">
              <button type="button" [attr.data-testid]="'btn-' + row.id">edit</button>
            </div>
            <div forTableCell name="b" [attr.data-testid]="'c-b-' + row.id">
              <span [attr.data-testid]="'text-' + row.id">{{ row.id }}</span>
            </div>
            <div forTableCell name="c" disabled [attr.data-testid]="'c-c-' + row.id">x</div>
          </div>
        }
        <div forTableRow (activate)="activations.push($event)">
          <div forTableCell name="a">-</div>
          <div forTableCell name="b" data-testid="c-b-none">-</div>
          <div forTableCell name="c">-</div>
        </div>
      </div>
    </div>
  `,
})
class RowActivateHost {
  readonly mode = signal<TableMode>('grid');
  readonly selectionMode = signal<TableSelectionMode>('none');
  selection: readonly number[] = [];
  readonly rows = [{ id: 1 }, { id: 2 }];
  readonly activations: TableRawRowActivateEvent[] = [];
  readonly cellActivations: TableCellActivateEvent<unknown>[] = [];
}

const byId = (el: HTMLElement, id: string) =>
  el.querySelector<HTMLElement>(`[data-testid="${id}"]`)!;

describe('ForTableRow activate', () => {
  it('a click on cell content emits once with the row value and the click', async () => {
    const { el, instance, flush } = renderHost(RowActivateHost);
    let click: Event | undefined;
    const row = byId(el, 'row-2');
    row.addEventListener('click', (event) => (click = event));
    pressWithMouse(byId(el, 'text-2'));
    await flush();
    expect(instance.activations).toHaveLength(1);
    expect(instance.activations[0]!.value).toBe(2);
    expect(instance.activations[0]!.event).toBe(click);
    expect(instance.activations[0]!.event).toBeInstanceOf(MouseEvent);
  });

  it('a click on the row host itself emits', async () => {
    const { el, instance, flush } = renderHost(RowActivateHost);
    byId(el, 'row-1').click();
    await flush();
    expect(instance.activations.map((a) => a.value)).toEqual([1]);
  });

  it('a click on an interactive descendant emits nothing', async () => {
    const { el, instance, flush } = renderHost(RowActivateHost);
    pressWithMouse(byId(el, 'btn-1'));
    await flush();
    expect(instance.activations).toHaveLength(0);
  });

  it('Enter on a widget-free cell emits the same prevented keydown the root reports as cellActivate', async () => {
    const { el, instance, flush } = renderHost(RowActivateHost);
    const cell = byId(el, 'c-b-2');
    cell.focus();
    const ev = pressKey(cell, 'Enter');
    await flush();
    expect(ev.defaultPrevented).toBe(true);
    expect(instance.activations).toEqual([{ value: 2, event: ev }]);
    expect(instance.cellActivations.map((a) => a.event)).toEqual([ev]);
    expect(document.activeElement).toBe(cell);
  });

  it('Enter that enters a widget emits nothing', async () => {
    const { el, instance, flush } = renderHost(RowActivateHost);
    const cell = byId(el, 'c-a-1');
    cell.focus();
    pressKey(cell, 'Enter');
    await flush();
    expect(document.activeElement).toBe(byId(el, 'btn-1'));
    expect(instance.activations).toHaveLength(0);
  });

  it('Enter from an inner control or nested text, Enter on a disabled cell and F2 emit nothing', async () => {
    const { el, instance, flush } = renderHost(RowActivateHost);
    pressKey(byId(el, 'btn-1'), 'Enter');
    pressKey(byId(el, 'text-1'), 'Enter');
    const disabled = byId(el, 'c-c-1');
    disabled.focus();
    pressKey(disabled, 'Enter');
    const plain = byId(el, 'c-b-1');
    plain.focus();
    pressKey(plain, 'F2');
    await flush();
    expect(instance.activations).toHaveLength(0);
  });

  it('reports an undefined value for a row without a [value]', async () => {
    const { el, instance, flush } = renderHost(RowActivateHost);
    const cell = byId(el, 'c-b-none');
    cell.focus();
    pressKey(cell, 'Enter');
    pressWithMouse(cell);
    await flush();
    expect(instance.activations).toHaveLength(2);
    expect(instance.activations.every((a) => a.value === undefined)).toBe(true);
  });

  it('treegrid emits like grid', async () => {
    const { el, instance, flush } = renderHost(RowActivateHost);
    instance.mode.set('treegrid');
    await flush();
    const cell = byId(el, 'c-b-1');
    cell.focus();
    pressKey(cell, 'Enter');
    pressWithMouse(byId(el, 'text-2'));
    await flush();
    expect(instance.activations.map((a) => a.value)).toEqual([1, 2]);
  });

  it('mode="table" emits for neither a click nor Enter', async () => {
    const { el, instance, flush } = renderHost(RowActivateHost);
    instance.mode.set('table');
    await flush();
    pressWithMouse(byId(el, 'text-1'));
    pressKey(byId(el, 'c-b-1'), 'Enter');
    await flush();
    expect(instance.activations).toHaveLength(0);
  });

  it('a click in a selectable grid both selects the row and emits', async () => {
    const { el, instance, flush } = renderHost(RowActivateHost);
    instance.selectionMode.set('multiple');
    await flush();
    pressWithMouse(byId(el, 'text-2'));
    await flush();
    expect(instance.selection).toEqual([2]);
    expect(instance.activations.map((a) => a.value)).toEqual([2]);
  });
});

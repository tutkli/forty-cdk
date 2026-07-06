import {
  ChangeDetectionStrategy,
  Component,
  computed,
  provideZonelessChangeDetection,
  signal,
  type Type,
  viewChild,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { flush } from '../../src/test-utils';
import { ForDraggable, moveItemInArray } from 'forty-cdk/drag-drop';
import { ForVirtualFor } from './virtual-for';
import { ForVirtualViewport } from './virtual-viewport';
import { ForVirtualReorder, type ForVirtualReorderEvent } from './virtual-reorder';

interface Row {
  readonly id: number;
  readonly label: string;
}

function makeRows(length: number): Row[] {
  return Array.from({ length }, (_, i) => ({ id: i, label: `Row ${i}` }));
}

function fakeLayout(el: HTMLElement, main = 200): void {
  Object.defineProperty(el, 'offsetHeight', { configurable: true, value: main });
  Object.defineProperty(el, 'clientHeight', { configurable: true, value: main });
  Object.defineProperty(el, 'offsetWidth', { configurable: true, value: main });
  Object.defineProperty(el, 'clientWidth', { configurable: true, value: main });
  Object.defineProperty(el, 'scrollHeight', { configurable: true, value: main * 200 });
  Object.defineProperty(el, 'scrollWidth', { configurable: true, value: main * 200 });
}

function dispatchKey(el: HTMLElement, key: string): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
  el.dispatchEvent(event);
  return event;
}

function pointer(type: string, x: number, y: number): PointerEvent {
  return new PointerEvent(type, {
    clientX: x,
    clientY: y,
    button: 0,
    pointerId: 1,
    bubbles: true,
    cancelable: true,
  });
}

@Component({
  imports: [ForVirtualViewport, ForVirtualFor, ForVirtualReorder, ForDraggable],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div data-testid="readout">{{ readout() }}</div>
    <div
      forVirtualViewport
      [virtualCount]="rows().length"
      [estimateSize]="40"
      forVirtualReorder
      (itemReorder)="onReorder($event)"
      style="height: 200px; width: 200px"
    >
      <div
        *forVirtualFor="let row of rows()"
        forDraggable
        [dragData]="row.id"
        [attr.data-testid]="'row-' + row.id"
      >
        {{ row.label }}
      </div>
    </div>
  `,
})
class ReorderHost {
  readonly rows = signal<readonly Row[]>(makeRows(1000));
  readonly last = signal<ForVirtualReorderEvent | null>(null);
  readonly events = signal(0);
  readonly viewport = viewChild.required(ForVirtualViewport);

  readonly readout = computed(() => {
    const r = this.last();
    return r ? `${r.from}->${r.to}` : 'none';
  });

  onReorder(event: ForVirtualReorderEvent): void {
    this.last.set(event);
    this.events.update((n) => n + 1);
    this.rows.update((rows) => moveItemInArray(rows, event.from, event.to));
  }
}

async function render<T>(host: Type<T>) {
  TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
  const fixture = TestBed.createComponent(host);
  const root = fixture.nativeElement as HTMLElement;
  fakeLayout(root.querySelector('[forVirtualViewport]')!, 200);
  fixture.detectChanges();
  await flush(fixture);
  return {
    fixture,
    instance: fixture.componentInstance,
    query: (selector: string) => root.querySelector<HTMLElement>(selector),
    queryAll: (selector: string) => Array.from(root.querySelectorAll<HTMLElement>(selector)),
    flush: () => flush(fixture),
  };
}

function mount() {
  return render(ReorderHost);
}

describe('ForVirtualReorder — keyboard', () => {
  it('lift → ArrowDown → drop emits the next absolute index and applies the move', async () => {
    const { instance, query, flush: f } = await mount();
    const row = query('[data-testid="row-2"]')!;
    row.focus();

    dispatchKey(row, ' ');
    await f();
    dispatchKey(row, 'ArrowDown');
    await f();
    dispatchKey(row, ' ');
    await f();

    expect(instance.last()).toEqual({ from: 2, to: 3 });
    expect(query('[data-testid="readout"]')!.textContent).toBe('2->3');
  });

  it('End jumps the target to the dataset end, beyond the rendered window', async () => {
    const { instance, query, flush: f } = await mount();
    const row = query('[data-testid="row-2"]')!;
    row.focus();

    dispatchKey(row, ' ');
    await f();
    dispatchKey(row, 'End');
    await f();
    dispatchKey(row, ' ');
    await f();

    expect(instance.last()).toEqual({ from: 2, to: 999 });
  });

  it('Home jumps the target to the dataset start', async () => {
    const { instance, query, flush: f } = await mount();
    const row = query('[data-testid="row-3"]')!;
    row.focus();

    dispatchKey(row, ' ');
    await f();
    dispatchKey(row, 'Home');
    await f();
    dispatchKey(row, ' ');
    await f();

    expect(instance.last()).toEqual({ from: 3, to: 0 });
  });

  it('Escape cancels a lifted drag without emitting', async () => {
    const { instance, query, flush: f } = await mount();
    const row = query('[data-testid="row-2"]')!;
    row.focus();

    dispatchKey(row, ' ');
    await f();
    dispatchKey(row, 'ArrowDown');
    await f();
    dispatchKey(row, 'Escape');
    await f();

    expect(instance.events()).toBe(0);
    expect(query('[data-testid="readout"]')!.textContent).toBe('none');
  });

  it('does not lift a disabled list (reorder disabled via the list)', async () => {
    const { instance, query, flush: f } = await render(DisabledHost);

    const row = query('[data-testid="row-2"]')!;
    row.focus();
    dispatchKey(row, ' ');
    await f();
    dispatchKey(row, 'End');
    await f();
    dispatchKey(row, ' ');
    await f();

    expect(instance.events()).toBe(0);
  });
});

describe('ForVirtualReorder — interactive row content keeps Space/Enter', () => {
  it('Space on a button inside a row does not lift the row (button keeps its key)', async () => {
    const { instance, query, flush: f } = await render(InteractiveHost);
    const button = query('[data-testid="btn-2"]')!;
    button.focus();

    dispatchKey(button, ' ');
    await f();
    expect(instance.events()).toBe(0);

    dispatchKey(button, 'ArrowDown');
    await f();
    dispatchKey(button, ' ');
    await f();
    expect(instance.events()).toBe(0);
    expect(instance.last()).toBeNull();
  });

  it('Enter on a button inside a row does not lift the row', async () => {
    const { instance, query, flush: f } = await render(InteractiveHost);
    const button = query('[data-testid="btn-3"]')!;
    button.focus();

    dispatchKey(button, 'Enter');
    await f();

    expect(instance.events()).toBe(0);
    expect(instance.last()).toBeNull();
  });

  it('a click on the button still activates it while the row is a reorder host', async () => {
    const { instance, query, flush: f } = await render(InteractiveHost);
    const button = query('[data-testid="btn-2"]')!;
    button.click();
    await f();
    expect(instance.buttonClicks()).toBe(1);
    expect(instance.events()).toBe(0);
  });

  it('Space on the row host itself still lifts (drag proceeds)', async () => {
    const { instance, query, flush: f } = await render(InteractiveHost);
    const row = query('[data-testid="row-2"]')!;
    row.focus();

    const lift = dispatchKey(row, ' ');
    await f();
    expect(lift.defaultPrevented).toBe(true);

    dispatchKey(row, 'ArrowDown');
    await f();
    dispatchKey(row, ' ');
    await f();

    expect(instance.last()).toEqual({ from: 2, to: 3 });
  });
});

describe('ForVirtualReorder — lifted-row pinning', () => {
  it('keeps a pinned out-of-window row mounted in the rendered set', async () => {
    const { instance, query, queryAll, flush: f } = await mount();

    expect(query('[data-testid="row-900"]')).toBeNull();

    instance.viewport().setReorderingIndex(900);
    await f();

    const pinned = query('[data-testid="row-900"]')!;
    expect(pinned.getAttribute('data-index')).toBe('900');

    instance.viewport().setReorderingIndex(null);
    await f();
    expect(queryAll('[data-testid="row-900"]').length).toBe(0);
  });

  it('does not pin an out-of-range index', async () => {
    const { instance, query, flush: f } = await mount();
    instance.viewport().setReorderingIndex(5000);
    await f();
    expect(query('[data-testid="row-5000"]')).toBeNull();
  });
});

describe('ForVirtualReorder — pointer transport armed on drag start (#1252)', () => {
  it('registers no document pointer listeners while idle', async () => {
    const addSpy = vi.spyOn(document, 'addEventListener');
    try {
      await mount();
      const idle = addSpy.mock.calls.filter(
        ([type]) => type === 'pointermove' || type === 'pointerup' || type === 'pointercancel',
      );
      expect(idle).toEqual([]);
    } finally {
      addSpy.mockRestore();
    }
  });

  it('attaches document pointer listeners on drag start and detaches them on drag end', async () => {
    const { query } = await mount();
    const addSpy = vi.spyOn(document, 'addEventListener');
    const removeSpy = vi.spyOn(document, 'removeEventListener');
    try {
      query('[data-testid="row-2"]')!.dispatchEvent(pointer('pointerdown', 0, 100));
      const added = addSpy.mock.calls.filter(([type]) => type === 'pointermove').length;
      expect(added).toBeGreaterThan(0);

      document.dispatchEvent(pointer('pointerup', 0, 100));
      const removed = removeSpy.mock.calls.filter(([type]) => type === 'pointermove').length;
      expect(removed).toBe(added);
    } finally {
      addSpy.mockRestore();
      removeSpy.mockRestore();
    }
  });
});

@Component({
  imports: [ForVirtualViewport, ForVirtualFor, ForVirtualReorder, ForDraggable],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      forVirtualViewport
      [virtualCount]="rows().length"
      [estimateSize]="40"
      forVirtualReorder
      disabled
      (itemReorder)="onReorder()"
      style="height: 200px; width: 200px"
    >
      <div
        *forVirtualFor="let row of rows()"
        forDraggable
        [dragData]="row.id"
        [attr.data-testid]="'row-' + row.id"
      >
        {{ row.label }}
      </div>
    </div>
  `,
})
class DisabledHost {
  readonly rows = signal<readonly Row[]>(makeRows(1000));
  readonly events = signal(0);

  onReorder(): void {
    this.events.update((n) => n + 1);
  }
}

@Component({
  imports: [ForVirtualViewport, ForVirtualFor, ForVirtualReorder, ForDraggable],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      forVirtualViewport
      [virtualCount]="rows().length"
      [estimateSize]="40"
      forVirtualReorder
      (itemReorder)="onReorder($event)"
      style="height: 200px; width: 200px"
    >
      <div
        *forVirtualFor="let row of rows()"
        forDraggable
        [dragData]="row.id"
        [attr.data-testid]="'row-' + row.id"
      >
        {{ row.label }}
        <button type="button" [attr.data-testid]="'btn-' + row.id" (click)="onButton()">
          action
        </button>
      </div>
    </div>
  `,
})
class InteractiveHost {
  readonly rows = signal<readonly Row[]>(makeRows(1000));
  readonly last = signal<ForVirtualReorderEvent | null>(null);
  readonly events = signal(0);
  readonly buttonClicks = signal(0);
  readonly viewport = viewChild.required(ForVirtualViewport);

  onReorder(event: ForVirtualReorderEvent): void {
    this.last.set(event);
    this.events.update((n) => n + 1);
    this.rows.update((rows) => moveItemInArray(rows, event.from, event.to));
  }

  onButton(): void {
    this.buttonClicks.update((n) => n + 1);
  }
}

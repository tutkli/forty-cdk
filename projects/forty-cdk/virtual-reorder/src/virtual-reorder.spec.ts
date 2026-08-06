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
import { ForVirtualFor, ForVirtualViewport } from 'forty-cdk/virtualization';

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

function dispatchKey(el: HTMLElement, key: string): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
  el.dispatchEvent(event);
  return event;
}

function focusOut(el: HTMLElement, relatedTarget: HTMLElement | null = null): void {
  el.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget }));
}

function assertiveText(): string {
  return Array.from(document.querySelectorAll('[aria-live="assertive"]'))
    .map((node) => node.textContent ?? '')
    .join(' ');
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
    <button type="button" data-testid="outside">outside</button>
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
  const viewport = root.querySelector<HTMLElement>('[forVirtualViewport]')!;
  fakeLayout(viewport, 200);
  installFakeScroll(viewport);
  fixture.detectChanges();
  await flush(fixture);
  return {
    fixture,
    instance: fixture.componentInstance,
    viewport,
    query: (selector: string) => root.querySelector<HTMLElement>(selector),
    queryAll: (selector: string) => Array.from(root.querySelectorAll<HTMLElement>(selector)),
    indices: () =>
      Array.from(root.querySelectorAll<HTMLElement>('[data-index]')).map((el) =>
        Number(el.getAttribute('data-index')),
      ),
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

describe('ForVirtualReorder — the lifted row reflects data-dragging (#1693)', () => {
  afterEach(() => {
    document.querySelectorAll('[aria-live]').forEach((n) => n.remove());
  });

  it('a keyboard lift marks the lifted row and the viewport, and the drop clears both', async () => {
    const { query, viewport, flush: f } = await mount();
    const row = query('[data-testid="row-2"]')!;
    row.focus();

    expect(row.hasAttribute('data-dragging')).toBe(false);
    expect(viewport.hasAttribute('data-dragging')).toBe(false);

    dispatchKey(row, ' ');
    await f();

    expect(query('[data-testid="row-2"]')!.getAttribute('data-dragging')).toBe('');
    expect(viewport.getAttribute('data-dragging')).toBe('');
    expect(query('[data-testid="row-3"]')!.hasAttribute('data-dragging')).toBe(false);

    dispatchKey(row, ' ');
    await f();

    expect(query('[data-testid="row-2"]')!.hasAttribute('data-dragging')).toBe(false);
    expect(viewport.hasAttribute('data-dragging')).toBe(false);
  });

  it('Escape clears the mark from the lifted row and the viewport', async () => {
    const { query, viewport, flush: f } = await mount();
    const row = query('[data-testid="row-2"]')!;
    row.focus();

    dispatchKey(row, ' ');
    await f();
    expect(query('[data-testid="row-2"]')!.getAttribute('data-dragging')).toBe('');

    dispatchKey(row, 'Escape');
    await f();

    expect(query('[data-testid="row-2"]')!.hasAttribute('data-dragging')).toBe(false);
    expect(viewport.hasAttribute('data-dragging')).toBe(false);
  });

  it('a focus leave that cancels the gesture clears the mark', async () => {
    const { query, viewport, flush: f } = await mount();
    const row = query('[data-testid="row-2"]')!;
    row.focus();

    dispatchKey(row, ' ');
    await f();
    expect(query('[data-testid="row-2"]')!.getAttribute('data-dragging')).toBe('');

    focusOut(row, query('[data-testid="outside"]')!);
    await f();

    expect(assertiveText()).toContain('movement cancelled');
    expect(query('[data-testid="row-2"]')!.hasAttribute('data-dragging')).toBe(false);
    expect(viewport.hasAttribute('data-dragging')).toBe(false);
  });

  it('a focus leave that keeps the gesture alive keeps the mark', async () => {
    const { query, flush: f } = await mount();
    const row = query('[data-testid="row-2"]')!;
    row.focus();

    dispatchKey(row, ' ');
    await f();
    focusOut(row, query('[data-testid="row-3"]')!);
    await f();

    expect(assertiveText()).not.toContain('cancelled');
    expect(query('[data-testid="row-2"]')!.getAttribute('data-dragging')).toBe('');
  });

  it('a pointer lift still marks the dragged row, and the release clears it', async () => {
    const { query, viewport, flush: f } = await mount();
    const row = query('[data-testid="row-2"]')!;

    row.dispatchEvent(pointer('pointerdown', 0, 100));
    document.dispatchEvent(pointer('pointermove', 0, 120));
    await f();

    expect(query('[data-testid="row-2"]')!.getAttribute('data-dragging')).toBe('');
    expect(viewport.getAttribute('data-dragging')).toBe('');

    document.dispatchEvent(pointer('pointerup', 0, 120));
    await f();

    expect(query('[data-testid="row-2"]')!.hasAttribute('data-dragging')).toBe(false);
    expect(viewport.hasAttribute('data-dragging')).toBe(false);
  });
});

describe('ForVirtualReorder — a window jump past the lifted row keeps the gesture alive (#1666)', () => {
  afterEach(() => {
    document.querySelectorAll('[aria-live]').forEach((n) => n.remove());
  });

  async function settle(harness: Awaited<ReturnType<typeof mount>>): Promise<void> {
    await harness.flush();
    await harness.flush();
  }

  async function scrollTo(
    harness: Awaited<ReturnType<typeof mount>>,
    top: number,
  ): Promise<number> {
    harness.viewport.scrollTo({ top });
    await settle(harness);
    const indices = harness.indices();
    return indices[Math.floor(indices.length / 2)]!;
  }

  it('End leaves the lifted row mounted and focused, and the drop emits the dataset end', async () => {
    const harness = await mount();
    const { instance, indices, query } = harness;
    const row = query('[data-testid="row-2"]')!;
    row.focus();

    dispatchKey(row, ' ');
    await settle(harness);
    dispatchKey(row, 'End');
    await settle(harness);

    expect(indices()).toContain(999);
    expect(query('[data-testid="row-2"]')).toBe(row);
    expect(document.activeElement).toBe(row);

    dispatchKey(row, ' ');
    await settle(harness);

    expect(instance.last()).toEqual({ from: 2, to: 999 });
  });

  it('Home survives the jump when the lifted row started far from the dataset start', async () => {
    const harness = await mount();
    const { instance, indices, query } = harness;
    const from = await scrollTo(harness, 20000);
    expect(from).toBeGreaterThan(400);

    const row = query(`[data-testid="row-${from}"]`)!;
    row.focus();
    dispatchKey(row, ' ');
    await settle(harness);
    dispatchKey(row, 'Home');
    await settle(harness);

    expect(indices()).toContain(0);
    expect(document.activeElement).toBe(row);

    dispatchKey(row, ' ');
    await settle(harness);

    expect(instance.last()).toEqual({ from, to: 0 });
  });

  it('PageDown survives the jump when the step leaves the rendered window', async () => {
    const harness = await mount();
    const { instance, indices, query } = harness;
    const row = query('[data-testid="row-2"]')!;
    row.focus();

    dispatchKey(row, ' ');
    await settle(harness);
    const page = indices().length;
    expect(2 + page).toBeGreaterThan(Math.max(...indices()));

    dispatchKey(row, 'PageDown');
    await settle(harness);
    expect(document.activeElement).toBe(row);

    dispatchKey(row, ' ');
    await settle(harness);

    expect(instance.last()).toEqual({ from: 2, to: 2 + page });
  });

  it('PageUp survives the jump when the step leaves the rendered window', async () => {
    const harness = await mount();
    const { instance, indices, query } = harness;
    const from = await scrollTo(harness, 20000);

    const row = query(`[data-testid="row-${from}"]`)!;
    row.focus();
    dispatchKey(row, ' ');
    await settle(harness);
    const page = indices().length;
    expect(from - page).toBeLessThan(Math.min(...indices()));

    dispatchKey(row, 'PageUp');
    await settle(harness);
    expect(document.activeElement).toBe(row);

    dispatchKey(row, ' ');
    await settle(harness);

    expect(instance.last()).toEqual({ from, to: from - page });
  });

  it('announces the drop, never a cancel, when the window jump recycles the window', async () => {
    const harness = await mount();
    const { query } = harness;
    const row = query('[data-testid="row-2"]')!;
    row.focus();

    dispatchKey(row, ' ');
    await settle(harness);
    dispatchKey(row, 'End');
    await settle(harness);
    dispatchKey(row, ' ');
    await settle(harness);

    const assertive = document.querySelector('[aria-live="assertive"]');
    expect(assertive?.textContent).toContain('dropped at position 1000 of 1000');
    expect(assertive?.textContent).not.toContain('cancelled');
  });
});

describe('ForVirtualReorder — a focusout only cancels when focus really left the viewport', () => {
  afterEach(() => {
    document.querySelectorAll('[aria-live]').forEach((n) => n.remove());
  });

  it('keeps the lift when the focusout reports no destination and focus is still inside', async () => {
    const { instance, query, flush: f } = await mount();
    const row = query('[data-testid="row-2"]')!;
    row.focus();

    dispatchKey(row, ' ');
    await f();
    focusOut(row);
    await f();

    expect(assertiveText()).not.toContain('cancelled');

    dispatchKey(row, 'ArrowDown');
    await f();
    dispatchKey(row, ' ');
    await f();

    expect(instance.last()).toEqual({ from: 2, to: 3 });
  });

  it('keeps the lift when focus moves to another row inside the viewport', async () => {
    const { instance, query, flush: f } = await mount();
    const row = query('[data-testid="row-2"]')!;
    row.focus();

    dispatchKey(row, ' ');
    await f();
    focusOut(row, query('[data-testid="row-3"]')!);
    await f();

    expect(assertiveText()).not.toContain('cancelled');

    dispatchKey(row, ' ');
    await f();

    expect(instance.last()).toEqual({ from: 2, to: 2 });
  });

  it('cancels the lift when focus lands on an element outside the viewport', async () => {
    const { instance, query, flush: f } = await mount();
    const row = query('[data-testid="row-2"]')!;
    row.focus();

    dispatchKey(row, ' ');
    await f();

    focusOut(row, query('[data-testid="outside"]')!);
    await f();

    expect(assertiveText()).toContain('movement cancelled');
    expect(instance.events()).toBe(0);
  });

  it('cancels the lift when the focusout reports no destination and focus left the viewport', async () => {
    const { instance, query, flush: f } = await mount();
    const row = query('[data-testid="row-2"]')!;
    row.focus();

    dispatchKey(row, ' ');
    await f();

    row.blur();
    focusOut(row);
    await f();

    expect(assertiveText()).toContain('movement cancelled');
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
    try {
      query('[data-testid="row-2"]')!.dispatchEvent(pointer('pointerdown', 0, 100));
      const signals = addSpy.mock.calls
        .filter(([type]) => type === 'pointermove')
        .map(([, , options]) => (options as AddEventListenerOptions | undefined)?.signal);
      expect(signals.length).toBeGreaterThan(0);
      expect(signals.every((s) => s?.aborted === false)).toBe(true);

      document.dispatchEvent(pointer('pointerup', 0, 100));
      expect(signals.every((s) => s?.aborted === true)).toBe(true);
    } finally {
      addSpy.mockRestore();
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

@Component({
  imports: [ForVirtualViewport, ForVirtualFor, ForVirtualReorder, ForDraggable],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      forVirtualViewport
      [virtualCount]="rows().length"
      [estimateSize]="40"
      forVirtualReorder
      style="height: 200px; width: 200px"
    >
      <div
        *forVirtualFor="let row of rows()"
        forDraggable
        [dragData]="row.id"
        [attr.data-testid]="'row-' + row.id"
      >
        <svg viewBox="0 0 8 8" aria-hidden="true">
          <rect [attr.data-testid]="'icon-' + row.id" width="8" height="8"></rect>
        </svg>
        {{ row.label }}
      </div>
    </div>
  `,
})
class SvgGrabTargetHost {
  readonly rows = signal<readonly Row[]>(makeRows(1000));
}

describe('ForVirtualReorder — a pointer grab target is an Element, not an HTMLElement (#1677)', () => {
  it('pins the pressed row when the press lands on an SVG icon inside it', async () => {
    const { fixture, viewport, query, flush: f } = await render(SvgGrabTargetHost);
    const icon = (fixture.nativeElement as HTMLElement).querySelector<SVGElement>(
      '[data-testid="icon-2"]',
    )!;
    expect(icon instanceof HTMLElement).toBe(false);

    icon.dispatchEvent(pointer('pointerdown', 0, 100));

    viewport.scrollTo({ top: 20000 });
    await f();
    await f();

    expect(query('[data-testid="row-3"]')).toBeNull();
    expect(query('[data-testid="row-2"]')!.getAttribute('data-index')).toBe('2');

    document.dispatchEvent(pointer('pointerup', 0, 100));
  });
});

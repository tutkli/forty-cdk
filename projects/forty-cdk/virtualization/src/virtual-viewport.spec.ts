import { Component, input, provideZonelessChangeDetection, signal, viewChild } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';

import { flush } from '../../src/test-utils';
import { ForVirtualFor } from './virtual-for';
import { ForVirtualViewport } from './virtual-viewport';

interface Row {
  readonly label: string;
}

function makeRows(length: number): Row[] {
  return Array.from({ length }, (_, i) => ({ label: `Row ${i}` }));
}

function fakeLayout(el: HTMLElement, main = 200): void {
  Object.defineProperty(el, 'offsetHeight', { configurable: true, value: main });
  Object.defineProperty(el, 'clientHeight', { configurable: true, value: main });
  Object.defineProperty(el, 'offsetWidth', { configurable: true, value: main });
  Object.defineProperty(el, 'clientWidth', { configurable: true, value: main });
  Object.defineProperty(el, 'scrollHeight', { configurable: true, value: main * 200 });
  Object.defineProperty(el, 'scrollWidth', { configurable: true, value: main * 200 });
}

@Component({
  imports: [ForVirtualViewport, ForVirtualFor],
  template: `
    <div
      forVirtualViewport
      [virtualCount]="rows().length"
      [estimateSize]="40"
      [orientation]="orientation()"
      [overscan]="overscan()"
      style="height: 200px; width: 200px"
    >
      <div *forVirtualFor="let row of rows(); let item = virtualItem; let i = index">
        {{ row.label }}
      </div>
    </div>
  `,
})
class Host {
  readonly rows = signal<Row[]>(makeRows(1000));
  readonly orientation = signal<'vertical' | 'horizontal'>('vertical');
  readonly overscan = signal(5);
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

function viewportEl(fixture: { nativeElement: HTMLElement }): HTMLElement {
  return fixture.nativeElement.querySelector('[forVirtualViewport]') as HTMLElement;
}

function rowEls(fixture: { nativeElement: HTMLElement }): HTMLElement[] {
  return Array.from(fixture.nativeElement.querySelectorAll('[data-index]'));
}

describe('ForVirtualViewport + ForVirtualFor', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
  });

  it('forces overflow:auto on the host and renders a relatively positioned sizer', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const host = viewportEl(fixture);
    expect(host.style.overflow).toBe('auto');
    const sizer = host.firstElementChild as HTMLElement;
    expect(sizer.style.position).toBe('relative');
  });

  it('sizer main-axis size equals count * estimateSize (estimate before mount)', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const sizer = viewportEl(fixture).firstElementChild as HTMLElement;
    expect(sizer.style.height).toBe('40000px');
    expect(sizer.style.width).toBe('100%');
  });

  it('renders only a window of rows, not the whole list', async () => {
    const fixture = TestBed.createComponent(Host);
    fakeLayout(viewportEl(fixture), 200);
    fixture.detectChanges();
    await flush(fixture);
    const rows = rowEls(fixture);
    expect(rows.length).toBeGreaterThanOrEqual(1);
    expect(rows.length).toBeLessThan(1000);
  });

  it('positions each row absolutely with translateY(index * estimateSize)', async () => {
    const fixture = TestBed.createComponent(Host);
    fakeLayout(viewportEl(fixture), 200);
    fixture.detectChanges();
    await flush(fixture);
    const first = rowEls(fixture).find((el) => el.getAttribute('data-index') === '1');
    expect(first).toBeDefined();
    expect(first?.style.position).toBe('absolute');
    expect(first?.style.transform).toBe('translateY(40px)');
  });

  it('binds aria-setsize (true total) and aria-posinset (index + 1) on each row', async () => {
    const fixture = TestBed.createComponent(Host);
    fakeLayout(viewportEl(fixture), 200);
    fixture.detectChanges();
    await flush(fixture);
    const first = rowEls(fixture).find((el) => el.getAttribute('data-index') === '0');
    expect(first?.getAttribute('aria-setsize')).toBe('1000');
    expect(first?.getAttribute('aria-posinset')).toBe('1');
  });

  it('renders the row data into the template ($implicit)', async () => {
    const fixture = TestBed.createComponent(Host);
    fakeLayout(viewportEl(fixture), 200);
    fixture.detectChanges();
    await flush(fixture);
    const first = rowEls(fixture).find((el) => el.getAttribute('data-index') === '0');
    expect(first?.textContent?.trim()).toBe('Row 0');
  });

  it('reacts to a count change — the sizer resizes', async () => {
    const fixture = TestBed.createComponent(Host);
    fakeLayout(viewportEl(fixture), 200);
    fixture.detectChanges();
    await flush(fixture);
    const sizer = viewportEl(fixture).firstElementChild as HTMLElement;
    expect(sizer.style.height).toBe('40000px');
    fixture.componentInstance.rows.set(makeRows(500));
    await flush(fixture);
    expect(sizer.style.height).toBe('20000px');
  });

  it('horizontal orientation uses translateX and a width sizer', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.orientation.set('horizontal');
    fakeLayout(viewportEl(fixture), 200);
    fixture.detectChanges();
    await flush(fixture);
    const sizer = viewportEl(fixture).firstElementChild as HTMLElement;
    expect(sizer.style.width).toBe('40000px');
    expect(sizer.style.height).toBe('100%');
    const first = rowEls(fixture).find((el) => el.getAttribute('data-index') === '1');
    expect(first?.style.transform).toBe('translateX(40px)');
  });

  it('a larger overscan renders more rows than a small one', async () => {
    const small = TestBed.createComponent(Host);
    small.componentInstance.overscan.set(0);
    fakeLayout(viewportEl(small), 200);
    small.detectChanges();
    await flush(small);
    const smallCount = rowEls(small).length;

    const large = TestBed.createComponent(Host);
    large.componentInstance.overscan.set(40);
    fakeLayout(viewportEl(large), 200);
    large.detectChanges();
    await flush(large);
    const largeCount = rowEls(large).length;

    expect(largeCount).toBeGreaterThan(smallCount);
  });

  it('throws a prefixed error when *forVirtualFor is used outside a viewport', () => {
    @Component({
      imports: [ForVirtualFor],
      template: `<div *forVirtualFor="let row of rows()">{{ row }}</div>`,
    })
    class BadHost {
      readonly rows = signal<string[]>(['a', 'b']);
    }

    expect(() => {
      const fixture = TestBed.createComponent(BadHost);
      fixture.detectChanges();
    }).toThrow(/\[forty-cdk\/virtualization\]/);
  });
});

describe('ForVirtualViewport — retained (pinned) row offset', () => {
  @Component({
    host: { 'data-fixture': 'pin-host' },
    imports: [ForVirtualViewport, ForVirtualFor],
    template: `
      <div
        forVirtualViewport
        [virtualCount]="rows().length"
        [estimateSize]="40"
        style="height: 200px; width: 200px"
      >
        <div *forVirtualFor="let row of rows()">{{ row.label }}</div>
      </div>
    `,
  })
  class PinHost {
    readonly rows = signal<Row[]>(makeRows(1000));
    readonly viewport = viewChild.required(ForVirtualViewport);
  }

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
  });

  it('positions a pinned out-of-window row with the pure estimate offset when unmeasured', async () => {
    const fixture = TestBed.createComponent(PinHost);
    fakeLayout(viewportEl(fixture), 200);
    fixture.detectChanges();
    await flush(fixture);

    fixture.componentInstance.viewport().setReorderingIndex(900);
    await flush(fixture);

    const pinned = rowEls(fixture).find((el) => el.getAttribute('data-index') === '900');
    expect(pinned).toBeDefined();
    expect(pinned?.style.transform).toBe('translateY(36000px)');
  });

  it('positions a pinned out-of-window row with the measured offset once earlier rows are measured', async () => {
    const fixture = TestBed.createComponent(PinHost);
    fakeLayout(viewportEl(fixture), 200);
    fixture.detectChanges();
    await flush(fixture);

    const measured = document.createElement('div');
    measured.setAttribute('data-index', '0');
    Object.defineProperty(measured, 'offsetHeight', { configurable: true, value: 100 });
    Object.defineProperty(measured, 'offsetWidth', { configurable: true, value: 100 });
    (fixture.nativeElement as HTMLElement).appendChild(measured);
    fixture.componentInstance.viewport().measureElement(measured);
    await flush(fixture);

    fixture.componentInstance.viewport().setReorderingIndex(900);
    await flush(fixture);

    const pinned = rowEls(fixture).find((el) => el.getAttribute('data-index') === '900');
    expect(pinned).toBeDefined();
    expect(pinned?.style.transform).toBe('translateY(36060px)');
  });
});

describe('ForVirtualFor — a row retained across a window jump keeps its element (#1666)', () => {
  @Component({
    imports: [ForVirtualViewport, ForVirtualFor],
    template: `
      <div
        forVirtualViewport
        [virtualCount]="rows().length"
        [estimateSize]="40"
        style="height: 200px; width: 200px"
      >
        <div *forVirtualFor="let row of rows()" tabindex="0">{{ row.label }}</div>
      </div>
    `,
  })
  class FocusHost {
    readonly rows = signal<Row[]>(makeRows(1000));
    readonly viewport = viewChild.required(ForVirtualViewport);
  }

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
  });

  async function mount() {
    const fixture = TestBed.createComponent(FocusHost);
    const host = viewportEl(fixture);
    fakeLayout(host, 200);
    installFakeScroll(host);
    fixture.detectChanges();
    await flush(fixture);
    return fixture;
  }

  function rowAt(fixture: ComponentFixture<FocusHost>, index: number): HTMLElement | undefined {
    return rowEls(fixture).find((el) => el.getAttribute('data-index') === String(index));
  }

  it('keeps the pinned row mounted, focused and on the same element after the window jumps past it', async () => {
    const fixture = await mount();
    fixture.componentInstance.viewport().setReorderingIndex(2);
    await flush(fixture);

    const pinned = rowAt(fixture, 2)!;
    pinned.focus();
    expect(document.activeElement).toBe(pinned);

    fixture.componentInstance.viewport().scrollToIndex(999);
    await flush(fixture);
    await flush(fixture);

    expect(rowAt(fixture, 999)).toBeDefined();
    expect(rowAt(fixture, 2)).toBe(pinned);
    expect(pinned.isConnected).toBe(true);
    expect(document.activeElement).toBe(pinned);
  });

  it('keeps a focused in-window row focused when a scroll moves its position in the window', async () => {
    const fixture = await mount();
    const row = rowAt(fixture, 8)!;
    row.focus();
    const positionBefore = rowEls(fixture).indexOf(row);

    fixture.componentInstance.viewport().scrollToOffset(400);
    await flush(fixture);
    await flush(fixture);

    expect(rowEls(fixture).indexOf(row)).not.toBe(positionBefore);
    expect(document.activeElement).toBe(row);
  });

  it('renders the jumped-to window in ascending document order', async () => {
    const fixture = await mount();
    fixture.componentInstance.viewport().setReorderingIndex(2);
    await flush(fixture);

    fixture.componentInstance.viewport().scrollToIndex(999);
    await flush(fixture);
    await flush(fixture);

    const rendered = rowEls(fixture).map((el) => Number(el.getAttribute('data-index')));
    expect(rendered[0]).toBe(2);
    expect([...rendered].sort((a, b) => a - b)).toEqual(rendered);
  });
});

describe('ForVirtualViewport (endReached) output', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
  });

  it('emits when the window reaches the end of a short list', async () => {
    @Component({
      imports: [ForVirtualViewport, ForVirtualFor],
      template: `
        <div
          forVirtualViewport
          [virtualCount]="rows().length"
          [estimateSize]="40"
          (endReached)="onEnd()"
          style="height: 200px; width: 200px"
        >
          <div *forVirtualFor="let row of rows()">{{ row }}</div>
        </div>
      `,
    })
    class ShortHost {
      readonly rows = signal(['a', 'b', 'c', 'd', 'e']);
      readonly endCount = signal(0);
      onEnd(): void {
        this.endCount.update((n) => n + 1);
      }
    }

    const fixture = TestBed.createComponent(ShortHost);
    const vpEl = fixture.nativeElement.querySelector('[forVirtualViewport]') as HTMLElement;
    fakeLayout(vpEl, 200);
    fixture.detectChanges();
    await flush(fixture);
    expect(fixture.componentInstance.endCount()).toBe(1);
  });

  it('does not emit while the window sits at the top of a long list', async () => {
    @Component({
      imports: [ForVirtualViewport, ForVirtualFor],
      template: `
        <div
          forVirtualViewport
          [virtualCount]="rows().length"
          [estimateSize]="40"
          (endReached)="onEnd()"
          style="height: 200px; width: 200px"
        >
          <div *forVirtualFor="let row of rows()">{{ row }}</div>
        </div>
      `,
    })
    class LongHost {
      readonly rows = signal(makeRows(1000));
      readonly endCount = signal(0);
      onEnd(): void {
        this.endCount.update((n) => n + 1);
      }
    }

    const fixture = TestBed.createComponent(LongHost);
    const vpEl = fixture.nativeElement.querySelector('[forVirtualViewport]') as HTMLElement;
    fakeLayout(vpEl, 200);
    fixture.detectChanges();
    await flush(fixture);
    expect(fixture.componentInstance.endCount()).toBe(0);
  });
});

describe('ForVirtualViewport — detached-row sweep (#1424)', () => {
  class RecordingResizeObserver {
    static observed: Element[] = [];
    static unobserved: Element[] = [];
    observe(el: Element): void {
      RecordingResizeObserver.observed.push(el);
    }
    unobserve(el: Element): void {
      RecordingResizeObserver.unobserved.push(el);
    }
    disconnect(): void {}
  }

  @Component({
    host: { 'data-fixture': 'sweep-host' },
    imports: [ForVirtualViewport, ForVirtualFor],
    template: `
      <div
        forVirtualViewport
        [virtualCount]="rows().length"
        [estimateSize]="40"
        style="height: 200px; width: 200px"
      >
        <div *forVirtualFor="let row of rows()">{{ row.label }}</div>
      </div>
    `,
  })
  class SweepHost {
    readonly rows = signal<Row[]>(makeRows(1000));
    readonly viewport = viewChild.required(ForVirtualViewport);
  }

  const appended: HTMLElement[] = [];

  beforeEach(() => {
    RecordingResizeObserver.observed = [];
    RecordingResizeObserver.unobserved = [];
    vi.stubGlobal('ResizeObserver', RecordingResizeObserver);
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
  });

  afterEach(() => {
    for (const el of appended.splice(0)) {
      el.remove();
    }
  });

  function measuredRow(index: number, height = 40): HTMLElement {
    const row = document.createElement('div');
    row.setAttribute('data-index', String(index));
    Object.defineProperty(row, 'offsetHeight', { configurable: true, value: height });
    Object.defineProperty(row, 'offsetWidth', { configurable: true, value: height });
    document.body.appendChild(row);
    appended.push(row);
    return row;
  }

  async function mount(): Promise<ReturnType<typeof TestBed.createComponent<SweepHost>>> {
    const fixture = TestBed.createComponent(SweepHost);
    fakeLayout(viewportEl(fixture), 200);
    fixture.detectChanges();
    await flush(fixture);
    return fixture;
  }

  it('evicts and unobserves a detached measured row on the next render — no manual null call', async () => {
    const fixture = await mount();
    const viewport = fixture.componentInstance.viewport();

    const recycled = measuredRow(0);
    viewport.measureElement(recycled);
    expect(RecordingResizeObserver.observed).toContain(recycled);

    document.body.removeChild(recycled);
    expect(recycled.isConnected).toBe(false);

    fixture.componentInstance.rows.set(makeRows(500));
    await flush(fixture);

    expect(RecordingResizeObserver.unobserved).toContain(recycled);
  });

  it('keeps observing a still-connected measured row across renders (bounded, not over-swept)', async () => {
    const fixture = await mount();
    const viewport = fixture.componentInstance.viewport();

    const live = measuredRow(1);
    viewport.measureElement(live);
    expect(RecordingResizeObserver.observed).toContain(live);

    fixture.componentInstance.rows.set(makeRows(500));
    await flush(fixture);

    expect(RecordingResizeObserver.unobserved).not.toContain(live);
  });

  it('accepts a manual measureElement(null) sweep without throwing', async () => {
    const fixture = await mount();
    expect(() => fixture.componentInstance.viewport().measureElement(null)).not.toThrow();
  });
});

describe('ForVirtualViewport — keyed rows follow their item across a same-count reorder (#2188)', () => {
  interface KeyedRow {
    readonly id: string;
  }

  @Component({
    host: { 'data-fixture': 'keyed-reorder-host' },
    imports: [ForVirtualViewport, ForVirtualFor],
    template: `
      <div
        forVirtualViewport
        [virtualCount]="rows().length"
        [estimateSize]="40"
        [getItemKey]="keyOf"
        style="height: 200px; width: 200px"
      >
        <div *forVirtualFor="let row of rows()">{{ row.id }}</div>
      </div>
    `,
  })
  class KeyedReorderHost {
    readonly rows = signal<readonly KeyedRow[]>(
      Array.from({ length: 100 }, (_, i) => ({ id: `row-${i}` })),
    );
    keyOf: ((index: number) => string) | undefined = (index) => this.rows()[index]!.id;
    readonly viewport = viewChild.required(ForVirtualViewport);

    swap(a: number, b: number): void {
      this.rows.update((rows) => {
        const next = [...rows];
        [next[a], next[b]] = [next[b]!, next[a]!];
        return next;
      });
    }
  }

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
  });

  async function mount(keyed = true): Promise<ComponentFixture<KeyedReorderHost>> {
    const fixture = TestBed.createComponent(KeyedReorderHost);
    if (!keyed) {
      fixture.componentInstance.keyOf = undefined;
    }
    fakeLayout(viewportEl(fixture), 200);
    fixture.detectChanges();
    await flush(fixture);
    return fixture;
  }

  function rowAt(fixture: ComponentFixture<KeyedReorderHost>, index: number): HTMLElement {
    return rowEls(fixture).find((el) => el.getAttribute('data-index') === String(index))!;
  }

  it('moves the keyed DOM node with its item to the new index', async () => {
    const fixture = await mount();
    const captured = rowAt(fixture, 2);
    expect(captured.textContent?.trim()).toBe('row-2');

    fixture.componentInstance.swap(2, 3);
    await flush(fixture);

    expect(captured.isConnected).toBe(true);
    expect(captured.getAttribute('data-index')).toBe('3');
    expect(captured.getAttribute('aria-posinset')).toBe('4');
    expect(captured.textContent?.trim()).toBe('row-2');
    expect(rowAt(fixture, 2).textContent?.trim()).toBe('row-3');
  });

  it('keeps a measured size on its item rather than on its slot', async () => {
    const fixture = await mount();
    const captured = rowAt(fixture, 2);
    Object.defineProperty(captured, 'offsetHeight', { configurable: true, value: 100 });
    Object.defineProperty(captured, 'offsetWidth', { configurable: true, value: 100 });
    fixture.componentInstance.viewport().measureElement(captured);
    await flush(fixture);
    expect(rowAt(fixture, 3).style.transform).toBe('translateY(180px)');

    fixture.componentInstance.swap(2, 3);
    await flush(fixture);

    expect(rowAt(fixture, 2).style.transform).toBe('translateY(80px)');
    expect(captured.style.transform).toBe('translateY(120px)');
    expect(rowAt(fixture, 4).style.transform).toBe('translateY(220px)');
  });

  it('keeps index keys reusing the slot when no getItemKey is bound', async () => {
    const fixture = await mount(false);
    const captured = rowAt(fixture, 2);

    fixture.componentInstance.swap(2, 3);
    await flush(fixture);

    expect(captured.getAttribute('data-index')).toBe('2');
    expect(captured.textContent?.trim()).toBe('row-3');
    expect(rowAt(fixture, 3).textContent?.trim()).toBe('row-2');
  });

  it('shrinks a keyed list without reading a key past the new data', async () => {
    const fixture = await mount();

    fixture.componentInstance.rows.update((rows) => rows.slice(0, -1));
    await flush(fixture);

    expect(rowAt(fixture, 0).getAttribute('aria-setsize')).toBe('99');
  });

  it('filters a keyed list down to fewer rows than the rendered window', async () => {
    const fixture = await mount();

    fixture.componentInstance.rows.update((rows) => rows.slice(0, 3));
    await flush(fixture);

    expect(rowEls(fixture).map((el) => el.textContent?.trim())).toEqual([
      'row-0',
      'row-1',
      'row-2',
    ]);
  });

  it('re-keys every row when a key function is bound after the first render', async () => {
    const fixture = await mount(false);
    fixture.componentInstance.keyOf = (index) => fixture.componentInstance.rows()[index]!.id;
    fixture.componentInstance.rows.update((rows) => [...rows]);
    await flush(fixture);
    const captured = rowAt(fixture, 2);

    fixture.componentInstance.swap(2, 3);
    await flush(fixture);

    expect(captured.getAttribute('data-index')).toBe('3');
    expect(captured.textContent?.trim()).toBe('row-2');
  });

  it('keys a pinned row with the same function as the windowed rows after a rebind', async () => {
    const fixture = await mount(false);
    const viewport = fixture.componentInstance.viewport();

    fixture.componentInstance.keyOf = (index) => `key-${index}`;
    viewport.setReorderingIndex(50);
    await flush(fixture);

    const keys = viewport.virtualItems().map((item) => [item.index, item.key]);
    expect(keys).toContainEqual([50, 'key-50']);
    expect(keys).toContainEqual([2, 'key-2']);
  });
});

describe('ForVirtualFor — a keyed reorder keeps focus on the row it moves (#2343)', () => {
  interface KeyedRow {
    readonly id: string;
  }

  @Component({
    host: { 'data-fixture': 'keyed-focus-host' },
    imports: [ForVirtualViewport, ForVirtualFor],
    template: `
      <div
        forVirtualViewport
        [virtualCount]="rows().length"
        [estimateSize]="40"
        [getItemKey]="keyOf"
        style="height: 200px; width: 200px"
      >
        <div *forVirtualFor="let row of rows()" tabindex="0">
          <input [attr.aria-label]="row.id" value="abcdef" />
        </div>
      </div>
    `,
  })
  class KeyedFocusHost {
    readonly rows = signal<readonly KeyedRow[]>(
      Array.from({ length: 100 }, (_, i) => ({ id: `row-${i}` })),
    );
    readonly keyOf = (index: number): string => this.rows()[index]!.id;

    move(from: number, to: number): void {
      this.rows.update((rows) => {
        const next = [...rows];
        const [row] = next.splice(from, 1);
        next.splice(to, 0, row!);
        return next;
      });
    }
  }

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
  });

  async function mount(): Promise<ComponentFixture<KeyedFocusHost>> {
    const fixture = TestBed.createComponent(KeyedFocusHost);
    fakeLayout(viewportEl(fixture), 200);
    fixture.detectChanges();
    await flush(fixture);
    return fixture;
  }

  function rowAt(fixture: ComponentFixture<KeyedFocusHost>, index: number): HTMLElement {
    return rowEls(fixture).find((el) => el.getAttribute('data-index') === String(index))!;
  }

  function renderedIds(fixture: ComponentFixture<KeyedFocusHost>): string[] {
    return rowEls(fixture).map((el) => el.querySelector('input')!.getAttribute('aria-label')!);
  }

  it('keeps a focused row focused when the reorder moves it up one slot', async () => {
    const fixture = await mount();
    const captured = rowAt(fixture, 3);
    captured.focus();

    fixture.componentInstance.move(3, 2);
    await flush(fixture);

    expect(captured.getAttribute('data-index')).toBe('2');
    expect(document.activeElement).toBe(captured);
  });

  it('keeps a focused row focused, and the window in item order, when it moves up several slots', async () => {
    const fixture = await mount();
    const captured = rowAt(fixture, 6);
    captured.focus();

    fixture.componentInstance.move(6, 1);
    await flush(fixture);

    expect(document.activeElement).toBe(captured);
    expect(renderedIds(fixture)).toEqual(
      fixture.componentInstance
        .rows()
        .slice(0, renderedIds(fixture).length)
        .map((row) => row.id),
    );
  });

  it('keeps the focus and the caret of an input inside a row the reorder moves up', async () => {
    const fixture = await mount();
    const input = rowAt(fixture, 3).querySelector('input')!;
    input.focus();
    input.setSelectionRange(2, 4);

    fixture.componentInstance.move(3, 0);
    await flush(fixture);

    expect(document.activeElement).toBe(input);
    expect([input.selectionStart, input.selectionEnd]).toEqual([2, 4]);
  });

  it('keeps a focused row focused when the reorder moves it down', async () => {
    const fixture = await mount();
    const captured = rowAt(fixture, 1);
    captured.focus();

    fixture.componentInstance.move(1, 4);
    await flush(fixture);

    expect(captured.getAttribute('data-index')).toBe('4');
    expect(document.activeElement).toBe(captured);
  });
});

describe('ForVirtualViewport — [estimateSize] changes after the first render', () => {
  @Component({
    host: { 'data-fixture': 'estimate-host' },
    imports: [ForVirtualViewport, ForVirtualFor],
    template: `
      <div
        forVirtualViewport
        [virtualCount]="rows().length"
        [estimateSize]="size()"
        style="height: 200px; width: 200px"
      >
        <div *forVirtualFor="let row of rows()">{{ row.label }}</div>
      </div>
    `,
  })
  class EstimateHost {
    readonly rows = signal<Row[]>(makeRows(1000));
    readonly size = signal(40);
  }

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
  });

  it('resizes the sizer and repositions every unmeasured row', async () => {
    const fixture = TestBed.createComponent(EstimateHost);
    fakeLayout(viewportEl(fixture), 200);
    fixture.detectChanges();
    await flush(fixture);
    const sizer = viewportEl(fixture).firstElementChild as HTMLElement;
    expect(sizer.style.height).toBe('40000px');

    fixture.componentInstance.size.set(20);
    await flush(fixture);

    expect(sizer.style.height).toBe('20000px');
    const row = rowEls(fixture).find((el) => el.getAttribute('data-index') === '1')!;
    expect(row.style.transform).toBe('translateY(20px)');
  });
});

describe('ForVirtualFor rendered by a wrapper component inside the viewport', () => {
  @Component({
    selector: 'wrapped-rows',
    imports: [ForVirtualFor],
    template: `<div *forVirtualFor="let row of rows()">{{ row.label }}</div>`,
  })
  class WrappedRows {
    readonly rows = input.required<readonly Row[]>();
  }

  @Component({
    host: { 'data-fixture': 'wrapped-rows-host' },
    imports: [ForVirtualViewport, WrappedRows],
    template: `
      <div
        forVirtualViewport
        [virtualCount]="rows.length"
        [estimateSize]="40"
        [getItemKey]="keyOf()"
        style="height: 200px; width: 200px"
      >
        <wrapped-rows [rows]="rows" />
      </div>
    `,
  })
  class WrappedRowsHost {
    readonly rows = makeRows(100);
    readonly keyOf = signal<((index: number) => string) | undefined>(undefined);
  }

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
  });

  async function mount(keyed: boolean): Promise<ComponentFixture<WrappedRowsHost>> {
    const fixture = TestBed.createComponent(WrappedRowsHost);
    if (keyed) {
      fixture.componentInstance.keyOf.set((index) => `row-${index}`);
    }
    fakeLayout(viewportEl(fixture), 200);
    fixture.detectChanges();
    await flush(fixture);
    return fixture;
  }

  it('renders the window on the first pass when rows are bound through the wrapper', async () => {
    const fixture = await mount(false);

    expect(rowEls(fixture).length).toBeGreaterThan(0);
    expect(rowEls(fixture)[0]!.textContent?.trim()).toBe('Row 0');
  });

  it('renders the window on the first pass with keyed rows bound through the wrapper', async () => {
    const fixture = await mount(true);

    expect(rowEls(fixture).length).toBeGreaterThan(0);
    expect(rowEls(fixture)[0]!.textContent?.trim()).toBe('Row 0');
  });
});

describe('ForVirtualViewport — writing direction', () => {
  @Component({
    imports: [ForVirtualViewport, ForVirtualFor],
    template: `
      <div
        forVirtualViewport
        #vp="forVirtualViewport"
        [virtualCount]="rows().length"
        [estimateSize]="40"
        [orientation]="orientation()"
        [overscan]="0"
        [dir]="dir()"
        style="height: 200px; width: 200px"
      >
        <div *forVirtualFor="let row of rows()">{{ row.label }}</div>
      </div>
    `,
  })
  class DirHost {
    readonly rows = signal<Row[]>(makeRows(1000));
    readonly orientation = signal<'vertical' | 'horizontal'>('horizontal');
    readonly dir = signal<'ltr' | 'rtl' | null>(null);
    readonly viewport = viewChild.required(ForVirtualViewport);
  }

  function installFakeHorizontalScroll(el: HTMLElement): void {
    let left = 0;
    Object.defineProperty(el, 'scrollLeft', {
      configurable: true,
      get: () => left,
      set: (value: number) => {
        left = value;
      },
    });
    el.scrollTo = ((options: ScrollToOptions) => {
      left = options.left ?? left;
      el.dispatchEvent(new Event('scroll'));
    }) as typeof el.scrollTo;
  }

  async function mount(
    configure: (host: DirHost) => void = () => undefined,
  ): Promise<ComponentFixture<DirHost>> {
    const fixture = TestBed.createComponent(DirHost);
    configure(fixture.componentInstance);
    const el = viewportEl(fixture);
    fakeLayout(el, 200);
    installFakeHorizontalScroll(el);
    fixture.detectChanges();
    await flush(fixture);
    return fixture;
  }

  function rowAt(fixture: ComponentFixture<DirHost>, index: number): HTMLElement | undefined {
    return rowEls(fixture).find((el) => el.getAttribute('data-index') === String(index));
  }

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
  });

  afterEach(() => {
    document.documentElement.removeAttribute('dir');
  });

  it('reflects the resolved direction to the host dir attribute', async () => {
    const fixture = await mount();
    expect(viewportEl(fixture).getAttribute('dir')).toBe('ltr');

    fixture.componentInstance.dir.set('rtl');
    await flush(fixture);
    expect(viewportEl(fixture).getAttribute('dir')).toBe('rtl');
  });

  it('lays horizontal rows out from the right edge once <html dir> flips to rtl at runtime', async () => {
    const fixture = await mount();
    expect(rowAt(fixture, 1)?.style.left).toBe('0px');
    expect(rowAt(fixture, 1)?.style.right).toBe('');
    expect(rowAt(fixture, 1)?.style.transform).toBe('translateX(40px)');

    document.documentElement.setAttribute('dir', 'rtl');
    await flush(fixture);

    expect(viewportEl(fixture).getAttribute('dir')).toBe('rtl');
    expect(rowAt(fixture, 1)?.style.left).toBe('');
    expect(rowAt(fixture, 1)?.style.right).toBe('0px');
    expect(rowAt(fixture, 1)?.style.transform).toBe('translateX(-40px)');

    document.documentElement.setAttribute('dir', 'ltr');
    await flush(fixture);

    expect(rowAt(fixture, 1)?.style.left).toBe('0px');
    expect(rowAt(fixture, 1)?.style.right).toBe('');
    expect(rowAt(fixture, 1)?.style.transform).toBe('translateX(40px)');
  });

  it('advances the window as an rtl scroller scrolls to a negative scrollLeft', async () => {
    const fixture = await mount((host) => host.dir.set('rtl'));
    expect(rowAt(fixture, 0)).toBeDefined();

    const el = viewportEl(fixture);
    el.scrollLeft = -4000;
    el.dispatchEvent(new Event('scroll'));
    await flush(fixture);

    expect(rowAt(fixture, 0)).toBeUndefined();
    expect(rowAt(fixture, 100)?.style.transform).toBe('translateX(-4000px)');
  });

  it('scrollToIndex writes a negative scrollLeft in rtl', async () => {
    const fixture = await mount((host) => host.dir.set('rtl'));

    fixture.componentInstance.viewport().scrollToIndex(50, { align: 'start' });
    await flush(fixture);

    expect(viewportEl(fixture).scrollLeft).toBe(-2000);
    expect(rowAt(fixture, 50)?.style.transform).toBe('translateX(-2000px)');
  });

  it('keeps a vertical list on translateY from the left edge in rtl', async () => {
    const fixture = await mount((host) => {
      host.orientation.set('vertical');
      host.dir.set('rtl');
    });

    expect(rowAt(fixture, 1)?.style.left).toBe('0px');
    expect(rowAt(fixture, 1)?.style.right).toBe('');
    expect(rowAt(fixture, 1)?.style.transform).toBe('translateY(40px)');
  });
});

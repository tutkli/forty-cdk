import { Component, provideZonelessChangeDetection, signal, viewChild } from '@angular/core';
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

  let priorResizeObserver: unknown;
  const appended: HTMLElement[] = [];

  beforeEach(() => {
    RecordingResizeObserver.observed = [];
    RecordingResizeObserver.unobserved = [];
    priorResizeObserver = (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver;
    (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = RecordingResizeObserver;
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
  });

  afterEach(() => {
    (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = priorResizeObserver;
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

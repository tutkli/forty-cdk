import {
  Component,
  type ElementRef,
  PLATFORM_ID,
  computed,
  provideZonelessChangeDetection,
  signal,
  viewChild,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ɵPLATFORM_SERVER_ID } from '@angular/common';

import { flush } from '../../src/test-utils';
import { injectVirtualizer } from './virtualizer';

function fakeLayoutProps(el: HTMLElement, height: number, width = 400): void {
  Object.defineProperty(el, 'offsetHeight', { configurable: true, value: height });
  Object.defineProperty(el, 'offsetWidth', { configurable: true, value: width });
  Object.defineProperty(el, 'clientHeight', { configurable: true, value: height });
  Object.defineProperty(el, 'clientWidth', { configurable: true, value: width });
  Object.defineProperty(el, 'scrollHeight', { configurable: true, value: height * 200 });
  Object.defineProperty(el, 'scrollWidth', { configurable: true, value: width * 200 });
}

@Component({
  selector: 'host-cmp',
  template: `
    <div #scroll style="overflow:auto; height:200px">
      <div [style.height.px]="v.totalSize()" style="position:relative">
        @for (item of v.virtualItems(); track item.key) {
          <div [attr.data-index]="item.index" [style.height.px]="item.size">{{ item.index }}</div>
        }
      </div>
    </div>
  `,
})
class Host {
  readonly count = signal(1000);
  readonly orientation = signal<'vertical' | 'horizontal'>('vertical');
  readonly scrollRef = viewChild<ElementRef<HTMLElement>>('scroll');
  readonly scrollElement = computed(() => this.scrollRef()?.nativeElement ?? null);
  readonly v = injectVirtualizer({
    count: this.count,
    estimateSize: () => 40,
    scrollElement: this.scrollElement,
    overscan: 5,
  });
}

describe('injectVirtualizer', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
  });

  it('shape — returns virtualItems signal, totalSize signal, and three imperative methods', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const { v } = fixture.componentInstance;
    expect(typeof v.virtualItems).toBe('function');
    expect(typeof v.totalSize).toBe('function');
    expect(typeof v.scrollToIndex).toBe('function');
    expect(typeof v.scrollToOffset).toBe('function');
    expect(typeof v.measureElement).toBe('function');
  });

  it('fixed-size totalSize — equals count * estimateSize after flush', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await flush(fixture);
    expect(fixture.componentInstance.v.totalSize()).toBe(40000);
  });

  it('totalSize reacts to count change', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await flush(fixture);
    fixture.componentInstance.count.set(500);
    await flush(fixture);
    expect(fixture.componentInstance.v.totalSize()).toBe(20000);
  });

  it('variable estimate totalSize — sums heterogeneous item sizes', async () => {
    @Component({
      selector: 'variable-host',
      template: `
        <div #scroll style="overflow:auto; height:200px">
          <div [style.height.px]="v.totalSize()">
            @for (item of v.virtualItems(); track item.key) {
              <div [attr.data-index]="item.index">{{ item.index }}</div>
            }
          </div>
        </div>
      `,
    })
    class VariableHost {
      readonly scrollRef = viewChild<ElementRef<HTMLElement>>('scroll');
      readonly scrollElement = computed(() => this.scrollRef()?.nativeElement ?? null);
      readonly v = injectVirtualizer({
        count: signal(20),
        estimateSize: (i) => (i < 10 ? 20 : 50),
        scrollElement: this.scrollElement,
      });
    }

    const fixture = TestBed.createComponent(VariableHost);
    fixture.detectChanges();
    await flush(fixture);
    expect(fixture.componentInstance.v.totalSize()).toBe(10 * 20 + 10 * 50);
  });

  it('virtualItems offsets — items have correct start and size when viewport is visible', async () => {
    const fixture = TestBed.createComponent(Host);
    const el = fixture.nativeElement.querySelector('div') as HTMLElement;
    fakeLayoutProps(el, 200);
    fixture.detectChanges();
    await flush(fixture);
    const items = fixture.componentInstance.v.virtualItems();
    expect(items.length).toBeGreaterThanOrEqual(1);
    expect(items.length).toBeLessThanOrEqual(1000);
    const first = items.find((item) => item.index === 0);
    expect(first).toBeDefined();
    for (const item of items) {
      expect(item.start).toBe(item.index * 40);
      expect(item.size).toBe(40);
    }
  });

  it('getItemKey — item at index 0 gets the custom key when viewport is visible', async () => {
    @Component({
      selector: 'keyed-host',
      template: `
        <div #scroll style="overflow:auto; height:200px">
          <div [style.height.px]="v.totalSize()">
            @for (item of v.virtualItems(); track item.key) {
              <div [attr.data-index]="item.index">{{ item.key }}</div>
            }
          </div>
        </div>
      `,
    })
    class KeyedHost {
      readonly scrollRef = viewChild<ElementRef<HTMLElement>>('scroll');
      readonly scrollElement = computed(() => this.scrollRef()?.nativeElement ?? null);
      readonly v = injectVirtualizer({
        count: signal(100),
        estimateSize: () => 40,
        scrollElement: this.scrollElement,
        getItemKey: (i) => 'row-' + i,
      });
    }

    const fixture = TestBed.createComponent(KeyedHost);
    const el = fixture.nativeElement.querySelector('div') as HTMLElement;
    fakeLayoutProps(el, 200);
    fixture.detectChanges();
    await flush(fixture);
    const items = fixture.componentInstance.v.virtualItems();
    expect(items.length).toBeGreaterThanOrEqual(1);
    const first = items.find((item) => item.index === 0);
    expect(first?.key).toBe('row-0');
  });

  it('scrollToOffset wiring (vertical) — calls scrollTo with top offset', async () => {
    const fixture = TestBed.createComponent(Host);
    const el = fixture.nativeElement.querySelector('div') as HTMLElement;
    fakeLayoutProps(el, 200);
    fixture.detectChanges();
    await flush(fixture);
    const spy = vi.fn();
    el.scrollTo = spy;
    fixture.componentInstance.v.scrollToOffset(120);
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ top: 120 }));
  });

  it('scrollToIndex wiring (align:start, fixed) — scrollTo called with top = index * size', async () => {
    const fixture = TestBed.createComponent(Host);
    const el = fixture.nativeElement.querySelector('div') as HTMLElement;
    fakeLayoutProps(el, 200);
    fixture.detectChanges();
    await flush(fixture);
    const spy = vi.fn();
    el.scrollTo = spy;
    fixture.componentInstance.v.scrollToIndex(10, { align: 'start' });
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ top: 400 }));
  });

  it('horizontal orientation — scrollToOffset calls scrollTo with left offset', async () => {
    @Component({
      selector: 'horiz-host',
      template: `
        <div #scroll style="overflow:auto; width:200px">
          <div [style.width.px]="v.totalSize()">
            @for (item of v.virtualItems(); track item.key) {
              <div [attr.data-index]="item.index">{{ item.index }}</div>
            }
          </div>
        </div>
      `,
    })
    class HorizHost {
      readonly scrollRef = viewChild<ElementRef<HTMLElement>>('scroll');
      readonly scrollElement = computed(() => this.scrollRef()?.nativeElement ?? null);
      readonly v = injectVirtualizer({
        count: signal(100),
        estimateSize: () => 40,
        scrollElement: this.scrollElement,
        orientation: 'horizontal',
      });
    }

    const fixture = TestBed.createComponent(HorizHost);
    const el = fixture.nativeElement.querySelector('div') as HTMLElement;
    Object.defineProperty(el, 'offsetWidth', { configurable: true, value: 200 });
    Object.defineProperty(el, 'offsetHeight', { configurable: true, value: 100 });
    Object.defineProperty(el, 'clientWidth', { configurable: true, value: 200 });
    Object.defineProperty(el, 'clientHeight', { configurable: true, value: 100 });
    Object.defineProperty(el, 'scrollWidth', { configurable: true, value: 4000 });
    Object.defineProperty(el, 'scrollHeight', { configurable: true, value: 100 });
    fixture.detectChanges();
    await flush(fixture);
    const spy = vi.fn();
    el.scrollTo = spy;
    fixture.componentInstance.v.scrollToOffset(120);
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ left: 120 }));
  });

  it('dynamic measurement — measureElement records a larger size and grows totalSize', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await flush(fixture);
    expect(fixture.componentInstance.v.totalSize()).toBe(40000);

    const el = document.createElement('div');
    el.setAttribute('data-index', '0');
    Object.defineProperty(el, 'offsetHeight', { configurable: true, value: 100 });
    Object.defineProperty(el, 'offsetWidth', { configurable: true, value: 100 });
    fixture.componentInstance.v.measureElement(el);
    await flush(fixture);

    expect(fixture.componentInstance.v.totalSize()).toBe(100 + 999 * 40);
  });

  it('range — populated window starts at index 0 and covers the visible items', async () => {
    const fixture = TestBed.createComponent(Host);
    const el = fixture.nativeElement.querySelector('div') as HTMLElement;
    fakeLayoutProps(el, 200);
    fixture.detectChanges();
    await flush(fixture);
    const { v } = fixture.componentInstance;
    const items = v.virtualItems();
    expect(items.length).toBeGreaterThanOrEqual(1);
    expect(v.range()).toEqual([items[0]!.index, items[items.length - 1]!.index + 1]);
    expect(v.range()[0]).toBe(0);
  });

  it('range — empty / zero count returns [0, 0]', async () => {
    @Component({
      selector: 'range-empty-host',
      template: `
        <div #scroll style="overflow:auto; height:200px">
          <div [style.height.px]="v.totalSize()">
            @for (item of v.virtualItems(); track item.key) {
              <div [attr.data-index]="item.index">{{ item.index }}</div>
            }
          </div>
        </div>
      `,
    })
    class RangeEmptyHost {
      readonly scrollRef = viewChild<ElementRef<HTMLElement>>('scroll');
      readonly scrollElement = computed(() => this.scrollRef()?.nativeElement ?? null);
      readonly v = injectVirtualizer({
        count: signal(0),
        estimateSize: () => 40,
        scrollElement: this.scrollElement,
      });
    }

    const fixture = TestBed.createComponent(RangeEmptyHost);
    fixture.detectChanges();
    await flush(fixture);
    expect(fixture.componentInstance.v.range()).toEqual([0, 0]);
  });

  it('empty / zero count — virtualItems is [] and totalSize is 0', async () => {
    @Component({
      selector: 'empty-host',
      template: `
        <div #scroll style="overflow:auto; height:200px">
          <div [style.height.px]="v.totalSize()">
            @for (item of v.virtualItems(); track item.key) {
              <div [attr.data-index]="item.index">{{ item.index }}</div>
            }
          </div>
        </div>
      `,
    })
    class EmptyHost {
      readonly scrollRef = viewChild<ElementRef<HTMLElement>>('scroll');
      readonly scrollElement = computed(() => this.scrollRef()?.nativeElement ?? null);
      readonly v = injectVirtualizer({
        count: signal(0),
        estimateSize: () => 40,
        scrollElement: this.scrollElement,
      });
    }

    const fixture = TestBed.createComponent(EmptyHost);
    fixture.detectChanges();
    await flush(fixture);
    expect(fixture.componentInstance.v.virtualItems()).toEqual([]);
    expect(fixture.componentInstance.v.totalSize()).toBe(0);
  });

  describe('virtualItems memoization', () => {
    it('keeps the same array reference across a notify that leaves the window unchanged', async () => {
      const fixture = TestBed.createComponent(Host);
      const el = fixture.nativeElement.querySelector('div') as HTMLElement;
      fakeLayoutProps(el, 200);
      fixture.detectChanges();
      await flush(fixture);

      const { v, count } = fixture.componentInstance;
      const before = v.virtualItems();
      expect(before.length).toBeGreaterThanOrEqual(1);

      count.set(999);
      await flush(fixture);

      const after = v.virtualItems();
      expect(after).toBe(before);
    });

    it('returns a new array reference when the window actually changes', async () => {
      const fixture = TestBed.createComponent(Host);
      const el = fixture.nativeElement.querySelector('div') as HTMLElement;
      fakeLayoutProps(el, 200);
      fixture.detectChanges();
      await flush(fixture);

      const { v, count } = fixture.componentInstance;
      const before = v.virtualItems();
      expect(before.length).toBeGreaterThan(3);

      count.set(3);
      await flush(fixture);

      const after = v.virtualItems();
      expect(after).not.toBe(before);
      expect(after.length).toBe(3);
    });

    it('keeps range reference-stable when the window is unchanged', async () => {
      const fixture = TestBed.createComponent(Host);
      const el = fixture.nativeElement.querySelector('div') as HTMLElement;
      fakeLayoutProps(el, 200);
      fixture.detectChanges();
      await flush(fixture);

      const { v, count } = fixture.componentInstance;
      const before = v.range();

      count.set(999);
      await flush(fixture);

      expect(v.range()).toBe(before);
    });
  });

  describe('scrollMargin', () => {
    @Component({
      selector: 'margin-host',
      template: `
        <div #scroll style="overflow:auto; height:200px">
          <div [style.height.px]="v.totalSize()" style="position:relative">
            @for (item of v.virtualItems(); track item.key) {
              <div [attr.data-index]="item.index" [style.height.px]="item.size">
                {{ item.index }}
              </div>
            }
          </div>
        </div>
      `,
    })
    class MarginHost {
      readonly scrollRef = viewChild<ElementRef<HTMLElement>>('scroll');
      readonly scrollElement = computed(() => this.scrollRef()?.nativeElement ?? null);
      readonly v = injectVirtualizer({
        count: signal(1000),
        estimateSize: () => 40,
        scrollElement: this.scrollElement,
        overscan: 5,
        scrollMargin: 100,
      });
    }

    it('shifts every item start by the margin', async () => {
      const fixture = TestBed.createComponent(MarginHost);
      const el = fixture.nativeElement.querySelector('div') as HTMLElement;
      fakeLayoutProps(el, 200);
      fixture.detectChanges();
      await flush(fixture);
      const items = fixture.componentInstance.v.virtualItems();
      expect(items.length).toBeGreaterThanOrEqual(1);
      for (const item of items) {
        expect(item.start).toBe(item.index * 40 + 100);
      }
    });

    it('scrollToIndex(align:start) offsets the target by the margin', async () => {
      const fixture = TestBed.createComponent(MarginHost);
      const el = fixture.nativeElement.querySelector('div') as HTMLElement;
      fakeLayoutProps(el, 200);
      fixture.detectChanges();
      await flush(fixture);
      const spy = vi.fn();
      el.scrollTo = spy;
      fixture.componentInstance.v.scrollToIndex(10, { align: 'start' });
      expect(spy).toHaveBeenCalledWith(expect.objectContaining({ top: 500 }));
    });

    it('measurementFor reflects the margin-shifted offset', async () => {
      const fixture = TestBed.createComponent(MarginHost);
      const el = fixture.nativeElement.querySelector('div') as HTMLElement;
      fakeLayoutProps(el, 200);
      fixture.detectChanges();
      await flush(fixture);
      const m = fixture.componentInstance.v.measurementFor(10);
      expect(m!.start).toBe(10 * 40 + 100);
    });

    it('default (no scrollMargin) keeps item 0 at offset 0', async () => {
      const fixture = TestBed.createComponent(Host);
      const el = fixture.nativeElement.querySelector('div') as HTMLElement;
      fakeLayoutProps(el, 200);
      fixture.detectChanges();
      await flush(fixture);
      const first = fixture.componentInstance.v.virtualItems().find((i) => i.index === 0);
      expect(first?.start).toBe(0);
    });
  });

  describe('measurementFor', () => {
    it('returns the measured offset after measureElement grows a row', async () => {
      const fixture = TestBed.createComponent(Host);
      const el = fixture.nativeElement.querySelector('div') as HTMLElement;
      fakeLayoutProps(el, 200);
      fixture.detectChanges();
      await flush(fixture);

      const measured = document.createElement('div');
      measured.setAttribute('data-index', '0');
      Object.defineProperty(measured, 'offsetHeight', { configurable: true, value: 100 });
      Object.defineProperty(measured, 'offsetWidth', { configurable: true, value: 100 });
      fixture.componentInstance.v.measureElement(measured);
      await flush(fixture);

      const item1 = fixture.componentInstance.v.measurementFor(1);
      expect(item1!.start).toBe(100);
    });

    it('returns null for an out-of-range index', async () => {
      const fixture = TestBed.createComponent(Host);
      const el = fixture.nativeElement.querySelector('div') as HTMLElement;
      fakeLayoutProps(el, 200);
      fixture.detectChanges();
      await flush(fixture);
      expect(fixture.componentInstance.v.measurementFor(5000)).toBeNull();
      expect(fixture.componentInstance.v.measurementFor(-1)).toBeNull();
    });
  });

  describe('measureElement(null) sweep (#1387)', () => {
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

    let priorResizeObserver: unknown;
    const appended: HTMLElement[] = [];

    beforeEach(() => {
      RecordingResizeObserver.observed = [];
      RecordingResizeObserver.unobserved = [];
      priorResizeObserver = (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver;
      (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver =
        RecordingResizeObserver;
    });

    afterEach(() => {
      (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = priorResizeObserver;
      for (const el of appended.splice(0)) {
        el.remove();
      }
    });

    async function mount(): Promise<ReturnType<typeof TestBed.createComponent<Host>>> {
      const fixture = TestBed.createComponent(Host);
      const el = fixture.nativeElement.querySelector('div') as HTMLElement;
      fakeLayoutProps(el, 200);
      fixture.detectChanges();
      await flush(fixture);
      return fixture;
    }

    function appendRow(index: number, height = 40): HTMLElement {
      const row = document.createElement('div');
      row.setAttribute('data-index', String(index));
      Object.defineProperty(row, 'offsetHeight', { configurable: true, value: height });
      Object.defineProperty(row, 'offsetWidth', { configurable: true, value: height });
      document.body.appendChild(row);
      appended.push(row);
      return row;
    }

    it('unobserves and evicts a detached measured element', async () => {
      const fixture = await mount();
      const { v } = fixture.componentInstance;

      const row = appendRow(0);
      expect(row.isConnected).toBe(true);
      v.measureElement(row);
      expect(RecordingResizeObserver.observed).toContain(row);

      document.body.removeChild(row);
      expect(row.isConnected).toBe(false);
      v.measureElement(null);
      expect(RecordingResizeObserver.unobserved).toContain(row);
    });

    it('keeps observing a still-connected measured element after a sweep', async () => {
      const fixture = await mount();
      const { v } = fixture.componentInstance;

      const row = appendRow(1);
      v.measureElement(row);
      expect(RecordingResizeObserver.observed).toContain(row);

      v.measureElement(null);
      expect(RecordingResizeObserver.unobserved).not.toContain(row);
    });

    it('does not throw when called with null before any measurement', async () => {
      const fixture = await mount();
      const { v } = fixture.componentInstance;
      expect(() => v.measureElement(null)).not.toThrow();
    });
  });

  describe('SSR empty window', () => {
    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: [
          provideZonelessChangeDetection(),
          { provide: PLATFORM_ID, useValue: ɵPLATFORM_SERVER_ID },
        ],
      });
    });

    it('SSR — virtualItems is [], totalSize is estimate, methods do not throw', () => {
      @Component({
        selector: 'ssr-host',
        template: `
          <div #scroll style="overflow:auto; height:200px">
            @for (item of v.virtualItems(); track item.key) {
              <div [attr.data-index]="item.index">{{ item.index }}</div>
            }
          </div>
        `,
      })
      class SsrHost {
        readonly scrollRef = viewChild<ElementRef<HTMLElement>>('scroll');
        readonly scrollElement = computed(() => this.scrollRef()?.nativeElement ?? null);
        readonly v = injectVirtualizer({
          count: signal(100),
          estimateSize: () => 40,
          scrollElement: this.scrollElement,
        });
      }

      const fixture = TestBed.createComponent(SsrHost);
      fixture.detectChanges();
      const { v } = fixture.componentInstance;
      expect(v.virtualItems()).toEqual([]);
      expect(v.totalSize()).toBe(100 * 40);
      expect(v.range()).toEqual([0, 0]);
      const fakeEl = document.createElement('div');
      const spyScrollTo = vi.fn();
      (fakeEl as HTMLElement & { scrollTo: unknown }).scrollTo = spyScrollTo;
      expect(() => v.scrollToOffset(50)).not.toThrow();
      expect(() => v.scrollToIndex(5)).not.toThrow();
      expect(() => v.measureElement(fakeEl)).not.toThrow();
      expect(() => v.measureElement(null)).not.toThrow();
      expect(v.measurementFor(0)).toBeNull();
      expect(spyScrollTo).not.toHaveBeenCalled();
    });
  });
});

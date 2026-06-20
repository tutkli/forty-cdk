import { Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

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

  it('reacts to a count change (zoneless) — the sizer resizes', async () => {
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

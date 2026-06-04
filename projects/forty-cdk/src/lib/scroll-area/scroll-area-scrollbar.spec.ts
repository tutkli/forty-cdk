import { Component, signal } from '@angular/core';

import { renderHost } from '../../test-utils/render';
import { ForScrollArea } from './scroll-area';
import { ForScrollAreaContent } from './scroll-area-content';
import { ForScrollAreaCorner } from './scroll-area-corner';
import type { ForScrollAreaType } from './scroll-area-context';
import { ForScrollAreaScrollbar } from './scroll-area-scrollbar';
import { ForScrollAreaThumb } from './scroll-area-thumb';
import { ForScrollAreaViewport } from './scroll-area-viewport';

class FakeResizeObserver {
  static instances: FakeResizeObserver[] = [];
  observed: Element[] = [];
  constructor(public cb: ResizeObserverCallback) {
    FakeResizeObserver.instances.push(this);
  }
  observe(el: Element): void {
    this.observed.push(el);
  }
  disconnect(): void {
    this.observed = [];
  }
  unobserve(el: Element): void {
    this.observed = this.observed.filter((e) => e !== el);
  }
  fire(): void {
    this.cb([], this as unknown as ResizeObserver);
  }
}

@Component({
  imports: [
    ForScrollArea,
    ForScrollAreaViewport,
    ForScrollAreaContent,
    ForScrollAreaScrollbar,
    ForScrollAreaThumb,
    ForScrollAreaCorner,
  ],
  template: `
    <div forScrollArea [type]="type()">
      <div forScrollAreaViewport>
        <div forScrollAreaContent style="width: 1000px; height: 1000px;">content</div>
      </div>
      <div forScrollAreaScrollbar orientation="vertical" data-testid="vbar">
        <div forScrollAreaThumb data-testid="vthumb"></div>
      </div>
      <div forScrollAreaScrollbar orientation="horizontal" data-testid="hbar">
        <div forScrollAreaThumb data-testid="hthumb"></div>
      </div>
      <div forScrollAreaCorner data-testid="corner"></div>
    </div>
  `,
})
class ScrollbarHost {
  readonly type = signal<ForScrollAreaType>('auto');
}

function setBoxes(viewport: HTMLElement, scrollWidth = 1000, scrollHeight = 1000) {
  Object.defineProperty(viewport, 'clientWidth', { configurable: true, value: 200 });
  Object.defineProperty(viewport, 'clientHeight', { configurable: true, value: 200 });
  Object.defineProperty(viewport, 'scrollWidth', { configurable: true, value: scrollWidth });
  Object.defineProperty(viewport, 'scrollHeight', { configurable: true, value: scrollHeight });
}

function fireAllObservers(): void {
  for (const ro of FakeResizeObserver.instances) ro.fire();
}

// `renderHost` configures `provideZonelessChangeDetection()`, so every case
// below is the mandatory zoneless coverage — the scrollbar's visibility state
// is signal-derived and flips without Zone.js.
describe('ForScrollAreaScrollbar — inline-display guard (type="auto")', () => {
  let originalRO: typeof ResizeObserver;
  let authorStyle: HTMLStyleElement | null = null;

  beforeEach(() => {
    originalRO = globalThis.ResizeObserver;
    (globalThis as any).ResizeObserver = FakeResizeObserver as any;
    FakeResizeObserver.instances = [];
    document.getElementById('for-scroll-area-hide-native')?.remove();
  });
  afterEach(() => {
    (globalThis as any).ResizeObserver = originalRO;
    authorStyle?.remove();
    authorStyle = null;
  });

  it('forces inline display:none over an author display:flex when the axis has no overflow', () => {
    // Author stylesheet rule a consumer might apply via a class. The inline
    // `display: none` the directive sets must beat this author selector.
    authorStyle = document.createElement('style');
    authorStyle.textContent = '[forScrollAreaScrollbar] { display: flex; }';
    document.head.appendChild(authorStyle);

    const { query, flush } = renderHost(ScrollbarHost);
    flush();

    const viewport = query<HTMLElement>('[forScrollAreaViewport]')!;
    const vbar = query<HTMLElement>('[data-testid="vbar"]')!;

    setBoxes(viewport);
    // No vertical overflow.
    Object.defineProperty(viewport, 'scrollHeight', { configurable: true, value: 200 });
    fireAllObservers();
    flush();

    expect(vbar.hasAttribute('hidden')).toBe(true);
    expect(vbar.style.display).toBe('none');
    expect(getComputedStyle(vbar).display).toBe('none');
  });

  it('removes the inline guard (null) when the axis overflows so the consumer display wins', () => {
    const { query, flush } = renderHost(ScrollbarHost);
    flush();

    const viewport = query<HTMLElement>('[forScrollAreaViewport]')!;
    const vbar = query<HTMLElement>('[data-testid="vbar"]')!;

    setBoxes(viewport);
    fireAllObservers();
    flush();

    expect(vbar.hasAttribute('hidden')).toBe(false);
    expect(vbar.style.display).toBe('');
    expect(getComputedStyle(vbar).display).not.toBe('none');
  });

  it('toggles the inline guard as overflow appears and disappears', () => {
    const { query, flush } = renderHost(ScrollbarHost);
    flush();

    const viewport = query<HTMLElement>('[forScrollAreaViewport]')!;
    const vbar = query<HTMLElement>('[data-testid="vbar"]')!;

    setBoxes(viewport);
    fireAllObservers();
    flush();
    expect(vbar.style.display).toBe('');

    Object.defineProperty(viewport, 'scrollHeight', { configurable: true, value: 200 });
    fireAllObservers();
    flush();
    expect(vbar.style.display).toBe('none');

    Object.defineProperty(viewport, 'scrollHeight', { configurable: true, value: 1000 });
    fireAllObservers();
    flush();
    expect(vbar.style.display).toBe('');
  });
});

// #480 — `type="always"` diverges from `type="auto"`: the track (and corner)
// stay painted and `data-state="visible"` even when the axis does not overflow.
// jsdom returns zeros for geometry, so `hasOverflow()` is false here; the only
// thing keeping the scrollbar painted is the `always` carve-out.
describe('ForScrollAreaScrollbar — type="always" keeps the track painted', () => {
  let originalRO: typeof ResizeObserver;

  beforeEach(() => {
    originalRO = globalThis.ResizeObserver;
    (globalThis as any).ResizeObserver = FakeResizeObserver as any;
    FakeResizeObserver.instances = [];
    document.getElementById('for-scroll-area-hide-native')?.remove();
  });
  afterEach(() => {
    (globalThis as any).ResizeObserver = originalRO;
  });

  it('stays painted and data-state="visible" when the axis does not overflow', () => {
    const { instance, query, flush } = renderHost(ScrollbarHost);
    instance.type.set('always');
    flush();

    const viewport = query<HTMLElement>('[forScrollAreaViewport]')!;
    const vbar = query<HTMLElement>('[data-testid="vbar"]')!;

    // No overflow on either axis (content fits the viewport).
    setBoxes(viewport, 200, 200);
    fireAllObservers();
    flush();

    expect(vbar.hasAttribute('hidden')).toBe(false);
    expect(vbar.style.display).toBe('');
    expect(vbar.getAttribute('data-state')).toBe('visible');
  });

  it('contrast: type="auto" self-hides the same non-overflowing axis', () => {
    const { instance, query, flush } = renderHost(ScrollbarHost);
    instance.type.set('auto');
    flush();

    const viewport = query<HTMLElement>('[forScrollAreaViewport]')!;
    const vbar = query<HTMLElement>('[data-testid="vbar"]')!;

    setBoxes(viewport, 200, 200);
    fireAllObservers();
    flush();

    expect(vbar.hasAttribute('hidden')).toBe(true);
    expect(vbar.style.display).toBe('none');
    expect(vbar.getAttribute('data-state')).toBe('hidden');
  });

  it('keeps the corner visible regardless of overflow', () => {
    const { instance, query, flush } = renderHost(ScrollbarHost);
    instance.type.set('always');
    flush();

    const viewport = query<HTMLElement>('[forScrollAreaViewport]')!;
    const corner = query<HTMLElement>('[data-testid="corner"]')!;

    setBoxes(viewport, 200, 200);
    fireAllObservers();
    flush();

    expect(corner.hasAttribute('hidden')).toBe(false);
    expect(corner.style.display).toBe('');
  });
});

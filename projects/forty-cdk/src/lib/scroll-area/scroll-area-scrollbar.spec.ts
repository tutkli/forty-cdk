import { Component } from '@angular/core';

import { renderHost } from '../../test-utils/render';
import { ForScrollArea } from './scroll-area';
import { ForScrollAreaContent } from './scroll-area-content';
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
  ],
  template: `
    <div forScrollArea type="always">
      <div forScrollAreaViewport>
        <div forScrollAreaContent style="width: 1000px; height: 1000px;">content</div>
      </div>
      <div forScrollAreaScrollbar orientation="vertical" data-testid="vbar">
        <div forScrollAreaThumb data-testid="vthumb"></div>
      </div>
    </div>
  `,
})
class ScrollbarHost {}

function setBoxes(viewport: HTMLElement) {
  Object.defineProperty(viewport, 'clientWidth', { configurable: true, value: 200 });
  Object.defineProperty(viewport, 'clientHeight', { configurable: true, value: 200 });
  Object.defineProperty(viewport, 'scrollWidth', { configurable: true, value: 1000 });
  Object.defineProperty(viewport, 'scrollHeight', { configurable: true, value: 1000 });
}

function fireAllObservers(): void {
  for (const ro of FakeResizeObserver.instances) ro.fire();
}

describe('ForScrollAreaScrollbar — inline-display guard', () => {
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

import { Component, signal } from '@angular/core';

import { renderHost } from '../../test-utils/render';
import { ForScrollArea } from './scroll-area';
import { ForScrollAreaContent } from './scroll-area-content';
import { ForScrollAreaCorner } from './scroll-area-corner';
import { ForScrollAreaScrollbar } from './scroll-area-scrollbar';
import { ForScrollAreaThumb } from './scroll-area-thumb';
import { ForScrollAreaViewport } from './scroll-area-viewport';
import type { ForScrollAreaType } from './scroll-area-context';

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
class ScrollAreaHost {
  readonly type = signal<ForScrollAreaType>('always');
}

@Component({
  imports: [ForScrollArea, ForScrollAreaViewport, ForScrollAreaScrollbar, ForScrollAreaThumb],
  template: `
    <div forScrollArea>
      <div forScrollAreaViewport>
        <div style="width: 1000px; height: 1000px;">content (no directive)</div>
      </div>
      <div forScrollAreaScrollbar orientation="vertical" data-testid="vbar">
        <div forScrollAreaThumb></div>
      </div>
    </div>
  `,
})
class ScrollAreaHostNoContent {}

function setBoxes(viewport: HTMLElement) {
  Object.defineProperty(viewport, 'clientWidth', { configurable: true, value: 200 });
  Object.defineProperty(viewport, 'clientHeight', { configurable: true, value: 200 });
  Object.defineProperty(viewport, 'scrollWidth', { configurable: true, value: 1000 });
  Object.defineProperty(viewport, 'scrollHeight', { configurable: true, value: 1000 });
  Object.defineProperty(viewport, 'scrollLeft', {
    configurable: true,
    get: function () {
      return this.__sl ?? 0;
    },
    set: function (v: number) {
      this.__sl = v;
      this.dispatchEvent(new Event('scroll'));
    },
  });
  Object.defineProperty(viewport, 'scrollTop', {
    configurable: true,
    get: function () {
      return this.__st ?? 0;
    },
    set: function (v: number) {
      this.__st = v;
      this.dispatchEvent(new Event('scroll'));
    },
  });
}

function setScrollbarSize(bar: HTMLElement, length: number, orientation: 'h' | 'v') {
  Object.defineProperty(bar, 'clientWidth', {
    configurable: true,
    value: orientation === 'h' ? length : 8,
  });
  Object.defineProperty(bar, 'clientHeight', {
    configurable: true,
    value: orientation === 'v' ? length : 8,
  });
  // scrollWidth/Height are also read by injectElementSize; mirror them.
  Object.defineProperty(bar, 'scrollWidth', {
    configurable: true,
    value: orientation === 'h' ? length : 8,
  });
  Object.defineProperty(bar, 'scrollHeight', {
    configurable: true,
    value: orientation === 'v' ? length : 8,
  });
}

function fireAllObservers(): void {
  for (const ro of FakeResizeObserver.instances) ro.fire();
}

describe('ForScrollArea', () => {
  let originalRO: typeof ResizeObserver;

  beforeEach(() => {
    originalRO = globalThis.ResizeObserver;

    (globalThis as any).ResizeObserver = FakeResizeObserver as any;
    FakeResizeObserver.instances = [];
    // Reset injected style tag between specs.
    document.getElementById('for-scroll-area-hide-native')?.remove();
  });
  afterEach(() => {
    (globalThis as any).ResizeObserver = originalRO;
    // Defensive: only the scrollHideDelay test installs fake timers, but
    // resetting here keeps a future delay-driven case from leaking across
    // describes if it forgets the per-`it` reset.
    vi.useRealTimers();
  });

  it('injects native-scrollbar-hiding styles once on first viewport mount', () => {
    expect(document.getElementById('for-scroll-area-hide-native')).toBeNull();
    renderHost(ScrollAreaHost);
    expect(document.getElementById('for-scroll-area-hide-native')).not.toBeNull();
  });

  it('always shows scrollbars when type="always" and there is overflow', () => {
    const { query, flush, fixture } = renderHost(ScrollAreaHost);
    flush();

    // Wire fake measurements.
    const viewport = query<HTMLElement>('[forScrollAreaViewport]')!;
    setBoxes(viewport);
    // Trigger size sync via fake ResizeObserver.
    fireAllObservers();
    flush();

    const vbar = query<HTMLElement>('[data-testid="vbar"]')!;
    const hbar = query<HTMLElement>('[data-testid="hbar"]')!;
    expect(vbar.hasAttribute('hidden')).toBe(false);
    expect(hbar.hasAttribute('hidden')).toBe(false);
    expect(vbar.getAttribute('data-state')).toBe('visible');
    expect(hbar.getAttribute('data-state')).toBe('visible');

    // No overflow case
    Object.defineProperty(viewport, 'scrollWidth', { configurable: true, value: 200 });
    Object.defineProperty(viewport, 'scrollHeight', { configurable: true, value: 200 });
    fireAllObservers();
    flush();

    expect(vbar.hasAttribute('hidden')).toBe(true);
    expect(hbar.hasAttribute('hidden')).toBe(true);
    void fixture;
  });

  it('hides scrollbars by default with type="hover" and shows on hover', () => {
    const { query, fixture, flush } = renderHost(ScrollAreaHost);
    fixture.componentInstance.type.set('hover');
    flush();
    const viewport = query<HTMLElement>('[forScrollAreaViewport]')!;
    setBoxes(viewport);
    fireAllObservers();
    flush();

    const vbar = query<HTMLElement>('[data-testid="vbar"]')!;
    expect(vbar.getAttribute('data-state')).toBe('hidden');

    const root = query<HTMLElement>('[forScrollArea]')!;
    root.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true }));
    flush();
    expect(vbar.getAttribute('data-state')).toBe('visible');

    root.dispatchEvent(new PointerEvent('pointerleave', { bubbles: true }));
    flush();
    expect(vbar.getAttribute('data-state')).toBe('hidden');
  });

  it('shows scrollbars during scroll then fades after scrollHideDelay (type="scroll")', () => {
    vi.useFakeTimers();
    const { query, fixture, flush } = renderHost(ScrollAreaHost);
    fixture.componentInstance.type.set('scroll');
    flush();
    const viewport = query<HTMLElement>('[forScrollAreaViewport]')!;
    setBoxes(viewport);
    fireAllObservers();
    flush();

    const vbar = query<HTMLElement>('[data-testid="vbar"]')!;
    expect(vbar.getAttribute('data-state')).toBe('hidden');

    viewport.dispatchEvent(new Event('scroll'));
    flush();
    expect(vbar.getAttribute('data-state')).toBe('visible');

    vi.advanceTimersByTime(600);
    flush();
    expect(vbar.getAttribute('data-state')).toBe('hidden');
  });

  it('positions thumb proportionally to scroll', () => {
    const { query, flush } = renderHost(ScrollAreaHost);
    flush();
    const viewport = query<HTMLElement>('[forScrollAreaViewport]')!;
    const vbar = query<HTMLElement>('[data-testid="vbar"]')!;
    setBoxes(viewport);
    setScrollbarSize(vbar, 200, 'v');
    fireAllObservers();
    flush();

    const vthumb = query<HTMLElement>('[data-testid="vthumb"]')!;
    // Ratio = 200/1000 = 0.2 → thumb size = max(8, floor(200 * 0.2)) = 40
    expect(vthumb.style.height).toBe('40px');
    // Initial scroll = 0 → translateY(0)
    expect(vthumb.style.transform).toBe('translateY(0px)');

    // Scroll halfway: scrollTop = (1000 - 200) / 2 = 400
    viewport.scrollTop = 400;
    flush();
    // offset = 400 / 800 * (200 - 40) = 0.5 * 160 = 80
    expect(vthumb.style.transform).toBe('translateY(80px)');
  });

  it('shows the corner only when both axes overflow', () => {
    const { query, flush } = renderHost(ScrollAreaHost);
    flush();
    const viewport = query<HTMLElement>('[forScrollAreaViewport]')!;
    setBoxes(viewport);
    fireAllObservers();
    flush();

    const corner = query<HTMLElement>('[data-testid="corner"]')!;
    expect(corner.hasAttribute('hidden')).toBe(false);

    // Remove vertical overflow only.
    Object.defineProperty(viewport, 'scrollHeight', { configurable: true, value: 200 });
    fireAllObservers();
    flush();
    expect(corner.hasAttribute('hidden')).toBe(true);
  });

  it('zoneless reactivity reflects scroll changes', () => {
    const { query, flush } = renderHost(ScrollAreaHost);
    flush();
    const viewport = query<HTMLElement>('[forScrollAreaViewport]')!;
    const vbar = query<HTMLElement>('[data-testid="vbar"]')!;
    setBoxes(viewport);
    setScrollbarSize(vbar, 200, 'v');
    fireAllObservers();
    flush();

    const vthumb = query<HTMLElement>('[data-testid="vthumb"]')!;
    expect(vthumb.style.transform).toBe('translateY(0px)');

    viewport.scrollTop = 200;
    flush();
    expect(vthumb.style.transform).not.toBe('translateY(0px)');
  });

  it('observes the [forScrollAreaContent] element so content resizes update geometry', () => {
    const { query, flush } = renderHost(ScrollAreaHost);
    flush();

    const viewport = query<HTMLElement>('[forScrollAreaViewport]')!;
    const content = query<HTMLElement>('[forScrollAreaContent]')!;

    // The viewport should have observed both itself and the registered
    // content element via the ResizeObserver.
    const observed = FakeResizeObserver.instances.flatMap((ro) => ro.observed);
    expect(observed).toContain(viewport);
    expect(observed).toContain(content);

    // Simulate a content resize: bump scrollWidth/scrollHeight, fire RO,
    // and assert the synthetic scrollbar reflects the new overflow.
    setBoxes(viewport);
    fireAllObservers();
    flush();

    const vbar = query<HTMLElement>('[data-testid="vbar"]')!;
    expect(vbar.getAttribute('data-state')).toBe('visible');
  });

  it('renders without [forScrollAreaContent] and skips content observation', () => {
    expect(() => renderHost(ScrollAreaHostNoContent)).not.toThrow();

    // Viewport mounts and is observed, but no content element is registered,
    // so the observer never sees a second target.
    const observed = FakeResizeObserver.instances.flatMap((ro) => ro.observed);
    const viewport = document.querySelector<HTMLElement>('[forScrollAreaViewport]')!;
    expect(observed).toContain(viewport);
    // Exactly one observation per RO instance — the viewport itself.
    for (const ro of FakeResizeObserver.instances) {
      expect(ro.observed.length).toBeLessThanOrEqual(1);
    }
  });
});

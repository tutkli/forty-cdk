import { Component, signal, viewChild } from '@angular/core';

import { installObserverPolyfills, renderHost } from '../../test-utils';
import { ForScrollArea } from './scroll-area';
import { ForScrollAreaContent } from './scroll-area-content';
import { ForScrollAreaCorner } from './scroll-area-corner';
import { ForScrollAreaScrollbar } from './scroll-area-scrollbar';
import { ForScrollAreaThumb } from './scroll-area-thumb';
import { ForScrollAreaViewport } from './scroll-area-viewport';
import type { ForScrollAreaType } from './scroll-area-context';

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

// A bare root with a viewport so the content ResizeObserver wiring runs. The
// root directive instance is surfaced via a `viewChild` so the wiring tests can
// drive `registerContent` / `unregisterContent` / `noteUserScroll` directly —
// these are part of the documented `ForScrollAreaContext`, not private signals.
@Component({
  imports: [ForScrollArea, ForScrollAreaViewport],
  template: `
    <div forScrollArea>
      <div forScrollAreaViewport></div>
    </div>
  `,
})
class ScrollAreaWiringHost {
  readonly root = viewChild.required(ForScrollArea);
}

// Geometry — thumb size / position, overflow-driven visibility, hover / scroll
// fade — is derived from `clientWidth` / `scrollWidth` / `scrollTop`, all of
// which jsdom returns as zeros. Those outcomes are covered against a real
// browser layout in `scroll-area.e2e.ts`; this suite asserts only wiring
// (style injection, observer / scroll-listener attachment, content re-observe,
// the unregister identity guard, and the scroll-hide timer) without faking
// measurements. See testing.md rule #8.
describe('ForScrollArea', () => {
  let restoreObservers: () => void;

  beforeAll(() => {
    restoreObservers = installObserverPolyfills();
  });
  afterAll(() => restoreObservers());

  beforeEach(() => {
    document.getElementById('for-scroll-area-hide-native')?.remove();
  });

  it('injects native-scrollbar-hiding styles once on first viewport mount', () => {
    expect(document.getElementById('for-scroll-area-hide-native')).toBeNull();
    renderHost(ScrollAreaHost);
    expect(document.getElementById('for-scroll-area-hide-native')).not.toBeNull();
  });

  it('mounts the scrollbar / thumb / corner pieces with their roles wired', () => {
    const { query } = renderHost(ScrollAreaHost);

    expect(query('[data-testid="vbar"]')).not.toBeNull();
    expect(query('[data-testid="hbar"]')).not.toBeNull();
    expect(query('[data-testid="vthumb"]')).not.toBeNull();
    expect(query('[data-testid="corner"]')).not.toBeNull();
  });

  it('wires the viewport scroll listener without throwing', () => {
    const { query, flush } = renderHost(ScrollAreaHost);
    flush();

    const viewport = query<HTMLElement>('[forScrollAreaViewport]')!;
    expect(() => {
      viewport.dispatchEvent(new Event('scroll'));
      flush();
    }).not.toThrow();
  });

  it('constructs with a registered [forScrollAreaContent] without throwing', () => {
    expect(() => renderHost(ScrollAreaHost)).not.toThrow();
  });

  it('renders without [forScrollAreaContent] and skips content observation', () => {
    expect(() => renderHost(ScrollAreaHostNoContent)).not.toThrow();
  });

  it('zoneless reactivity: changing [type] does not throw', () => {
    const { fixture, flush } = renderHost(ScrollAreaHost);
    flush();

    expect(() => {
      fixture.componentInstance.type.set('hover');
      flush();
      fixture.componentInstance.type.set('scroll');
      flush();
    }).not.toThrow();
  });

  // The single non-geometry carve-out: `type="always"` short-circuits the
  // scrollbar / corner self-hide so the track stays painted regardless of
  // overflow (Radix parity). jsdom returns zeros for layout, so `hasOverflow()`
  // is always false here — which is exactly why the `always` branch (a literal
  // short-circuit, no measurement) is assertable in Vitest while thumb sizing
  // stays in `scroll-area.e2e.ts`. See testing.md rule #8.
  describe('type="always" keeps the scrollbar visible without overflow', () => {
    it('paints the scrollbar (data-state="visible", not removed) with no overflow under "always"', () => {
      const { query, flush } = renderHost(ScrollAreaHost);
      flush();

      const vbar = query<HTMLElement>('[data-testid="vbar"]')!;
      expect(vbar.getAttribute('data-state')).toBe('visible');
      expect(vbar.hasAttribute('hidden')).toBe(false);
      expect(vbar.style.display).not.toBe('none');

      const corner = query<HTMLElement>('[data-testid="corner"]')!;
      expect(corner.hasAttribute('hidden')).toBe(false);
      expect(corner.style.display).not.toBe('none');
    });

    it('self-hides the scrollbar (data-state="hidden", removed) with no overflow under "hover"', () => {
      const { fixture, query, flush } = renderHost(ScrollAreaHost);
      flush();

      fixture.componentInstance.type.set('hover');
      flush();

      const vbar = query<HTMLElement>('[data-testid="vbar"]')!;
      expect(vbar.getAttribute('data-state')).toBe('hidden');
      expect(vbar.hasAttribute('hidden')).toBe(true);
      expect(vbar.style.display).toBe('none');
    });
  });

  describe('content re-observe (viewport ResizeObserver swap)', () => {
    interface RoCall {
      readonly kind: 'observe' | 'unobserve';
      readonly target: Element;
    }

    let calls: RoCall[];
    let original: typeof ResizeObserver | undefined;

    beforeEach(() => {
      calls = [];
      original = (globalThis as { ResizeObserver?: typeof ResizeObserver }).ResizeObserver;
      class RecordingResizeObserver {
        observe(target: Element): void {
          calls.push({ kind: 'observe', target });
        }
        unobserve(target: Element): void {
          calls.push({ kind: 'unobserve', target });
        }
        disconnect(): void {}
      }
      (globalThis as { ResizeObserver?: typeof ResizeObserver }).ResizeObserver =
        RecordingResizeObserver as unknown as typeof ResizeObserver;
    });

    afterEach(() => {
      if (original) {
        (globalThis as { ResizeObserver?: typeof ResizeObserver }).ResizeObserver = original;
      } else {
        delete (globalThis as { ResizeObserver?: typeof ResizeObserver }).ResizeObserver;
      }
    });

    it('unobserves the previous content and observes the new one when content swaps', async () => {
      const { instance, flush } = renderHost(ScrollAreaWiringHost);
      await flush();

      const root = instance.root();
      const elA = document.createElement('div');
      const elB = document.createElement('div');

      root.registerContent(elA);
      await flush();
      expect(calls).toContainEqual({ kind: 'observe', target: elA });

      calls.length = 0;
      root.registerContent(elB);
      await flush();

      expect(calls).toContainEqual({ kind: 'unobserve', target: elA });
      expect(calls).toContainEqual({ kind: 'observe', target: elB });
    });
  });

  describe('unregisterContent identity guard', () => {
    it('does not clear a freshly registered replacement when an old content piece tears down', async () => {
      const { instance, flush } = renderHost(ScrollAreaWiringHost);
      await flush();

      const root = instance.root();
      const elA = document.createElement('div');
      const elB = document.createElement('div');

      root.registerContent(elA);
      root.registerContent(elB);
      expect(root.content()).toBe(elB);

      // A late teardown of the OLD piece must not blow away the replacement.
      root.unregisterContent(elA);
      expect(root.content()).toBe(elB);

      // Unregistering the element actually tracked still clears it.
      root.unregisterContent(elB);
      expect(root.content()).toBeNull();
    });
  });

  describe('scroll-hide timer', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it('opens a scrolling window that clears after scrollHideDelay', async () => {
      const { instance, flush } = renderHost(ScrollAreaWiringHost);
      await flush();
      const root = instance.root();

      vi.useFakeTimers();
      expect(root.scrolling()).toBe(false);

      root.noteUserScroll();
      expect(root.scrolling()).toBe(true);

      // Default scrollHideDelay is 600 ms (FALLBACK).
      vi.advanceTimersByTime(599);
      expect(root.scrolling()).toBe(true);
      vi.advanceTimersByTime(1);
      expect(root.scrolling()).toBe(false);
    });

    it('coalesces repeated scrolls into a single trailing window', async () => {
      const { instance, flush } = renderHost(ScrollAreaWiringHost);
      await flush();
      const root = instance.root();

      vi.useFakeTimers();
      root.noteUserScroll();
      vi.advanceTimersByTime(400);
      root.noteUserScroll();
      vi.advanceTimersByTime(400);
      // 800 ms since the first scroll, but only 400 ms since the last → still on.
      expect(root.scrolling()).toBe(true);
      vi.advanceTimersByTime(200);
      expect(root.scrolling()).toBe(false);
    });

    it('clears the pending timer on destroy', async () => {
      const { instance, fixture, flush } = renderHost(ScrollAreaWiringHost);
      await flush();
      const root = instance.root();

      vi.useFakeTimers();
      root.noteUserScroll();
      fixture.destroy();

      // The pending timeout was cleared on destroy; advancing past the delay
      // must not fire a stray callback on the destroyed directive.
      expect(() => vi.advanceTimersByTime(1_000)).not.toThrow();
    });
  });
});

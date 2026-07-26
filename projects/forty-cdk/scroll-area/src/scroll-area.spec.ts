import { Component, provideZonelessChangeDetection, signal, viewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { flush, installObserverPolyfills, renderHost } from '../../src/test-utils';
import { ForScrollArea } from './scroll-area';
import { ForScrollAreaContent } from './scroll-area-content';
import { ForScrollAreaCorner } from './scroll-area-corner';
import { ForScrollAreaScrollbar } from './scroll-area-scrollbar';
import { ForScrollAreaThumb } from './scroll-area-thumb';
import { ForScrollAreaViewport } from './scroll-area-viewport';
import type { ForScrollAreaTrackPress, ForScrollAreaType } from './scroll-area-context';

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

@Component({
  imports: [ForScrollArea, ForScrollAreaViewport],
  template: `
    <div forScrollArea>
      <div forScrollAreaViewport [focusable]="focusable()" data-testid="viewport"></div>
    </div>
  `,
})
class ScrollAreaFocusableHost {
  readonly focusable = signal(true);
}

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

@Component({
  imports: [ForScrollArea, ForScrollAreaViewport, ForScrollAreaScrollbar, ForScrollAreaThumb],
  template: `
    <div forScrollArea type="always" [trackPress]="trackPress()">
      <div forScrollAreaViewport data-testid="viewport">
        <div style="width: 1000px; height: 1000px;">content</div>
      </div>
      <div forScrollAreaScrollbar orientation="vertical" data-testid="vbar">
        <div forScrollAreaThumb data-testid="vthumb"></div>
      </div>
    </div>
  `,
})
class ScrollAreaTrackPressHost {
  readonly trackPress = signal<ForScrollAreaTrackPress>('page');
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

  it('wires the viewport scroll listener without throwing', async () => {
    const { query, flush } = renderHost(ScrollAreaHost);
    await flush();

    const viewport = query<HTMLElement>('[forScrollAreaViewport]')!;
    expect(async () => {
      viewport.dispatchEvent(new Event('scroll'));
      await flush();
    }).not.toThrow();
  });

  it('constructs with a registered [forScrollAreaContent] without throwing', () => {
    expect(() => renderHost(ScrollAreaHost)).not.toThrow();
  });

  it('renders without [forScrollAreaContent] and skips content observation', () => {
    expect(() => renderHost(ScrollAreaHostNoContent)).not.toThrow();
  });

  it('zoneless reactivity: changing [type] does not throw', async () => {
    const { fixture, flush } = renderHost(ScrollAreaHost);
    await flush();

    expect(async () => {
      fixture.componentInstance.type.set('hover');
      await flush();
      fixture.componentInstance.type.set('scroll');
      await flush();
    }).not.toThrow();
  });

  // The single non-geometry carve-out: `type="always"` short-circuits the
  // scrollbar / corner self-hide so the track stays painted regardless of
  // overflow. jsdom returns zeros for layout, so `hasOverflow()`
  // is always false here — which is exactly why the `always` branch (a literal
  // short-circuit, no measurement) is assertable in Vitest while thumb sizing
  // stays in `scroll-area.e2e.ts`. See testing.md rule #8.
  describe('type="always" keeps the scrollbar visible without overflow', () => {
    it('paints the scrollbar (data-state="visible", not removed) with no overflow under "always"', async () => {
      const { query, flush } = renderHost(ScrollAreaHost);
      await flush();

      const vbar = query<HTMLElement>('[data-testid="vbar"]')!;
      expect(vbar.getAttribute('data-state')).toBe('visible');
      expect(vbar.hasAttribute('hidden')).toBe(false);
      expect(vbar.style.display).not.toBe('none');

      const corner = query<HTMLElement>('[data-testid="corner"]')!;
      expect(corner.hasAttribute('hidden')).toBe(false);
      expect(corner.style.display).not.toBe('none');
    });

    it('self-hides the scrollbar (data-state="hidden", removed) with no overflow under "hover"', async () => {
      const { fixture, query, flush } = renderHost(ScrollAreaHost);
      await flush();

      fixture.componentInstance.type.set('hover');
      await flush();

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

  describe('viewport keyboard focusability', () => {
    it('emits tabindex="0" on the viewport by default so it is a keyboard tab stop', () => {
      const { query } = renderHost(ScrollAreaHost);
      const viewport = query<HTMLElement>('[forScrollAreaViewport]')!;
      expect(viewport.getAttribute('tabindex')).toBe('0');
    });

    it('removes the tab stop (no tabindex attribute) when [focusable]="false"', async () => {
      const { fixture, query, flush } = renderHost(ScrollAreaFocusableHost);
      const viewport = query<HTMLElement>('[data-testid="viewport"]')!;
      expect(viewport.getAttribute('tabindex')).toBe('0');

      fixture.componentInstance.focusable.set(false);
      await flush();
      expect(viewport.hasAttribute('tabindex')).toBe(false);
    });

    it('zoneless: toggling [focusable] reflects the tabindex without Zone.js', async () => {
      TestBed.configureTestingModule({
        providers: [provideZonelessChangeDetection()],
      });
      const fixture = TestBed.createComponent(ScrollAreaFocusableHost);
      await flush(fixture);

      const viewport = fixture.nativeElement.querySelector(
        '[data-testid="viewport"]',
      ) as HTMLElement;
      expect(viewport.getAttribute('tabindex')).toBe('0');

      fixture.componentInstance.focusable.set(false);
      await flush(fixture);
      expect(viewport.hasAttribute('tabindex')).toBe(false);

      fixture.componentInstance.focusable.set(true);
      await flush(fixture);
      expect(viewport.getAttribute('tabindex')).toBe('0');
    });
  });

  describe('track press (#1392 item 13)', () => {
    const pointer = (type: string, init: PointerEventInit = {}): PointerEvent =>
      new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: 1, ...init });

    const release = (): void => {
      document.dispatchEvent(pointer('pointerup'));
    };

    const stubPointerCapture = (el: HTMLElement): number[] => {
      const captured: number[] = [];
      el.setPointerCapture = (id: number): void => {
        captured.push(id);
      };
      el.hasPointerCapture = (): boolean => false;
      el.releasePointerCapture = (): void => {};
      return captured;
    };

    it('claims a primary-button press on the track so the browser cannot start a text selection', async () => {
      const { query, flush } = renderHost(ScrollAreaTrackPressHost);
      await flush();
      const vbar = query<HTMLElement>('[data-testid="vbar"]')!;
      stubPointerCapture(vbar);

      const down = pointer('pointerdown', { clientY: 100 });
      vbar.dispatchEvent(down);
      release();
      await flush();

      expect(down.defaultPrevented).toBe(true);
    });

    it('leaves a track press untouched when trackPress="none"', async () => {
      const { fixture, query, flush } = renderHost(ScrollAreaTrackPressHost);
      fixture.componentInstance.trackPress.set('none');
      await flush();
      const vbar = query<HTMLElement>('[data-testid="vbar"]')!;
      const captured = stubPointerCapture(vbar);

      const down = pointer('pointerdown', { clientY: 100 });
      vbar.dispatchEvent(down);
      release();
      await flush();

      expect(down.defaultPrevented).toBe(false);
      expect(captured).toEqual([]);
    });

    it('ignores a non-primary-button press on the track', async () => {
      const { query, flush } = renderHost(ScrollAreaTrackPressHost);
      await flush();
      const vbar = query<HTMLElement>('[data-testid="vbar"]')!;
      const captured = stubPointerCapture(vbar);

      const down = pointer('pointerdown', { button: 1, clientY: 100 });
      vbar.dispatchEvent(down);
      release();
      await flush();

      expect(down.defaultPrevented).toBe(false);
      expect(captured).toEqual([]);
    });

    it('does not claim a press that originated on the thumb', async () => {
      const { query, flush } = renderHost(ScrollAreaTrackPressHost);
      await flush();
      const vbar = query<HTMLElement>('[data-testid="vbar"]')!;
      const vthumb = query<HTMLElement>('[data-testid="vthumb"]')!;
      const trackCaptured = stubPointerCapture(vbar);
      const thumbCaptured = stubPointerCapture(vthumb);

      vthumb.dispatchEvent(pointer('pointerdown', { clientY: 100 }));
      release();
      await flush();

      expect(thumbCaptured).toEqual([1]);
      expect(trackCaptured).toEqual([]);
    });

    it('keeps out of a thumb gesture even when the press cannot be default-prevented', async () => {
      const { query, flush } = renderHost(ScrollAreaTrackPressHost);
      await flush();
      const vbar = query<HTMLElement>('[data-testid="vbar"]')!;
      const vthumb = query<HTMLElement>('[data-testid="vthumb"]')!;
      const trackCaptured = stubPointerCapture(vbar);
      const thumbCaptured = stubPointerCapture(vthumb);

      vthumb.dispatchEvent(
        new PointerEvent('pointerdown', { bubbles: true, cancelable: false, pointerId: 1 }),
      );
      release();
      await flush();

      expect(thumbCaptured).toEqual([1]);
      expect(trackCaptured).toEqual([]);
    });

    it('does not claim a press a consumer handler already default-prevented', async () => {
      const { query, flush } = renderHost(ScrollAreaTrackPressHost);
      await flush();
      const vbar = query<HTMLElement>('[data-testid="vbar"]')!;
      const captured = stubPointerCapture(vbar);

      const down = pointer('pointerdown', { clientY: 100 });
      down.preventDefault();
      vbar.dispatchEvent(down);
      release();
      await flush();

      expect(captured).toEqual([]);
    });

    it('detaches the document listeners on pointerup so a later move is inert', async () => {
      const { query, flush } = renderHost(ScrollAreaTrackPressHost);
      await flush();
      const vbar = query<HTMLElement>('[data-testid="vbar"]')!;
      stubPointerCapture(vbar);

      const addSpy = vi.spyOn(document, 'addEventListener');
      const removeSpy = vi.spyOn(document, 'removeEventListener');

      vbar.dispatchEvent(pointer('pointerdown', { clientY: 100 }));
      const moveListener = addSpy.mock.calls.find(([type]) => type === 'pointermove')?.[1];
      expect(moveListener).toBeDefined();

      release();
      await flush();

      expect(
        removeSpy.mock.calls.some(
          ([type, listener]) => type === 'pointermove' && listener === moveListener,
        ),
      ).toBe(true);
      expect(removeSpy.mock.calls.some(([type]) => type === 'pointerup')).toBe(true);
      expect(removeSpy.mock.calls.some(([type]) => type === 'pointercancel')).toBe(true);

      expect(() => document.dispatchEvent(pointer('pointermove', { clientY: 300 }))).not.toThrow();
    });

    describe('repeat timer teardown', () => {
      afterEach(() => {
        vi.useRealTimers();
      });

      it('clears a pending repeat timer when the scroll area is destroyed mid-press', async () => {
        const { fixture, query, flush } = renderHost(ScrollAreaTrackPressHost);
        await flush();
        const vbar = query<HTMLElement>('[data-testid="vbar"]')!;
        stubPointerCapture(vbar);

        vi.useFakeTimers();
        vbar.dispatchEvent(pointer('pointerdown', { clientY: 100 }));
        fixture.destroy();

        expect(() => vi.advanceTimersByTime(2_000)).not.toThrow();
      });
    });

    it('zoneless: a track press under provideZonelessChangeDetection does not throw', async () => {
      TestBed.configureTestingModule({
        providers: [provideZonelessChangeDetection()],
      });
      const fixture = TestBed.createComponent(ScrollAreaTrackPressHost);
      await flush(fixture);

      const vbar = fixture.nativeElement.querySelector('[data-testid="vbar"]') as HTMLElement;
      stubPointerCapture(vbar);

      const down = pointer('pointerdown', { clientY: 100 });
      expect(() => vbar.dispatchEvent(down)).not.toThrow();
      release();
      await flush(fixture);

      expect(down.defaultPrevented).toBe(true);
    });
  });

  describe('zoneless reactivity', () => {
    it('reflects type changes after detectChanges without Zone.js', async () => {
      TestBed.configureTestingModule({
        providers: [provideZonelessChangeDetection()],
      });
      const fixture = TestBed.createComponent(ScrollAreaHost);
      await flush(fixture);

      const vbar = fixture.nativeElement.querySelector('[data-testid="vbar"]') as HTMLElement;
      expect(vbar.getAttribute('data-state')).toBe('visible');

      fixture.componentInstance.type.set('hover');
      await flush(fixture);

      expect(vbar.getAttribute('data-state')).toBe('hidden');
    });
  });
});

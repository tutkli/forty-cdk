import { Component, signal, type Type } from '@angular/core';

import {
  ForCarousel,
  ForCarouselDrag,
  ForCarouselSlide,
  ForCarouselTrack,
  ForCarouselViewport,
} from 'forty-cdk/carousel';
import { ForDrawer, type ForDrawerSnapPoint } from 'forty-cdk/drawer';
import { installObserverPolyfills, withReducedMotion } from 'forty-cdk/testing';
import { ForToast, type ForToastCloseReason } from 'forty-cdk/toast';

import { afterEachOverlayCleanup, flush, renderHost } from '../test-utils';
import { entryPointOf, LIBRARY_CODE } from '../test-utils/source-scan';

const SWIPE_CALL = /(?:^|[^A-Za-z])attachSwipeDismiss\(\{/;
const OWN_PREFERENCE = /\binjectPrefersReducedMotion\b|prefers-reduced-motion/;
const SHARED_POLICY = /\binjectSwipeMotion\(\)/;
const ROUTED_MOVEMENT = /\.follow\(/;

function swipeCallers(sources: ReadonlyMap<string, string> = LIBRARY_CODE): string[] {
  return [...sources]
    .filter(([path, code]) => entryPointOf(path) !== 'core' && SWIPE_CALL.test(code))
    .map(([path]) => path)
    .sort();
}

function violations(path: string, code: string): string[] {
  const found: string[] = [];
  if (OWN_PREFERENCE.test(code)) {
    found.push(`${path} reads prefers-reduced-motion itself instead of through injectSwipeMotion`);
  }
  if (!SHARED_POLICY.test(code)) {
    found.push(`${path} does not resolve the shared policy with injectSwipeMotion()`);
  }
  if (!ROUTED_MOVEMENT.test(code)) {
    found.push(`${path} publishes its movement without SwipeMotion.follow`);
  }
  return found;
}

function dispatchPointer(
  target: HTMLElement,
  type: 'pointerdown' | 'pointermove' | 'pointerup',
  clientX: number,
  clientY: number,
): void {
  target.dispatchEvent(
    new PointerEvent(type, {
      bubbles: true,
      cancelable: true,
      composed: true,
      clientX,
      clientY,
      pointerId: 1,
      pointerType: 'touch',
      button: 0,
    }),
  );
}

@Component({
  imports: [ForDrawer],
  host: { 'data-fixture': 'drawer' },
  template: `
    <div forDrawer [snapPoints]="snaps" [(activeSnapPoint)]="active" ariaLabel="Sheet"></div>
  `,
})
class DrawerHost {
  readonly snaps: ReadonlyArray<ForDrawerSnapPoint> = [0.25, 0.5, 1];
  readonly active = signal<ForDrawerSnapPoint | null>(0.5);
}

@Component({
  imports: [ForToast],
  host: { 'data-fixture': 'toast' },
  template: `
    <div
      forToast
      swipeDirection="right"
      [swipeThreshold]="50"
      [duration]="0"
      (dismiss)="reasons.push($event)"
    >
      Saved
    </div>
  `,
})
class ToastHost {
  readonly reasons: ForToastCloseReason[] = [];
}

@Component({
  imports: [ForCarousel, ForCarouselViewport, ForCarouselTrack, ForCarouselSlide, ForCarouselDrag],
  host: { 'data-fixture': 'carousel' },
  template: `
    <div forCarousel ariaLabel="Slides">
      <div forCarouselViewport forCarouselDrag>
        <div forCarouselTrack>
          <div forCarouselSlide>A</div>
          <div forCarouselSlide>B</div>
          <div forCarouselSlide>C</div>
        </div>
      </div>
    </div>
  `,
})
class CarouselHost {}

interface Adopter {
  readonly name: string;
  readonly host: Type<unknown>;
  readonly run: (el: HTMLElement, settle: () => Promise<void>, host: unknown) => Promise<void>;
}

const ADOPTERS: Readonly<Record<string, Adopter>> = {
  'drawer/src/drawer-drag.ts': {
    name: 'the drawer reaches a larger snap point without following the finger',
    host: DrawerHost,
    run: async (_el, settle, host) => {
      const drawer = document.querySelector<HTMLElement>('[forDrawer]')!;
      dispatchPointer(drawer, 'pointerdown', 0, 100);
      dispatchPointer(drawer, 'pointermove', 0, 90);
      dispatchPointer(drawer, 'pointermove', 0, 0);
      await settle();
      expect(drawer.getAttribute('data-dragging')).toBe('');
      expect(drawer.style.getPropertyValue('--for-drawer-swipe-movement-y')).toBe('0px');

      dispatchPointer(drawer, 'pointerup', 0, 0);
      await settle();
      expect((host as DrawerHost).active()).toBe(1);
    },
  },
  'toast/src/toast.ts': {
    name: 'the toast dismisses on a swipe without following the finger',
    host: ToastHost,
    run: async (el, settle, host) => {
      const toast = el.querySelector<HTMLElement>('[forToast]')!;
      dispatchPointer(toast, 'pointerdown', 0, 0);
      dispatchPointer(toast, 'pointermove', 20, 0);
      await settle();
      expect(toast.getAttribute('data-swipe')).toBe('start');
      expect(toast.style.getPropertyValue('--for-toast-swipe-movement-x')).toBe('0px');

      dispatchPointer(toast, 'pointermove', 60, 0);
      dispatchPointer(toast, 'pointerup', 60, 0);
      await settle();
      expect((host as ToastHost).reasons).toEqual(['swipe']);
      expect(toast.style.getPropertyValue('--for-toast-swipe-movement-x')).toBe('0px');
    },
  },
  'carousel/src/carousel-drag.ts': {
    name: 'the carousel advances on a swipe without following the finger',
    host: CarouselHost,
    run: async (el, settle) => {
      const viewport = el.querySelector<HTMLElement>('[forCarouselViewport]')!;
      const slides = el.querySelectorAll<HTMLElement>('[forCarouselSlide]');
      viewport.getBoundingClientRect = () => new DOMRect(0, 0, 300, 100);
      expect(slides[0]!.getAttribute('data-state')).toBe('active');

      dispatchPointer(viewport, 'pointerdown', 250, 0);
      dispatchPointer(viewport, 'pointermove', 240, 0);
      dispatchPointer(viewport, 'pointermove', 10, 0);
      await settle();
      expect(viewport.getAttribute('data-dragging')).toBe('');
      expect(viewport.style.getPropertyValue('--for-carousel-swipe-movement-x')).toBe('');

      dispatchPointer(viewport, 'pointerup', 10, 0);
      await settle();
      expect(slides[0]!.getAttribute('data-state')).toBe('inactive');
      expect(slides[1]!.getAttribute('data-state')).toBe('active');
    },
  },
};

describe('swipe surfaces follow the shared reduced-motion policy', () => {
  it('derives a live family of swipe callers, each with a behavioural case', () => {
    expect(swipeCallers()).toEqual(Object.keys(ADOPTERS).sort());
  });

  it('reports an own preference read, an unresolved policy and an unrouted movement', () => {
    const sources = new Map([
      [
        'a/src/a.ts',
        'const m = injectSwipeMotion(); const r = injectPrefersReducedMotion(); attachSwipeDismiss({ getDirections: () => (r() ? [] : ["up"]) }); m.follow(1);',
      ],
      ['b/src/b.ts', 'attachSwipeDismiss({ onSwipeMove: (d) => x.set(d.delta.x) });'],
      ['c/src/c.ts', 'const m = injectSwipeMotion(); attachSwipeDismiss({});'],
      ['d/src/d.ts', 'const m = injectSwipeMotion(); attachSwipeDismiss({}); m.follow(px);'],
      ['core/src/e.ts', 'attachSwipeDismiss({});'],
    ]);

    expect(swipeCallers(sources)).toEqual(['a/src/a.ts', 'b/src/b.ts', 'c/src/c.ts', 'd/src/d.ts']);
    expect(swipeCallers(sources).flatMap((path) => violations(path, sources.get(path)!))).toEqual([
      'a/src/a.ts reads prefers-reduced-motion itself instead of through injectSwipeMotion',
      'b/src/b.ts does not resolve the shared policy with injectSwipeMotion()',
      'b/src/b.ts publishes its movement without SwipeMotion.follow',
      'c/src/c.ts publishes its movement without SwipeMotion.follow',
    ]);
  });

  for (const path of swipeCallers()) {
    it(`${path} routes its movement through injectSwipeMotion`, () => {
      expect(violations(path, LIBRARY_CODE.get(path)!)).toEqual([]);
    });
  }

  describe('under prefers-reduced-motion: reduce', () => {
    afterEachOverlayCleanup();

    let restoreObservers: () => void;
    let restoreReducedMotion: () => void;
    beforeEach(() => {
      restoreObservers = installObserverPolyfills();
      restoreReducedMotion = withReducedMotion();
    });
    afterEach(() => {
      restoreReducedMotion();
      restoreObservers();
    });

    for (const [path, adopter] of Object.entries(ADOPTERS)) {
      it(`${adopter.name} (${path})`, async () => {
        const r = renderHost(adopter.host);
        await flush(r.fixture);
        await adopter.run(r.el, () => flush(r.fixture), r.instance);
      });
    }
  });
});

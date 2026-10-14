import { Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { flickVelocity, FLICK_VELOCITY_PX_PER_MS } from 'forty-cdk/core';
import { installObserverPolyfills } from 'forty-cdk/testing';

import { flush, renderHost } from '../../src/test-utils';
import { ForCarousel } from './carousel';
import { ForCarouselDrag, resolveDragIndex } from './carousel-drag';
import { ForCarouselSlide } from './carousel-slide';
import { ForCarouselTrack } from './carousel-track';
import { ForCarouselViewport } from './carousel-viewport';

@Component({
  imports: [ForCarousel, ForCarouselViewport, ForCarouselTrack, ForCarouselSlide, ForCarouselDrag],
  template: `
    <div forCarousel ariaLabel="Test carousel" [orientation]="orientation()">
      <div forCarouselViewport forCarouselDrag [disabled]="dragDisabled()" data-testid="viewport">
        <div forCarouselTrack>
          <div forCarouselSlide>A</div>
          <div forCarouselSlide>B</div>
          <div forCarouselSlide>C</div>
        </div>
      </div>
    </div>
  `,
})
class DragHost {
  readonly orientation = signal<'horizontal' | 'vertical'>('horizontal');
  readonly dragDisabled = signal(false);
}

const viewportEl = (host: HTMLElement) => host.querySelector<HTMLElement>('[forCarouselViewport]')!;

describe('ForCarouselDrag', () => {
  let restoreObservers: () => void;

  beforeAll(() => {
    restoreObservers = installObserverPolyfills();
  });
  afterAll(() => restoreObservers());

  describe('touch-action reflects orientation', () => {
    it('horizontal carousel: viewport has touch-action pan-y', () => {
      const { el } = renderHost(DragHost);
      expect(viewportEl(el).style.touchAction).toBe('pan-y');
    });

    it('vertical carousel: viewport has touch-action pan-x', async () => {
      const { el, instance, fixture } = renderHost(DragHost);
      instance.orientation.set('vertical');
      fixture.detectChanges();
      await Promise.resolve();
      expect(viewportEl(el).style.touchAction).toBe('pan-x');
    });
  });

  describe('disabled removes touch-action', () => {
    it('dragDisabled=true removes touch-action from viewport', () => {
      const { el, instance, fixture } = renderHost(DragHost);
      instance.dragDisabled.set(true);
      fixture.detectChanges();
      expect(viewportEl(el).style.touchAction).toBe('');
    });
  });

  describe('at rest', () => {
    it('viewport has no data-dragging attribute at rest', () => {
      const { el } = renderHost(DragHost);
      expect(viewportEl(el).hasAttribute('data-dragging')).toBe(false);
    });

    it('viewport has no --for-carousel-swipe-movement-* vars at rest', () => {
      const { el } = renderHost(DragHost);
      expect(viewportEl(el).style.getPropertyValue('--for-carousel-swipe-movement-x')).toBe('');
      expect(viewportEl(el).style.getPropertyValue('--for-carousel-swipe-movement-y')).toBe('');
    });
  });

  describe('flick velocity staleness (D: no flick after a long pause)', () => {
    it('a fast flick toward the next slide biases the snap forward', () => {
      const v = flickVelocity(FLICK_VELOCITY_PX_PER_MS, false);
      expect(resolveDragIndex(0, 0.1, v)).toBe(1);
    });

    it('a stale release zeroes the velocity so the snap goes to nearest', () => {
      const v = flickVelocity(FLICK_VELOCITY_PX_PER_MS, true);
      expect(v).toBe(0);
      expect(resolveDragIndex(0, 0.1, v)).toBe(0);
    });

    it('a stale release does not bias a small backward drag either', () => {
      const v = flickVelocity(-FLICK_VELOCITY_PX_PER_MS, true);
      expect(v).toBe(0);
      expect(resolveDragIndex(2, -0.2, v)).toBe(2);
    });

    it('a fresh release keeps its velocity untouched', () => {
      expect(flickVelocity(0.9, false)).toBe(0.9);
      expect(flickVelocity(-0.9, false)).toBe(-0.9);
    });
  });

  describe('reactive updates', () => {
    it('touch-action updates when orientation changes', async () => {
      TestBed.configureTestingModule({
        providers: [provideZonelessChangeDetection()],
      });
      const fixture = TestBed.createComponent(DragHost);
      fixture.detectChanges();
      const host = fixture.nativeElement as HTMLElement;
      const vp = viewportEl(host);

      expect(vp.style.touchAction).toBe('pan-y');

      fixture.componentInstance.orientation.set('vertical');
      fixture.detectChanges();
      await Promise.resolve();

      expect(vp.style.touchAction).toBe('pan-x');
    });
  });
  describe('the gesture is measured from the press', () => {
    function dispatchTouch(
      target: HTMLElement,
      type: 'pointerdown' | 'pointermove',
      clientX: number,
    ): void {
      target.dispatchEvent(
        new PointerEvent(type, {
          bubbles: true,
          cancelable: true,
          composed: true,
          clientX,
          clientY: 0,
          pointerId: 1,
          pointerType: 'touch',
          button: 0,
        }),
      );
    }

    @Component({
      imports: [
        ForCarousel,
        ForCarouselViewport,
        ForCarouselTrack,
        ForCarouselSlide,
        ForCarouselDrag,
      ],
      template: `
        <div forCarousel ariaLabel="Test carousel">
          <div forCarouselViewport forCarouselDrag>
            <div forCarouselTrack>
              <div forCarouselSlide>
                <div data-testid="scroller" style="overflow-x: auto">
                  <div style="width: 300px">Wide</div>
                </div>
              </div>
              <div forCarouselSlide>B</div>
            </div>
          </div>
        </div>
      `,
    })
    class ScrollerHost {}

    it('the arming move counts toward the published displacement', async () => {
      const { el, fixture } = renderHost(DragHost);
      const viewport = viewportEl(el);

      dispatchTouch(viewport, 'pointerdown', 100);
      dispatchTouch(viewport, 'pointermove', 80);
      await flush(fixture);

      expect(viewport.style.getPropertyValue('--for-carousel-swipe-movement-x')).toBe('-20px');
    });

    it('defers to an inner scroller the press landed in after the arming move has left it', async () => {
      const { el, fixture } = renderHost(ScrollerHost);
      const viewport = viewportEl(el);
      const scroller = el.querySelector<HTMLElement>('[data-testid="scroller"]')!;
      Object.defineProperty(scroller, 'scrollWidth', { configurable: true, value: 300 });
      Object.defineProperty(scroller, 'clientWidth', { configurable: true, value: 100 });
      Object.defineProperty(scroller, 'scrollLeft', { configurable: true, value: 50 });

      dispatchTouch(scroller, 'pointerdown', 100);
      dispatchTouch(viewport, 'pointermove', 80);
      await flush(fixture);

      expect(viewport.hasAttribute('data-dragging')).toBe(false);
    });
  });
});

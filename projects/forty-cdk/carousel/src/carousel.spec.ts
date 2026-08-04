import { Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import {
  installObserverPolyfills,
  pressKey,
  renderHost,
  withReducedMotion,
} from '../../src/test-utils';
import {
  assertDataStateContract,
  assertRovingTabindexContract,
} from '../../src/test-utils/contract';
import { ForCarousel } from './carousel';
import { provideForCarouselDefaults } from './carousel-defaults';
import { ForCarouselIndicator } from './carousel-indicator';
import { ForCarouselIndicators } from './carousel-indicators';
import { ForCarouselNext } from './carousel-next';
import { ForCarouselPrevious } from './carousel-previous';
import { ForCarouselRotationControl } from './carousel-rotation-control';
import { ForCarouselSlide } from './carousel-slide';
import { ForCarouselTrack } from './carousel-track';
import { ForCarouselViewport } from './carousel-viewport';

const CAROUSEL_IMPORTS = [
  ForCarousel,
  ForCarouselViewport,
  ForCarouselTrack,
  ForCarouselSlide,
  ForCarouselPrevious,
  ForCarouselNext,
  ForCarouselIndicators,
  ForCarouselIndicator,
  ForCarouselRotationControl,
] as const;

@Component({
  imports: [...CAROUSEL_IMPORTS],
  template: `
    <div
      forCarousel
      [(activeIndex)]="active"
      [loop]="loop()"
      [orientation]="orientation()"
      [dir]="dir()"
      [align]="align()"
      [slidesPerView]="slidesPerView()"
      [containScroll]="containScroll()"
      [ariaLabel]="ariaLabel()"
      [autoplay]="autoplay()"
      [autoplayInterval]="autoplayInterval()"
    >
      <button forCarouselRotationControl data-testid="rotation"></button>
      <button forCarouselPrevious data-testid="prev" aria-label="Previous"></button>
      <div forCarouselViewport data-testid="viewport">
        <div forCarouselTrack data-testid="track">
          @for (s of slides(); track s; let i = $index) {
            <div forCarouselSlide [attr.data-slide]="i">Slide {{ i }}</div>
          }
        </div>
      </div>
      <button forCarouselNext data-testid="next" aria-label="Next"></button>
      <div forCarouselIndicators [ariaLabel]="indicatorsLabel()">
        @for (s of slides(); track s; let i = $index) {
          <button
            forCarouselIndicator
            [attr.data-indicator]="i"
            [disabled]="disabledIndicators().includes(i)"
          ></button>
        }
      </div>
    </div>
  `,
})
class CarouselHost {
  readonly active = signal(0);
  readonly disabledIndicators = signal<readonly number[]>([]);
  readonly loop = signal(false);
  readonly orientation = signal<'horizontal' | 'vertical'>('horizontal');
  readonly dir = signal<'ltr' | 'rtl'>('ltr');
  readonly align = signal<'start' | 'center' | 'end'>('start');
  readonly slidesPerView = signal(1);
  readonly ariaLabel = signal<string | null>('Featured items');
  readonly indicatorsLabel = signal<string | null>('Choose slide');
  readonly slides = signal([0, 1, 2]);
  readonly containScroll = signal(false);
  readonly autoplay = signal(false);
  readonly autoplayInterval = signal(5000);
}

@Component({
  imports: [
    ForCarousel,
    ForCarouselViewport,
    ForCarouselTrack,
    ForCarouselSlide,
    ForCarouselIndicators,
    ForCarouselIndicator,
  ],
  providers: [
    provideForCarouselDefaults({
      slideLabel: (position, total) => `Diapositiva ${position} de ${total}`,
      indicatorLabel: (position) => `Ir a la diapositiva ${position}`,
    }),
  ],
  template: `
    <div forCarousel ariaLabel="Carrusel">
      <div forCarouselViewport>
        <div forCarouselTrack>
          @for (s of slides(); track s; let i = $index) {
            <div
              forCarouselSlide
              [attr.data-slide]="i"
              [ariaLabel]="i === 1 ? slideOverride() : null"
            >
              Slide {{ i }}
            </div>
          }
        </div>
      </div>
      <div forCarouselIndicators>
        @for (s of slides(); track s; let i = $index) {
          <button
            forCarouselIndicator
            [attr.data-indicator]="i"
            [ariaLabel]="i === 1 ? indicatorOverride() : null"
          ></button>
        }
      </div>
    </div>
  `,
})
class LocalizedCarouselHost {
  readonly slides = signal([0, 1, 2]);
  readonly slideOverride = signal<string | null>(null);
  readonly indicatorOverride = signal<string | null>(null);
}

@Component({
  imports: [
    ForCarousel,
    ForCarouselViewport,
    ForCarouselTrack,
    ForCarouselSlide,
    ForCarouselPrevious,
    ForCarouselNext,
  ],
  template: `
    <div forCarousel>
      <button forCarouselPrevious data-testid="prev"></button>
      @if (mounted()) {
        @if (swapped()) {
          <div forCarouselViewport id="vp-b">
            <div forCarouselTrack><div forCarouselSlide>b</div></div>
          </div>
        } @else {
          <div forCarouselViewport id="vp-a">
            <div forCarouselTrack><div forCarouselSlide>a</div></div>
          </div>
        }
      }
      <button forCarouselNext data-testid="next"></button>
    </div>
  `,
})
class ViewportLifecycleHost {
  readonly mounted = signal(true);
  readonly swapped = signal(false);
}

const slide = (host: HTMLElement, i: number) =>
  host.querySelector<HTMLElement>(`[data-slide="${i}"]`)!;

const indicator = (host: HTMLElement, i: number) =>
  host.querySelector<HTMLElement>(`[data-indicator="${i}"]`)!;

const prev = (host: HTMLElement) => host.querySelector<HTMLButtonElement>('[forCarouselPrevious]')!;
const next = (host: HTMLElement) => host.querySelector<HTMLButtonElement>('[forCarouselNext]')!;
const viewport = (host: HTMLElement) => host.querySelector<HTMLElement>('[forCarouselViewport]')!;
const root = (host: HTMLElement) => host.querySelector<HTMLElement>('[forCarousel]')!;
const rotation = (host: HTMLElement) =>
  host.querySelector<HTMLButtonElement>('[forCarouselRotationControl]')!;

const indicators = (host: HTMLElement): HTMLElement[] =>
  Array.from(host.querySelectorAll<HTMLElement>('[forCarouselIndicator]'));

describe('ForCarousel', () => {
  let restoreObservers: () => void;
  beforeAll(() => {
    restoreObservers = installObserverPolyfills();
  });
  afterAll(() => restoreObservers());

  assertDataStateContract({
    vocabulary: ['active', 'inactive'],
    mount: () => {
      const r = renderHost(CarouselHost);
      return {
        pieces: () => ({
          slide: slide(r.el, 0),
          indicator: indicator(r.el, 0),
        }),
        setState: (state) => r.instance.active.set(state === 'active' ? 0 : 1),
        flush: r.flush,
      };
    },
  });

  assertRovingTabindexContract(
    {
      mount: async () => {
        const r = renderHost(CarouselHost);
        await r.flush();
        return { items: indicators(r.el), flush: r.flush };
      },
      mountWithDisabledFirst: async () => {
        const r = renderHost(CarouselHost);
        r.instance.disabledIndicators.set([0]);
        r.instance.active.set(1);
        await r.flush();
        return { items: indicators(r.el), enabledIndices: [1, 2], flush: r.flush };
      },
      mountWithDisabledMiddle: async () => {
        const r = renderHost(CarouselHost);
        r.instance.disabledIndicators.set([1]);
        await r.flush();
        return { items: indicators(r.el), enabledIndices: [0, 2], flush: r.flush };
      },
      mountRtl: async () => {
        const r = renderHost(CarouselHost);
        r.instance.dir.set('rtl');
        await r.flush();
        return { items: indicators(r.el), flush: r.flush };
      },
      mountWithSelection: async () => {
        const r = renderHost(CarouselHost);
        r.instance.active.set(1);
        await r.flush();
        return { items: indicators(r.el), selectedIndices: [1], flush: r.flush };
      },
      mountWithSelectedDisabled: async () => {
        const r = renderHost(CarouselHost);
        r.instance.disabledIndicators.set([2]);
        r.instance.active.set(2);
        await r.flush();
        return {
          items: indicators(r.el),
          enabledIndices: [0, 1],
          selectedIndices: [2],
          flush: r.flush,
        };
      },
    },
    { forwardArrow: 'ArrowRight' },
  );

  describe('static accessibility & wiring', () => {
    it('sets role=group, aria-roledescription=carousel, aria-label on the root', () => {
      const { el } = renderHost(CarouselHost);
      const r = root(el);
      expect(r.getAttribute('role')).toBe('group');
      expect(r.getAttribute('aria-roledescription')).toBe('carousel');
      expect(r.getAttribute('aria-label')).toBe('Featured items');
    });

    it('viewport has aria-live=polite, aria-atomic=false, and a non-empty id', () => {
      const { el } = renderHost(CarouselHost);
      const vp = viewport(el);
      expect(vp.getAttribute('aria-live')).toBe('polite');
      expect(vp.getAttribute('aria-atomic')).toBe('false');
      expect(vp.id).toBeTruthy();
    });

    it('prev and next buttons point aria-controls at the viewport id', () => {
      const { el } = renderHost(CarouselHost);
      const vpId = viewport(el).id;
      expect(prev(el).getAttribute('aria-controls')).toBe(vpId);
      expect(next(el).getAttribute('aria-controls')).toBe(vpId);
    });

    it('each slide has role=group, aria-roledescription=slide, aria-label N of M', () => {
      const { el } = renderHost(CarouselHost);
      for (let i = 0; i < 3; i++) {
        const s = slide(el, i);
        expect(s.getAttribute('role')).toBe('group');
        expect(s.getAttribute('aria-roledescription')).toBe('slide');
        expect(s.getAttribute('aria-label')).toBe(`${i + 1} of 3`);
      }
    });

    it('indicators group has role=group and aria-label', () => {
      const { el } = renderHost(CarouselHost);
      const group = el.querySelector<HTMLElement>('[forCarouselIndicators]')!;
      expect(group.getAttribute('role')).toBe('group');
      expect(group.getAttribute('aria-label')).toBe('Choose slide');
    });

    it('--for-carousel-slide-count CSS var reflects the slide count', () => {
      const { el } = renderHost(CarouselHost);
      const r = root(el);
      expect(r.style.getPropertyValue('--for-carousel-slide-count')).toBe('3');
    });
  });

  describe('slide state (data-state, data-in-view, aria-hidden, inert)', () => {
    it('active slide has data-state=active; inactive slides have data-state=inactive', () => {
      const { el } = renderHost(CarouselHost);
      expect(slide(el, 0).getAttribute('data-state')).toBe('active');
      expect(slide(el, 1).getAttribute('data-state')).toBe('inactive');
      expect(slide(el, 2).getAttribute('data-state')).toBe('inactive');
    });

    it('in-view slide has data-in-view attribute; off-view slides do not', () => {
      const { el } = renderHost(CarouselHost);
      expect(slide(el, 0).hasAttribute('data-in-view')).toBe(true);
      expect(slide(el, 1).hasAttribute('data-in-view')).toBe(false);
      expect(slide(el, 2).hasAttribute('data-in-view')).toBe(false);
    });

    it('off-view slides have aria-hidden=true and inert', () => {
      const { el } = renderHost(CarouselHost);
      expect(slide(el, 1).getAttribute('aria-hidden')).toBe('true');
      expect(slide(el, 1).hasAttribute('inert')).toBe(true);
      expect(slide(el, 0).hasAttribute('aria-hidden')).toBe(false);
      expect(slide(el, 0).hasAttribute('inert')).toBe(false);
    });

    it('slidesPerView=2 marks first two slides in-view', () => {
      const { el, instance, fixture } = renderHost(CarouselHost);
      instance.slidesPerView.set(2);
      fixture.detectChanges();
      expect(slide(el, 0).hasAttribute('data-in-view')).toBe(true);
      expect(slide(el, 1).hasAttribute('data-in-view')).toBe(true);
      expect(slide(el, 2).hasAttribute('data-in-view')).toBe(false);
    });
  });

  describe('prev/next navigation', () => {
    it('clicking next advances the active slide', async () => {
      const { el, flush } = renderHost(CarouselHost);
      next(el).click();
      await flush();
      expect(slide(el, 0).getAttribute('data-state')).toBe('inactive');
      expect(slide(el, 1).getAttribute('data-state')).toBe('active');
      expect(root(el).style.getPropertyValue('--for-carousel-active-index')).toBe('1');
    });

    it('clicking prev moves back', async () => {
      const { el, instance, fixture, flush } = renderHost(CarouselHost);
      instance.active.set(2);
      fixture.detectChanges();
      prev(el).click();
      await flush();
      expect(slide(el, 1).getAttribute('data-state')).toBe('active');
    });

    it('prev reflects aria-disabled + data-disabled at index 0 without loop, never native disabled (#1392)', () => {
      const { el } = renderHost(CarouselHost);
      expect(prev(el).hasAttribute('disabled')).toBe(false);
      expect(prev(el).getAttribute('aria-disabled')).toBe('true');
      expect(prev(el).getAttribute('data-disabled')).toBe('');
    });

    it('next reflects aria-disabled + data-disabled at the last index without loop, never native disabled (#1392)', () => {
      const { el, instance, fixture } = renderHost(CarouselHost);
      instance.active.set(2);
      fixture.detectChanges();
      expect(next(el).hasAttribute('disabled')).toBe(false);
      expect(next(el).getAttribute('aria-disabled')).toBe('true');
      expect(next(el).getAttribute('data-disabled')).toBe('');
    });

    it('with loop neither prev nor next is ever disabled', () => {
      const { el, instance, fixture } = renderHost(CarouselHost);
      instance.loop.set(true);
      fixture.detectChanges();
      expect(prev(el).hasAttribute('disabled')).toBe(false);
      expect(prev(el).getAttribute('aria-disabled')).toBeNull();
      expect(prev(el).hasAttribute('data-disabled')).toBe(false);
      instance.active.set(2);
      fixture.detectChanges();
      expect(next(el).hasAttribute('disabled')).toBe(false);
      expect(next(el).getAttribute('aria-disabled')).toBeNull();
      expect(next(el).hasAttribute('data-disabled')).toBe(false);
    });

    it('a boundary-disabled next is inoperable: clicking does not move the active slide (#1392)', async () => {
      const { el, instance, fixture, flush } = renderHost(CarouselHost);
      instance.active.set(2);
      fixture.detectChanges();
      next(el).click();
      await flush();
      expect(slide(el, 2).getAttribute('data-state')).toBe('active');
      expect(root(el).style.getPropertyValue('--for-carousel-active-index')).toBe('2');
    });

    it('a boundary-disabled prev is inoperable: clicking does not move the active slide (#1392)', async () => {
      const { el, flush } = renderHost(CarouselHost);
      prev(el).click();
      await flush();
      expect(slide(el, 0).getAttribute('data-state')).toBe('active');
      expect(root(el).style.getPropertyValue('--for-carousel-active-index')).toBe('0');
    });

    it('re-enables both channels when the boundary is left', () => {
      const { el, instance, fixture } = renderHost(CarouselHost);
      instance.active.set(2);
      fixture.detectChanges();
      expect(next(el).getAttribute('aria-disabled')).toBe('true');
      instance.active.set(1);
      fixture.detectChanges();
      expect(next(el).getAttribute('aria-disabled')).toBeNull();
      expect(next(el).hasAttribute('data-disabled')).toBe(false);
    });

    it('with loop, next past the last slide wraps to slide 0', async () => {
      const { el, instance, fixture, flush } = renderHost(CarouselHost);
      instance.loop.set(true);
      instance.active.set(2);
      fixture.detectChanges();
      next(el).click();
      await flush();
      expect(slide(el, 0).getAttribute('data-state')).toBe('active');
    });
  });

  describe('viewport registration lifecycle', () => {
    it('unmounting the viewport clears aria-controls on prev and next (#1392)', async () => {
      const { el, instance, flush } = renderHost(ViewportLifecycleHost);
      expect(prev(el).getAttribute('aria-controls')).toBe('vp-a');
      expect(next(el).getAttribute('aria-controls')).toBe('vp-a');
      instance.mounted.set(false);
      await flush();
      expect(prev(el).hasAttribute('aria-controls')).toBe(false);
      expect(next(el).hasAttribute('aria-controls')).toBe(false);
    });

    it('unmounting the viewport stops publishing the measured viewport CSS vars (#1392)', async () => {
      const { el, instance, flush } = renderHost(ViewportLifecycleHost);
      await flush();
      expect(root(el).style.getPropertyValue('--for-carousel-viewport-width')).toBe('0px');
      expect(root(el).style.getPropertyValue('--for-carousel-viewport-height')).toBe('0px');
      instance.mounted.set(false);
      await flush();
      expect(root(el).style.getPropertyValue('--for-carousel-viewport-width')).toBe('');
      expect(root(el).style.getPropertyValue('--for-carousel-viewport-height')).toBe('');
    });

    it('re-mounting a viewport re-wires aria-controls to the new id (#1392)', async () => {
      const { el, instance, flush } = renderHost(ViewportLifecycleHost);
      instance.mounted.set(false);
      await flush();
      instance.swapped.set(true);
      instance.mounted.set(true);
      await flush();
      expect(prev(el).getAttribute('aria-controls')).toBe('vp-b');
      expect(next(el).getAttribute('aria-controls')).toBe('vp-b');
    });

    it('swapping the viewport in place re-points aria-controls at the surviving viewport (#1392)', async () => {
      const { el, instance, flush } = renderHost(ViewportLifecycleHost);
      instance.swapped.set(true);
      await flush();
      expect(prev(el).getAttribute('aria-controls')).toBe('vp-b');
      expect(next(el).getAttribute('aria-controls')).toBe('vp-b');
    });

    it('the surviving viewport keeps publishing the measured CSS vars after a swap', async () => {
      const { el, instance, flush } = renderHost(ViewportLifecycleHost);
      await flush();
      instance.swapped.set(true);
      await flush();
      expect(root(el).style.getPropertyValue('--for-carousel-viewport-width')).toBe('0px');
    });
  });

  describe('offset computation (pure arithmetic — safe in Vitest)', () => {
    it('align=start: offset = -activeIndex * (100/slidesPerView)%', () => {
      const { el, instance, fixture } = renderHost(CarouselHost);
      instance.active.set(1);
      instance.align.set('start');
      instance.slidesPerView.set(1);
      fixture.detectChanges();
      expect(root(el).style.getPropertyValue('--for-carousel-offset')).toBe('-100%');
    });

    it('align=center with slidesPerView=1: offset = -100% + 0 = -100%', () => {
      const { el, instance, fixture } = renderHost(CarouselHost);
      instance.active.set(1);
      instance.align.set('center');
      instance.slidesPerView.set(1);
      fixture.detectChanges();
      expect(root(el).style.getPropertyValue('--for-carousel-offset')).toBe('-100%');
    });

    it('align=center with slidesPerView=2, activeIndex=0: offset = 0 + (100-50)/2 = 25%', () => {
      const { el, instance, fixture } = renderHost(CarouselHost);
      instance.active.set(0);
      instance.align.set('center');
      instance.slidesPerView.set(2);
      fixture.detectChanges();
      expect(root(el).style.getPropertyValue('--for-carousel-offset')).toBe('25%');
    });

    it('align=end with slidesPerView=1, activeIndex=0: offset = 0 + (100-100) = 0%', () => {
      const { el, instance, fixture } = renderHost(CarouselHost);
      instance.active.set(0);
      instance.align.set('end');
      instance.slidesPerView.set(1);
      fixture.detectChanges();
      expect(root(el).style.getPropertyValue('--for-carousel-offset')).toBe('0%');
    });

    it('containScroll=false (default): no clamp — activeIndex=2, slidesPerView=2 produces -100%', () => {
      const { el, instance, fixture } = renderHost(CarouselHost);
      instance.active.set(2);
      instance.align.set('start');
      instance.slidesPerView.set(2);
      instance.containScroll.set(false);
      fixture.detectChanges();
      expect(root(el).style.getPropertyValue('--for-carousel-offset')).toBe('-100%');
    });

    it('containScroll=true: trailing overscroll clamped — activeIndex=2, slidesPerView=2 produces -50%', () => {
      const { el, instance, fixture } = renderHost(CarouselHost);
      instance.active.set(2);
      instance.align.set('start');
      instance.slidesPerView.set(2);
      instance.containScroll.set(true);
      fixture.detectChanges();
      expect(root(el).style.getPropertyValue('--for-carousel-offset')).toBe('-50%');
    });

    it('containScroll=true with loop=true: clamp bypassed — activeIndex=2, slidesPerView=2 produces -100%', () => {
      const { el, instance, fixture } = renderHost(CarouselHost);
      instance.active.set(2);
      instance.align.set('start');
      instance.slidesPerView.set(2);
      instance.containScroll.set(true);
      instance.loop.set(true);
      fixture.detectChanges();
      expect(root(el).style.getPropertyValue('--for-carousel-offset')).toBe('-100%');
    });

    it('containScroll=true with slidesPerView=1: no-op — activeIndex=2 produces -200%', () => {
      const { el, instance, fixture } = renderHost(CarouselHost);
      instance.active.set(2);
      instance.align.set('start');
      instance.slidesPerView.set(1);
      instance.containScroll.set(true);
      fixture.detectChanges();
      expect(root(el).style.getPropertyValue('--for-carousel-offset')).toBe('-200%');
    });

    it('containScroll=true, align=center, activeIndex=0: leading adjust clamped to 0%', () => {
      const { el, instance, fixture } = renderHost(CarouselHost);
      instance.active.set(0);
      instance.align.set('center');
      instance.slidesPerView.set(2);
      instance.containScroll.set(true);
      fixture.detectChanges();
      expect(root(el).style.getPropertyValue('--for-carousel-offset')).toBe('0%');
    });

    it('containScroll=false, align=center, activeIndex=0: center adjust not clamped — 25%', () => {
      const { el, instance, fixture } = renderHost(CarouselHost);
      instance.active.set(0);
      instance.align.set('center');
      instance.slidesPerView.set(2);
      instance.containScroll.set(false);
      fixture.detectChanges();
      expect(root(el).style.getPropertyValue('--for-carousel-offset')).toBe('25%');
    });
  });

  describe('indicator activation', () => {
    it('clicking indicator i sets data-state=active on slide i and aria-current on indicator i', async () => {
      const { el, flush } = renderHost(CarouselHost);
      indicator(el, 2).click();
      await flush();
      expect(slide(el, 2).getAttribute('data-state')).toBe('active');
      expect(indicator(el, 2).getAttribute('aria-current')).toBe('true');
      expect(indicator(el, 0).hasAttribute('aria-current')).toBe(false);
    });

    it('current indicator has data-state=active, others have data-state=inactive', () => {
      const { el } = renderHost(CarouselHost);
      expect(indicator(el, 0).getAttribute('data-state')).toBe('active');
      expect(indicator(el, 1).getAttribute('data-state')).toBe('inactive');
    });
  });

  describe('keyboard navigation (wiring — real focus in E2E)', () => {
    it('ArrowRight on an indicator advances the active index', async () => {
      const { el, flush } = renderHost(CarouselHost);
      indicator(el, 0).focus();
      await flush();
      pressKey(indicator(el, 0), 'ArrowRight');
      await flush();
      expect(slide(el, 1).getAttribute('data-state')).toBe('active');
      expect(root(el).style.getPropertyValue('--for-carousel-active-index')).toBe('1');
    });

    it('ArrowLeft on an indicator moves back', async () => {
      const { el, instance, fixture, flush } = renderHost(CarouselHost);
      instance.active.set(2);
      fixture.detectChanges();
      indicator(el, 2).focus();
      await flush();
      pressKey(indicator(el, 2), 'ArrowLeft');
      await flush();
      expect(slide(el, 1).getAttribute('data-state')).toBe('active');
    });

    it('End jumps to the last slide', async () => {
      const { el, flush } = renderHost(CarouselHost);
      indicator(el, 0).focus();
      await flush();
      pressKey(indicator(el, 0), 'End');
      await flush();
      expect(slide(el, 2).getAttribute('data-state')).toBe('active');
    });

    it('Home jumps to the first slide', async () => {
      const { el, instance, fixture, flush } = renderHost(CarouselHost);
      instance.active.set(2);
      fixture.detectChanges();
      indicator(el, 2).focus();
      await flush();
      pressKey(indicator(el, 2), 'Home');
      await flush();
      expect(slide(el, 0).getAttribute('data-state')).toBe('active');
    });

    it('RTL: ArrowLeft advances (direction swap)', async () => {
      const { el, instance, fixture, flush } = renderHost(CarouselHost);
      instance.dir.set('rtl');
      fixture.detectChanges();
      indicator(el, 0).focus();
      await flush();
      pressKey(indicator(el, 0), 'ArrowLeft');
      await flush();
      expect(slide(el, 1).getAttribute('data-state')).toBe('active');
    });

    it('vertical: ArrowDown advances', async () => {
      const { el, instance, fixture, flush } = renderHost(CarouselHost);
      instance.orientation.set('vertical');
      fixture.detectChanges();
      indicator(el, 0).focus();
      await flush();
      pressKey(indicator(el, 0), 'ArrowDown');
      await flush();
      expect(slide(el, 1).getAttribute('data-state')).toBe('active');
    });
  });

  describe('data-orientation and data-align', () => {
    it('root reflects data-orientation', () => {
      const { el, instance, fixture } = renderHost(CarouselHost);
      expect(root(el).getAttribute('data-orientation')).toBe('horizontal');
      instance.orientation.set('vertical');
      fixture.detectChanges();
      expect(root(el).getAttribute('data-orientation')).toBe('vertical');
    });

    it('root reflects data-align', () => {
      const { el, instance, fixture } = renderHost(CarouselHost);
      expect(root(el).getAttribute('data-align')).toBe('start');
      instance.align.set('center');
      fixture.detectChanges();
      expect(root(el).getAttribute('data-align')).toBe('center');
    });
  });

  describe('used outside [forCarousel]', () => {
    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: [provideZonelessChangeDetection()],
      });
    });

    it('throws a prefixed error from ForCarouselViewport', () => {
      @Component({
        imports: [ForCarouselViewport],
        template: `<div forCarouselViewport></div>`,
      })
      class Orphan {}
      expect(() => TestBed.createComponent(Orphan)).toThrow(
        /\[forty-cdk\/carousel\] ForCarouselViewport must be used inside a \[forCarousel\] element\./,
      );
    });

    it('throws a prefixed error from ForCarouselSlide', () => {
      @Component({
        imports: [ForCarouselSlide],
        template: `<div forCarouselSlide></div>`,
      })
      class Orphan {}
      expect(() => TestBed.createComponent(Orphan)).toThrow(
        /\[forty-cdk\/carousel\] ForCarouselSlide must be used inside a \[forCarousel\] element\./,
      );
    });
  });

  describe('slide registration count', () => {
    it('N forCarouselSlide directives → --for-carousel-slide-count is N', () => {
      @Component({
        imports: [ForCarousel, ForCarouselViewport, ForCarouselTrack, ForCarouselSlide],
        template: `
          <div forCarousel ariaLabel="test">
            <div forCarouselViewport>
              <div forCarouselTrack>
                <div forCarouselSlide>A</div>
                <div forCarouselSlide>B</div>
                <div forCarouselSlide>C</div>
                <div forCarouselSlide>D</div>
                <div forCarouselSlide>E</div>
              </div>
            </div>
          </div>
        `,
      })
      class FiveSlides {}

      const { el } = renderHost(FiveSlides);
      const r = el.querySelector<HTMLElement>('[forCarousel]')!;
      expect(r.style.getPropertyValue('--for-carousel-slide-count')).toBe('5');
      const slides = el.querySelectorAll('[forCarouselSlide]');
      Array.from(slides).forEach((s, i) => {
        expect(s.getAttribute('aria-label')).toBe(`${i + 1} of 5`);
      });
    });
  });

  describe('central label localization (provideForCarouselDefaults)', () => {
    it('localizes the default slide and indicator labels', () => {
      const { el } = renderHost(LocalizedCarouselHost);
      for (let i = 0; i < 3; i++) {
        expect(slide(el, i).getAttribute('aria-label')).toBe(`Diapositiva ${i + 1} de 3`);
        expect(indicator(el, i).getAttribute('aria-label')).toBe(`Ir a la diapositiva ${i + 1}`);
      }
    });

    it('per-element ariaLabel still overrides the localized default', async () => {
      const { el, instance, flush } = renderHost(LocalizedCarouselHost);
      instance.slideOverride.set('Producto destacado');
      instance.indicatorOverride.set('Saltar al destacado');
      await flush();

      expect(slide(el, 1).getAttribute('aria-label')).toBe('Producto destacado');
      expect(indicator(el, 1).getAttribute('aria-label')).toBe('Saltar al destacado');
      expect(slide(el, 0).getAttribute('aria-label')).toBe('Diapositiva 1 de 3');
      expect(indicator(el, 0).getAttribute('aria-label')).toBe('Ir a la diapositiva 1');
    });

    it('localized slide label reflects the live slide count', async () => {
      const { el, instance, flush } = renderHost(LocalizedCarouselHost);
      expect(slide(el, 0).getAttribute('aria-label')).toBe('Diapositiva 1 de 3');

      instance.slides.set([0, 1, 2, 3]);
      await flush();

      expect(slide(el, 0).getAttribute('aria-label')).toBe('Diapositiva 1 de 4');
      expect(slide(el, 3).getAttribute('aria-label')).toBe('Diapositiva 4 de 4');
    });
  });

  describe('indicators tabindex', () => {
    it('after navigating to slide 1, indicator 1 gets tabindex=0', async () => {
      const { el, flush } = renderHost(CarouselHost);
      indicator(el, 0).focus();
      await flush();
      pressKey(indicator(el, 0), 'ArrowRight');
      await flush();
      const all = indicators(el);
      expect(all[1]!.getAttribute('tabindex')).toBe('0');
    });
  });

  describe('indicator/slide count mismatch (dev guard)', () => {
    @Component({
      imports: [
        ForCarousel,
        ForCarouselViewport,
        ForCarouselTrack,
        ForCarouselSlide,
        ForCarouselIndicators,
        ForCarouselIndicator,
      ],
      template: `
        <div forCarousel ariaLabel="test">
          <div forCarouselViewport>
            <div forCarouselTrack>
              @for (s of slides(); track s; let i = $index) {
                <div forCarouselSlide [attr.data-slide]="i">Slide {{ i }}</div>
              }
            </div>
          </div>
          <div forCarouselIndicators>
            @for (d of dots(); track d; let i = $index) {
              <button forCarouselIndicator [attr.data-indicator]="i"></button>
            }
          </div>
        </div>
      `,
    })
    class MismatchHost {
      readonly slides = signal([0, 1, 2, 3]);
      readonly dots = signal([0, 1, 2, 3]);
    }

    it('warns when fewer indicators than slides are rendered', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const { instance, flush } = renderHost(MismatchHost);
      instance.dots.set([0, 1]);
      await flush();

      expect(warn).toHaveBeenCalled();
      expect(warn.mock.calls[0]![0]).toContain('[forty-cdk/carousel]');
    });

    it('does not warn when indicators and slides are 1:1', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const { flush } = renderHost(MismatchHost);
      await flush();

      expect(warn).not.toHaveBeenCalled();
    });

    it('does not warn when no indicators are rendered', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const { instance, flush } = renderHost(MismatchHost);
      instance.dots.set([]);
      await flush();

      expect(warn).not.toHaveBeenCalled();
    });
  });

  describe('rotation control wiring', () => {
    it('default aria-label is "Start automatic slide show" and type=button', () => {
      const { el } = renderHost(CarouselHost);
      const btn = rotation(el);
      expect(btn.getAttribute('aria-label')).toBe('Start automatic slide show');
      expect(btn.getAttribute('type')).toBe('button');
    });

    it('has no aria-pressed attribute', () => {
      const { el } = renderHost(CarouselHost);
      expect(rotation(el).hasAttribute('aria-pressed')).toBe(false);
    });

    it('clicking the control sets playing, label becomes "Stop automatic slide show", root gets data-rotating', async () => {
      const { el, flush } = renderHost(CarouselHost);
      rotation(el).click();
      await flush();
      expect(rotation(el).getAttribute('aria-label')).toBe('Stop automatic slide show');
      expect(rotation(el).getAttribute('data-playing')).toBe('');
      expect(root(el).getAttribute('data-rotating')).toBe('');
      expect(root(el).hasAttribute('data-autoplay')).toBe(false);
    });

    it('clicking again stops playing', async () => {
      const { el, flush } = renderHost(CarouselHost);
      rotation(el).click();
      await flush();
      rotation(el).click();
      await flush();
      expect(rotation(el).getAttribute('aria-label')).toBe('Start automatic slide show');
      expect(rotation(el).hasAttribute('data-playing')).toBe(false);
      expect(root(el).hasAttribute('data-rotating')).toBe(false);
    });

    it('startLabel / stopLabel inputs override defaults', async () => {
      @Component({
        imports: [
          ForCarousel,
          ForCarouselViewport,
          ForCarouselTrack,
          ForCarouselSlide,
          ForCarouselRotationControl,
        ],
        template: `
          <div forCarousel ariaLabel="test">
            <button forCarouselRotationControl startLabel="Play" stopLabel="Stop"></button>
            <div forCarouselViewport>
              <div forCarouselTrack>
                <div forCarouselSlide>A</div>
              </div>
            </div>
          </div>
        `,
      })
      class CustomLabelHost {}

      const { el, flush } = renderHost(CustomLabelHost);
      const btn = el.querySelector<HTMLButtonElement>('[forCarouselRotationControl]')!;
      expect(btn.getAttribute('aria-label')).toBe('Play');
      btn.click();
      await flush();
      expect(btn.getAttribute('aria-label')).toBe('Stop');
    });

    it('unbound labels resolve from provideForCarouselDefaults rotationStartLabel / rotationStopLabel', async () => {
      @Component({
        imports: [
          ForCarousel,
          ForCarouselViewport,
          ForCarouselTrack,
          ForCarouselSlide,
          ForCarouselRotationControl,
        ],
        providers: [
          provideForCarouselDefaults({
            rotationStartLabel: 'Iniciar',
            rotationStopLabel: 'Detener',
          }),
        ],
        template: `
          <div forCarousel ariaLabel="test">
            <button forCarouselRotationControl></button>
            <div forCarouselViewport>
              <div forCarouselTrack>
                <div forCarouselSlide>A</div>
              </div>
            </div>
          </div>
        `,
      })
      class LocalizedRotationHost {}

      const { el, flush } = renderHost(LocalizedRotationHost);
      const btn = el.querySelector<HTMLButtonElement>('[forCarouselRotationControl]')!;
      expect(btn.getAttribute('aria-label')).toBe('Iniciar');
      btn.click();
      await flush();
      expect(btn.getAttribute('aria-label')).toBe('Detener');
    });

    it('startLabel / stopLabel inputs still win over the scope defaults', async () => {
      @Component({
        imports: [
          ForCarousel,
          ForCarouselViewport,
          ForCarouselTrack,
          ForCarouselSlide,
          ForCarouselRotationControl,
        ],
        providers: [
          provideForCarouselDefaults({
            rotationStartLabel: 'Iniciar',
            rotationStopLabel: 'Detener',
          }),
        ],
        template: `
          <div forCarousel ariaLabel="test">
            <button forCarouselRotationControl startLabel="Play" stopLabel="Stop"></button>
            <div forCarouselViewport>
              <div forCarouselTrack>
                <div forCarouselSlide>A</div>
              </div>
            </div>
          </div>
        `,
      })
      class LocalizedOverriddenRotationHost {}

      const { el, flush } = renderHost(LocalizedOverriddenRotationHost);
      const btn = el.querySelector<HTMLButtonElement>('[forCarouselRotationControl]')!;
      expect(btn.getAttribute('aria-label')).toBe('Play');
      btn.click();
      await flush();
      expect(btn.getAttribute('aria-label')).toBe('Stop');
    });

    it('[startLabel]="null" / [stopLabel]="null" emit no aria-label', async () => {
      @Component({
        imports: [
          ForCarousel,
          ForCarouselViewport,
          ForCarouselTrack,
          ForCarouselSlide,
          ForCarouselRotationControl,
        ],
        template: `
          <div forCarousel ariaLabel="test">
            <button forCarouselRotationControl [startLabel]="null" [stopLabel]="null"></button>
            <div forCarouselViewport>
              <div forCarouselTrack>
                <div forCarouselSlide>A</div>
              </div>
            </div>
          </div>
        `,
      })
      class NullLabelRotationHost {}

      const { el, flush } = renderHost(NullLabelRotationHost);
      const btn = el.querySelector<HTMLButtonElement>('[forCarouselRotationControl]')!;
      expect(btn.hasAttribute('aria-label')).toBe(false);
      btn.click();
      await flush();
      expect(btn.hasAttribute('aria-label')).toBe(false);
    });

    it('the rotation control does not adopt a consumer static aria-label', async () => {
      @Component({
        imports: [
          ForCarousel,
          ForCarouselViewport,
          ForCarouselTrack,
          ForCarouselSlide,
          ForCarouselRotationControl,
        ],
        template: `
          <div forCarousel ariaLabel="test">
            <button forCarouselRotationControl aria-label="Consumer name"></button>
            <div forCarouselViewport>
              <div forCarouselTrack>
                <div forCarouselSlide>A</div>
              </div>
            </div>
          </div>
        `,
      })
      class StaticAriaLabelRotationHost {}

      const { el, flush } = renderHost(StaticAriaLabelRotationHost);
      const btn = el.querySelector<HTMLButtonElement>('[forCarouselRotationControl]')!;
      expect(btn.getAttribute('aria-label')).toBe('Start automatic slide show');
      btn.click();
      await flush();
      expect(btn.getAttribute('aria-label')).toBe('Stop automatic slide show');
    });
  });

  describe('auto-start and advancing (fake timers)', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it('autoplay=true: root has data-rotating, control has data-playing, label is "Stop automatic slide show"', async () => {
      vi.useFakeTimers();
      const { el, instance, fixture, flush } = renderHost(CarouselHost);
      instance.autoplay.set(true);
      instance.autoplayInterval.set(3000);
      fixture.detectChanges();
      await flush();
      expect(root(el).getAttribute('data-rotating')).toBe('');
      expect(root(el).getAttribute('data-autoplay')).toBe('');
      expect(rotation(el).getAttribute('data-playing')).toBe('');
      expect(rotation(el).getAttribute('aria-label')).toBe('Stop automatic slide show');
    });

    it('does not advance before the interval elapses', async () => {
      vi.useFakeTimers();
      const { el, instance, fixture, flush } = renderHost(CarouselHost);
      instance.autoplay.set(true);
      instance.autoplayInterval.set(3000);
      fixture.detectChanges();
      await flush();
      vi.advanceTimersByTime(2999);
      await flush();
      expect(slide(el, 0).getAttribute('data-state')).toBe('active');
    });

    it('advances to slide 1 after one full interval', async () => {
      vi.useFakeTimers();
      const { el, instance, fixture, flush } = renderHost(CarouselHost);
      instance.autoplay.set(true);
      instance.autoplayInterval.set(3000);
      fixture.detectChanges();
      await flush();
      vi.advanceTimersByTime(3000);
      await flush();
      expect(slide(el, 1).getAttribute('data-state')).toBe('active');
      expect(root(el).style.getPropertyValue('--for-carousel-active-index')).toBe('1');
    });

    it('wrap without loop: at last slide, advancing wraps to slide 0 (loop=false)', async () => {
      vi.useFakeTimers();
      const { el, instance, fixture, flush } = renderHost(CarouselHost);
      instance.autoplay.set(true);
      instance.autoplayInterval.set(1000);
      instance.active.set(2);
      fixture.detectChanges();
      await flush();
      vi.advanceTimersByTime(1000);
      await flush();
      expect(slide(el, 0).getAttribute('data-state')).toBe('active');
    });

    it('autoplayInterval=0 never advances', async () => {
      vi.useFakeTimers();
      const { el, instance, fixture, flush } = renderHost(CarouselHost);
      instance.autoplay.set(true);
      instance.autoplayInterval.set(0);
      fixture.detectChanges();
      await flush();
      vi.advanceTimersByTime(60000);
      await flush();
      expect(slide(el, 0).getAttribute('data-state')).toBe('active');
    });
  });

  describe('reduced-motion gate', () => {
    let restoreMotion: () => void;

    beforeEach(() => {
      restoreMotion = withReducedMotion();
    });
    afterEach(() => {
      restoreMotion();
      vi.useRealTimers();
    });

    it('autoplay=true under reduced motion: no data-rotating, label is "Start automatic slide show"', async () => {
      vi.useFakeTimers();
      const { el, instance, fixture, flush } = renderHost(CarouselHost);
      instance.autoplay.set(true);
      instance.autoplayInterval.set(1000);
      fixture.detectChanges();
      await flush();
      expect(root(el).hasAttribute('data-rotating')).toBe(false);
      expect(rotation(el).getAttribute('aria-label')).toBe('Start automatic slide show');
      vi.advanceTimersByTime(5000);
      await flush();
      expect(slide(el, 0).getAttribute('data-state')).toBe('active');
    });

    it('explicit click under reduced motion does start rotation', async () => {
      vi.useFakeTimers();
      const { el, instance, fixture, flush } = renderHost(CarouselHost);
      instance.autoplay.set(true);
      instance.autoplayInterval.set(1000);
      fixture.detectChanges();
      await flush();
      rotation(el).click();
      await flush();
      expect(root(el).getAttribute('data-rotating')).toBe('');
      vi.advanceTimersByTime(1000);
      await flush();
      expect(slide(el, 1).getAttribute('data-state')).toBe('active');
    });
  });

  describe('pause on hover / focus (fake timers)', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it('pointerenter on root pauses; root loses data-rotating; viewport aria-live becomes polite', async () => {
      vi.useFakeTimers();
      const { el, instance, fixture, flush } = renderHost(CarouselHost);
      instance.autoplay.set(true);
      instance.autoplayInterval.set(1000);
      fixture.detectChanges();
      await flush();
      root(el).dispatchEvent(new PointerEvent('pointerenter', { bubbles: true }));
      await flush();
      expect(root(el).hasAttribute('data-rotating')).toBe(false);
      expect(viewport(el).getAttribute('aria-live')).toBe('polite');
      vi.advanceTimersByTime(3000);
      await flush();
      expect(slide(el, 0).getAttribute('data-state')).toBe('active');
    });

    it('pointerleave on root resumes; data-rotating restored; viewport aria-live becomes off', async () => {
      vi.useFakeTimers();
      const { el, instance, fixture, flush } = renderHost(CarouselHost);
      instance.autoplay.set(true);
      instance.autoplayInterval.set(1000);
      fixture.detectChanges();
      await flush();
      root(el).dispatchEvent(new PointerEvent('pointerenter', { bubbles: true }));
      await flush();
      root(el).dispatchEvent(new PointerEvent('pointerleave', { bubbles: true }));
      await flush();
      expect(root(el).getAttribute('data-rotating')).toBe('');
      expect(viewport(el).getAttribute('aria-live')).toBe('off');
      vi.advanceTimersByTime(1000);
      await flush();
      expect(slide(el, 1).getAttribute('data-state')).toBe('active');
    });

    it('focusin on root pauses', async () => {
      vi.useFakeTimers();
      const { el, instance, fixture, flush } = renderHost(CarouselHost);
      instance.autoplay.set(true);
      instance.autoplayInterval.set(1000);
      fixture.detectChanges();
      await flush();
      root(el).dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
      await flush();
      expect(root(el).hasAttribute('data-rotating')).toBe(false);
    });

    it('focusout with relatedTarget inside root keeps it paused', async () => {
      vi.useFakeTimers();
      const { el, instance, fixture, flush } = renderHost(CarouselHost);
      instance.autoplay.set(true);
      instance.autoplayInterval.set(1000);
      fixture.detectChanges();
      await flush();
      root(el).dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
      await flush();
      const inner = rotation(el);
      root(el).dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: inner }));
      await flush();
      expect(root(el).hasAttribute('data-rotating')).toBe(false);
    });

    it('focusout with relatedTarget outside root resumes', async () => {
      vi.useFakeTimers();
      const { el, instance, fixture, flush } = renderHost(CarouselHost);
      instance.autoplay.set(true);
      instance.autoplayInterval.set(1000);
      fixture.detectChanges();
      await flush();
      root(el).dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
      await flush();
      const outside = document.createElement('button');
      document.body.appendChild(outside);
      root(el).dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: outside }));
      await flush();
      expect(root(el).getAttribute('data-rotating')).toBe('');
      outside.remove();
    });
  });

  describe('sticky stop', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it('after explicit stop, hover/focus do not restart rotation', async () => {
      vi.useFakeTimers();
      const { el, instance, fixture, flush } = renderHost(CarouselHost);
      instance.autoplay.set(true);
      instance.autoplayInterval.set(1000);
      fixture.detectChanges();
      await flush();
      rotation(el).click();
      await flush();
      expect(root(el).hasAttribute('data-rotating')).toBe(false);
      root(el).dispatchEvent(new PointerEvent('pointerenter', { bubbles: true }));
      root(el).dispatchEvent(new PointerEvent('pointerleave', { bubbles: true }));
      await flush();
      expect(root(el).hasAttribute('data-rotating')).toBe(false);
      vi.advanceTimersByTime(3000);
      await flush();
      expect(slide(el, 0).getAttribute('data-state')).toBe('active');
    });

    it('clicking the control again after sticky stop restarts rotation', async () => {
      vi.useFakeTimers();
      const { el, instance, fixture, flush } = renderHost(CarouselHost);
      instance.autoplay.set(true);
      instance.autoplayInterval.set(1000);
      fixture.detectChanges();
      await flush();
      rotation(el).click();
      await flush();
      rotation(el).click();
      await flush();
      expect(root(el).getAttribute('data-rotating')).toBe('');
      vi.advanceTimersByTime(1000);
      await flush();
      expect(slide(el, 1).getAttribute('data-state')).toBe('active');
    });
  });

  describe('aria-live flip', () => {
    it('stopped (no autoplay): viewport aria-live=polite', () => {
      const { el } = renderHost(CarouselHost);
      expect(viewport(el).getAttribute('aria-live')).toBe('polite');
    });

    it('playing (autoplay=true, not paused): viewport aria-live=off', async () => {
      const { el, instance, fixture, flush } = renderHost(CarouselHost);
      instance.autoplay.set(true);
      fixture.detectChanges();
      await flush();
      expect(viewport(el).getAttribute('aria-live')).toBe('off');
    });

    it('playing but hover-paused: viewport aria-live=polite', async () => {
      const { el, instance, fixture, flush } = renderHost(CarouselHost);
      instance.autoplay.set(true);
      fixture.detectChanges();
      await flush();
      root(el).dispatchEvent(new PointerEvent('pointerenter', { bubbles: true }));
      await flush();
      expect(viewport(el).getAttribute('aria-live')).toBe('polite');
    });
  });

  describe('visibility pause', () => {
    afterEach(() => {
      vi.useRealTimers();
      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        get: () => 'visible',
      });
    });

    function setVisibility(state: 'visible' | 'hidden'): void {
      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        get: () => state,
      });
      document.dispatchEvent(new Event('visibilitychange'));
    }

    it('page hidden pauses the carousel; page visible resumes it', async () => {
      vi.useFakeTimers();
      const { el, instance, fixture, flush } = renderHost(CarouselHost);
      instance.autoplay.set(true);
      instance.autoplayInterval.set(1000);
      fixture.detectChanges();
      await flush();
      setVisibility('hidden');
      await flush();
      expect(root(el).hasAttribute('data-rotating')).toBe(false);
      vi.advanceTimersByTime(5000);
      await flush();
      expect(slide(el, 0).getAttribute('data-state')).toBe('active');
      setVisibility('visible');
      await flush();
      expect(root(el).getAttribute('data-rotating')).toBe('');
      vi.advanceTimersByTime(1000);
      await flush();
      expect(slide(el, 1).getAttribute('data-state')).toBe('active');
    });
  });

  describe('reactive updates (autoplay)', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it('an autoplay interval tick advances the slide', async () => {
      vi.useFakeTimers();
      const { el, instance, fixture, flush } = renderHost(CarouselHost);
      instance.autoplay.set(true);
      instance.autoplayInterval.set(500);
      fixture.detectChanges();
      await flush();
      vi.advanceTimersByTime(500);
      await flush();
      expect(slide(el, 1).getAttribute('data-state')).toBe('active');
    });
  });
});

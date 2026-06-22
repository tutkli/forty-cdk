import { Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import {
  installObserverPolyfills,
  pressKey,
  renderHost,
  withReducedMotion,
} from '../../src/test-utils';
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
          <button forCarouselIndicator [attr.data-indicator]="i"></button>
        }
      </div>
    </div>
  `,
})
class CarouselHost {
  readonly active = signal(0);
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
    it('clicking next advances the active slide', () => {
      const { el, flush } = renderHost(CarouselHost);
      next(el).click();
      flush();
      expect(slide(el, 0).getAttribute('data-state')).toBe('inactive');
      expect(slide(el, 1).getAttribute('data-state')).toBe('active');
      expect(root(el).style.getPropertyValue('--for-carousel-active-index')).toBe('1');
    });

    it('clicking prev moves back', () => {
      const { el, instance, fixture, flush } = renderHost(CarouselHost);
      instance.active.set(2);
      fixture.detectChanges();
      prev(el).click();
      flush();
      expect(slide(el, 1).getAttribute('data-state')).toBe('active');
    });

    it('prev is disabled at index 0 without loop', () => {
      const { el } = renderHost(CarouselHost);
      expect(prev(el).hasAttribute('disabled')).toBe(true);
    });

    it('next is disabled at the last index without loop', () => {
      const { el, instance, fixture } = renderHost(CarouselHost);
      instance.active.set(2);
      fixture.detectChanges();
      expect(next(el).hasAttribute('disabled')).toBe(true);
    });

    it('with loop neither prev nor next is ever disabled', () => {
      const { el, instance, fixture } = renderHost(CarouselHost);
      instance.loop.set(true);
      fixture.detectChanges();
      expect(prev(el).hasAttribute('disabled')).toBe(false);
      instance.active.set(2);
      fixture.detectChanges();
      expect(next(el).hasAttribute('disabled')).toBe(false);
    });

    it('with loop, next past the last slide wraps to slide 0', () => {
      const { el, instance, fixture, flush } = renderHost(CarouselHost);
      instance.loop.set(true);
      instance.active.set(2);
      fixture.detectChanges();
      next(el).click();
      flush();
      expect(slide(el, 0).getAttribute('data-state')).toBe('active');
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
    it('clicking indicator i sets data-state=active on slide i and aria-current on indicator i', () => {
      const { el, flush } = renderHost(CarouselHost);
      indicator(el, 2).click();
      flush();
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
    it('ArrowRight on an indicator advances the active index', () => {
      const { el, flush } = renderHost(CarouselHost);
      indicator(el, 0).focus();
      flush();
      pressKey(indicator(el, 0), 'ArrowRight');
      flush();
      expect(slide(el, 1).getAttribute('data-state')).toBe('active');
      expect(root(el).style.getPropertyValue('--for-carousel-active-index')).toBe('1');
    });

    it('ArrowLeft on an indicator moves back', () => {
      const { el, instance, fixture, flush } = renderHost(CarouselHost);
      instance.active.set(2);
      fixture.detectChanges();
      indicator(el, 2).focus();
      flush();
      pressKey(indicator(el, 2), 'ArrowLeft');
      flush();
      expect(slide(el, 1).getAttribute('data-state')).toBe('active');
    });

    it('End jumps to the last slide', () => {
      const { el, flush } = renderHost(CarouselHost);
      indicator(el, 0).focus();
      flush();
      pressKey(indicator(el, 0), 'End');
      flush();
      expect(slide(el, 2).getAttribute('data-state')).toBe('active');
    });

    it('Home jumps to the first slide', () => {
      const { el, instance, fixture, flush } = renderHost(CarouselHost);
      instance.active.set(2);
      fixture.detectChanges();
      indicator(el, 2).focus();
      flush();
      pressKey(indicator(el, 2), 'Home');
      flush();
      expect(slide(el, 0).getAttribute('data-state')).toBe('active');
    });

    it('RTL: ArrowLeft advances (direction swap)', () => {
      const { el, instance, fixture, flush } = renderHost(CarouselHost);
      instance.dir.set('rtl');
      fixture.detectChanges();
      indicator(el, 0).focus();
      flush();
      pressKey(indicator(el, 0), 'ArrowLeft');
      flush();
      expect(slide(el, 1).getAttribute('data-state')).toBe('active');
    });

    it('vertical: ArrowDown advances', () => {
      const { el, instance, fixture, flush } = renderHost(CarouselHost);
      instance.orientation.set('vertical');
      fixture.detectChanges();
      indicator(el, 0).focus();
      flush();
      pressKey(indicator(el, 0), 'ArrowDown');
      flush();
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

  describe('zoneless reactivity', () => {
    it('clicking next advances data-state without Zone.js', () => {
      const { el, flush } = renderHost(CarouselHost);
      next(el).click();
      flush();
      expect(slide(el, 1).getAttribute('data-state')).toBe('active');
      expect(slide(el, 0).getAttribute('data-state')).toBe('inactive');
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

  describe('indicators tabindex (initial state)', () => {
    it('current indicator (index 0) has tabindex=0; others have tabindex=-1', () => {
      const { el } = renderHost(CarouselHost);
      expect(indicator(el, 0).getAttribute('tabindex')).toBe('0');
      expect(indicator(el, 1).getAttribute('tabindex')).toBe('-1');
      expect(indicator(el, 2).getAttribute('tabindex')).toBe('-1');
    });

    it('after navigating to slide 1, indicator 1 gets tabindex=0', () => {
      const { el, flush } = renderHost(CarouselHost);
      indicator(el, 0).focus();
      flush();
      pressKey(indicator(el, 0), 'ArrowRight');
      flush();
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

    it('clicking the control sets playing, label becomes "Stop automatic slide show", root gets data-rotating', () => {
      const { el, flush } = renderHost(CarouselHost);
      rotation(el).click();
      flush();
      expect(rotation(el).getAttribute('aria-label')).toBe('Stop automatic slide show');
      expect(rotation(el).getAttribute('data-playing')).toBe('');
      expect(root(el).getAttribute('data-rotating')).toBe('');
      expect(root(el).hasAttribute('data-autoplay')).toBe(false);
    });

    it('clicking again stops playing', () => {
      const { el, flush } = renderHost(CarouselHost);
      rotation(el).click();
      flush();
      rotation(el).click();
      flush();
      expect(rotation(el).getAttribute('aria-label')).toBe('Start automatic slide show');
      expect(rotation(el).hasAttribute('data-playing')).toBe(false);
      expect(root(el).hasAttribute('data-rotating')).toBe(false);
    });

    it('startLabel / stopLabel inputs override defaults', () => {
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
      flush();
      expect(btn.getAttribute('aria-label')).toBe('Stop');
    });
  });

  describe('auto-start and advancing (fake timers)', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it('autoplay=true: root has data-rotating, control has data-playing, label is "Stop automatic slide show"', () => {
      vi.useFakeTimers();
      const { el, instance, fixture, flush } = renderHost(CarouselHost);
      instance.autoplay.set(true);
      instance.autoplayInterval.set(3000);
      fixture.detectChanges();
      flush();
      expect(root(el).getAttribute('data-rotating')).toBe('');
      expect(root(el).getAttribute('data-autoplay')).toBe('');
      expect(rotation(el).getAttribute('data-playing')).toBe('');
      expect(rotation(el).getAttribute('aria-label')).toBe('Stop automatic slide show');
    });

    it('does not advance before the interval elapses', () => {
      vi.useFakeTimers();
      const { el, instance, fixture, flush } = renderHost(CarouselHost);
      instance.autoplay.set(true);
      instance.autoplayInterval.set(3000);
      fixture.detectChanges();
      flush();
      vi.advanceTimersByTime(2999);
      flush();
      expect(slide(el, 0).getAttribute('data-state')).toBe('active');
    });

    it('advances to slide 1 after one full interval', () => {
      vi.useFakeTimers();
      const { el, instance, fixture, flush } = renderHost(CarouselHost);
      instance.autoplay.set(true);
      instance.autoplayInterval.set(3000);
      fixture.detectChanges();
      flush();
      vi.advanceTimersByTime(3000);
      flush();
      expect(slide(el, 1).getAttribute('data-state')).toBe('active');
      expect(root(el).style.getPropertyValue('--for-carousel-active-index')).toBe('1');
    });

    it('wrap without loop: at last slide, advancing wraps to slide 0 (loop=false)', () => {
      vi.useFakeTimers();
      const { el, instance, fixture, flush } = renderHost(CarouselHost);
      instance.autoplay.set(true);
      instance.autoplayInterval.set(1000);
      instance.active.set(2);
      fixture.detectChanges();
      flush();
      vi.advanceTimersByTime(1000);
      flush();
      expect(slide(el, 0).getAttribute('data-state')).toBe('active');
    });

    it('autoplayInterval=0 never advances', () => {
      vi.useFakeTimers();
      const { el, instance, fixture, flush } = renderHost(CarouselHost);
      instance.autoplay.set(true);
      instance.autoplayInterval.set(0);
      fixture.detectChanges();
      flush();
      vi.advanceTimersByTime(60000);
      flush();
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

    it('autoplay=true under reduced motion: no data-rotating, label is "Start automatic slide show"', () => {
      vi.useFakeTimers();
      const { el, instance, fixture, flush } = renderHost(CarouselHost);
      instance.autoplay.set(true);
      instance.autoplayInterval.set(1000);
      fixture.detectChanges();
      flush();
      expect(root(el).hasAttribute('data-rotating')).toBe(false);
      expect(rotation(el).getAttribute('aria-label')).toBe('Start automatic slide show');
      vi.advanceTimersByTime(5000);
      flush();
      expect(slide(el, 0).getAttribute('data-state')).toBe('active');
    });

    it('explicit click under reduced motion does start rotation', () => {
      vi.useFakeTimers();
      const { el, instance, fixture, flush } = renderHost(CarouselHost);
      instance.autoplay.set(true);
      instance.autoplayInterval.set(1000);
      fixture.detectChanges();
      flush();
      rotation(el).click();
      flush();
      expect(root(el).getAttribute('data-rotating')).toBe('');
      vi.advanceTimersByTime(1000);
      flush();
      expect(slide(el, 1).getAttribute('data-state')).toBe('active');
    });
  });

  describe('pause on hover / focus (fake timers)', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it('pointerenter on root pauses; root loses data-rotating; viewport aria-live becomes polite', () => {
      vi.useFakeTimers();
      const { el, instance, fixture, flush } = renderHost(CarouselHost);
      instance.autoplay.set(true);
      instance.autoplayInterval.set(1000);
      fixture.detectChanges();
      flush();
      root(el).dispatchEvent(new PointerEvent('pointerenter', { bubbles: true }));
      flush();
      expect(root(el).hasAttribute('data-rotating')).toBe(false);
      expect(viewport(el).getAttribute('aria-live')).toBe('polite');
      vi.advanceTimersByTime(3000);
      flush();
      expect(slide(el, 0).getAttribute('data-state')).toBe('active');
    });

    it('pointerleave on root resumes; data-rotating restored; viewport aria-live becomes off', () => {
      vi.useFakeTimers();
      const { el, instance, fixture, flush } = renderHost(CarouselHost);
      instance.autoplay.set(true);
      instance.autoplayInterval.set(1000);
      fixture.detectChanges();
      flush();
      root(el).dispatchEvent(new PointerEvent('pointerenter', { bubbles: true }));
      flush();
      root(el).dispatchEvent(new PointerEvent('pointerleave', { bubbles: true }));
      flush();
      expect(root(el).getAttribute('data-rotating')).toBe('');
      expect(viewport(el).getAttribute('aria-live')).toBe('off');
      vi.advanceTimersByTime(1000);
      flush();
      expect(slide(el, 1).getAttribute('data-state')).toBe('active');
    });

    it('focusin on root pauses', () => {
      vi.useFakeTimers();
      const { el, instance, fixture, flush } = renderHost(CarouselHost);
      instance.autoplay.set(true);
      instance.autoplayInterval.set(1000);
      fixture.detectChanges();
      flush();
      root(el).dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
      flush();
      expect(root(el).hasAttribute('data-rotating')).toBe(false);
    });

    it('focusout with relatedTarget inside root keeps it paused', () => {
      vi.useFakeTimers();
      const { el, instance, fixture, flush } = renderHost(CarouselHost);
      instance.autoplay.set(true);
      instance.autoplayInterval.set(1000);
      fixture.detectChanges();
      flush();
      root(el).dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
      flush();
      const inner = rotation(el);
      root(el).dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: inner }));
      flush();
      expect(root(el).hasAttribute('data-rotating')).toBe(false);
    });

    it('focusout with relatedTarget outside root resumes', () => {
      vi.useFakeTimers();
      const { el, instance, fixture, flush } = renderHost(CarouselHost);
      instance.autoplay.set(true);
      instance.autoplayInterval.set(1000);
      fixture.detectChanges();
      flush();
      root(el).dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
      flush();
      const outside = document.createElement('button');
      document.body.appendChild(outside);
      root(el).dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: outside }));
      flush();
      expect(root(el).getAttribute('data-rotating')).toBe('');
      outside.remove();
    });
  });

  describe('sticky stop', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it('after explicit stop, hover/focus do not restart rotation', () => {
      vi.useFakeTimers();
      const { el, instance, fixture, flush } = renderHost(CarouselHost);
      instance.autoplay.set(true);
      instance.autoplayInterval.set(1000);
      fixture.detectChanges();
      flush();
      rotation(el).click();
      flush();
      expect(root(el).hasAttribute('data-rotating')).toBe(false);
      root(el).dispatchEvent(new PointerEvent('pointerenter', { bubbles: true }));
      root(el).dispatchEvent(new PointerEvent('pointerleave', { bubbles: true }));
      flush();
      expect(root(el).hasAttribute('data-rotating')).toBe(false);
      vi.advanceTimersByTime(3000);
      flush();
      expect(slide(el, 0).getAttribute('data-state')).toBe('active');
    });

    it('clicking the control again after sticky stop restarts rotation', () => {
      vi.useFakeTimers();
      const { el, instance, fixture, flush } = renderHost(CarouselHost);
      instance.autoplay.set(true);
      instance.autoplayInterval.set(1000);
      fixture.detectChanges();
      flush();
      rotation(el).click();
      flush();
      rotation(el).click();
      flush();
      expect(root(el).getAttribute('data-rotating')).toBe('');
      vi.advanceTimersByTime(1000);
      flush();
      expect(slide(el, 1).getAttribute('data-state')).toBe('active');
    });
  });

  describe('aria-live flip', () => {
    it('stopped (no autoplay): viewport aria-live=polite', () => {
      const { el } = renderHost(CarouselHost);
      expect(viewport(el).getAttribute('aria-live')).toBe('polite');
    });

    it('playing (autoplay=true, not paused): viewport aria-live=off', () => {
      const { el, instance, fixture, flush } = renderHost(CarouselHost);
      instance.autoplay.set(true);
      fixture.detectChanges();
      flush();
      expect(viewport(el).getAttribute('aria-live')).toBe('off');
    });

    it('playing but hover-paused: viewport aria-live=polite', () => {
      const { el, instance, fixture, flush } = renderHost(CarouselHost);
      instance.autoplay.set(true);
      fixture.detectChanges();
      flush();
      root(el).dispatchEvent(new PointerEvent('pointerenter', { bubbles: true }));
      flush();
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

    it('page hidden pauses the carousel; page visible resumes it', () => {
      vi.useFakeTimers();
      const { el, instance, fixture, flush } = renderHost(CarouselHost);
      instance.autoplay.set(true);
      instance.autoplayInterval.set(1000);
      fixture.detectChanges();
      flush();
      setVisibility('hidden');
      flush();
      expect(root(el).hasAttribute('data-rotating')).toBe(false);
      vi.advanceTimersByTime(5000);
      flush();
      expect(slide(el, 0).getAttribute('data-state')).toBe('active');
      setVisibility('visible');
      flush();
      expect(root(el).getAttribute('data-rotating')).toBe('');
      vi.advanceTimersByTime(1000);
      flush();
      expect(slide(el, 1).getAttribute('data-state')).toBe('active');
    });
  });

  describe('zoneless reactivity (autoplay)', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it('setInterval tick advances the slide without Zone.js', () => {
      vi.useFakeTimers();
      const { el, instance, fixture, flush } = renderHost(CarouselHost);
      instance.autoplay.set(true);
      instance.autoplayInterval.set(500);
      fixture.detectChanges();
      flush();
      vi.advanceTimersByTime(500);
      flush();
      expect(slide(el, 1).getAttribute('data-state')).toBe('active');
    });
  });
});

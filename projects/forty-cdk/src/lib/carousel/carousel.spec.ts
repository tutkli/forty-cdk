import { Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { installObserverPolyfills, pressKey, renderHost } from '../../test-utils';
import { ForCarousel } from './carousel';
import { ForCarouselIndicator } from './carousel-indicator';
import { ForCarouselIndicators } from './carousel-indicators';
import { ForCarouselNext } from './carousel-next';
import { ForCarouselPrevious } from './carousel-previous';
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
      [ariaLabel]="ariaLabel()"
    >
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
}

const slide = (host: HTMLElement, i: number) =>
  host.querySelector<HTMLElement>(`[data-slide="${i}"]`)!;

const indicator = (host: HTMLElement, i: number) =>
  host.querySelector<HTMLElement>(`[data-indicator="${i}"]`)!;

const prev = (host: HTMLElement) => host.querySelector<HTMLButtonElement>('[forCarouselPrevious]')!;
const next = (host: HTMLElement) => host.querySelector<HTMLButtonElement>('[forCarouselNext]')!;
const viewport = (host: HTMLElement) => host.querySelector<HTMLElement>('[forCarouselViewport]')!;
const root = (host: HTMLElement) => host.querySelector<HTMLElement>('[forCarousel]')!;

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
});

import { Component, Directive } from '@angular/core';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { installObserverPolyfills, renderHost } from '../../src/test-utils';

import { ForCarousel } from './carousel';
import { FOR_CAROUSEL_CONTEXT } from './carousel-context';
import { ForCarouselIndicator } from './carousel-indicator';
import { ForCarouselIndicators } from './carousel-indicators';
import { ForCarouselNext } from './carousel-next';
import { ForCarouselSlide } from './carousel-slide';
import { ForCarouselTrack } from './carousel-track';
import { ForCarouselViewport } from './carousel-viewport';

@Directive({
  selector: '[wrapperCarousel]',
  exportAs: 'wrapperCarousel',
  providers: [{ provide: FOR_CAROUSEL_CONTEXT, useExisting: WrapperCarousel }],
  host: { class: 'wrapper-carousel' },
})
class WrapperCarousel extends ForCarousel {}

@Directive({ selector: '[wrapperCarouselViewport]', hostDirectives: [ForCarouselViewport] })
class WrapperCarouselViewport {}

@Directive({ selector: '[wrapperCarouselTrack]', hostDirectives: [ForCarouselTrack] })
class WrapperCarouselTrack {}

@Directive({ selector: '[wrapperCarouselSlide]', hostDirectives: [ForCarouselSlide] })
class WrapperCarouselSlide {}

@Directive({ selector: '[wrapperCarouselNext]', hostDirectives: [ForCarouselNext] })
class WrapperCarouselNext {}

@Directive({ selector: '[wrapperCarouselIndicators]', hostDirectives: [ForCarouselIndicators] })
class WrapperCarouselIndicators {}

@Directive({ selector: '[wrapperCarouselIndicator]', hostDirectives: [ForCarouselIndicator] })
class WrapperCarouselIndicator {}

@Component({
  imports: [
    WrapperCarousel,
    WrapperCarouselViewport,
    WrapperCarouselTrack,
    WrapperCarouselSlide,
    WrapperCarouselNext,
    WrapperCarouselIndicators,
    WrapperCarouselIndicator,
  ],
  template: `
    <div wrapperCarousel>
      <div wrapperCarouselViewport data-testid="viewport">
        <div wrapperCarouselTrack>
          <div wrapperCarouselSlide data-testid="slide-0">One</div>
          <div wrapperCarouselSlide data-testid="slide-1">Two</div>
        </div>
      </div>
      <button wrapperCarouselNext data-testid="next">Next</button>
      <div wrapperCarouselIndicators>
        <button wrapperCarouselIndicator data-testid="dot-0"></button>
        <button wrapperCarouselIndicator data-testid="dot-1"></button>
      </div>
    </div>
  `,
})
class WrapperHost {}

describe('ForCarousel subclass wrapper (#1593)', () => {
  let restoreObservers: () => void;
  beforeAll(() => {
    restoreObservers = installObserverPolyfills();
  });
  afterAll(() => restoreObservers());

  it('mounts a subclassed root that re-provides FOR_CAROUSEL_CONTEXT by hand', () => {
    const { el } = renderHost(WrapperHost);

    expect(el.querySelector('[wrapperCarousel]')?.getAttribute('role')).toBe('group');
  });

  it('labels each slide from its position in the subclass registry', () => {
    const { el } = renderHost(WrapperHost);

    expect(el.querySelector('[data-testid="slide-0"]')?.getAttribute('aria-label')).toBe('1 of 2');
    expect(el.querySelector('[data-testid="slide-1"]')?.getAttribute('aria-label')).toBe('2 of 2');
  });

  it('points the next control at the viewport registered with the subclass', () => {
    const { el } = renderHost(WrapperHost);

    const viewport = el.querySelector<HTMLElement>('[data-testid="viewport"]');

    expect(viewport?.id).toBeTruthy();
    expect(el.querySelector('[data-testid="next"]')?.getAttribute('aria-controls')).toBe(
      viewport?.id,
    );
  });

  it('gives the indicator collection a single tab stop', () => {
    const { el } = renderHost(WrapperHost);

    const dots = Array.from(el.querySelectorAll('[wrapperCarouselIndicator]'));
    const tabStops = dots.filter((dot) => dot.getAttribute('tabindex') === '0');

    expect(dots).toHaveLength(2);
    expect(tabStops).toHaveLength(1);
  });
});

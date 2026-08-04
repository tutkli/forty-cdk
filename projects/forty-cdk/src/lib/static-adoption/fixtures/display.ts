import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

import { ForBreadcrumbs } from 'forty-cdk/breadcrumbs';
import {
  ForCarousel,
  ForCarouselIndicators,
  ForCarouselNext,
  ForCarouselPrevious,
  ForCarouselSlide,
  ForCarouselTrack,
  ForCarouselViewport,
} from 'forty-cdk/carousel';
import { ForMeter } from 'forty-cdk/meter';
import { ForPagination, ForPaginationNext, ForPaginationPrevious } from 'forty-cdk/pagination';
import { ForProgress } from 'forty-cdk/progress';
import { ForToolbar } from 'forty-cdk/toolbar';

import type { StaticAdoptionAdopter } from './mount';

@Component({
  imports: [ForBreadcrumbs, ForToolbar, ForProgress, ForMeter],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<nav forBreadcrumbs aria-label="Probe you are here"></nav>
    <div forToolbar aria-label="Probe formatting"></div>
    <div forProgress [value]="50" [max]="100" aria-label="Probe upload"></div>
    <div forMeter [value]="50" [max]="100" aria-label="Probe disk usage"></div>`,
})
class StaticRootsAdopted {}

@Component({
  imports: [ForBreadcrumbs, ForToolbar, ForProgress, ForMeter],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<nav forBreadcrumbs></nav>
    <div forToolbar></div>
    <div forProgress [value]="50" [max]="100"></div>
    <div forMeter [value]="50" [max]="100"></div>`,
})
class StaticRootsBare {}

@Component({
  imports: [
    ForCarousel,
    ForCarouselViewport,
    ForCarouselTrack,
    ForCarouselSlide,
    ForCarouselNext,
    ForCarouselPrevious,
    ForCarouselIndicators,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div forCarousel aria-label="Probe featured products">
    <button forCarouselPrevious aria-label="Probe previous slide">‹</button>
    <div forCarouselViewport id="probe-viewport">
      <div forCarouselTrack>
        <div forCarouselSlide>One</div>
      </div>
    </div>
    <button forCarouselNext aria-label="Probe next slide">›</button>
    <div forCarouselIndicators aria-label="Probe choose slide"></div>
  </div>`,
})
class CarouselAdopted {}

@Component({
  imports: [
    ForCarousel,
    ForCarouselViewport,
    ForCarouselTrack,
    ForCarouselSlide,
    ForCarouselNext,
    ForCarouselPrevious,
    ForCarouselIndicators,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div forCarousel>
    <button forCarouselPrevious>‹</button>
    <div forCarouselViewport>
      <div forCarouselTrack>
        <div forCarouselSlide>One</div>
      </div>
    </div>
    <button forCarouselNext>›</button>
    <div forCarouselIndicators></div>
  </div>`,
})
class CarouselBare {}

@Component({
  imports: [ForPagination, ForPaginationNext, ForPaginationPrevious],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<nav forPagination [(page)]="page" [count]="20" aria-label="Probe pagination">
    <button forPaginationPrevious aria-label="Probe previous page">‹</button>
    <button forPaginationNext aria-label="Probe next page">›</button>
  </nav>`,
})
class PaginationAdopted {
  readonly page = signal(1);
}

@Component({
  imports: [ForPagination, ForPaginationNext, ForPaginationPrevious],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<nav forPagination [(page)]="page" [count]="20">
    <button forPaginationPrevious>‹</button>
    <button forPaginationNext>›</button>
  </nav>`,
})
class PaginationBare {
  readonly page = signal(1);
}

/**
 * The display roots and their navigation buttons — every one of them an
 * optional accessible name, except `[forBreadcrumbs]`, whose scope default is
 * what a static attribute overrides.
 */
export const DISPLAY_FAMILY_ADOPTERS: readonly StaticAdoptionAdopter[] = [
  {
    label: 'Breadcrumbs / Toolbar / Progress / Meter',
    adopted: StaticRootsAdopted,
    bare: StaticRootsBare,
    claims: [
      {
        key: '[forBreadcrumbs]',
        channel: 'aria-label',
        source: 'breadcrumbs/src/breadcrumbs.ts',
        seam: 'hostAriaLabel',
        probe: 'Probe you are here',
        fallback: 'Breadcrumb',
      },
      {
        key: '[forToolbar]',
        channel: 'aria-label',
        source: 'toolbar/src/toolbar.ts',
        seam: 'hostAriaLabel',
        probe: 'Probe formatting',
        fallback: null,
      },
      {
        key: '[forProgress]',
        channel: 'aria-label',
        source: 'progress/src/progress.ts',
        seam: 'hostAriaLabel',
        probe: 'Probe upload',
        fallback: null,
      },
      {
        key: '[forMeter]',
        channel: 'aria-label',
        source: 'meter/src/meter.ts',
        seam: 'hostAriaLabel',
        probe: 'Probe disk usage',
        fallback: null,
      },
    ],
  },
  {
    label: 'Carousel',
    adopted: CarouselAdopted,
    bare: CarouselBare,
    claims: [
      {
        key: '[forCarouselViewport]',
        channel: 'id',
        source: 'carousel/src/carousel-viewport.ts',
        seam: 'hostId',
        probe: 'probe-viewport',
        fallback: { generated: 'for-carousel-viewport' },
      },
      {
        key: '[forCarousel]',
        channel: 'aria-label',
        source: 'carousel/src/carousel.ts',
        seam: 'hostAriaLabel',
        probe: 'Probe featured products',
        fallback: null,
      },
      {
        key: '[forCarouselPrevious]',
        channel: 'aria-label',
        source: 'carousel/src/carousel-previous.ts',
        seam: 'hostAriaLabel',
        probe: 'Probe previous slide',
        fallback: null,
      },
      {
        key: '[forCarouselNext]',
        channel: 'aria-label',
        source: 'carousel/src/carousel-next.ts',
        seam: 'hostAriaLabel',
        probe: 'Probe next slide',
        fallback: null,
      },
      {
        key: '[forCarouselIndicators]',
        channel: 'aria-label',
        source: 'carousel/src/carousel-indicators.ts',
        seam: 'hostAriaLabel',
        probe: 'Probe choose slide',
        fallback: null,
      },
    ],
  },
  {
    label: 'Pagination',
    adopted: PaginationAdopted,
    bare: PaginationBare,
    claims: [
      {
        key: '[forPagination]',
        channel: 'aria-label',
        source: 'pagination/src/pagination.ts',
        seam: 'hostAriaLabel',
        probe: 'Probe pagination',
        fallback: null,
      },
      {
        key: '[forPaginationPrevious]',
        channel: 'aria-label',
        source: 'pagination/src/pagination-previous.ts',
        seam: 'hostAriaLabel',
        probe: 'Probe previous page',
        fallback: null,
      },
      {
        key: '[forPaginationNext]',
        channel: 'aria-label',
        source: 'pagination/src/pagination-next.ts',
        seam: 'hostAriaLabel',
        probe: 'Probe next page',
        fallback: null,
      },
    ],
  },
];

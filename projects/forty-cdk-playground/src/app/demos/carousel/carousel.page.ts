import { ChangeDetectionStrategy, Component } from '@angular/core';

import { EXAMPLE_SOURCES } from '../../doc/example-source';
import { DemoLayout } from '../../ui/demo-layout';
import { PrimitivePage } from '../../ui/primitive-page';
import { CarouselAutoplayExample } from './examples/autoplay.example';
import { CarouselDefaultExample } from './examples/default.example';
import { CarouselDragExample } from './examples/drag.example';
import { CarouselMultipleSlidesExample } from './examples/multiple-slides.example';
import { SOURCES } from './sources.generated';
import readmeContent from '../../../../../forty-cdk/carousel/README.md';

@Component({
  selector: 'app-carousel-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PrimitivePage,
    DemoLayout,
    CarouselDefaultExample,
    CarouselMultipleSlidesExample,
    CarouselAutoplayExample,
    CarouselDragExample,
  ],
  providers: [{ provide: EXAMPLE_SOURCES, useValue: SOURCES }],
  template: `
    <primitive-page slug="carousel" [readme]="readme">
      <playground-demo hero sourcePath="carousel/examples/default.example.ts">
        <app-carousel-default-example />
      </playground-demo>

      <playground-demo
        title="Multiple slides per view"
        subtitle="Set <code>slidesPerView</code> above <code>1</code> to show several slides at once. Each slide is <code>flex: 0 0 calc(100% / var(--for-carousel-slides-per-view))</code>; <code>loop</code> wraps once the last visible set is reached."
        sourcePath="carousel/examples/multiple-slides.example.ts"
      >
        <app-carousel-multiple-slides-example />
      </playground-demo>

      <playground-demo
        title="Autoplay with pause control"
        subtitle="<code>[forCarouselRotationControl]</code> is the first focusable child (APG / WCAG 2.2.2). Rotation pauses on hover, on keyboard focus inside the carousel, and while the tab is backgrounded; an explicit stop is sticky. Under <code>prefers-reduced-motion</code> it does not auto-start."
        sourcePath="carousel/examples/autoplay.example.ts"
      >
        <app-carousel-autoplay-example />
      </playground-demo>

      <playground-demo
        title="Drag / swipe"
        subtitle="Add the opt-in <code>[forCarouselDrag]</code> directive to the viewport for pointer drag and touch swipe. The track follows the finger 1:1 via <code>--for-carousel-drag</code>, then snaps to the nearest slide on release."
        sourcePath="carousel/examples/drag.example.ts"
      >
        <app-carousel-drag-example />
      </playground-demo>
    </primitive-page>
  `,
})
export class CarouselPage {
  protected readonly readme = readmeContent;
}

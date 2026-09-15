import { ChangeDetectionStrategy, Component } from '@angular/core';

import { EXAMPLE_SOURCES } from '../../doc/example-source';
import { DemoLayout } from '../../ui/demo-layout';
import { PrimitivePage } from '../../ui/primitive-page';
import { CarouselAutoplayExample } from './examples/autoplay.example';
import { CarouselDefaultExample } from './examples/default.example';
import { CarouselDragExample } from './examples/drag.example';
import { CarouselMultipleSlidesExample } from './examples/multiple-slides.example';
import { SOURCES } from './sources.generated';
import { DOC } from '../../../generated/docs/primitives/carousel.generated';

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
    <primitive-page slug="carousel" [doc]="doc">
      <demo-layout hero sourcePath="carousel/examples/default.example.ts">
        <app-carousel-default-example />
      </demo-layout>

      <demo-layout
        heading="multiple-slides-per-view"
        sourcePath="carousel/examples/multiple-slides.example.ts"
      >
        <app-carousel-multiple-slides-example />
      </demo-layout>

      <demo-layout
        heading="autoplay-with-pause-control"
        sourcePath="carousel/examples/autoplay.example.ts"
      >
        <app-carousel-autoplay-example />
      </demo-layout>

      <demo-layout heading="drag--swipe" sourcePath="carousel/examples/drag.example.ts">
        <app-carousel-drag-example />
      </demo-layout>
    </primitive-page>
  `,
})
export class CarouselPage {
  protected readonly doc = DOC;
}

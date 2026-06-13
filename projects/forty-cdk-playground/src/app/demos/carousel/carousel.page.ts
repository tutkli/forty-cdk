import { ChangeDetectionStrategy, Component } from '@angular/core';

import { PrimitivePage } from '../../ui/primitive-page';
import { CarouselAutoplayExample } from './examples/autoplay.example';
import { CarouselBasicExample } from './examples/basic.example';
import { CarouselDragExample } from './examples/drag.example';
import { CarouselMultipleExample } from './examples/multiple-slides.example';

@Component({
  selector: 'app-carousel-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PrimitivePage,
    CarouselBasicExample,
    CarouselMultipleExample,
    CarouselAutoplayExample,
    CarouselDragExample,
  ],
  template: `
    <primitive-page slug="carousel">
      <app-carousel-basic-example />
      <app-carousel-multiple-example />
      <app-carousel-drag-example />
      <app-carousel-autoplay-example />
    </primitive-page>
  `,
})
export class CarouselPage {}

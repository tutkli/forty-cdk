import { ChangeDetectionStrategy, Component } from '@angular/core';

import { PrimitivePage } from '../../ui/primitive-page';
import { SliderExample } from './examples/slider.example';
import { SliderInvertedExample } from './examples/inverted.example';
import { SliderRangeExample } from './examples/range.example';
import { SliderVerticalExample } from './examples/vertical.example';

@Component({
  selector: 'app-slider-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PrimitivePage,
    SliderExample,
    SliderRangeExample,
    SliderVerticalExample,
    SliderInvertedExample,
  ],
  template: `
    <primitive-page slug="slider">
      <app-slider-example />
      <app-slider-range-example />
      <app-slider-vertical-example />
      <app-slider-inverted-example />
    </primitive-page>
  `,
})
export class SliderPage {}

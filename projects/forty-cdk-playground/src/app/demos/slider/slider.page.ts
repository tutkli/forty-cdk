import { ChangeDetectionStrategy, Component } from '@angular/core';

import { PrimitivePage } from '../../ui/primitive-page';
import { SliderExample } from './examples/slider.example';
import { SliderInvertedExample } from './examples/inverted.example';
import { SliderRangeExample } from './examples/range.example';
import { SliderVerticalExample } from './examples/vertical.example';
import { EXAMPLE_SOURCES } from '../../doc/example-source';
import { SOURCES } from './sources.generated';
import readmeContent from '../../../../../forty-cdk/slider/README.md';

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
  providers: [{ provide: EXAMPLE_SOURCES, useValue: SOURCES }],
  template: `
    <primitive-page slug="slider" [readme]="readme">
      <app-slider-example />
      <app-slider-range-example />
      <app-slider-vertical-example />
      <app-slider-inverted-example />
    </primitive-page>
  `,
})
export class SliderPage {
  protected readonly readme = readmeContent;
}

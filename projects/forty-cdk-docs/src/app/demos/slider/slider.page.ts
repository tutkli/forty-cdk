import { ChangeDetectionStrategy, Component } from '@angular/core';

import { EXAMPLE_SOURCES } from '../../doc/example-source';
import { DemoLayout } from '../../ui/demo-layout';
import { PrimitivePage } from '../../ui/primitive-page';
import { SliderDefaultExample } from './examples/default.example';
import { SliderInvertedExample } from './examples/inverted.example';
import { SliderRangeExample } from './examples/range.example';
import { SliderStepsExample } from './examples/steps.example';
import { SliderVerticalExample } from './examples/vertical.example';
import { SOURCES } from './sources.generated';
import { DOC } from '../../../generated/docs/primitives/slider.generated';

@Component({
  selector: 'app-slider-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PrimitivePage,
    DemoLayout,
    SliderDefaultExample,
    SliderStepsExample,
    SliderRangeExample,
    SliderVerticalExample,
    SliderInvertedExample,
  ],
  providers: [{ provide: EXAMPLE_SOURCES, useValue: SOURCES }],
  template: `
    <primitive-page slug="slider" [doc]="doc">
      <demo-layout hero sourcePath="slider/examples/default.example.ts">
        <app-slider-default-example />
      </demo-layout>

      <demo-layout heading="stepped" sourcePath="slider/examples/steps.example.ts">
        <app-slider-steps-example />
      </demo-layout>

      <demo-layout heading="range-two-thumbs" sourcePath="slider/examples/range.example.ts">
        <app-slider-range-example />
      </demo-layout>

      <demo-layout heading="vertical-orientation" sourcePath="slider/examples/vertical.example.ts">
        <app-slider-vertical-example />
      </demo-layout>

      <demo-layout heading="inverted" sourcePath="slider/examples/inverted.example.ts">
        <app-slider-inverted-example />
      </demo-layout>
    </primitive-page>
  `,
})
export class SliderPage {
  protected readonly doc = DOC;
}

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
import readmeContent from '../../../../../forty-cdk/slider/README.md';

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
    <primitive-page slug="slider" [readme]="readme">
      <playground-demo
        title="Single thumb"
        subtitle="Drag the thumb, click the track, or focus it and use arrows / PageUp-Down / Home-End. The directive exposes the live position as CSS custom properties; the track, range and thumb are painted with pure CSS."
        sourcePath="projects/forty-cdk-playground/src/app/demos/slider/examples/default.example.ts"
      >
        <app-slider-default-example />
      </playground-demo>

      <playground-demo
        title="Stepped"
        subtitle="step sets the granularity values snap to and the amount each arrow-key press moves. Here step is 10, so values snap to 0, 10, 20…; PageUp / PageDown move by 10× this step."
        sourcePath="projects/forty-cdk-playground/src/app/demos/slider/examples/steps.example.ts"
      >
        <app-slider-steps-example />
      </playground-demo>

      <playground-demo
        title="Range (two thumbs)"
        subtitle="The value model is a readonly number[]; two forSliderThumb pieces, one per index, make a range. Each thumb's aria-valuemin / aria-valuemax squeeze to its neighbor so the thumbs can't cross, and minStepsBetweenThumbs keeps a minimum gap in step units."
        sourcePath="projects/forty-cdk-playground/src/app/demos/slider/examples/range.example.ts"
      >
        <app-slider-range-example />
      </playground-demo>

      <playground-demo
        title="Vertical orientation"
        subtitle="orientation='vertical' reflects data-orientation on every piece and sets aria-orientation on the thumb. The exposed fractions are unchanged — the consumer paints along the Y axis: ArrowUp increases, ArrowDown decreases."
        sourcePath="projects/forty-cdk-playground/src/app/demos/slider/examples/vertical.example.ts"
      >
        <app-slider-vertical-example />
      </playground-demo>

      <playground-demo
        title="Inverted"
        subtitle="inverted flips the value-to-position mapping — in horizontal LTR, max sits on the left. The flip is baked into the exposed fractions, so the same CSS paints both ways. Keyboard semantics are unchanged: ArrowRight / ArrowUp still move toward max."
        sourcePath="projects/forty-cdk-playground/src/app/demos/slider/examples/inverted.example.ts"
      >
        <app-slider-inverted-example />
      </playground-demo>
    </primitive-page>
  `,
})
export class SliderPage {
  protected readonly readme = readmeContent;
}

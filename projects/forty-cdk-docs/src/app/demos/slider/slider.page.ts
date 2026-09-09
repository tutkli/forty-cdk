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
      <playground-demo hero sourcePath="slider/examples/default.example.ts">
        <app-slider-default-example />
      </playground-demo>

      <playground-demo
        title="Stepped"
        subtitle="<code>step</code> sets the granularity values snap to and the amount each arrow-key press moves. Here <code>step</code> is 10, so values snap to 0, 10, 20…; <kbd>PageUp</kbd> / <kbd>PageDown</kbd> move by 10× this step."
        sourcePath="slider/examples/steps.example.ts"
      >
        <app-slider-steps-example />
      </playground-demo>

      <playground-demo
        title="Range (two thumbs)"
        subtitle="The <code>value</code> model is a <code>readonly number[]</code>; two <code>forSliderThumb</code> pieces, one per <code>index</code>, make a range. Each thumb's <code>aria-valuemin</code> / <code>aria-valuemax</code> squeeze to its neighbor so the thumbs can't cross, and <code>minStepsBetweenThumbs</code> keeps a minimum gap in step units."
        sourcePath="slider/examples/range.example.ts"
      >
        <app-slider-range-example />
      </playground-demo>

      <playground-demo
        title="Vertical orientation"
        subtitle="<code>orientation='vertical'</code> reflects <code>data-orientation</code> on every piece and sets <code>aria-orientation</code> on the thumb. The exposed fractions are unchanged — the consumer paints along the Y axis: <kbd>ArrowUp</kbd> increases, <kbd>ArrowDown</kbd> decreases."
        sourcePath="slider/examples/vertical.example.ts"
      >
        <app-slider-vertical-example />
      </playground-demo>

      <playground-demo
        title="Inverted"
        subtitle="<code>inverted</code> flips the value-to-position mapping — in horizontal LTR, max sits on the left. The flip is baked into the exposed fractions, so the same CSS paints both ways. Keyboard semantics are unchanged: <kbd>ArrowRight</kbd> / <kbd>ArrowUp</kbd> still move toward max."
        sourcePath="slider/examples/inverted.example.ts"
      >
        <app-slider-inverted-example />
      </playground-demo>
    </primitive-page>
  `,
})
export class SliderPage {
  protected readonly doc = DOC;
}

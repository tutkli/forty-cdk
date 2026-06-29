import { ChangeDetectionStrategy, Component } from '@angular/core';

import { EXAMPLE_SOURCES } from '../../doc/example-source';
import { DemoLayout } from '../../ui/demo-layout';
import { PrimitivePage } from '../../ui/primitive-page';
import { NumberInputDefaultExample } from './examples/default.example';
import { NumberInputDisabledExample } from './examples/disabled.example';
import { NumberInputFormattingExample } from './examples/formatting.example';
import { SOURCES } from './sources.generated';
import readmeContent from '../../../../../forty-cdk/number-input/README.md';

@Component({
  selector: 'app-number-input-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PrimitivePage,
    DemoLayout,
    NumberInputDefaultExample,
    NumberInputDisabledExample,
    NumberInputFormattingExample,
  ],
  providers: [{ provide: EXAMPLE_SOURCES, useValue: SOURCES }],
  template: `
    <primitive-page slug="number-input" [readme]="readme">
      <playground-demo
        title="Stepper"
        subtitle="The input is a role=spinbutton with aria-valuenow / valuemin / valuemax. ArrowUp / ArrowDown step by [step], PageUp / PageDown step by the multiplier, and Home / End jump to the bounds. The group wires the +/− buttons, which auto-disable (data-disabled) at min or max."
        sourcePath="projects/forty-cdk-playground/src/app/demos/number-input/examples/default.example.ts"
      >
        <app-number-input-default-example />
      </playground-demo>

      <playground-demo
        title="Disabled"
        subtitle="disabled reflects data-disabled on the spinbutton and both stepper buttons, removes the control from the tab order, and ignores the keyboard."
        sourcePath="projects/forty-cdk-playground/src/app/demos/number-input/examples/disabled.example.ts"
      >
        <app-number-input-disabled-example />
      </playground-demo>

      <playground-demo
        title="Formatting & precision"
        subtitle="formatOptions feeds an Intl.NumberFormat that renders the displayed text and aria-valuetext, while value() stays a raw number. The locale drives both formatting and parsing; a hidden input submits the raw number, not the formatted string."
        sourcePath="projects/forty-cdk-playground/src/app/demos/number-input/examples/formatting.example.ts"
      >
        <app-number-input-formatting-example />
      </playground-demo>
    </primitive-page>
  `,
})
export class NumberInputPage {
  protected readonly readme = readmeContent;
}

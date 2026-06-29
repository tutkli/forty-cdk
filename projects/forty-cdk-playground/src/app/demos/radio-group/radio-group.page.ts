import { ChangeDetectionStrategy, Component } from '@angular/core';

import { EXAMPLE_SOURCES } from '../../doc/example-source';
import { DemoLayout } from '../../ui/demo-layout';
import { PrimitivePage } from '../../ui/primitive-page';
import { RadioGroupDefaultExample } from './examples/default.example';
import { RadioGroupFormFieldExample } from './examples/form-field.example';
import { RadioGroupHorizontalExample } from './examples/horizontal.example';
import { SOURCES } from './sources.generated';
import readmeContent from '../../../../../forty-cdk/radio-group/README.md';

@Component({
  selector: 'app-radio-group-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PrimitivePage,
    DemoLayout,
    RadioGroupDefaultExample,
    RadioGroupHorizontalExample,
    RadioGroupFormFieldExample,
  ],
  providers: [{ provide: EXAMPLE_SOURCES, useValue: SOURCES }],
  template: `
    <primitive-page slug="radio-group" [readme]="readme">
      <playground-demo
        title="Stand-alone"
        subtitle="Arrow keys move focus and change the value at once, wrapping at the ends. Home / End jump to the first / last enabled radio; disabled radios are skipped."
        sourcePath="projects/forty-cdk-playground/src/app/demos/radio-group/examples/default.example.ts"
      >
        <app-radio-group-default-example />
      </playground-demo>

      <playground-demo
        title="Horizontal orientation"
        subtitle="orientation='horizontal' reflects data-orientation and switches arrow navigation to ArrowLeft / ArrowRight (swapped in RTL)."
        sourcePath="projects/forty-cdk-playground/src/app/demos/radio-group/examples/horizontal.example.ts"
      >
        <app-radio-group-horizontal-example />
      </playground-demo>

      <playground-demo
        title="Signal Forms"
        subtitle="forRadioGroup implements FormValueControl<string>, so [formField] binds the selected value into the form and surfaces validity back. This field is required: tab through without choosing and the group reflects data-invalid / data-touched once focus leaves it."
        sourcePath="projects/forty-cdk-playground/src/app/demos/radio-group/examples/form-field.example.ts"
      >
        <app-radio-group-form-field-example />
      </playground-demo>
    </primitive-page>
  `,
})
export class RadioGroupPage {
  protected readonly readme = readmeContent;
}

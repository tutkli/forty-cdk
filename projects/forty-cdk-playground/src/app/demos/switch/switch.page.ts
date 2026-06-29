import { ChangeDetectionStrategy, Component } from '@angular/core';

import { EXAMPLE_SOURCES } from '../../doc/example-source';
import { DemoLayout } from '../../ui/demo-layout';
import { PrimitivePage } from '../../ui/primitive-page';
import { SwitchDefaultExample } from './examples/default.example';
import { SwitchDisabledExample } from './examples/disabled.example';
import { SwitchFormFieldExample } from './examples/form-field.example';
import { SwitchReadOnlyExample } from './examples/read-only.example';
import { SOURCES } from './sources.generated';
import readmeContent from '../../../../../forty-cdk/switch/README.md';

@Component({
  selector: 'app-switch-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PrimitivePage,
    DemoLayout,
    SwitchDefaultExample,
    SwitchDisabledExample,
    SwitchReadOnlyExample,
    SwitchFormFieldExample,
  ],
  providers: [{ provide: EXAMPLE_SOURCES, useValue: SOURCES }],
  template: `
    <primitive-page slug="switch" [readme]="readme">
      <playground-demo
        title="Stand-alone"
        subtitle="Toggle it with click, Enter or Space. data-state reflects the checked state for styling."
        sourcePath="projects/forty-cdk-playground/src/app/demos/switch/examples/default.example.ts"
      >
        <app-switch-default-example />
      </playground-demo>

      <playground-demo
        title="Disabled"
        subtitle="disabled removes the switch from the tab order and reflects data-disabled."
        sourcePath="projects/forty-cdk-playground/src/app/demos/switch/examples/disabled.example.ts"
      >
        <app-switch-disabled-example />
      </playground-demo>

      <playground-demo
        title="Read-only"
        subtitle="readonly keeps the switch focusable and announced, but blocks toggling. It reflects data-readonly."
        sourcePath="projects/forty-cdk-playground/src/app/demos/switch/examples/read-only.example.ts"
      >
        <app-switch-read-only-example />
      </playground-demo>

      <playground-demo
        title="Signal Forms"
        subtitle="forSwitch implements FormCheckboxControl, so a single [formField] binding wires checked state, validity and touched both ways — no ControlValueAccessor."
        sourcePath="projects/forty-cdk-playground/src/app/demos/switch/examples/form-field.example.ts"
      >
        <app-switch-form-field-example />
      </playground-demo>
    </primitive-page>
  `,
})
export class SwitchPage {
  protected readonly readme = readmeContent;
}

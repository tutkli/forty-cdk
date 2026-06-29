import { ChangeDetectionStrategy, Component } from '@angular/core';

import { EXAMPLE_SOURCES } from '../../doc/example-source';
import { DemoLayout } from '../../ui/demo-layout';
import { PrimitivePage } from '../../ui/primitive-page';
import { FieldDefaultExample } from './examples/default.example';
import { FieldDisabledExample } from './examples/disabled.example';
import { FieldValidationExample } from './examples/validation.example';
import { SOURCES } from './sources.generated';
import readmeContent from '../../../../../forty-cdk/field/README.md';

@Component({
  selector: 'app-field-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PrimitivePage,
    DemoLayout,
    FieldDefaultExample,
    FieldDisabledExample,
    FieldValidationExample,
  ],
  providers: [{ provide: EXAMPLE_SOURCES, useValue: SOURCES }],
  template: `
    <primitive-page slug="field" [readme]="readme">
      <playground-demo
        title="Anatomy"
        subtitle="forField renders nothing — it ties the label, description and control together. forLabel adopts the field's generated id, the control gains aria-labelledby / aria-describedby / its own id, and clicking the label focuses the input. The host reflects data-required from the control for styling. A plain native input opts in with forFieldControl."
        sourcePath="projects/forty-cdk-playground/src/app/demos/field/examples/default.example.ts"
      >
        <app-field-default-example />
      </playground-demo>

      <playground-demo
        title="Disabled"
        subtitle="A disabled native control reflects data-disabled on the field host, so the whole block can dim in one rule. The control stays announced as disabled to assistive tech."
        sourcePath="projects/forty-cdk-playground/src/app/demos/field/examples/disabled.example.ts"
      >
        <app-field-disabled-example />
      </playground-demo>

      <playground-demo
        title="Validation with Signal Forms"
        subtitle="forFieldError reads the control's Signal Forms errors automatically — you render err.messages(), the field wires aria-errormessage and folds the id into aria-describedby while invalid. The checkbox auto-associates because it extends the shared form base. Tick then untick to surface the required error."
        sourcePath="projects/forty-cdk-playground/src/app/demos/field/examples/validation.example.ts"
      >
        <app-field-validation-example />
      </playground-demo>
    </primitive-page>
  `,
})
export class FieldPage {
  protected readonly readme = readmeContent;
}

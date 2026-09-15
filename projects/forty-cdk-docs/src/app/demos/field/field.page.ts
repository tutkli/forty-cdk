import { ChangeDetectionStrategy, Component } from '@angular/core';

import { EXAMPLE_SOURCES } from '../../doc/example-source';
import { DemoLayout } from '../../ui/demo-layout';
import { PrimitivePage } from '../../ui/primitive-page';
import { FieldDefaultExample } from './examples/default.example';
import { FieldStatesExample } from './examples/states.example';
import { FieldValidationExample } from './examples/validation.example';
import { SOURCES } from './sources.generated';
import { DOC } from '../../../generated/docs/primitives/field.generated';

@Component({
  selector: 'app-field-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PrimitivePage,
    DemoLayout,
    FieldDefaultExample,
    FieldStatesExample,
    FieldValidationExample,
  ],
  providers: [{ provide: EXAMPLE_SOURCES, useValue: SOURCES }],
  template: `
    <primitive-page slug="field" [doc]="doc">
      <demo-layout hero sourcePath="field/examples/default.example.ts">
        <app-field-default-example />
      </demo-layout>

      <demo-layout
        title="States"
        subtitle="One class and one directive, four states. The control's own <code>required</code>, <code>invalid</code> and <code>disabled</code> are reflected on the <code>[forField]</code> host as <code>data-required</code>, <code>data-invalid</code> and <code>data-disabled</code>, so the label, the input and the description all key on one element."
        sourcePath="field/examples/states.example.ts"
      >
        <app-field-states-example />
      </demo-layout>

      <demo-layout
        title="Validation with Signal Forms"
        subtitle="<code>[forFieldError]</code> reads the control's Signal Forms errors automatically — you render <code>err.messages()</code>, the field wires <code>aria-errormessage</code> and folds the id into <code>aria-describedby</code> while invalid. The <code>[forCheckbox]</code> auto-associates because it extends the shared form base. Tick then untick to surface the required error."
        sourcePath="field/examples/validation.example.ts"
      >
        <app-field-validation-example />
      </demo-layout>
    </primitive-page>
  `,
})
export class FieldPage {
  protected readonly doc = DOC;
}

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

      <demo-layout heading="states" sourcePath="field/examples/states.example.ts">
        <app-field-states-example />
      </demo-layout>

      <demo-layout
        heading="validation-with-signal-forms"
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

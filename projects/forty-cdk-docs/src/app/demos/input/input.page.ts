import { ChangeDetectionStrategy, Component } from '@angular/core';

import { EXAMPLE_SOURCES } from '../../doc/example-source';
import { DemoLayout } from '../../ui/demo-layout';
import { PrimitivePage } from '../../ui/primitive-page';
import { InputAutosizeExample } from './examples/autosize.example';
import { InputDefaultExample } from './examples/default.example';
import { InputStatesExample } from './examples/states.example';
import { InputValidationExample } from './examples/validation.example';
import { SOURCES } from './sources.generated';
import { DOC } from '../../../generated/docs/primitives/input.generated';

@Component({
  selector: 'app-input-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PrimitivePage,
    DemoLayout,
    InputDefaultExample,
    InputStatesExample,
    InputAutosizeExample,
    InputValidationExample,
  ],
  providers: [{ provide: EXAMPLE_SOURCES, useValue: SOURCES }],
  template: `
    <primitive-page slug="input" [doc]="doc">
      <demo-layout hero sourcePath="input/examples/default.example.ts">
        <app-input-default-example />
      </demo-layout>

      <demo-layout heading="states" sourcePath="input/examples/states.example.ts">
        <app-input-states-example />
      </demo-layout>

      <demo-layout heading="auto-sizing-textarea" sourcePath="input/examples/autosize.example.ts">
        <app-input-autosize-example />
      </demo-layout>

      <demo-layout
        heading="signal-forms-validation"
        sourcePath="input/examples/validation.example.ts"
      >
        <app-input-validation-example />
      </demo-layout>
    </primitive-page>
  `,
})
export class InputPage {
  protected readonly doc = DOC;
}

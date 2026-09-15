import { ChangeDetectionStrategy, Component } from '@angular/core';

import { EXAMPLE_SOURCES } from '../../doc/example-source';
import { DemoLayout } from '../../ui/demo-layout';
import { PrimitivePage } from '../../ui/primitive-page';
import { CheckboxDefaultExample } from './examples/default.example';
import { CheckboxFormFieldExample } from './examples/form-field.example';
import { CheckboxSelectAllExample } from './examples/select-all.example';
import { CheckboxStatesExample } from './examples/states.example';
import { SOURCES } from './sources.generated';
import { DOC } from '../../../generated/docs/primitives/checkbox.generated';

@Component({
  selector: 'app-checkbox-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PrimitivePage,
    DemoLayout,
    CheckboxDefaultExample,
    CheckboxSelectAllExample,
    CheckboxStatesExample,
    CheckboxFormFieldExample,
  ],
  providers: [{ provide: EXAMPLE_SOURCES, useValue: SOURCES }],
  template: `
    <primitive-page slug="checkbox" [doc]="doc">
      <demo-layout hero sourcePath="checkbox/examples/default.example.ts">
        <app-checkbox-default-example />
      </demo-layout>

      <demo-layout
        heading="tri-state-select-all"
        sourcePath="checkbox/examples/select-all.example.ts"
      >
        <app-checkbox-select-all-example />
      </demo-layout>

      <demo-layout heading="states" sourcePath="checkbox/examples/states.example.ts">
        <app-checkbox-states-example />
      </demo-layout>

      <demo-layout heading="signal-forms" sourcePath="checkbox/examples/form-field.example.ts">
        <app-checkbox-form-field-example />
      </demo-layout>
    </primitive-page>
  `,
})
export class CheckboxPage {
  protected readonly doc = DOC;
}

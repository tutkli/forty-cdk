import { ChangeDetectionStrategy, Component } from '@angular/core';

import { EXAMPLE_SOURCES } from '../../doc/example-source';
import { DemoLayout } from '../../ui/demo-layout';
import { PrimitivePage } from '../../ui/primitive-page';
import { SwitchDefaultExample } from './examples/default.example';
import { SwitchFormFieldExample } from './examples/form-field.example';
import { SwitchStatesExample } from './examples/states.example';
import { SOURCES } from './sources.generated';
import { DOC } from '../../../generated/docs/primitives/switch.generated';

@Component({
  selector: 'app-switch-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PrimitivePage,
    DemoLayout,
    SwitchDefaultExample,
    SwitchStatesExample,
    SwitchFormFieldExample,
  ],
  providers: [{ provide: EXAMPLE_SOURCES, useValue: SOURCES }],
  template: `
    <primitive-page slug="switch" [doc]="doc">
      <demo-layout hero sourcePath="switch/examples/default.example.ts">
        <app-switch-default-example />
      </demo-layout>

      <demo-layout heading="states" sourcePath="switch/examples/states.example.ts">
        <app-switch-states-example />
      </demo-layout>

      <demo-layout heading="signal-forms" sourcePath="switch/examples/form-field.example.ts">
        <app-switch-form-field-example />
      </demo-layout>
    </primitive-page>
  `,
})
export class SwitchPage {
  protected readonly doc = DOC;
}

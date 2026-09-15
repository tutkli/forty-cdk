import { ChangeDetectionStrategy, Component } from '@angular/core';

import { EXAMPLE_SOURCES } from '../../doc/example-source';
import { DemoLayout } from '../../ui/demo-layout';
import { PrimitivePage } from '../../ui/primitive-page';
import { ToggleDefaultExample } from './examples/default.example';
import { ToggleFormFieldExample } from './examples/form-field.example';
import { ToggleGroupExample } from './examples/group.example';
import { ToggleStatesExample } from './examples/states.example';
import { SOURCES } from './sources.generated';
import { DOC } from '../../../generated/docs/primitives/toggle.generated';

@Component({
  selector: 'app-toggle-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PrimitivePage,
    DemoLayout,
    ToggleDefaultExample,
    ToggleStatesExample,
    ToggleGroupExample,
    ToggleFormFieldExample,
  ],
  providers: [{ provide: EXAMPLE_SOURCES, useValue: SOURCES }],
  template: `
    <primitive-page slug="toggle" [doc]="doc">
      <demo-layout hero sourcePath="toggle/examples/default.example.ts">
        <app-toggle-default-example />
      </demo-layout>

      <demo-layout heading="states" sourcePath="toggle/examples/states.example.ts">
        <app-toggle-states-example />
      </demo-layout>

      <demo-layout heading="togglegroup" sourcePath="toggle/examples/group.example.ts">
        <app-toggle-group-example />
      </demo-layout>

      <demo-layout heading="signal-forms" sourcePath="toggle/examples/form-field.example.ts">
        <app-toggle-form-field-example />
      </demo-layout>
    </primitive-page>
  `,
})
export class TogglePage {
  protected readonly doc = DOC;
}

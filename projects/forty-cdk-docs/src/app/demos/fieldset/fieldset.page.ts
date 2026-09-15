import { ChangeDetectionStrategy, Component } from '@angular/core';

import { EXAMPLE_SOURCES } from '../../doc/example-source';
import { DemoLayout } from '../../ui/demo-layout';
import { PrimitivePage } from '../../ui/primitive-page';
import { FieldsetDefaultExample } from './examples/default.example';
import { FieldsetDisabledExample } from './examples/disabled.example';
import { FieldsetRoleGroupExample } from './examples/role-group.example';
import { SOURCES } from './sources.generated';
import { DOC } from '../../../generated/docs/primitives/fieldset.generated';

@Component({
  selector: 'app-fieldset-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PrimitivePage,
    DemoLayout,
    FieldsetDefaultExample,
    FieldsetDisabledExample,
    FieldsetRoleGroupExample,
  ],
  providers: [{ provide: EXAMPLE_SOURCES, useValue: SOURCES }],
  template: `
    <primitive-page slug="fieldset" [doc]="doc">
      <demo-layout hero sourcePath="fieldset/examples/default.example.ts">
        <app-fieldset-default-example />
      </demo-layout>

      <demo-layout heading="disable-a-group" sourcePath="fieldset/examples/disabled.example.ts">
        <app-fieldset-disabled-example />
      </demo-layout>

      <demo-layout
        heading="group-on-any-element"
        sourcePath="fieldset/examples/role-group.example.ts"
      >
        <app-fieldset-role-group-example />
      </demo-layout>
    </primitive-page>
  `,
})
export class FieldsetPage {
  protected readonly doc = DOC;
}

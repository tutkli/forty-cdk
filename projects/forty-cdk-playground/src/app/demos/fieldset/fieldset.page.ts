import { ChangeDetectionStrategy, Component } from '@angular/core';

import { EXAMPLE_SOURCES } from '../../doc/example-source';
import { DemoLayout } from '../../ui/demo-layout';
import { PrimitivePage } from '../../ui/primitive-page';
import { FieldsetDefaultExample } from './examples/default.example';
import { FieldsetDisabledExample } from './examples/disabled.example';
import { FieldsetRoleGroupExample } from './examples/role-group.example';
import { SOURCES } from './sources.generated';
import readmeContent from '../../../../../forty-cdk/fieldset/README.md';

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
    <primitive-page slug="fieldset" [readme]="readme">
      <playground-demo
        title="Native fieldset group"
        subtitle="On a native <fieldset>, forFieldset leans on the browser's implicit grouping — no role is added because the element already groups its controls. Each forField inside still reflects its own state for styling."
        sourcePath="projects/forty-cdk-playground/src/app/demos/fieldset/examples/default.example.ts"
      >
        <app-fieldset-default-example />
      </playground-demo>

      <playground-demo
        title="Disable a group"
        subtitle="disabled emits the native disabled attribute, which disables every control inside in one move. The data-disabled hook flows to the fieldset and to each forField so the whole block can dim together."
        sourcePath="projects/forty-cdk-playground/src/app/demos/fieldset/examples/disabled.example.ts"
      >
        <app-fieldset-disabled-example />
      </playground-demo>

      <playground-demo
        title="Group on any element"
        subtitle="On non-fieldset markup forFieldset synthesizes the grouping: it emits role=group and points aria-labelledby at the [forFieldsetLegend]'s generated id, so a plain <div> + <span> reads to assistive tech exactly like a native fieldset / legend."
        sourcePath="projects/forty-cdk-playground/src/app/demos/fieldset/examples/role-group.example.ts"
      >
        <app-fieldset-role-group-example />
      </playground-demo>
    </primitive-page>
  `,
})
export class FieldsetPage {
  protected readonly readme = readmeContent;
}

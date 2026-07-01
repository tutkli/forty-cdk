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
      <playground-demo hero sourcePath="fieldset/examples/default.example.ts">
        <app-fieldset-default-example />
      </playground-demo>

      <playground-demo
        title="Disable a group"
        subtitle="<code>disabled</code> emits the native <code>disabled</code> attribute, which disables every control inside in one move. The <code>data-disabled</code> hook flows to the fieldset and to each <code>forField</code> so the whole block can dim together."
        sourcePath="fieldset/examples/disabled.example.ts"
      >
        <app-fieldset-disabled-example />
      </playground-demo>

      <playground-demo
        title="Group on any element"
        subtitle='On non-fieldset markup <code>forFieldset</code> synthesizes the grouping: it emits <code>role="group"</code> and points <code>aria-labelledby</code> at the <code>[forFieldsetLegend]</code>&apos;s generated id, so a plain <code>&lt;div&gt;</code> + <code>&lt;span&gt;</code> reads to assistive tech exactly like a native fieldset / legend.'
        sourcePath="fieldset/examples/role-group.example.ts"
      >
        <app-fieldset-role-group-example />
      </playground-demo>
    </primitive-page>
  `,
})
export class FieldsetPage {
  protected readonly readme = readmeContent;
}

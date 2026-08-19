import { ChangeDetectionStrategy, Component } from '@angular/core';

import { EXAMPLE_SOURCES } from '../../doc/example-source';
import { DemoLayout } from '../../ui/demo-layout';
import { PrimitivePage } from '../../ui/primitive-page';
import { DisclosureDefaultExample } from './examples/default.example';
import { DisclosureDisabledExample } from './examples/disabled.example';
import { SOURCES } from './sources.generated';
import { DOC } from '../../../generated/docs/primitives/disclosure.generated';

@Component({
  selector: 'app-disclosure-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PrimitivePage, DemoLayout, DisclosureDefaultExample, DisclosureDisabledExample],
  providers: [{ provide: EXAMPLE_SOURCES, useValue: SOURCES }],
  template: `
    <primitive-page slug="disclosure" [doc]="doc">
      <playground-demo hero sourcePath="disclosure/examples/default.example.ts">
        <app-disclosure-default-example />
      </playground-demo>

      <playground-demo
        title="Disabled"
        subtitle="<code>disabled</code> drops the trigger from the tab order and blocks toggling, so the panel stays in its current state."
        sourcePath="disclosure/examples/disabled.example.ts"
      >
        <app-disclosure-disabled-example />
      </playground-demo>
    </primitive-page>
  `,
})
export class DisclosurePage {
  protected readonly doc = DOC;
}

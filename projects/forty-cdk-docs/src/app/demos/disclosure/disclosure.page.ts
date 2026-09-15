import { ChangeDetectionStrategy, Component } from '@angular/core';

import { EXAMPLE_SOURCES } from '../../doc/example-source';
import { DemoLayout } from '../../ui/demo-layout';
import { PrimitivePage } from '../../ui/primitive-page';
import { DisclosureDefaultExample } from './examples/default.example';
import { DisclosureStatesExample } from './examples/states.example';
import { SOURCES } from './sources.generated';
import { DOC } from '../../../generated/docs/primitives/disclosure.generated';

@Component({
  selector: 'app-disclosure-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PrimitivePage, DemoLayout, DisclosureDefaultExample, DisclosureStatesExample],
  providers: [{ provide: EXAMPLE_SOURCES, useValue: SOURCES }],
  template: `
    <primitive-page slug="disclosure" [doc]="doc">
      <demo-layout hero sourcePath="disclosure/examples/default.example.ts">
        <app-disclosure-default-example />
      </demo-layout>

      <demo-layout
        title="States"
        subtitle="One class and one directive, two states. <code>disabled</code> drops the trigger from the tab order and blocks toggling, so the panel stays where it is; the root and the trigger both reflect <code>data-disabled</code>, which is all the stylesheet below keys on."
        sourcePath="disclosure/examples/states.example.ts"
      >
        <app-disclosure-states-example />
      </demo-layout>
    </primitive-page>
  `,
})
export class DisclosurePage {
  protected readonly doc = DOC;
}

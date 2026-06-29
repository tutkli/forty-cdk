import { ChangeDetectionStrategy, Component } from '@angular/core';

import { EXAMPLE_SOURCES } from '../../doc/example-source';
import { DemoLayout } from '../../ui/demo-layout';
import { PrimitivePage } from '../../ui/primitive-page';
import { DisclosureDefaultExample } from './examples/default.example';
import { DisclosureDisabledExample } from './examples/disabled.example';
import { SOURCES } from './sources.generated';
import readmeContent from '../../../../../forty-cdk/disclosure/README.md';

@Component({
  selector: 'app-disclosure-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PrimitivePage, DemoLayout, DisclosureDefaultExample, DisclosureDisabledExample],
  providers: [{ provide: EXAMPLE_SOURCES, useValue: SOURCES }],
  template: `
    <primitive-page slug="disclosure" [readme]="readme">
      <playground-demo
        title="Show / hide a section"
        subtitle="A single show/hide section — the building block behind Accordion. The panel stays mounted while closed (the directive marks it aria-hidden + inert), so it can animate open with pure CSS instead of being unmounted."
        sourcePath="projects/forty-cdk-playground/src/app/demos/disclosure/examples/default.example.ts"
      >
        <app-disclosure-default-example />
      </playground-demo>

      <playground-demo
        title="Disabled"
        subtitle="disabled drops the trigger from the tab order and blocks toggling, so the panel stays in its current state."
        sourcePath="projects/forty-cdk-playground/src/app/demos/disclosure/examples/disabled.example.ts"
      >
        <app-disclosure-disabled-example />
      </playground-demo>
    </primitive-page>
  `,
})
export class DisclosurePage {
  protected readonly readme = readmeContent;
}

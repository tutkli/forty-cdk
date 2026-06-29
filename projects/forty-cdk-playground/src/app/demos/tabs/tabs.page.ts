import { ChangeDetectionStrategy, Component } from '@angular/core';

import { EXAMPLE_SOURCES } from '../../doc/example-source';
import { DemoLayout } from '../../ui/demo-layout';
import { PrimitivePage } from '../../ui/primitive-page';
import { TabsDefaultExample } from './examples/default.example';
import { TabsManualActivationExample } from './examples/manual-activation.example';
import { TabsVerticalExample } from './examples/vertical.example';
import { SOURCES } from './sources.generated';
import readmeContent from '../../../../../forty-cdk/tabs/README.md';

@Component({
  selector: 'app-tabs-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PrimitivePage,
    DemoLayout,
    TabsDefaultExample,
    TabsManualActivationExample,
    TabsVerticalExample,
  ],
  providers: [{ provide: EXAMPLE_SOURCES, useValue: SOURCES }],
  template: `
    <primitive-page slug="tabs" [readme]="readme">
      <playground-demo
        title="Stand-alone"
        subtitle="A tablist with roving tabindex. Focus a tab and move with the arrow keys, Home and End. In the default automatic mode, the focused tab is selected in one step."
        sourcePath="projects/forty-cdk-playground/src/app/demos/tabs/examples/default.example.ts"
      >
        <app-tabs-default-example />
      </playground-demo>

      <playground-demo
        title="Manual activation"
        subtitle="activationMode='manual' lets the arrow keys move focus without selecting; the user presses Space or Enter to activate — better when panel content is expensive."
        sourcePath="projects/forty-cdk-playground/src/app/demos/tabs/examples/manual-activation.example.ts"
      >
        <app-tabs-manual-activation-example />
      </playground-demo>

      <playground-demo
        title="Vertical"
        subtitle="orientation='vertical' stacks the tablist beside the panel and switches roving navigation to ArrowUp/ArrowDown. It is reflected as data-orientation for styling."
        sourcePath="projects/forty-cdk-playground/src/app/demos/tabs/examples/vertical.example.ts"
      >
        <app-tabs-vertical-example />
      </playground-demo>
    </primitive-page>
  `,
})
export class TabsPage {
  protected readonly readme = readmeContent;
}

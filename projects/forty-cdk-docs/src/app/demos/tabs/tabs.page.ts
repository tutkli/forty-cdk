import { ChangeDetectionStrategy, Component } from '@angular/core';

import { EXAMPLE_SOURCES } from '../../doc/example-source';
import { DemoLayout } from '../../ui/demo-layout';
import { PrimitivePage } from '../../ui/primitive-page';
import { TabsDefaultExample } from './examples/default.example';
import { TabsManualActivationExample } from './examples/manual-activation.example';
import { TabsVerticalExample } from './examples/vertical.example';
import { SOURCES } from './sources.generated';
import { DOC } from '../../../generated/docs/primitives/tabs.generated';

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
    <primitive-page slug="tabs" [doc]="doc">
      <demo-layout hero sourcePath="tabs/examples/default.example.ts">
        <app-tabs-default-example />
      </demo-layout>

      <demo-layout
        title="Manual activation"
        subtitle="<code>activationMode='manual'</code> lets the arrow keys move focus without selecting; the user presses <kbd>Space</kbd> or <kbd>Enter</kbd> to activate — better when panel content is expensive."
        sourcePath="tabs/examples/manual-activation.example.ts"
      >
        <app-tabs-manual-activation-example />
      </demo-layout>

      <demo-layout
        title="Vertical"
        subtitle="<code>orientation='vertical'</code> stacks the tablist beside the panel and switches roving navigation to <kbd>ArrowUp</kbd> / <kbd>ArrowDown</kbd>. It is reflected as <code>data-orientation</code> for styling."
        sourcePath="tabs/examples/vertical.example.ts"
      >
        <app-tabs-vertical-example />
      </demo-layout>
    </primitive-page>
  `,
})
export class TabsPage {
  protected readonly doc = DOC;
}

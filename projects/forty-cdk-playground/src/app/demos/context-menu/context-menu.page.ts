import { ChangeDetectionStrategy, Component } from '@angular/core';

import { EXAMPLE_SOURCES } from '../../doc/example-source';
import { DemoLayout } from '../../ui/demo-layout';
import { PrimitivePage } from '../../ui/primitive-page';
import { ContextMenuDefaultExample } from './examples/default.example';
import { ContextMenuRichContentExample } from './examples/rich-content.example';
import { SOURCES } from './sources.generated';
import readmeContent from '../../../../../forty-cdk/context-menu/README.md';

@Component({
  selector: 'app-context-menu-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PrimitivePage, DemoLayout, ContextMenuDefaultExample, ContextMenuRichContentExample],
  providers: [{ provide: EXAMPLE_SOURCES, useValue: SOURCES }],
  template: `
    <primitive-page slug="context-menu" [readme]="readme">
      <playground-demo
        hero
        sourcePath="projects/forty-cdk-playground/src/app/demos/context-menu/examples/default.example.ts"
      >
        <app-context-menu-default-example />
      </playground-demo>

      <playground-demo
        title="Rich content"
        subtitle="The same menu vocabulary the Dropdown Menu exposes, anchored to the pointer on right-click: plain <code>forMenuItem</code> actions, a <code>forMenuCheckboxItem</code> toggle, a <code>forMenuRadioGroup</code>, a <code>forMenuSub</code> submenu, and grouped labels with separators. Checkbox and radio items call <code>preventDefault()</code> on <code>(activate)</code> to stay open; plain items close the menu and bubble up through any open submenu."
        sourcePath="projects/forty-cdk-playground/src/app/demos/context-menu/examples/rich-content.example.ts"
      >
        <app-context-menu-rich-content-example />
      </playground-demo>
    </primitive-page>
  `,
})
export class ContextMenuPage {
  protected readonly readme = readmeContent;
}

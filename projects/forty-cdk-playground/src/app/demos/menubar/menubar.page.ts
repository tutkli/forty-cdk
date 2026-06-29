import { ChangeDetectionStrategy, Component } from '@angular/core';

import { EXAMPLE_SOURCES } from '../../doc/example-source';
import { DemoLayout } from '../../ui/demo-layout';
import { PrimitivePage } from '../../ui/primitive-page';
import { MenubarDefaultExample } from './examples/default.example';
import { MenubarVerticalRtlExample } from './examples/vertical-rtl.example';
import { SOURCES } from './sources.generated';
import readmeContent from '../../../../../forty-cdk/menubar/README.md';

@Component({
  selector: 'app-menubar-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PrimitivePage, DemoLayout, MenubarDefaultExample, MenubarVerticalRtlExample],
  providers: [{ provide: EXAMPLE_SOURCES, useValue: SOURCES }],
  template: `
    <primitive-page slug="menubar" [readme]="readme">
      <playground-demo
        title="Application menu bar"
        subtitle="A persistent application menu bar (role menubar) driven by a single [(value)] model naming the open menu. A roving tabindex keeps one tab stop; arrows move between top-level triggers, and once one menu is open, hovering or arrowing to a sibling switches instantly. Each menu's content portals to <body>; its styles are colocated here via ViewEncapsulation.None."
        sourcePath="projects/forty-cdk-playground/src/app/demos/menubar/examples/default.example.ts"
      >
        <app-menubar-default-example />
      </playground-demo>

      <playground-demo
        title="Vertical & RTL"
        subtitle="The same menubar laid out as a vertical sidebar (orientation='vertical' makes Up / Down move between triggers) with dir='rtl'. RTL swaps the cross-menu arrow keys and floats each menu out of the opposite edge — the directive resolves the writing direction and positioning for you."
        sourcePath="projects/forty-cdk-playground/src/app/demos/menubar/examples/vertical-rtl.example.ts"
      >
        <app-menubar-vertical-rtl-example />
      </playground-demo>
    </primitive-page>
  `,
})
export class MenubarPage {
  protected readonly readme = readmeContent;
}

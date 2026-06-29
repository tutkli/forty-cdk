import { ChangeDetectionStrategy, Component } from '@angular/core';

import { EXAMPLE_SOURCES } from '../../doc/example-source';
import { DemoLayout } from '../../ui/demo-layout';
import { PrimitivePage } from '../../ui/primitive-page';
import { MenuDefaultExample } from './examples/default.example';
import { SOURCES } from './sources.generated';
import readmeContent from '../../../../../forty-cdk/menu/README.md';

@Component({
  selector: 'app-menu-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PrimitivePage, DemoLayout, MenuDefaultExample],
  providers: [{ provide: EXAMPLE_SOURCES, useValue: SOURCES }],
  template: `
    <primitive-page slug="menu" [readme]="readme">
      <playground-demo
        title="Groups, radio & submenu"
        subtitle="The shared menu vocabulary, hosted here by a minimal Dropdown Menu trigger: grouped labels, checkbox items and a radio group (role menuitemcheckbox / menuitemradio), a nested submenu and decorative separators. Checkbox and radio items keep the menu open on activation so several options can be flipped before dismissing. The surface portals to <body>; its styles are colocated here via ViewEncapsulation.None."
        sourcePath="projects/forty-cdk-playground/src/app/demos/menu/examples/default.example.ts"
      >
        <app-menu-default-example />
      </playground-demo>
    </primitive-page>
  `,
})
export class MenuPage {
  protected readonly readme = readmeContent;
}

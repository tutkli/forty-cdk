import { ChangeDetectionStrategy, Component } from '@angular/core';

import { EXAMPLE_SOURCES } from '../../doc/example-source';
import { DemoLayout } from '../../ui/demo-layout';
import { PrimitivePage } from '../../ui/primitive-page';
import { MenubarDefaultExample } from './examples/default.example';
import { MenubarVerticalRtlExample } from './examples/vertical-rtl.example';
import { SOURCES } from './sources.generated';
import { DOC } from '../../../generated/docs/primitives/menubar.generated';

@Component({
  selector: 'app-menubar-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PrimitivePage, DemoLayout, MenubarDefaultExample, MenubarVerticalRtlExample],
  providers: [{ provide: EXAMPLE_SOURCES, useValue: SOURCES }],
  template: `
    <primitive-page slug="menubar" [doc]="doc">
      <playground-demo hero sourcePath="menubar/examples/default.example.ts">
        <app-menubar-default-example />
      </playground-demo>

      <playground-demo
        title="Vertical & RTL"
        subtitle="The same menubar laid out as a vertical sidebar (<code>orientation='vertical'</code> makes <kbd>Up</kbd> / <kbd>Down</kbd> move between triggers) with <code>dir='rtl'</code>. RTL swaps the cross-menu arrow keys and floats each menu out of the opposite edge — the directive resolves the writing direction and positioning for you."
        sourcePath="menubar/examples/vertical-rtl.example.ts"
      >
        <app-menubar-vertical-rtl-example />
      </playground-demo>
    </primitive-page>
  `,
})
export class MenubarPage {
  protected readonly doc = DOC;
}

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
      <demo-layout hero sourcePath="menubar/examples/default.example.ts">
        <app-menubar-default-example />
      </demo-layout>

      <demo-layout heading="vertical--rtl" sourcePath="menubar/examples/vertical-rtl.example.ts">
        <app-menubar-vertical-rtl-example />
      </demo-layout>
    </primitive-page>
  `,
})
export class MenubarPage {
  protected readonly doc = DOC;
}

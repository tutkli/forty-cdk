import { ChangeDetectionStrategy, Component } from '@angular/core';

import { EXAMPLE_SOURCES } from '../../doc/example-source';
import { DemoLayout } from '../../ui/demo-layout';
import { PrimitivePage } from '../../ui/primitive-page';
import { MenuDefaultExample } from './examples/default.example';
import { SOURCES } from './sources.generated';
import { DOC } from '../../../generated/docs/primitives/menu.generated';

@Component({
  selector: 'app-menu-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PrimitivePage, DemoLayout, MenuDefaultExample],
  providers: [{ provide: EXAMPLE_SOURCES, useValue: SOURCES }],
  template: `
    <primitive-page slug="menu" [doc]="doc">
      <demo-layout hero sourcePath="menu/examples/default.example.ts">
        <app-menu-default-example />
      </demo-layout>
    </primitive-page>
  `,
})
export class MenuPage {
  protected readonly doc = DOC;
}

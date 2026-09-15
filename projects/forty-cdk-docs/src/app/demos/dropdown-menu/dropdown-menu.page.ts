import { ChangeDetectionStrategy, Component } from '@angular/core';

import { EXAMPLE_SOURCES } from '../../doc/example-source';
import { DemoLayout } from '../../ui/demo-layout';
import { PrimitivePage } from '../../ui/primitive-page';
import { DropdownMenuCheckboxRadioExample } from './examples/checkbox-radio.example';
import { DropdownMenuDefaultExample } from './examples/default.example';
import { DropdownMenuSubmenusExample } from './examples/submenus.example';
import { SOURCES } from './sources.generated';
import { DOC } from '../../../generated/docs/primitives/dropdown-menu.generated';

@Component({
  selector: 'app-dropdown-menu-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PrimitivePage,
    DemoLayout,
    DropdownMenuDefaultExample,
    DropdownMenuCheckboxRadioExample,
    DropdownMenuSubmenusExample,
  ],
  providers: [{ provide: EXAMPLE_SOURCES, useValue: SOURCES }],
  template: `
    <primitive-page slug="dropdown-menu" [doc]="doc">
      <demo-layout hero sourcePath="dropdown-menu/examples/default.example.ts">
        <app-dropdown-menu-default-example />
      </demo-layout>

      <demo-layout
        heading="checkbox--radio-items"
        sourcePath="dropdown-menu/examples/checkbox-radio.example.ts"
      >
        <app-dropdown-menu-checkbox-radio-example />
      </demo-layout>

      <demo-layout heading="submenus" sourcePath="dropdown-menu/examples/submenus.example.ts">
        <app-dropdown-menu-submenus-example />
      </demo-layout>
    </primitive-page>
  `,
})
export class DropdownMenuPage {
  protected readonly doc = DOC;
}

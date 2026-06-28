import { ChangeDetectionStrategy, Component } from '@angular/core';

import { PrimitivePage } from '../../ui/primitive-page';
import { DropdownMenuCheckboxRadioExample } from './examples/checkbox-radio.example';
import { DropdownMenuExample } from './examples/dropdown-menu.example';
import { DropdownMenuSubmenusExample } from './examples/submenus.example';
import readmeContent from '../../../../../forty-cdk/dropdown-menu/README.md';

@Component({
  selector: 'app-dropdown-menu-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PrimitivePage,
    DropdownMenuExample,
    DropdownMenuCheckboxRadioExample,
    DropdownMenuSubmenusExample,
  ],
  template: `
    <primitive-page slug="dropdown-menu" [readme]="readme">
      <app-dropdown-menu-example />
      <app-dropdown-menu-checkbox-radio-example />
      <app-dropdown-menu-submenus-example />
    </primitive-page>
  `,
})
export class DropdownMenuPage {
  protected readonly readme = readmeContent;
}

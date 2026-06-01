import { ChangeDetectionStrategy, Component } from '@angular/core';

import { PrimitivePage } from '../../ui/primitive-page';
import { DropdownMenuExample } from './examples/dropdown-menu.example';

@Component({
  selector: 'app-dropdown-menu-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PrimitivePage, DropdownMenuExample],
  template: `
    <primitive-page slug="dropdown-menu">
      <app-dropdown-menu-example />
    </primitive-page>
  `,
})
export class DropdownMenuPage {}

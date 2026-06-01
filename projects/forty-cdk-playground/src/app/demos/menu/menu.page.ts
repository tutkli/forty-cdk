import { ChangeDetectionStrategy, Component } from '@angular/core';

import { PrimitivePage } from '../../ui/primitive-page';
import { MenuExample } from './examples/menu.example';

@Component({
  selector: 'app-menu-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PrimitivePage, MenuExample],
  template: `
    <primitive-page slug="menu">
      <app-menu-example />
    </primitive-page>
  `,
})
export class MenuPage {}

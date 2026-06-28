import { ChangeDetectionStrategy, Component } from '@angular/core';

import { PrimitivePage } from '../../ui/primitive-page';
import { MenuExample } from './examples/menu.example';
import readmeContent from '../../../../../forty-cdk/menu/README.md';

@Component({
  selector: 'app-menu-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PrimitivePage, MenuExample],
  template: `
    <primitive-page slug="menu" [readme]="readme">
      <app-menu-example />
    </primitive-page>
  `,
})
export class MenuPage {
  protected readonly readme = readmeContent;
}

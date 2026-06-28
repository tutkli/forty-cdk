import { ChangeDetectionStrategy, Component } from '@angular/core';

import { PrimitivePage } from '../../ui/primitive-page';
import { MenubarExample } from './examples/menubar.example';
import { MenubarVerticalRtlExample } from './examples/vertical-rtl.example';
import readmeContent from '../../../../../forty-cdk/menubar/README.md';

@Component({
  selector: 'app-menubar-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PrimitivePage, MenubarExample, MenubarVerticalRtlExample],
  template: `
    <primitive-page slug="menubar" [readme]="readme">
      <app-menubar-example />
      <app-menubar-vertical-rtl-example />
    </primitive-page>
  `,
})
export class MenubarPage {
  protected readonly readme = readmeContent;
}
